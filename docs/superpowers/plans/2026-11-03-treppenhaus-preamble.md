# Treppenhaus Preamble Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the Treppenhaus scene (Tibik leaves his 1. OG flat, walks down the stairs and out of No. 12), give the scenes stable names, and re-stage the Papiertonnen opening so he comes out of the front door.

**Architecture:** The staircase is built inside the existing Wohnblock, in street coordinates, behind real openings cut into the facade. Every door is a hinged collision box shared by the renderer and the physics. The gait planner learns uneven ground (treads) and explicit foot targets. The new scene follows the existing scene pattern: choreography (story time), solve (guards, memoised per frame), cameras, a composition, sound, and a physics test file. A shot list maps film time to story time, so one cut can skip part of the walk.

**Tech Stack:** Remotion 4.0.540, @remotion/three, React Three Fiber 9.8.2, three 0.187, vitest 5.1 (`npm test` runs files one at a time), Node scripts for generated audio.

**Spec:** `docs/superpowers/specs/2026-11-03-treppenhaus-preamble-design.md`

## Global Constraints

- Everything visible is a pure function of time: no per-frame state, solvers memoised per frame (key `Math.round(t * 1000)`), gait plans built once at module level.
- Nothing passes through anything: every new solid goes into the collision model and the scene's violation check. Contact tolerance stays `TOLERANCE = 0.005` m. Outlines count: nothing may come within `OUTLINE` (0.014 m) of hiding another object's outline.
- Units are metres and radians, at 30 fps. Frame counts are derived from durations (`Math.round(DURATION * FPS)`).
- German norms from the spec: risers 0.175 m (EG flight) and 2.85/16 m (upper storeys), going (tread depth) 0.28 m, at most 18 risers per flight, handrail 0.90 m above the nosing line, headroom ≥ 2.0 m, flat door rough opening 1.010 m, lift on every floor landing.
- Sounds are Kenney CC0 files from `https://raw.githubusercontent.com/kapishdima/soundcn/main/assets/<pack>/<file>`, credited in `public/sfx/CREDITS.md`.
- Comments and names in plain English, matching the surrounding code. German only for in-world text (signs, nameplates).
- **Do not commit** unless the user asks (user rule). Each task ends with a checkpoint instead: `npx tsc --noEmit`, `npx eslint src`, and the task's tests.
- If a vitest worker dies with exit code 3221225477 (Windows 0xC0000005), re-run that test file on its own before treating it as a failure.
- Tibik's look (the plush changes) is out of scope.

## Review Focus

1. **Frames rendered out of order** (Studio scrubbing, parallel rendering) must give exactly the same picture as in order. Test in Task 6: solving the Treppenhaus frames in reverse order equals solving them forwards.
2. **Sunlight leaking through walls** would make the stairwell look like it's outdoors. Test in Task 4: the sun's shadow camera covers the whole staircase core, and every wall and facade piece casts shadows.
3. **The Haustür swinging shut through Tibik** as the door closer pulls it closed while he walks off. Test in Task 7: the door leaf is in the Papiertonnen violation check for every frame.
4. **Visible cracks between facade pieces** (sky showing through seams). Test in Task 2: the pieces and openings tile the wall exactly, with no gaps or overlaps.
5. **The ambience jumping at the cut through the door** (muffled sound still on outside, or restarting). Test in Task 8: indoors reaches 0 before the cut and stays 0 for the rest of the film.

---

### Task 1: Rename the scenes (mechanical)

**Files:**
- Move: `src/Scene1/` → `src/scenes/papiertonnen/` (`Scene1.tsx` → `Papiertonnen.tsx`, `Scene1Sound.tsx` → `PapiertonnenSound.tsx`; other files keep their names)
- Move: `src/Scene2/` → `src/scenes/hausmuell/` (`Scene2.tsx` → `Hausmuell.tsx`, `Scene2Sound.tsx` → `HausmuellSound.tsx`)
- Modify: `src/Root.tsx`, `src/Film.tsx`, `src/index.ts` (comment), `src/characters/gait.test.ts`, `docs/CONTINUITY.md`

**Interfaces (produces), the full rename map:**

| Old | New |
|---|---|
| `Scene1`, `Scene2` (components) | `Papiertonnen`, `Hausmuell` |
| `Scene1Sound`, `Scene2Sound` | `PapiertonnenSound`, `HausmuellSound` |
| `SCENE_DURATION` (papiertonnen), `SCENE2_DURATION` | `PAPIERTONNEN_DURATION`, `HAUSMUELL_DURATION` |
| `SCENE1_FRAMES`, `SCENE2_FRAMES` | `PAPIERTONNEN_FRAMES`, `HAUSMUELL_FRAMES` |
| `solveScene1`, `solveScene2` | `solvePapiertonnen`, `solveHausmuell` |
| `Scene1State`, `Scene2State` | `PapiertonnenState`, `HausmuellState` |
| `scene1End` | `papiertonnenEnd` |
| `sceneViolations`, `scene2Violations` | `papiertonnenViolations`, `hausmuellViolations` |
| `SCENE1_LAST`, `scene1TibikAt`, `scene1KartonAt` | `PAPIERTONNEN_LAST`, `papiertonnenTibikAt`, `papiertonnenKartonAt` |
| `scene1TibikGait`, `scene2TibikGait` | `papiertonnenTibikGait`, `hausmuellTibikGait` |
| Composition ids `Scene1-Papiertonnen`, `Scene2-Karen` | `Papiertonnen`, `Hausmuell` |
| Film sequence names "Scene 1: Papiertonnen", "Scene 2: Karen" | "Papiertonnen", "Hausmuell" |

`sceneSolids` keeps its name (it isn't numbered).

- [ ] **Step 1: Record the baseline.** Run `npm test` and note the counts (expected: 5 files, 70 tests passing). Render two reference stills with the old ids: `npx remotion still Scene1-Papiertonnen <scratch>/before-p.png --frame=150` and `npx remotion still Scene2-Karen <scratch>/before-h.png --frame=200`.
- [ ] **Step 2: Move the folders and files, apply the rename map everywhere** (code, comments, CONTINUITY.md, the spec's file references), and fix the import paths (one level deeper).
- [ ] **Step 3: Verify nothing moved.** `grep -rnE "Scene[12]|scene[12]|SCENE[12]_|SCENE_DURATION|sceneViolations" src docs` prints nothing (except the plan and spec, which describe the rename). `npm test` gives the same counts as Step 1, all passing. The same frames rendered with the new ids (`Papiertonnen` frame 150, `Hausmuell` frame 200) are byte-identical to the Step 1 stills (`cmp`).
- [ ] **Step 4: Checkpoint:** tsc and eslint clean.

### Task 2: Facade openings and the hinged Haustür

**Files:**
- Create: `src/street/facade.ts`, `src/building/doors.ts`, `src/street/facade.test.ts`
- Modify: `src/street/layout.ts` (solids), `src/street/Street.tsx` (wall, entrance, staircase window glass), every scene that renders `<Street>` or calls `worldSolids`

**Interfaces (produces):**
- `facade.ts`:
  - `type Rect = { x0: number; x1: number; y0: number; y1: number }`
  - `FACADE_THICKNESS = 0.4`
  - `DOORWAY: Rect`, the inside of the existing door frame: x = `ENTRANCE_X ± 0.575`, y = 0.15 … 2.45
  - `facadeOpenings(): Rect[]`, the doorway plus each `kind: "stairs"` opening, sized `STAIR_WINDOW.frame`
  - `facadePieces(): Part[]`, boxes covering the wall (x −15 … 15, y 0 … `BUILDING_HEIGHT`, z `FACADE_Z − FACADE_THICKNESS` … `FACADE_Z`) everywhere except the openings
- `doors.ts`:
  - `type Door = { name: string; hinge: Vec3; width: number; height: number; thickness: number; closedYaw: number; swing: 1 | -1 }`. `hinge` is the bottom of the hinge edge; `swing` is the sign of the yaw that opens the door.
  - `doorFrame(door: Door, angle: number): Matrix4`, the leaf's frame (origin at the hinge, +x along the leaf)
  - `doorLeaf(door: Door, angle: number): Obb`
  - `doorHandle(door: Door, angle: number, side: 1 | -1): Vector3`, the handle or knob on the given face
  - `HAUSTUER: Door`: width 1.1, height 2.26, thickness 0.05, hinged at x = `ENTRANCE_X − 0.55` (the side away from the street handle at `ENTRANCE_X + 0.42`), opening inwards (towards −z)
- `layout.ts`:
  - `STREET_SOLIDS` drops the `FACADE` half-space and the solid "door frame" part, and adds the facade pieces plus frame jambs and head as OBBs
  - `worldSolids(lids: readonly number[], haustuer = 0)` also returns `doorLeaf(HAUSTUER, haustuer)`
- `Street.tsx`: `Street` takes `{ haustuer?: number }` (default 0), and draws the leaf (with glass strip and handle) from `doorFrame(HAUSTUER, haustuer)`. Staircase windows get see-through glass (transparent toon material, opacity ≈ 0.3).

- [ ] **Step 1: Write the failing tests** in `src/street/facade.test.ts`:
  - `"facade pieces never cover an opening"`: every piece's rectangle overlaps no opening by more than 1e-9 m².
  - `"pieces and openings tile the wall exactly"`: the sum of piece areas plus opening areas equals 30 × `BUILDING_HEIGHT` (±1e-6), and no two pieces overlap.
  - `"the shut Haustür fills the doorway, the open one leaves room to walk through"`: a sphere (radius 0.4) at the doorway centre (y 1.0) collides with `doorLeaf(HAUSTUER, 0)` and with no street solid at angle 1.4 rad.
  - `"the Haustür opens inwards"`: the centre of `doorLeaf(HAUSTUER, 1.0)` has z < `FACADE_Z − FACADE_THICKNESS`.
- [ ] **Step 2: Run** `npx vitest run src/street/facade.test.ts`. Expected: FAIL (module not found).
- [ ] **Step 3: Implement** `facade.ts`, `doors.ts` and the `layout.ts` changes. Pieces come from splitting the wall into columns at every opening's x edges, then each column into rows at the openings' y edges.
- [ ] **Step 4: Run the facade tests.** Expected: PASS.
- [ ] **Step 5: Update `Street.tsx`, and pass `haustuer` through the scenes** (0 everywhere for now). Run `npm test`: all existing scene tests still pass (the lid stops against the wall pieces at the same angle as against the half-space, ±0.01 rad).
- [ ] **Step 6: Render** `Papiertonnen` frame 0 and `Hausmuell` frame 30, and check that the facade looks unchanged apart from the glass, with no seams.
- [ ] **Step 7: Checkpoint.**

### Task 3: Staircase geometry and collision model (pure data)

**Files:**
- Create: `src/building/stairwell.ts`, `src/building/stairwell.test.ts`

**The geometry** (street coordinates; the facade's inner face is at z = −2.6):

| Part | Values |
|---|---|
| Core | x −3.2 … −0.6, z −2.6 … −10.0. Lane A x −3.2 … −1.9 (flights going up towards the back), lane B x −1.9 … −0.6 (flights going up towards the facade) |
| EG hallway | floor y 0.15, from the facade to the EG flight in lane A, and the whole of lane B |
| EG flight | lane A, 18 risers × 0.175, 17 treads × 0.28; first riser at z = −3.8 (clear of the Haustür's swing), last at z = −8.56, onto the 1. OG landing (y 3.3) |
| Upper storeys | half landing at the facade (z −2.6 … −4.0, both lanes) at `floorLevel(n) + 1.425`; lane B flight from the floor landing (z −5.96) up to the half landing; lane A flight from the half landing up to the next floor landing; 8 risers × 2.85/16 and 7 treads × 0.28 each |
| Floor landings | lane B z −5.96 … −10.0; lane A z −8.56 … −10.0 on the 1. OG, −5.96 … −10.0 above it. Railing along the edge of each stairwell opening |
| Flat doors | 1. OG: Tibik's on the lane A side wall (x −3.2, centre z −9.3, "1. OG links"), the neighbour's opposite (x −0.6, z −9.3). Rough opening 1.010 × 2.135 m, opening into the flat |
| Lift | shaft behind the back wall (z −10.0 … −11.6, x −2.7 … −1.1), stainless doors 0.9 × 2.0 m on every floor landing |
| His Flur | a small lit volume behind his door (x −4.6 … −3.2, z −9.9 … −8.7). Walls and warm light only, no furniture |
| Handrail | wall-mounted on lane A's outer wall (x −3.14), 0.90 m above the nosing line; balustrade with steel bars along the lane edges |
| Walls, slabs | 0.2 m slabs under every landing and flight; walls 0.2 m thick |

**Interfaces (produces):**
- `type Tread = { center: Vec3; size: Vec3; top: number; flight: string }`, with the nosing on the downhill side
- `TREADS: readonly Tread[]` (every walkable tread and landing, as boxes)
- `stairwellGround(x: number, z: number): number`, the height of the walkable surface (the highest tread or landing top under (x, z), or 0.15 in the hallway; outside the core it delegates to the street: 0.15 on the door step, else 0)
- `HANDRAIL: { from: Vec3; to: Vec3 }[]`, the rail's centreline segments
- `TIBIK_DOOR: Door`, `NEIGHBOUR_DOOR: Door`, `LIFT_DOORS: Door[]` (built with `doors.ts`)
- `stairwellSolids(doors: { tibik: number }): Solid[]`: treads and landings, slabs, walls, the balustrade and handrail, the doors at their angles, the lift doors shut
- `HALF_LANDINGS: { y: number; z0: number; z1: number }[]`

- [ ] **Step 1: Write the failing tests** in `src/building/stairwell.test.ts`:
  - `"every flight follows the norms"`: risers 0.175 or 2.85/16 (±1e-9), going 0.28, at most 18 risers.
  - `"the staircase windows sit above the half landings"`: for every `kind: "stairs"` opening above 3.45 m, a half landing exists with `opening.y − landing.y` = 1.575 (±0.01), and the window's x range lies within the core. The lowest window (centre 3.45) lies over the EG hallway.
  - `"headroom is at least 2 m everywhere you can walk"`: sample (x, z) on a 5 cm grid over every tread, landing and the hallway. The underside of whatever is above is ≥ 2.0 m over `stairwellGround`.
  - `"the Haustür swings open without hitting the stairs"`: `doorLeaf(HAUSTUER, a)` for a in 0 … 1.5 touches no tread or slab (`boxGap > 0`).
  - `"his door is 1010 mm wide and opens into the flat"`: leaf width 0.985 (±0.01). At angle 1.2 the leaf centre's x < −3.2.
  - `"ground is continuous along the walking line"`: `stairwellGround` along lane A's centre from the 1. OG landing to the hallway changes by at most one riser between samples 1 cm apart.
- [ ] **Step 2: Run** `npx vitest run src/building/stairwell.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** `stairwell.ts` with the table's values, deriving each flight's treads from (first riser z, direction, riser height, count).
- [ ] **Step 4: Run the tests.** Expected: PASS.
- [ ] **Step 5: Checkpoint.**

### Task 4: Drawing the staircase, and its light

**Files:**
- Create: `src/building/StairwellSet.tsx`, `src/building/StairwellLighting.tsx`, `src/building/StairwellSheet.tsx` (a review Still), `src/building/lighting.test.ts`
- Modify: `src/street/StreetSet.tsx` (export the sun's settings), `src/Root.tsx` (Still `Treppenhaus-Set` in a "Sets" folder)

**Interfaces:**
- Consumes: everything from Task 3; `Door`, `doorFrame` from Task 2
- Produces:
  - `SUN: { position: Vec3; intensity: number; shadow: { left: number; right: number; top: number; bottom: number; near: number; far: number; mapSize: number } }` in `StreetSet.tsx`. `StreetLighting` uses it, and the bounds grow to cover the core.
  - `StairwellSet: React.FC<{ tibikDoor: number; lights: number }>`, where `lights` (0 … 1) is the Treppenhauslicht
  - `StairwellLighting: React.FC<{ lights: number }>`: `SUN`, a hemisphere light at about a quarter of the street's, one ceiling lamp per landing scaled by `lights`, and warm light in his Flur
  - `STAIRWELL_WALLS_CAST_SHADOWS = true`. Every wall, slab and facade piece mesh has `castShadow` and `receiveShadow`, read from this one constant.

**Details to draw:**
- grey terrazzo (a speckled `drawnTexture`)
- wall paint: a darker washable Ölsockel up to 1.4 m (a muted green-grey), white above
- wooden handrail on steel bars
- doors: wood, with spyhole, doorbell button and nameplate; „Tibik" on his (from `RESIDENTS`)
- orange glowing light buttons, glowing even when the lights are off
- milk-glass ceiling lamps
- in the hallway, a board with „Hausordnung" and „Reinigungsplan — Treppenhausreinigung diese Woche: 1. OG links"
- the inside of the Haustür: door closer arm, and the sign „Bitte Haustür geschlossen halten"
- coir doormats, and one pair of the neighbour's shoes on theirs

- [ ] **Step 1: Write the failing tests** in `src/building/lighting.test.ts`:
  - `"the sun's shadow camera covers the whole staircase"`: transform the core's 8 corners (y 0 … 7) into the sun's view space (looking from `SUN.position` at the origin). Every corner lies within `SUN.shadow` left/right/top/bottom and near/far.
  - `"walls cast shadows"`: `STAIRWELL_WALLS_CAST_SHADOWS === true`, and `facadePieces()` are drawn by a component that reads it. Assert on the exported flag; the component reading it is checked in review.
- [ ] **Step 2: Run them.** Expected: FAIL.
- [ ] **Step 3: Implement** the set, the lighting and the Still, and update `StreetLighting` to use `SUN`.
- [ ] **Step 4: Run the tests.** Expected: PASS. Run `npm test`: the street scenes still pass. Shadows only look different if the bounds changed their resolution; check a Papiertonnen still.
- [ ] **Step 5: Render the Still from three viewpoints** (his landing, looking up the flight from the hallway, the hallway towards the door). Check that no sunlight comes through walls, that the window light falls on the half landings, and that the details read.
- [ ] **Step 6: Checkpoint.**

### Task 5: Stairs in the gait planner

**Files:**
- Modify: `src/characters/gait.ts`, `src/characters/gait.test.ts`

**Interfaces (produces):**
- `type Ground = (x: number, z: number) => number` and `FLAT_GROUND: Ground = () => 0`
- `RootAt` results get an optional `y` (the body's base height; default 0)
- `Step` gets optional `at?: { x: number; z: number }`, the world position of the ankle for that landing, instead of the root-derived one
- `planGait(skeleton, style, root, steps, span, ground: Ground = FLAT_GROUND)`:
  - each plant's ankle y = `ground(x, z)` + the rest ankle height
  - `reachLimit` adds `root(t).y`
- **Swing over uneven ground:** the swinging foot's lowest point stays at least the swing clearance above `ground` everywhere under its heel and toe, along the whole path. It lands exactly on its plant (continuous). Going down, it first moves forward past the nosing, then drops.

- [ ] **Step 1: Write the failing tests.** Add to `src/characters/gait.test.ts` a synthetic staircase (`ground` = 0.175 × number of 0.28 m treads passed, descending along +z), Tibik's skeleton, and steps landing on tread centres with `at`:
  - `"on stairs, every planted sole rests on its tread"`: at the middle of each stance, the sole's lowest point is within 3 mm of `ground` at the ankle, and at least 70% of the sole's length is over that tread (overhang only past the nosing, never into the riser behind).
  - `"on stairs, a swinging foot never passes through a step"`: sample every 1/240 s. The heel and toe ends' lowest points are ≥ `ground` under them − 1 mm.
  - `"on stairs, a foot lands without jumping"`: ankle movement between consecutive frames (1/30 s) ≤ 0.06 m, and ≤ 3 mm across each landing frame.
  - `"on stairs, knees stay human"`: knee angle in 0 … `MAX_KNEE` and ahead of the hip–ankle line, for every frame.
  - `"flat ground is unchanged"`: a plan built with the explicit `FLAT_GROUND` equals one built without the argument, for the Papiertonnen steps (deep-equal plants).
- [ ] **Step 2: Run** `npx vitest run src/characters/gait.test.ts`. Expected: the new tests FAIL, the old ones PASS.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** the gait tests, then `npm test`. Expected: all PASS, with existing scene results unchanged.
- [ ] **Step 5: Checkpoint.**

### Task 6: The Treppenhaus scene

**Files:**
- Create in `src/scenes/treppenhaus/`: `choreography.ts`, `solve.ts`, `cameras.ts`, `Treppenhaus.tsx`, `TreppenhausSound.tsx` (light switch and door sounds come in Task 8; footsteps here), `physics.test.ts`
- Modify: `src/Root.tsx` (composition `Treppenhaus`, first in "Scenes")

**Interfaces:**
- Consumes: `TibikFrame` and `KartonState` types from `scenes/papiertonnen/choreography.ts`; `holdKarton` is not used (no box yet); gait (Task 5), stairwell (Task 3), doors (Task 2), `guardGround/guardBody/guardLean/guardArm/characterViolations` (`physics/guards.ts`), `reachArm` (`physics/grip.ts`)
- Produces:
  - `TREPPENHAUS_DURATION` (film seconds, 12)
  - `SHOTS: { name: string; from: number; to: number; story: number; at: (storyT: number) => CameraSetup }[]`, where `story` is the story time at the shot's start
  - `storyTime(filmT: number): number`
  - `STORY_END`
  - `tibikAt(storyT): TibikFrame`, `tibikDoorAt(storyT)`, `haustuerAt(storyT)`, `lightsAt(storyT)` (0 … 1)
  - `treppenhausTibikGait()`, `footstepStoryTimes()`
  - `solveTreppenhaus(storyT): TreppenhausState = { tibik: TibikFrame; tibikDoor: number; haustuer: number; lights: number }`
  - `treppenhausEnd()`: `solveTreppenhaus(STORY_END)`
  - `treppenhausViolations(state): Contact[]`
  - `railGap(state): number`, the rail hand's distance to the handrail
  - `clearTreppenhausCache(): void` (tests only: empties the per-frame memo)
  - Camera setups use `CameraSetup` from `scenes/hausmuell/cameras.ts`
- **Story beats** (story time; the film skips part of the walk at the cut from shot 3 to 4):
  - door opens 0.3–1.0
  - he steps out and turns
  - pulls the door shut 2.4–3.0 (*klack*)
  - presses the light button at 3.6 (lights 0 → 1 over 0.2 s)
  - starts down at 5.5, about 0.5 s per step, right hand on the rail
  - reaches the hallway, then: Haustür opens 0.4 s after he reaches it, he steps through, and story ends with him on the threshold, facing +z, the door open about 1.3 rad
- **Shots:** 1 his door (film 0–3.5), 2 the light switch (3.5–5.5), 3 the long flight from the hallway (5.5–8.5), 4 out the door from behind him (8.5–12). Shot 4's `story` is chosen so that 3.5 s of film reaches `STORY_END`.
- **Solver order per frame:**
  1. `guardBody` and `guardLean` against `stairwellSolids` plus the Haustür leaf
  2. `guardArm` for both arms
  3. the right arm reaches for the nearest handrail point ahead of the shoulder, while on the flight
  4. `plantFeet` last

  Memoised per story time.

- [ ] **Step 1: Write the failing tests** in `physics.test.ts`, over every story frame from 0 to `STORY_END` (1/30 s):
  - `"treppenhaus: nothing passes through anything, in any frame"`: `treppenhausViolations` deeper than `TOLERANCE` is empty.
  - `"planted feet rest on treads and don't slide"`: as in Task 5's stair tests, but on the solved states. Planted ankles move < 3 mm per frame.
  - `"his hand slides along the handrail"`: `railGap(state) ≤ TOLERANCE` for every frame on the flight.
  - `"cameras never sit inside or against a wall"`: for every film frame, the camera position is outside every solid, with ≥ 0.05 m clearance (the near plane's half-diagonal plus margin).
  - `"frames solved in any order give the same result"`: solve every 5th frame in reverse, then forwards with fresh caches (export a `clearTreppenhausCache()` for tests), and deep-equal the states.
  - `"the film never shows a story moment twice or skips inside a shot"`: `storyTime` increases strictly, and within each shot by exactly the film time.
- [ ] **Step 2: Run** `npx vitest run src/scenes/treppenhaus/physics.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** choreography, solve, cameras, the composition (`<Sky>`, `ThreeCanvas`, `StairwellLighting`, `Street haustuer`, `StairwellSet`, `Tibik`; story time from `storyTime(frame / fps)`), and footsteps (`footstep_concrete_*`, every planted step in the shown story times).
- [ ] **Step 4: Run the tests.** Expected: PASS.
- [ ] **Step 5: Render** one still per shot (and the frame before and after the cut). Check them against the spec's shot list.
- [ ] **Step 6: Checkpoint.**

### Task 7: Papiertonnen opens at the front door; the Film gets the new scene

**Files:**
- Modify: `src/scenes/papiertonnen/choreography.ts`, `solve.ts`, `Papiertonnen.tsx` (opening camera), `PapiertonnenSound.tsx`, `physics.test.ts`; `src/Film.tsx`, `src/Root.tsx`

**Interfaces:**
- Consumes: `treppenhausEnd()`, `haustuerAt`, `HAUSTUER`, `stairwellGround` (for the door step)
- Produces:
  - `PAPIERTONNEN_DURATION` = 12.0 (+1.5 s)
  - `papiertonnenHaustuerAt(t)`: from the Treppenhaus's last angle, the door closer swings it shut, easing out, latched by t ≈ 2.0
  - `TREPPENHAUS_FRAMES`, and `Film` as `<Series>` of Treppenhaus → Papiertonnen → Hausmuell

- [ ] **Step 1: Pin the end state before changing anything.** Add the test `"papiertonnen ends exactly as before the re-staging"`, comparing `papiertonnenEnd()` (lids, Tibik's position, rotation and pose, the karton) against a snapshot taken now (`expect(...).toMatchSnapshot()`, stored next to the test in `__snapshots__`). Run it: PASS (it writes the snapshot).
- [ ] **Step 2: Write the failing hand-off test:** `"papiertonnen starts exactly where the treppenhaus ends"`. Tibik's position, rotationY and every pose value (legs included) are within 1e-4 of `treppenhausEnd()`, and `papiertonnenHaustuerAt(0) === treppenhausEnd().haustuer`. Run: FAIL.
- [ ] **Step 3: Re-stage the opening.**
  - He starts on the threshold, steps onto the door step (ground 0.15) and down to the pavement, turns right (yaw → π/2), and joins the walking line z −0.75 to the bin.
  - Every later beat (lid, finding the box, holding it, turning to the camera, footstep and sound times, cameras after the opening) shifts by +1.5 s.
  - The planner gets `stairwellGround` as its ground.
  - The Haustür leaf goes into `papiertonnenViolations` (Review Focus 3).
  - The opening crane shot starts on the door of No. 12, from the street side.
- [ ] **Step 3b: Add the frame counts.** `TREPPENHAUS_FRAMES`, and update `PAPIERTONNEN_FRAMES` via the duration. The Film and Root use them; the Film plays all three scenes.
- [ ] **Step 4: Run** `npm test`. Expected: the snapshot test, the hand-off test and every existing Papiertonnen/Hausmuell test PASS.
- [ ] **Step 5: Render** the cut: Film frames at the last Treppenhaus frame and the first Papiertonnen frame. The movement continues in the same screen direction, and the door angle matches.
- [ ] **Step 6: Checkpoint.**

### Task 8: Sound indoors, and across the cut

**Files:**
- Modify: `scripts/make-ambience.mjs`, `src/street/StreetAmbience.tsx`, `src/Film.tsx`, `src/scenes/treppenhaus/TreppenhausSound.tsx`, `src/scenes/papiertonnen/PapiertonnenSound.tsx`, `public/sfx/CREDITS.md`
- Create: `src/building/StairStep.tsx`, `src/street/ambience.test.ts`
- Download into `public/sfx/`:
  - `kenney_rpg-audio/doorOpen_1.ogg` (Haustür opening)
  - `kenney_rpg-audio/doorClose_4.ogg` (Haustür pulled shut by the closer)
  - `kenney_rpg-audio/doorClose_1.ogg` (his flat door pulled shut)
  - `kenney_rpg-audio/metalLatch.ogg` (the knob latching)
  - `kenney_interface-sounds/switch_002.ogg` (light button)

**Interfaces (produces):**
- `make-ambience.mjs` also writes `street-atmosphere-muffled.wav` and `street-traffic-muffled.wav`: the same samples through a 2-pole low-pass at 450 Hz, −12 dB, same length, so they stay in sync with the full loops.
- `StreetAmbience: React.FC<{ indoors?: (frame: number) => number }>` (0 = outside, 1 = inside; default outside). The full loops play at `volume × (1 − indoors)`, the muffled ones at `volume × indoors`.
- `treppenhausIndoors(storyT): number`: 1 until the Haustür opens, then `1 − smooth(angle / 1.0)`, reaching 0 when it is 1.0 rad open
- `filmIndoors(filmFrame): number` in `Film.tsx`: Treppenhaus frames map through `storyTime`; 0 from the first Papiertonnen frame on
- `StairStep: React.FC<{ frame: number; index: number; volume?: number }>`: a footstep on stone, plus echoes 2 frames later (×0.35) and 5 frames later (×0.15)

- [ ] **Step 1: Write the failing tests** in `src/street/ambience.test.ts`:
  - `"indoors is fully muffled until the Haustür opens"`: `treppenhausIndoors(t) === 1` for every story frame before the door starts opening.
  - `"the street is fully open before the cut and stays open"`: `filmIndoors(TREPPENHAUS_FRAMES − 1) === 0`, and `filmIndoors(f) === 0` for every later film frame.
  - `"indoors never jumps"`: consecutive film frames inside Treppenhaus differ by ≤ 0.15.
- [ ] **Step 2: Run them.** Expected: FAIL.
- [ ] **Step 3: Implement.**
  - The generator: run `node scripts/make-ambience.mjs` and check that four files are written.
  - `StreetAmbience`'s two-layer crossfade.
  - `Film` passes `filmIndoors`.
  - The Treppenhaus sounds: his door *klack* plus latch, the switch, `StairStep` for steps on the stairs and in the hallway, and the Haustür opening.
  - In Papiertonnen: the closer's *whump* (`doorClose_4`) at the moment the door latches.
  - Update `CREDITS.md`, adding the files and the RPG Audio and Interface Sounds packs.
- [ ] **Step 4: Run the tests.** Expected: PASS.
- [ ] **Step 5: Render the Film's audio** across the Treppenhaus → Papiertonnen cut as WAV (`--codec=wav --frames=<cut−90>-<cut+60>`). Measure per 0.25 s window: no jump of more than 3 dB in the ambience bed at the cut. The stair steps and door sounds stand out by at least 8 dB.
- [ ] **Step 6: Checkpoint.**

### Task 9: Review renders and docs

**Files:**
- Modify: `docs/CONTINUITY.md` (scenes by name, staircase facts: his flat is 1. OG links, the lift, the door and closer behaviour; the deferred key stays open), the memory file `tibik-film-plan.md` (scene list)

- [ ] **Step 1: Run** `npm test`, `npx tsc --noEmit` and `npx eslint src`. All clean.
- [ ] **Step 2: Render review stills:** every shot of Treppenhaus (start, middle, end), the cut into Papiertonnen, and Papiertonnen's re-staged opening at 0, 1, 2 and 3 s. Put them side by side in one contact sheet for the user.
- [ ] **Step 3: Update the docs.**
- [ ] **Step 4: Report** to the user with the contact sheet, the test counts, and anything that deviated from the spec.
