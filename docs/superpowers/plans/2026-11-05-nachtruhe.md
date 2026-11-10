# Nachtruhe Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Insert the wordless breather „Nachtruhe" between Klingelsturm and Rundschreiben: Tibik comes home at dusk, goes to bed, the camera rises over a sleeping Musterstadt while Karen's window stays lit longest, and he wakes on the rainy morning two weeks later.

**Architecture:** A new scene module `src/scenes/nachtruhe/` built like the others (choreography → solve with guards → cameras → view → sound). The shared street set gains time-of-day looks, window lights, lit street lamps, roofs and a town silhouette through props that default to today's behaviour. The bedroom is a new set in `src/building/`. Tibik gains a whole-body tilt so he can lie down. The epilogue's caption moves here.

**Tech Stack:** Remotion 4, @remotion/three, React Three Fiber, three, vitest 5, Node scripts.

**Spec:** `docs/superpowers/specs/2026-11-05-nachtruhe-design.md`

**Workspace and ledger:** `.superpowers/sdd/2026-11-05-nachtruhe/progress.md` (first line names this plan).

## Global Constraints

- No duplicated general code (user's rule): street, house, lighting, rain, ambience, Tibik's rig and gait come from the shared pieces; extend through props. jscpd strict at 50 tokens reports no new clone involving the new files.
- Every new prop on a shared piece defaults to today's behaviour. Treppenhaus, Papiertonnen, Hausmuell, Klingelsturm and Rundschreiben render pixel-identical before/after each task (`node scripts/stills.mjs <out> Comp:frames …`, compared with `git stash`), except his bedroom window losing its roller shutter (Task 3) and the epilogue losing its caption (Task 8).
- Everything is a pure function of time; randomness only through Remotion `random(seed)` with stable seeds; solvers go through `memoByFrame`.
- No clipping anywhere, ink outlines included (OUTLINE = 14 mm unless a part sets its own ink).
- Windows: a data module never shares a case-insensitive name with a component in the same folder (`bedroomShape.ts` beside `Bedroom.tsx`, `townShape.ts` beside `Town.tsx`).
- No code comments; `node scripts/strip-comments.mjs` before every commit. Commit and push to `main` as HugeFrog24, no AI/Claude/Co-Authored-By trailers.
- 16:9 as now; key action near the frame centre (a later 9:16 crop: |NDC x| ≤ 0.316).
- Nothing in the repo says the bedroom is modelled on a real room; no photos in the repo.
- New sounds: CC0 / public domain or synthesised by our own scripts; credited in `public/sfx/CREDITS.md`. If no free source exists for a sound, stop and ask the user.
- Each task ends with tsc, eslint, the touched tests green, stills of the affected shots checked for clipping, a commit and a ledger line.

## Review Focus

1. The rain loop must not jump at the cut into the epilogue: its playback position at Rundschreiben's first frame continues from Nachtruhe's dawn. Pinned in Task 9.
2. The passage at the bed's foot: Tibik walks round a 2 m bed in a 3.3 m room; the gap must fit his widest collider plus 10 cm. Pinned in Task 4.
3. Lying down must not break the guards: with the body tilted, ground and body guards keep him on the mattress, never sunk into it or flung off it. Pinned in Task 5.
4. Inside and outside agree: his bedroom window glows on the facade exactly while a bedside lamp is on. Pinned in Task 7.
5. The doorway camera in the bedroom: the lens is never inside the door leaf, the frame or the wall. Pinned in Task 8.

---

### Task 1: Time-of-day looks on the shared street

**Files:**
- Modify: `src/weather/overcast.ts`, `src/weather/overcast.test.ts`, `src/weather/DayLight.tsx`, `src/street/StreetSet.tsx` (`Sky`, `StreetLighting`)

**Interfaces:**
- Produces: `type Weather = "sunny" | "rain" | "dusk" | "night"`; `WEATHER.dusk`, `WEATHER.night`; `mixLooks(a: WeatherLook, b: WeatherLook, k: number): WeatherLook` (colours mixed in linear space, numbers lerped, `shadows` = `k < 0.5 ? a.shadows : b.shadows`, `wetTint` taken from the nearer end); `HAZE.dusk = HAZE.night = null`; `hazeOf(look: WeatherLook): { colour: string; density: number } | null`; `signLightOf(look: WeatherLook): number` (`facadeLight(look) / facadeLight(WEATHER.sunny)`); `Sky({ weather?, look?, children })`, `StreetLighting({ weather?, look? })`, `DayLight({ weather?, look?, children })` — `look` overrides `WEATHER[weather]`.
- Values: dusk sky `["#2b3b6b", "#e8a46a"]`, hemisphere `{ sky: "#5a6c9a", ground: "#3a3530", intensity: 0.9 }`, sun `{ intensity: 0, shadows: false }`, `wetTint: null`; night sky `["#0b1022", "#1b2440"]`, hemisphere `{ sky: "#2a3550", ground: "#15151a", intensity: 0.25 }`, sun `{ intensity: 0, shadows: false }`, `wetTint: null`.

- [ ] **Step 1: Write the failing tests** in `overcast.test.ts`:
  - `"dusk and night have no sun, and night is darker than dusk, dusk darker than the rainy day"`: `sun.intensity` 0 for both; `facadeLight(night) < facadeLight(dusk) < facadeLight(rain)`.
  - `"mixing two looks starts at one and ends at the other"`: `mixLooks(a, b, 0)` deep-equals `a`, `mixLooks(a, b, 1)` deep-equals `b` for (night, rain) and (dusk, night); at k = 0.5 the hemisphere intensity is the mean.
  - `"the haze grows with the dawn into the rain"`: `hazeOf(mixLooks(night, rain, k))` is null at 0 and its density rises monotonically to `HAZE.rain.density` at 1.
  - `"signs dim with the light"`: `signLightOf(night) < signLightOf(dusk) < SIGN_LIGHT.rain < SIGN_LIGHT.sunny = 1`.
- [ ] **Step 2: Run** `node scripts/test.mjs src/weather/overcast.test.ts`; expected FAIL.
- [ ] **Step 3: Implement** the values and functions above; `DayLight` provides a look, `useSignColor` reads `signLightOf`; `StreetLighting` adds the fog from `hazeOf(look)`.
- [ ] **Step 4: Run** the tests; expected PASS. Full suite green.
- [ ] **Step 5: Prove nothing else moved:** stills Film 120, 460, 1220, Klingelsturm 1500, Rundschreiben 60 before/after: identical.
- [ ] **Step 6: Commit** `"The street knows dusk and night, and a dawn that greys into the rain"`.

### Task 2: Roofs and the town beyond

**Files:**
- Create: `src/street/townShape.ts`, `src/street/Town.tsx`, `src/street/roofs.test.ts`
- Modify: `src/street/Street.tsx` (`Street`, `DistantBlock` via `src/street/DistantBlock.tsx`)

**Interfaces:**
- Produces: `roofParts(): readonly Part[]` for one block in block-local coordinates — a flat slab over the block footprint at `BUILDING_HEIGHT`, a parapet 0.35 m high and 0.25 m thick on all four edges, a smoke-vent dome (RWA-Lichtkuppel) above the stairwell core (`CORE` x/z) and two vent pipes; `TOWN: readonly { x: number; z: number; w: number; d: number; h: number }[]` (blocks 15–25 m high, behind No. 12 at z ≤ −20 and beyond the street's ends, never over the street); `Street({ …, roofs?: boolean, town?: boolean })` default false.

- [ ] **Step 1: Write the failing tests** in `roofs.test.ts`:
  - `"every block is roofed flat: the slab covers its footprint and a parapet runs round it"`: the slab's top is within 1 cm of `BUILDING_HEIGHT`; it spans the block's x extent and its depth from the facade back; four parapet parts 0.35 m above the slab.
  - `"the smoke vent the stairwell button opens sits on the roof above the stairwell"`: the dome's x/z centre lies inside `CORE`.
  - `"the town lies beyond the street and never inside a block, the street or the across-street twin"`: every `TOWN` box's footprint overlaps no block footprint, no street part and no `acrossFootprint` of a block.
- [ ] **Step 2: Run**; expected FAIL.
- [ ] **Step 3: Implement** `roofParts` and `TOWN`; `<Town>` draws the boxes in muted night colours with a window-dot texture; `Street` draws the roofs on No. 12, No. 13 and the distant blocks and `<Town>` only when asked.
- [ ] **Step 4: Run**; expected PASS. Stills of the existing scenes identical (props off).
- [ ] **Step 5: Commit** `"Flat roofs with a parapet and the smoke vent, and a town beyond the street"`.

### Task 3: Lit windows, lit street lamps, and his bedroom window

**Files:**
- Modify: `src/street/building.ts` (`openingsOf`, new `flatWindow`), `src/street/Street.tsx` (`OpeningView`, `Street`), `src/street/StreetLamp.tsx`, `src/street/windows.test.ts`, `docs/CONTINUITY.md` (Windows paragraph)
- Create: `src/street/windowLights.test.ts`

**Interfaces:**
- Produces: `flatWindow(house: number, storey: number, side: "links" | "rechts"): Opening` — No. 12 storey 1 links → the window at x = −8.8 (his bedroom), rechts → the window at x = 0.3 (Karen's); `Opening.bedroom?: boolean` (true only for his window: `shutter` 0, no shutter box, single sash, a curtain behind the glass in `CURTAIN_SAND = "#d6c09a"`); `Street({ …, windowLight?: (house: number, opening: Opening) => number, lampsOn?: boolean })` — `windowLight` 0..1 makes the glass glow warm (`"#ffc98a"` at 1, the room colour at 0), `lampsOn` makes each lamp head emissive warm white (`"#ffe0b8"`) with a soft round pool decal on the pavement; both default off.

- [ ] **Step 1: Write the failing tests:**
  - `windows.test.ts` `"his bedroom window has no roller shutter, inside or out"`: `flatWindow(12, 1, "links")` is at x −8.8, `bedroom` true, `shutter` 0, not tilted; no other opening is `bedroom`.
  - `windowLights.test.ts` `"Karen's window is across the landing from his"`: `flatWindow(12, 1, "rechts").x` is 0.3; both share storey 1's y.
  - `windowLights.test.ts` `"a lamp head glows only when the lamps are on"`: the `StreetLamp` look function returns emissive 0 when off (pure helper `lampGlow(on: boolean)`).
- [ ] **Step 2: Run**; expected FAIL.
- [ ] **Step 3: Implement**; CONTINUITY's Windows paragraph notes his window's single sash without a shutter.
- [ ] **Step 4: Run**; expected PASS. Stills: the sunny scenes differ only around his window (diff bounding box inside its projected frame); everything else identical.
- [ ] **Step 5: Commit** `"Windows that light up, street lamps that glow, and his bedroom window without a shutter"`.

### Task 4: The bedroom set

**Files:**
- Create: `src/building/bedroomShape.ts`, `src/building/Bedroom.tsx`, `src/building/bedroom.test.ts`

**Interfaces:**
- Consumes: `floorLevel`, `FACADE_Z`, `FACADE_THICKNESS`, `Part`, `doorFrame`/`doorLeaf`/`leverGrip`/`Door` from `src/building/doors.ts`, `LIVING_ROOM`, `FLUR`, `flatWindow`.
- Produces: `BEDROOM = { x0: -10.6, x1: -7.3, z0: -6.6, z1: FACADE_Z - FACADE_THICKNESS, floor: floorLevel(1), height: FLUR.height }`; `BED = { mattress: [1.6, 2.0], top: 0.55, frame: 0.06, headboard: { height: 1.05, thickness: 0.12 } }` with the headboard against `x0` and the bed's long side 0.7 m from the window wall; `CABINETS` (two, 0.45 × 0.45 × 0.55, one each side of the headboard); `LAMPS` (two, on the cabinets, base Ø 0.14, 0.40 high, drum shade Ø 0.25, rocker switch point on the base); `RADIATOR` (1.0 × 0.6 × 0.1, bottom 0.12 above the floor, under the window); `CURTAIN` (rail 0.05 below the ceiling with a wood-look pelmet 0.08 high, the room's width minus 0.1, hanging 0.2 m in front of the window wall, hem 0.02 above the floor, colour `CURTAIN_SAND`); `DOME_LAMP` (Ø 0.30 at the ceiling centre); `SMOKE_ALARM` (Ø 0.11 on the ceiling); `BEDROOM_DOOR: Door` in the back wall near `x1`; `bedroomParts(): readonly Part[]`; `bedroomSolids(state: { door: number; curtain: number }): readonly Solid[]`; `curtainShape(open: number)` (pleat amplitude growing as the panel bunches, 0 = closed, 1 = pulled open); `PILLOWS` (two, 0.8 × 0.8 German size, patterned covers, slightly askew as slept on); `<Bedroom door lamps={[boolean, boolean]} curtain daylight streetGlow />` and `BedroomLighting({ lamps, daylight, streetGlow })` (hemisphere through the window at `daylight` 0..1, a faint orange `"#ff9a4a"` glow through the curtain at `streetGlow` 0..1 for the night, a warm point light at each lit lamp, `"#ffd6a0"`).

- [ ] **Step 1: Write the failing tests** in `bedroom.test.ts`:
  - `"the bedroom is a street-side room of his flat, clear of the living room and the Flur"`: `BEDROOM` overlaps neither `LIVING_ROOM` nor `FLUR`; its window wall is the facade's inner face; `flatWindow(12, 1, "links").x` lies within its x range.
  - `"the bed is a 160 × 200 double with its headboard against the side wall"`; `"a bedside cabinet stands on each side of the headboard, a lamp on each"`; `"the radiator sits under the window and the curtain clears it"`.
  - `"walking round the bed's foot fits him"` (Review Focus 2): the gap between the bed frame's foot and `x1` is at least Tibik's widest collider (max over his standing `bodyColliders` of 2 × radius across) + 0.10 m.
  - `"the smoke alarm is at least 50 cm from every wall, as DIN 14676 asks"`.
  - `"no piece of furniture overlaps another, the walls or the closed door"`: pairwise `boxGap` ≥ 0 over `bedroomParts()`.
  - `"the curtain opened bunches at one end and uncovers the window"`: `curtainShape(1)` leaves the window's x span free; `curtainShape(0)` covers it with 5 cm to spare each side.
- [ ] **Step 2: Run**; expected FAIL.
- [ ] **Step 3: Implement**; furniture as `Part`s drawn with the existing toon primitives; the curtain as a `bentPlane` whose height function is the pleat profile; the dome lamp's glass emissive only when on (never in this scene).
- [ ] **Step 4: Run**; expected PASS. A temporary still of the room from the doorway (removed after) checked for clipping and against CONTINUITY's everyday imperfections (park ideas, don't build them).
- [ ] **Step 5: Commit** `"Tibik's bedroom: the bed, two lamps, the radiator under the window and the sand curtain"`.

### Task 5: Tibik lies down

**Files:**
- Modify: `src/characters/skeleton.ts` (`Placement`, `frames`), `src/characters/Body.tsx`, `src/physics/guards.ts` (`guardGround` reads the tilted colliders)
- Create: `src/characters/tilt.test.ts`, `src/props/blanketShape.ts`, `src/props/Blanket.tsx`, `src/props/blanket.test.ts`

**Interfaces:**
- Produces: `Placement.tilt?: number` — the whole body pitching back about a horizontal axis through the hips at `hipHeight` above `position` (π/2 = lying on his back, face up); with `tilt` undefined or 0 every matrix is exactly today's (no extra frame). `SITTING: TibikPose` (on a seat at `BED.top`), `LYING: TibikPose`. `blanketSurface(bed: { x0; x1; z0; z1; top }, body: readonly Sphere[], cover: number): (x: number, z: number) => number` (height of the fleece: at least the mattress top + 8 mm, above every body sphere by its radius + 1 cm where covered; `cover` 0 = folded at the foot, 1 = up to the chest); `<Blanket bed body cover />` (a `bentPlane` with that height function, `"#3b3f45"`).

- [ ] **Step 1: Write the failing tests:**
  - `tilt.test.ts` `"untilted, every collider is exactly where it was"`: `allColliders(RIG, c)` with `tilt` 0 deep-equals the result without `tilt`, for a walking and a standing frame.
  - `"tilted a quarter turn he lies on his back"`: head and hip colliders within 5 cm in height; the face direction points up (dot > 0.9).
  - `"lying on the mattress he rests on it, neither sunk in nor floating"` (Review Focus 3): after `guardGround` with the mattress as ground, the lowest body sphere touches the mattress top within 1 cm.
  - `blanket.test.ts` `"the blanket never passes through him or the mattress, outlines included"`: on a 40 × 40 grid, the surface is above the mattress top and above every covered body sphere by its radius + OUTLINE/2; `"pulled up it reaches his chest, folded it lies at the foot"`.
- [ ] **Step 2: Run**; expected FAIL.
- [ ] **Step 3: Implement**; the Papiertonnen end snapshot and every scene's physics tests stay byte-identical (tilt absent).
- [ ] **Step 4: Run** the new tests and the full suite; expected PASS.
- [ ] **Step 5: Commit** `"Tibik can sit on a bed and lie down, and a fleece blanket drapes over him"`.

### Task 6: The cameras, the drone rise included

**Files:**
- Modify: `src/scenes/hausmuell/cameras.ts` (move `dolly` here beside `fixed`), `src/scenes/rundschreiben/cameras.ts` (import it)
- Create: `src/scenes/nachtruhe/cameras.ts`, `src/scenes/nachtruhe/cameras.test.ts`

**Interfaces:**
- Produces: `NACHTRUHE_SHOTS` with names `"Dusk wide"` [0, 6), `"Bedroom: evening"` [6, 12), `"Drone rise"` [12, 20), `"Dawn"` [20, 23), `"Bedroom: morning"` [23, 29); `NACHTRUHE_DURATION = 29`; `{ shotAt, cameraAt } = camerasOf(NACHTRUHE_SHOTS)`; the two bedroom shots share one `fixed(…)` setup from the doorway; the drone rise is a `dolly` from first-floor height in front of No. 12 up past the parapet; "Dawn" holds the drone's last setup.

- [ ] **Step 1: Write the failing tests** in `cameras.test.ts` (solids: `worldSolids` plus roofs, balconies, the dish, the bedroom's solids):
  - `"the lens is never inside or against a solid"` (Review Focus 5 for the bedroom shots): every frame, `0.2 m` clearance from every solid, the bedroom door leaf at every angle included.
  - `"the drone opens on both first-floor windows and rises clear of the roof"`: at 12 s both `flatWindow(12,1,"links")` and `"rechts"` centres project inside the frame; at 20 s the camera is ≥ 3 m above the parapet top.
  - `"the key action stays near the centre, for a later vertical crop"`: at each shot's key moments (defined beside the shots: the Haustür at his entry, his window as it lights, the bed while he lies down and gets up, the window as the curtain opens) the point projects within |NDC x| ≤ 0.316.
  - `"evening and morning are filmed from the same place"`: the two bedroom shots' setups are equal.
- [ ] **Step 2: Run**; expected FAIL.
- [ ] **Step 3: Implement** the shots; `dolly` moves without changing its output (Rundschreiben's camera tests stay green).
- [ ] **Step 4: Run**; expected PASS.
- [ ] **Step 5: Commit** `"Nachtruhe's cameras: the dusk wide, the doorway view and the drone rise over the roofs"`.

### Task 7: Choreography and solve

**Files:**
- Create: `src/scenes/nachtruhe/choreography.ts`, `src/scenes/nachtruhe/solve.ts`, `src/scenes/nachtruhe/physics.test.ts`
- Modify: `src/scenes/rundschreiben/home.ts` and its choreography (extract the entry), `src/street/` (shared `sensorLampOn`)

**Interfaces:**
- Consumes: `tibikGaitOf`, `offTheEdges`, holds (`Hold`, `workArm`), guards, `enterHouse`, `sensorLampOn`, everything from Tasks 1–6.
- Produces: `enterHouse(start: number): { haustuerAt(t), holds: readonly Hold[], steps, ends: number }` — the epilogue's unlock, pull, step-aside and walk-in sequence parameterised by its start (the epilogue calls it with its own start and solves byte-identically); `sensorLampOn(rootAt: (t) => Vec3, range: number, t: number): boolean` (latches on, never off; the epilogue's `lampOnAt` uses it); `nachtruheAt(t: number): NachtruheState` with `tibik`, `haustuer`, `look: WeatherLook`, `stairwellLit: boolean`, `lamps: [boolean, boolean]` (far, his), `blanket: number`, `curtain: number`, `bedroomDoor: number`, `windowLight: (house, opening) => number`, `rain: boolean`; `solveNachtruhe = memoByFrame(…)`.
- Beats: dusk 0–6 (walk in from the west along the pavement, keys in hand, the entrance lamp by the sensor, the stairwell lit at ≈ 4.5 s for its timer's span, his window lit from ≈ 5.5 s); evening 6–12 (in through the bedroom door, round the bed's foot, the far lamp off, sit, lie, blanket to the chest, his lamp off by 11.5 s); night 12–20 (Karen's window lit until ≈ 18.5 s, others off by schedule); dawn 20–23 (`look` = `mixLooks(night, rain, k)`, `rain` from 20 s); morning 23–29 (eyes open, his lamp on, blanket back, sit up, get up, walk to the window, curtain open by 28.5 s).

- [ ] **Step 1: Write the failing tests** in `physics.test.ts`:
  - `"Tibik passes through nothing, outlines included"`: every frame, his colliders + OUTLINE against the bedroom solids, the bed, the cabinets, the lamps, the curtain, the doors and the street.
  - `"his hand is on the switch when a lamp clicks and on the curtain's edge while he pulls it"`: within 5 mm of the switch point at each press; of the curtain's leading edge while `curtain` rises.
  - `"the lights change in order"`: entrance lamp, stairwell, his window at dusk; the far lamp off before his own; his window dark when the drone opens; Karen's window last to go out.
  - `"his window glows exactly while a bedside lamp is on"` (Review Focus 4).
  - `"the dusk starts after Klingelsturm with nothing in his hands but his keys, and the morning leads into the epilogue"`: no parcel; at 29 s the world is the rain look and every lid shut.
  - The epilogue's tests stay green with `enterHouse` and `sensorLampOn` extracted.
- [ ] **Step 2: Run**; expected FAIL.
- [ ] **Step 3: Implement** the beats; gaits through `tibikGaitOf`; arm reaches through holds; lying through `tilt`.
- [ ] **Step 4: Run** the scene tests and the full suite; expected PASS.
- [ ] **Step 5: Commit** `"Nachtruhe's choreography: home at dusk, to bed, and up on the rainy morning"`.

### Task 8: The scene in the film, the caption moved

**Files:**
- Create: `src/scenes/nachtruhe/Nachtruhe.tsx`
- Modify: `src/timeline.ts`, `src/Film.tsx`, `src/Root.tsx`, `src/scenes/rundschreiben/Rundschreiben.tsx`, `src/scenes/rundschreiben/cameras.ts` (`CAPTION` moves), `src/scenes/rundschreiben/cameras.test.ts`, `src/scenes/rundschreiben/sounds.test.ts`, `docs/CONTINUITY.md`

**Interfaces:**
- Produces: `NACHTRUHE_FRAMES`, `NACHTRUHE_FROM`; `TIME_JUMPS` = Hausmuell→Klingelsturm, Klingelsturm→Nachtruhe, Nachtruhe→Rundschreiben; `filmIndoors` covers Nachtruhe (1 in the bedroom shots, 0 outside); `CAPTION = { text: "Zwei Wochen später.", from: 23, to: 26 }` exported from `src/scenes/nachtruhe/cameras.ts`; `<Nachtruhe ambience />` composition id `"Nachtruhe"`.

- [ ] **Step 1: Write the failing tests:**
  - `sounds.test.ts` `"the declared time jumps, and the film is its six scenes end to end"`: `TIME_JUMPS` holds the three jumps; `FILM_FRAMES` = the six scenes' sum; `RUNDSCHREIBEN_FROM` = `NACHTRUHE_FROM` + its frames.
  - `nachtruhe/cameras.test.ts` `"the time-jump caption is up for three seconds from the morning's first frame"`; `rundschreiben/cameras.test.ts` `"the epilogue's opening wide carries no caption"`.
- [ ] **Step 2: Run**; expected FAIL.
- [ ] **Step 3: Implement** `Nachtruhe.tsx` (Sky and lighting from `state.look`, `DayLight look`, `Street` with roofs, town, window lights, lamps on, `Bedroom`, `Tibik` with `tilt`, `Blanket`, `Rain` from the dawn on, `Caption` in a `Sequence` at `CAPTION`); wire the timeline, the film and the composition; remove the caption from Rundschreiben; CONTINUITY lists six scenes and the new time jumps.
- [ ] **Step 4: Run**; expected PASS. Stills of every Nachtruhe shot (start, middle, end) checked for clipping and the everyday-imperfections rule.
- [ ] **Step 5: Commit** `"Nachtruhe joins the film between Klingelsturm and the epilogue, and the caption moves to the morning"`.

### Task 9: Sound

**Files:**
- Create: `src/scenes/nachtruhe/soundCues.ts`, `src/scenes/nachtruhe/NachtruheSound.tsx`, `src/scenes/nachtruhe/sounds.test.ts`
- Modify: `src/sound/IndoorLoop.tsx` (`startAt` offset), `src/street/StreetAmbience.tsx` (`hush`), `src/scenes/rundschreiben/RundschreibenSound.tsx`, `public/sfx/CREDITS.md`, `public/sfx/` (new files)

**Interfaces:**
- Produces: `IndoorLoop({ …, startAt?: number })` — seconds into the loop at the component's first frame (default 0, today's behaviour); `StreetAmbience({ …, hush?: (frame: number) => number })` — 1 = today's levels, lower at dusk, near 0 at night; `NACHTRUHE_CUES: FileCue[]` (lamp clicks at each press, the fleece rustle, the curtain rings, the bedroom door, the Haustür as in the epilogue); `RAIN_FROM = 20` and the epilogue's rain `startAt` = (`NACHTRUHE_DURATION` − `RAIN_FROM`) mod the rain loop's length.
- Sources: a blackbird (CC0 / public domain; if none is found, stop and ask the user), Kenney CC0 switch and cloth sounds for the clicks and the rustle, a CC0 curtain-rings recording (or ask).

- [ ] **Step 1: Write the failing tests** in `sounds.test.ts`:
  - `"every cue has its file and every file is credited"`.
  - `"each click lands on the frame his hand presses the switch, the rings while the curtain moves"`.
  - `"the rain does not jump at the cut into the epilogue"` (Review Focus 1): the epilogue rain's `startAt` equals the rain's elapsed time at Nachtruhe's end modulo its length (`soundSeconds("rain.wav")`).
  - `"the street hushes for the night and wakes with the rain"`: `hush` decreases from dusk to night and is 1 again by the scene's end.
- [ ] **Step 2: Run**; expected FAIL.
- [ ] **Step 3: Implement**; find and credit the sources (ledger the search and licences).
- [ ] **Step 4: Run** the sound tests and the full suite; expected PASS.
- [ ] **Step 5: Commit** `"Nachtruhe's sound: a blackbird at dusk, a hushed night, and the rain that carries into the epilogue"`.

### Final review

- [ ] Review package over the plan's commits; a fresh reviewer on the most capable model with this plan's Review Focus and the ledger's rulings; fix Critical/Important findings test-first; ledger minors.
