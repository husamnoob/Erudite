// Local helper: lets the Erudite shell talk to Google Gemini (free key from Google AI Studio).
// The shell speaks "Anthropic format"; Gemini's OpenAI-compatible endpoint speaks "OpenAI format".
// This file translates both ways (text, tools, streaming), paces requests so the free quota lasts,
// waits 30 s (2 attempts) when Gemini says "too many requests", logs the tokens every request used,
// and switches to a backup model after 2 failures.
// Key comes from the GEMINI_API_KEY environment variable. It is never written to the log.
const http = require("http");
const fs = require("fs");
const path = require("path");

const KEY = process.env.GEMINI_API_KEY || "";
const MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";
const BACKUP_MODEL = process.env.GEMINI_BACKUP_MODEL || MODEL;
const UPSTREAM = process.env.GEMINI_UPSTREAM || "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
const PORT = Number(process.env.GEMINI_PROXY_PORT || 8788);
const THINK = process.env.GEMINI_THINK || "high"; // high = slow but smartest for Gemini 3.x
const SWITCH_AFTER = 2, MAX = 8, HEADER_TIMEOUT = Number(process.env.GEMINI_HEADER_TIMEOUT_MS || 90000);
// --- quota pacing (easy to change here, or with environment variables) ---
const MAX_PER_MIN = Number(process.env.GEMINI_MAX_PER_MIN || 8);        // free plan allows about 10 per minute
const PACE_WINDOW_MS = Number(process.env.GEMINI_PACE_WINDOW_MS || 60000);
const QUOTA_WAIT_MS = Number(process.env.GEMINI_QUOTA_WAIT_MS || 30000); // wait after a 429
const QUOTA_ATTEMPTS = Number(process.env.GEMINI_QUOTA_ATTEMPTS || 2);   // total tries when Gemini says 429
const FALLBACK_SIG = "skip_thought_signature_validator"; // only used if the real signature is missing
const LOG = path.join(__dirname, "gemini-proxy.log");
const log = (m) => { try { fs.appendFileSync(LOG, new Date().toISOString() + " " + m + "\n"); } catch (e) {} };
const rid = () => Math.random().toString(36).slice(2, 12);
let backupDead = false; // set if Google says the backup model is not available
const sigs = new Map(); // tool call id -> Gemini 3 thought signature (must be echoed back)

const DROP = new Set(["$schema", "$id", "$ref", "$defs", "definitions", "additionalProperties", "propertyNames",
  "patternProperties", "unevaluatedProperties", "format", "default", "examples", "title", "minLength", "maxLength",
  "pattern", "minimum", "maximum", "exclusiveMinimum", "exclusiveMaximum", "multipleOf", "minItems", "maxItems", "uniqueItems"]);
function cleanSchema(s) {
  if (Array.isArray(s)) return s.map(cleanSchema);
  if (!s || typeof s !== "object") return s;
  const o = {};
  for (const [k, v] of Object.entries(s)) {
    if (DROP.has(k)) continue;
    if (k === "const") { o.enum = [v]; continue; }
    if (k === "type" && Array.isArray(v)) { o.type = v.find((t) => t !== "null") || "string"; continue; }
    if (k === "properties" && v && typeof v === "object") {
      o.properties = {};
      for (const [pk, pv] of Object.entries(v)) o.properties[pk] = cleanSchema(pv);
      continue;
    }
    o[k] = cleanSchema(v);
  }
  return o;
}

const imgPart = (b) => (b && b.source && b.source.type === "base64" && b.source.data
  ? { type: "image_url", image_url: { url: "data:" + (b.source.media_type || "image/png") + ";base64," + b.source.data } } : null);
const textOf = (c) => {
  if (typeof c === "string") return c;
  if (Array.isArray(c)) return c.map((b) => (b.type === "text" ? b.text : b.type === "image" ? (imgPart(b) ? "[screenshot attached below]" : "[image omitted]") : "")).filter(Boolean).join("\n");
  return "";
};
const MAX_IMAGES = 2; // keep only the newest screenshots so requests stay small
function trimImages(msgs) {
  let n = 0;
  for (let i = msgs.length - 1; i >= 0; i--) {
    const c = msgs[i].content;
    if (!Array.isArray(c)) continue;
    for (let j = c.length - 1; j >= 0; j--) {
      if (c[j].type !== "image_url") continue;
      if (++n > MAX_IMAGES) c[j] = { type: "text", text: "[older screenshot removed]" };
    }
  }
}

function toOpenAI(a, model) {
  const g3 = model.startsWith("gemini-3");
  const msgs = [];
  const sys = typeof a.system === "string" ? a.system : Array.isArray(a.system) ? a.system.map((b) => b.text || "").join("\n") : "";
  if (sys) msgs.push({ role: "system", content: sys });
  const names = new Map();
  for (const m of a.messages || []) {
    if (typeof m.content === "string") { msgs.push({ role: m.role, content: m.content }); continue; }
    if (m.role === "assistant") {
      let text = ""; const calls = [];
      for (const b of m.content || []) {
        if (b.type === "text") text += (text ? "\n" : "") + b.text;
        else if (b.type === "tool_use") {
          names.set(b.id, b.name);
          const tc = { id: b.id, type: "function", function: { name: b.name, arguments: JSON.stringify(b.input || {}) } };
          if (g3) tc.extra_content = { google: { thought_signature: sigs.get(b.id) || FALLBACK_SIG } };
          calls.push(tc);
        }
      }
      const o = { role: "assistant" };
      if (text || !calls.length) o.content = text;
      if (calls.length) o.tool_calls = calls;
      msgs.push(o);
    } else {
      const toolMsgs = [], parts = [], shots = [];
      for (const b of m.content || []) {
        if (b.type === "tool_result") {
          const body = textOf(b.content) || "(no output)";
          toolMsgs.push({ role: "tool", tool_call_id: b.tool_use_id, name: names.get(b.tool_use_id) || "tool", content: b.is_error ? "ERROR: " + body : body });
          if (Array.isArray(b.content)) for (const x of b.content) { const p = x.type === "image" && imgPart(x); if (p) shots.push(p); }
        } else if (b.type === "text") parts.push({ type: "text", text: b.text });
        else if (b.type === "image") parts.push(imgPart(b) || { type: "text", text: "[image omitted]" });
      }
      msgs.push(...toolMsgs);
      if (shots.length) msgs.push({ role: "user", content: [{ type: "text", text: "Screenshot from the tool result above:" }, ...shots] });
      if (parts.length) msgs.push({ role: "user", content: parts.some((p) => p.type === "image_url") ? parts : parts.map((p) => p.text).join("\n") });
    }
  }
  trimImages(msgs);
  const out = { model, messages: msgs, stream: true, stream_options: { include_usage: true } };
  out.reasoning_effort = model.startsWith("gemini-2.5") ? "none" : THINK;
  if (a.max_tokens) out.max_tokens = a.max_tokens;
  if (typeof a.temperature === "number") out.temperature = a.temperature;
  if (typeof a.top_p === "number") out.top_p = a.top_p;
  if (Array.isArray(a.stop_sequences) && a.stop_sequences.length) out.stop = a.stop_sequences.slice(0, 5);
  if (Array.isArray(a.tools) && a.tools.length) {
    out.tools = a.tools.map((t) => {
      const fn = { name: t.name, description: (t.description || "").slice(0, 1500) };
      const ps = t.input_schema && t.input_schema.properties;
      if (ps && Object.keys(ps).length) fn.parameters = cleanSchema(t.input_schema);
      return { type: "function", function: fn };
    });
    const tc = a.tool_choice;
    if (tc && tc.type === "any") out.tool_choice = "required";
    else if (tc && tc.type === "none") out.tool_choice = "none";
    else if (tc && tc.type === "tool" && tc.name) out.tool_choice = { type: "function", function: { name: tc.name } };
    else out.tool_choice = "auto";
  }
  return out;
}

// OpenAI streaming chunks -> Anthropic streaming events
function makeConverter(emit, clientModel) {
  let started = false, idx = -1, open = null, usedTool = false, toolArgs = false, finish = null, outTok = 0, usage = null;
  const start = () => {
    if (started) return; started = true;
    emit("message_start", { type: "message_start", message: { id: "msg_" + rid(), type: "message", role: "assistant", model: clientModel, content: [], stop_reason: null, stop_sequence: null, usage: { input_tokens: 0, output_tokens: 0 } } });
  };
  const close = () => {
    if (!open) return;
    if (open === "tool" && !toolArgs) emit("content_block_delta", { type: "content_block_delta", index: idx, delta: { type: "input_json_delta", partial_json: "{}" } });
    emit("content_block_stop", { type: "content_block_stop", index: idx }); open = null;
  };
  return {
    getUsage() { return usage; },
    chunk(j) {
      start();
      if (j.usage) usage = j.usage;
      if (j.usage && j.usage.completion_tokens) outTok = j.usage.completion_tokens;
      const ch = j.choices && j.choices[0]; if (!ch) return;
      const d = ch.delta || {};
      if (d.content) {
        if (open !== "text") { close(); idx++; open = "text"; emit("content_block_start", { type: "content_block_start", index: idx, content_block: { type: "text", text: "" } }); }
        emit("content_block_delta", { type: "content_block_delta", index: idx, delta: { type: "text_delta", text: d.content } });
      }
      for (const tc of d.tool_calls || []) {
        const f = tc.function || {};
        if (f.name) {
          close(); idx++; open = "tool"; usedTool = true; toolArgs = false;
          const id = tc.id || ("call_" + rid());
          const sig = tc.extra_content && tc.extra_content.google && tc.extra_content.google.thought_signature;
          if (sig) sigs.set(id, sig);
          emit("content_block_start", { type: "content_block_start", index: idx, content_block: { type: "tool_use", id, name: f.name, input: {} } });
        }
        if (f.arguments && open === "tool") {
          toolArgs = true;
          emit("content_block_delta", { type: "content_block_delta", index: idx, delta: { type: "input_json_delta", partial_json: f.arguments } });
        }
      }
      if (ch.finish_reason) finish = ch.finish_reason;
    },
    end() {
      start();
      if (idx < 0) { idx++; open = "text"; emit("content_block_start", { type: "content_block_start", index: idx, content_block: { type: "text", text: "" } }); }
      close();
      const reason = usedTool ? "tool_use" : finish === "length" ? "max_tokens" : "end_turn";
      emit("message_delta", { type: "message_delta", delta: { stop_reason: reason, stop_sequence: null }, usage: { output_tokens: outTok } });
      emit("message_stop", { type: "message_stop" });
    },
  };
}

async function readSSE(body, onData) {
  const reader = body.getReader(); const dec = new TextDecoder(); let buf = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let i;
    while ((i = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, i).replace(/\r$/, ""); buf = buf.slice(i + 1);
      if (!line.startsWith("data:")) continue;
      const data = line.slice(5).trim();
      if (!data || data === "[DONE]") continue;
      try { onData(JSON.parse(data)); } catch (e) {}
    }
  }
}

const errJson = (status, msg) => ({ type: "error", error: { type: status === 429 ? "rate_limit_error" : status >= 500 ? "api_error" : "invalid_request_error", message: msg } });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Pacing: never start more than MAX_PER_MIN upstream requests in any 60 seconds (retries count too).
const stamps = [];
let paceChain = Promise.resolve();
function pace() {
  const p = paceChain.then(async () => {
    while (true) {
      const now = Date.now();
      while (stamps.length && now - stamps[0] >= PACE_WINDOW_MS) stamps.shift();
      if (stamps.length < MAX_PER_MIN) { stamps.push(now); return; }
      const wait = stamps[0] + PACE_WINDOW_MS - now + 250;
      log("pacing: " + stamps.length + " requests in the last minute, waiting " + Math.ceil(wait / 1000) + "s");
      await sleep(wait);
    }
  });
  paceChain = p.catch(() => {});
  return p;
}

// Token log: one line per answered request, plus what was used in the last minute and since the proxy started.
const tokenStamps = []; let sessReq = 0, sessTok = 0;
function logTokens(model, usage, bodyChars, secs) {
  const known = usage && usage.total_tokens;
  const inT = known ? (usage.prompt_tokens || 0) : Math.ceil(bodyChars / 4);
  const outT = known ? (usage.completion_tokens || 0) : 0;
  const total = known ? usage.total_tokens : inT;
  const think = usage && usage.completion_tokens_details && usage.completion_tokens_details.reasoning_tokens;
  const now = Date.now();
  tokenStamps.push([now, total]);
  while (tokenStamps.length && now - tokenStamps[0][0] >= 60000) tokenStamps.shift();
  sessReq++; sessTok += total;
  const lastMin = tokenStamps.reduce((a, t) => a + t[1], 0);
  log("tokens " + (known ? "" : "(estimate) ") + "in " + inT + " out " + outT + (think ? " (thinking " + think + ")" : "") + " total " + total +
    " | " + secs + "s | last minute: " + tokenStamps.length + " requests, " + lastMin + " tokens | since start: " + sessReq + " requests, " + sessTok + " tokens (" + model + ")");
}

const server = http.createServer((req, res) => {
  const chunks = [];
  req.on("data", (c) => chunks.push(c));
  req.on("end", async () => {
    const t0 = Date.now();
    const url = req.url.split("?")[0];
    const send = (status, obj) => { res.writeHead(status, { "content-type": "application/json" }); res.end(JSON.stringify(obj)); };
    try {
      const raw = Buffer.concat(chunks).toString("utf8");
      if (req.method === "POST" && url.endsWith("/v1/messages/count_tokens")) return send(200, { input_tokens: Math.ceil(raw.length / 4) });
      if (!(req.method === "POST" && url.endsWith("/v1/messages"))) return send(200, { data: [], has_more: false });
      if (!KEY) return send(401, errJson(401, "GEMINI_API_KEY is not set"));
      const a = JSON.parse(raw);
      const wantStream = a.stream !== false;
      const clientModel = a.model || MODEL;
      let model = MODEL, failures = 0, up = null, attempt = 0, lastText = "", quotaTries = 0, body0 = "";
      while (true) {
        attempt++;
        if (failures >= SWITCH_AFTER && BACKUP_MODEL !== MODEL && model === MODEL && !backupDead) { model = BACKUP_MODEL; log("switching to " + BACKUP_MODEL); }
        const body = JSON.stringify(toOpenAI(a, model)); body0 = body;
        await pace();
        const ac = new AbortController(); const to = setTimeout(() => ac.abort(), HEADER_TIMEOUT);
        let retryAfter = 0;
        try {
          up = await fetch(UPSTREAM, { method: "POST", headers: { "content-type": "application/json", authorization: "Bearer " + KEY }, body, signal: ac.signal });
          clearTimeout(to);
        } catch (e) {
          clearTimeout(to); failures++;
          log("attempt " + attempt + " failed: " + (e.name === "AbortError" ? "no answer in " + HEADER_TIMEOUT + "ms" : e.message) + " (" + model + ", request " + Math.round(body.length / 1024) + "KB)");
          if (attempt >= MAX) return send(502, errJson(502, "proxy: " + e.message));
          await sleep(Math.min(400 * attempt, 2000)); continue;
        }
        if (up.ok) break;
        lastText = ""; try { lastText = (await up.text()).slice(0, 600); } catch (e) {}
        if (up.status === 404 && model === BACKUP_MODEL && model !== MODEL) {
          backupDead = true; model = MODEL; failures = 0;
          log("backup model " + BACKUP_MODEL + " is not available (404), staying on " + MODEL);
          if (attempt >= MAX) return send(502, errJson(502, "backup model unavailable"));
          continue;
        }
        if (up.status === 429) {
          failures++; quotaTries++;
          log("attempt " + attempt + " got 429 (" + model + ") " + lastText.replace(/\s+/g, " ").slice(0, 200));
          if (/PerDay|per day/i.test(lastText)) return send(429, errJson(429, "Gemini daily free limit reached. It resets once a day, so try again later."));
          if (quotaTries >= QUOTA_ATTEMPTS) return send(429, errJson(429, "Gemini free limit reached (too many requests or tokens in a minute). Wait about a minute, then send your message again."));
          const wait = Math.min(Math.max(QUOTA_WAIT_MS, (Number(up.headers.get("retry-after")) || 0) * 1000), 60000);
          log("quota: waiting " + Math.round(wait / 1000) + "s, then trying again (attempt " + (quotaTries + 1) + " of " + QUOTA_ATTEMPTS + ")");
          await sleep(wait); continue;
        }
        if (up.status >= 500) {
          failures++;
          retryAfter = Number(up.headers.get("retry-after")) || 0;
          log("attempt " + attempt + " got " + up.status + " (" + model + ")" + (lastText ? " " + lastText.replace(/\s+/g, " ").slice(0, 200) : "") + ", retrying");
          if (attempt >= MAX) return send(up.status, errJson(up.status, lastText || "upstream error"));
          await sleep(Math.min(Math.max(retryAfter * 1000, 400 * attempt), 8000)); continue;
        }
        log("upstream " + up.status + " (" + model + "): " + lastText.replace(/\s+/g, " "));
        return send(up.status, errJson(up.status, lastText || "upstream error"));
      }
      log("POST /v1/messages -> 200 " + model + " first byte " + (Date.now() - t0) + "ms");
      if (wantStream) {
        res.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-cache" });
        const conv = makeConverter((ev, d) => res.write("event: " + ev + "\ndata: " + JSON.stringify(d) + "\n\n"), clientModel);
        await readSSE(up.body, (j) => conv.chunk(j));
        conv.end(); res.end();
        logTokens(model, conv.getUsage(), body0.length, ((Date.now() - t0) / 1000).toFixed(1));
      } else {
        const msg = { id: "msg_" + rid(), type: "message", role: "assistant", model: clientModel, content: [], stop_reason: null, stop_sequence: null, usage: { input_tokens: 0, output_tokens: 0 } };
        const jsonBufs = {};
        const conv = makeConverter((ev, d) => {
          if (ev === "content_block_start") { msg.content[d.index] = d.content_block; jsonBufs[d.index] = ""; }
          else if (ev === "content_block_delta") {
            if (d.delta.type === "text_delta") msg.content[d.index].text += d.delta.text;
            else jsonBufs[d.index] += d.delta.partial_json;
          } else if (ev === "content_block_stop") {
            const b = msg.content[d.index];
            if (b && b.type === "tool_use") { try { b.input = JSON.parse(jsonBufs[d.index] || "{}"); } catch (e) { b.input = {}; } }
          } else if (ev === "message_delta") { msg.stop_reason = d.delta.stop_reason; msg.usage.output_tokens = d.usage.output_tokens; }
        }, clientModel);
        await readSSE(up.body, (j) => conv.chunk(j));
        conv.end(); send(200, msg);
        logTokens(model, conv.getUsage(), body0.length, ((Date.now() - t0) / 1000).toFixed(1));
      }
    } catch (e) {
      log("ERROR " + e.message);
      if (!res.headersSent) send(502, errJson(502, "proxy: " + e.message)); else res.end();
    }
  });
});

server.on("error", (e) => { if (e.code === "EADDRINUSE") process.exit(0); log("server error " + e.message); process.exit(1); });
server.listen(PORT, "127.0.0.1", () => {
  try { fs.writeFileSync(path.join(__dirname, "gemini-proxy.pid"), String(process.pid)); } catch (e) {}
  log("gemini proxy up on " + PORT + " model " + MODEL + " backup " + BACKUP_MODEL + " think " + THINK + " | max " + MAX_PER_MIN + " requests/min, quota wait " + QUOTA_WAIT_MS / 1000 + "s x " + QUOTA_ATTEMPTS + " attempts");
});
