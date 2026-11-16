# LIGHTING + BUILD - lighting, sky, atmosphere, terrain, how a map looks. Read for "make it look better", day/night, mood, map building.

Set properties with the Studio tools. Change one thing, look, then continue. Always tell the user how to undo it (Ctrl+Z).

## Lighting service (current way)
- Lighting.Technology is old. Roblox now uses Unified Lighting: `Lighting.LightingStyle` (Soft or Realistic) and `Lighting.PrioritizeLightingQuality` (true = better look, false = longer view distance and faster). Old settings map like this: Future = Realistic + Prioritize true. ShadowMap = Soft + true. Voxel = Soft + false.
- Realistic looks best but costs more on phones. For mobile-heavy or fast games prefer Soft, or Realistic with PrioritizeLightingQuality false. Check the current names with WebFetch (web.md) if unsure.
- Time and sun: ClockTime (0-24), GeographicLatitude, Brightness. Ambient / OutdoorAmbient set the color of shadows (Ambient = where the sky is blocked, OutdoorAmbient = under open sky).
- Day/night cycle: change ClockTime slowly on the SERVER (one loop, task.wait(1)); the client sees it.

## Atmosphere (fog and depth feel)
Insert Atmosphere in Lighting. Density = how much haze (even 0.3 gives a nice distant fade). Offset = balance with Density (too low: sky shows through terrain; too high: far things stay sharp). Color tints it. Glare needs Haze above 0. Decay needs Haze and Glare. Match Color to the sky.

## Sky, clouds, post-effects
- Sky object = skybox (sun, moon, stars). Clouds object = moving clouds.
- Post effects as children of Lighting: BloomEffect (glow), ColorCorrectionEffect (mood/contrast), SunRaysEffect, DepthOfFieldEffect, BlurEffect. Keep values small; strong effects hurt phones and make UI hard to read.
- Local lights (PointLight, SpotLight, SurfaceLight): few, small Range. Many shadow-casting lights are expensive.

## Mood recipes (starting values, then adjust by eye)
- Sunny: ClockTime 14, Atmosphere Density 0.3, light Bloom.
- Sunset: ClockTime 17.5-18, warm ColorCorrection tint, Atmosphere Haze 1-2.
- Night: ClockTime 0, low Brightness, bright PointLights, Bloom for glow.
- Spooky: Atmosphere Density 0.5 + dark Color, low Brightness, no clouds.

## Terrain and building
- Terrain for ground, water, hills (cheap and good-looking). Parts for structures. Anchor all static parts.
- Reuse models (copy, do not rebuild). Fewer, bigger parts beat thousands of tiny ones. Use CollisionFidelity Box for decoration (see performance.md).
- Do not build or edit a big map with one huge script. Make one small area, check it, then continue.
- Use Materials and a limited color palette (3-5 colors) so the map feels consistent.
- Never touch or delete the user's existing map without asking and a backup (/rollback).

## Test
Play (not just Edit view - lighting can look different), walk the map, and use Device Emulator for a phone view. Ask the user: "Is it too dark, too bright, or too foggy?" Looks are the user's taste: ask, do not assume. Screenshots help but cannot show frame rate.
