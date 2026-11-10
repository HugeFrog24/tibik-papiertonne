# Rundschreiben Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Append the epilogue „Rundschreiben" to the film: two weeks later, in the rain, Tibik takes the Hausverwaltung's circular from his mailbox, reads it (readable inserts, „Vie-len DANK." four times), folds it back into its envelope, kloppt it into the blue Papiertonne and goes inside.

**Architecture:** A new scene module `src/scenes/rundschreiben/` built like the other scenes (choreography → solve with guards → cameras → view → sound), appended to the film as the second declared time jump. The shared street set gains a `weather` value instead of being copied; rain, the overcast look, the mailbox door and the paper props are new units in `src/weather/`, `src/street/` and `src/props/`.

**Tech Stack:** Remotion 4, @remotion/three, React Three Fiber, three, vitest 5, Node scripts.

**Spec:** `docs/superpowers/specs/2026-11-04-rundschreiben-design.md`

**Workspace and ledger:** `.superpowers/sdd/2026-11-04-rundschreiben/progress.md` (first line names this plan).

## Global Constraints

- No duplicated general code (user's rule): the facade, cars, mailboxes, bins, trees, lamps, lighting and ambience come from the shared components and data (`<Street>`, `<StreetLighting>`, `<Sky>`, `<BinRow>`, `<StreetAmbience>`, `worldSolids`); the epilogue extends them through props. jscpd strict at 50 tokens reports no new clone involving the new files.
- The shared pieces' new props default to today's behaviour: the four existing scenes render pixel-identical and solve byte-identical (stills with `node scripts/stills.mjs`, compared before/after with `git stash`; solved states with the scratchpad snapshot probe).
- German copy exactly as in the spec, including „Vie-len DANK." four times on one line and „Zwei Wochen später." as the caption.
- Everything is a pure function of time; randomness only through Remotion `random(seed)` with stable seeds; solvers go through `memoByFrame`.
- No clipping anywhere, ink outlines included (OUTLINE = 14 mm for characters and props unless a prop sets its own ink).
- On Windows a data module must not share a case-insensitive name with a component in the same folder: `mailboxDoorShape.ts` beside `MailboxDoor.tsx`, `rainDrops.ts` beside `Rain.tsx`, `letterShape.ts` beside `Letter.tsx`.
- No code comments; run `node scripts/strip-comments.mjs` before every commit. Commit and push to `main` as HugeFrog24, no AI/Claude/Co-Authored-By trailers.
- Tests run through `node scripts/test.mjs` (retries crashed Node 26 workers); stills through `node scripts/stills.mjs <Composition> <dir> <frames…>`.
- Each task ends with tsc, eslint, the touched tests green, stills of the affected shots checked for clipping, a commit and a ledger line.

## Review Focus

1. A raindrop born right in front of the lens draws a streak across the frame: no drop is drawn within `RAIN.nearCamera` of the camera. Pinned in Task 2.
2. Rain inside the building: no drop is ever drawn behind the facade plane (inside No. 12) or under the Haustür's lintel. Pinned in Task 2.
3. Sound at the time jump: no Klingelsturm cue runs past its scene's end, and the rain loop starts exactly at the cut. Pinned in Task 8.
4. The envelope's flight into the bin: it passes through the lid opening, never through the bin wall or the lid's ink, and rests on the empty bin's floor under the shut lid. Pinned in Task 6.
5. The entrance lamp once on stays on (no flicker as Tibik moves in and out of the sensor's range). Pinned in Task 6.

---

### Task 1: Weather on the shared street set

**Files:**
- Create: `src/weather/overcast.ts`, `src/weather/overcast.test.ts`
- Modify: `src/street/StreetSet.tsx` (`StreetLighting`, `Sky`, `BinRow`), `src/street/Street.tsx` (`Street`, `EntranceLamp`, paving and asphalt materials), `src/street/Asphalt.tsx` if its material colour is set there

**Interfaces:**
- Produces: `type Weather = "sunny" | "rain"`; `WEATHER: Readonly<Record<Weather, WeatherLook>>` with `WeatherLook = { sky: readonly [string, string]; hemisphere: { sky: string; ground: string; intensity: number }; sun: { intensity: number; shadows: boolean }; wetTint: string | null }`; `PUDDLES: readonly { x: number; z: number; rx: number; rz: number }[]`.
- Produces: `StreetLighting({ weather?: Weather })`, `Sky({ weather?: Weather; children })`, `BinRow({ lids, boxTaken, emptied?: boolean })`, `Street({ …existing, weather?: Weather; lampOn?: boolean; mailboxDoor?: number })` (`mailboxDoor` is wired in Task 3).

- [ ] **Step 1: Write the failing tests** in `src/weather/overcast.test.ts`:
  - `"sunny is today's street, value for value"`: `WEATHER.sunny.sky` equals `["#8ecdf0", "#cfeaf7"]`; hemisphere `{ sky: "#ffffff", ground: "#b5ad9c", intensity: 1.7 }`; `sun.intensity` equals `SUN.intensity`; `sun.shadows` true; `wetTint` null.
  - `"the rainy day is overcast: grey sky, weak sun, sky light dominant"`: both rain sky colours have HSL saturation < 0.15; `rain.sun.intensity <= 0.3 * sunny.sun.intensity`; `rain.hemisphere.intensity >= sunny.hemisphere.intensity`.
  - `"wet ground is darker"`: `wetTint` relative luminance < 0.7.
  - `"puddles lie on open pavement or along the kerb, never in a tree pit, under a car, on the step or the entrance mat"`: each puddle's ellipse footprint overlaps none of `treePit(x)` for `STREET_TREE_XS`, `tyreFootprints`/car footprints, `partFootprint(ENTRANCE_STEP)`; use `overlap`/`footprint` from `src/street/footprint.ts`.
- [ ] **Step 2: Run** `node scripts/test.mjs src/weather/overcast.test.ts`; expected FAIL (module missing).
- [ ] **Step 3: Implement** `overcast.ts` (values: rain sky `["#8d949b", "#b9bfc4"]`, hemisphere `{ sky: "#d9dde0", ground: "#6f7377", intensity: 2.1 }`, sun `{ intensity: 0.45, shadows: false }`, `wetTint: "#9a9fa3"`; five puddles chosen by the test). In the components, read `WEATHER[weather]`; with `weather` omitted every element and prop stays exactly what it is today (no new JSX nodes, no new material props). `Street` with `weather="rain"` tints the paving and asphalt materials with `wetTint` and draws `PUDDLES` as darker `Decal` ellipses (polygon offset as other decals). `lampOn` makes `EntranceLamp`'s glass emissive warm white and adds one small point light (range 4 m). `BinRow` with `emptied` draws no bin contents.
- [ ] **Step 4: Run** the tests; expected PASS.
- [ ] **Step 5: Prove nothing else moved:** render `Film` frames 120, 460, 1220 and `Klingelsturm` 1500 with and without the change (`git stash`): no differing pixel.
- [ ] **Step 6: Commit** `"The street set knows a rainy day: overcast light, wet ground, puddles, the entrance lamp on, emptied bins; the sunny scenes are unchanged"`.

### Task 2: Rain that stops where it lands

**Files:**
- Create: `src/weather/rainDrops.ts`, `src/weather/rainDrops.test.ts`, `src/weather/Rain.tsx`

**Interfaces:**
- Consumes: `Solid`, `Sphere`, `collide` from `src/physics/collision.ts`; `FACADE_Z`, `DOORWAY` from `src/street/facade.ts`; the film's wind direction from `src/physics/wind.ts` (`windIn`).
- Produces: `RAIN = { perSquareMetre: 1.2, speed: 8, streak: 0.24, top: 16, radius: 10, slant: 0.12, nearCamera: 0.4, splash: 0.12 }` (streaks in view per m² of ground, m/s, streak length m, spawn height m, horizontal radius round the focus m, horizontal drift per metre of fall, keep-out round the camera m, splash life s); `type Drop = { id: number; head: Vec3; tail: Vec3; splash: { at: Vec3; age: number } | null }`; `firstSurfaceBelow(x: number, z: number, top: number, solids: readonly Solid[], bodies: readonly Sphere[]): { y: number; open: boolean }`; `rainAt(t: number, focus: Vec3, camera: Vec3, solids: readonly Solid[], bodies: readonly Sphere[]): Drop[]`; `<Rain drops={…} />`.

- [ ] **Step 1: Write the failing tests** in `rainDrops.test.ts`, against `worldSolids` with all lids 0 and Tibik's `bodyColliders` at a fixed pose standing at (−2.6, 0, −0.9):
  - `"every streak ends at the first surface below it and never enters a solid"`: for t in [0.5, 7.25, 20], every drop's `tail.y >= firstSurfaceBelow(…).y - 1e-9`, and 8 points along head→tail lie in no solid (`collide(sphere(p, 0.001), solid)` null for every solid and body).
  - `"under a balcony it stays dry"`: for points under each `BALCONIES` slab (x within the slab, z between facade and slab edge), `firstSurfaceBelow` returns the slab's top; no drop in `rainAt` has a tail below it there.
  - `"rain never falls inside the house or in the doorway"` (Review Focus 2): no head or tail with z < `FACADE_Z` or inside the `DOORWAY` box.
  - `"no drop right in front of the lens"` (Review Focus 1): every head and tail is at least `RAIN.nearCamera` from `camera`.
  - `"Tibik keeps the ground under him dry"`: drops whose x,z lie inside a body sphere's footprint stop on that sphere (`open` false), not on the ground.
  - `"a splash only where a drop meets open ground"`: `splash` non-null only when `open` is true, at the stop point, with `age` in [0, RAIN.splash].
  - `"the same instant is the same rain, in any order"`: `rainAt(7.25, …)` deep-equals itself after calling `rainAt` at 20 and 0.5 in between.
  - `"steady summer rain, not a storm"`: drops whose head is over open ground within `RAIN.radius` of the focus number `RAIN.perSquareMetre × π × radius²` ± 15 %.
- [ ] **Step 2: Run** `node scripts/test.mjs src/weather/rainDrops.test.ts`; expected FAIL.
- [ ] **Step 3: Implement** `rainDrops.ts`. Each drop id has a seeded column (x, z in the disc round the focus) and a seeded phase; its height falls from `top` at `speed`, drifting along the wind direction by `slant` per metre; when the head passes `firstSurfaceBelow`, the drop is reborn at the top on its next cycle and leaves a splash for `RAIN.splash` s if `open`. `firstSurfaceBelow` casts straight down: half-spaces give their plane, OBBs the highest top face over (x, z), spheres the top of their cap. Drops in solids' shadow (under slabs) never reach the ground. `Rain.tsx` draws streaks as one instanced thin quad mesh (transparent pale blue-grey, depth-tested, no ink) and splashes as small rings.
- [ ] **Step 4: Run** the tests; expected PASS.
- [ ] **Step 5: Commit** `"Rain falls with the breeze and stops on the first surface below each drop: ground, slabs, cars, lids or Tibik; seeded, so every frame renders the same"`.

### Task 3: Tibik's mailbox door

**Files:**
- Create: `src/street/mailboxDoorShape.ts`, `src/street/mailboxDoor.test.ts`, `src/street/MailboxDoor.tsx`
- Modify: `src/street/Street.tsx` (`Mailboxes` draws `<MailboxDoor angle>` when `Street`'s `mailboxDoor` is defined)

**Interfaces:**
- Consumes: `MAILBOX_GRID`, `mailboxCell`, `mailboxPlate`, `MAILBOXES`, `RESIDENTS` from `src/street/layout.ts`.
- Produces: `MAILBOX_DOOR = { resident: "Tibik", hinge: "left", open: number, thickness: 0.002, lift: 0.001, lock: { u: number; v: number } }`; `mailboxDoorFrame(angle: number): Matrix4`; `mailboxDoorSolid(angle: number): Obb`; `mailboxKeyhole(): Vec3` (world, on the closed door's face); `mailboxInside(): { center: Vec3; size: Vec3 }` (the box's interior behind the door).

- [ ] **Step 1: Write the failing tests** in `mailboxDoor.test.ts`:
  - `"the door is Tibik's box: row 3 right, over its painted cell"`: `RESIDENTS.indexOf(MAILBOX_DOOR.resident)` is 8; the closed door's world rectangle equals that cell mapped onto the plate (`mailboxCell(8)`, `mailboxPlate()`) within 1 mm, 0.5–2 mm proud of the plate.
  - `"it opens on its left hinge, clear of its neighbours, the unit, the facade and the doorbell panel, ink included"`: for 40 angles from 0 to `MAILBOX_DOOR.open`, `boxGap(mailboxDoorSolid(a), solid) >= OUTLINE` for the facade solids, `DOORBELL_PANEL` and the plate's other cells (the plate as an Obb); `MAILBOX_DOOR.open` is the largest such angle rounded down to 0.05 rad and at least 1.4 rad.
  - `"the lock sits near the free edge where a key can reach it"`: `mailboxKeyhole()` lies within 30 mm of the door's right edge, 0.5–2 mm proud of its face.
  - `"the envelope fits inside the box"`: `mailboxInside().size` contains a DL envelope lying on its long edge (220 × 110 mm) with ≥ 5 mm to spare.
- [ ] **Step 2: Run**; expected FAIL.
- [ ] **Step 3: Implement** `mailboxDoorShape.ts` and `MailboxDoor.tsx` (steel grey door with the slot, the name strip „Tibik" and a lock cylinder, drawn with the mailbox texture's colours and the existing `WallBox`/plate conventions). Ruling to ledger if the test's largest clear angle is below the spec's "about 100°": the door's hinge is flush with the plate, so it cannot pass 90° without entering the neighbouring box; the test's value wins.
- [ ] **Step 4: Run**; expected PASS. Still: a dev-only render of `Film` 460 with `mailboxDoor` forced to open (revert after): the door swings out over the step side, no clipping.
- [ ] **Step 5: Commit** `"Tibik's mailbox has a real door: hinged left over its painted cell, with its lock, opening clear of everything round it"`.

### Task 4: The letter, the envelope and the keys

**Files:**
- Create: `src/props/letterShape.ts`, `src/props/letterShape.test.ts`, `src/props/Letter.tsx`, `src/props/Envelope.tsx`, `src/props/KeyRing.tsx`, `src/scenes/rundschreiben/letter.ts`
- Modify: `scripts/make-font-metrics.mjs` and `src/dialogue/fontMetrics.ts` (add the letter's sans-serif font)

**Interfaces:**
- Consumes: `HAUSVERWALTUNG` from `src/street/building.ts`; `drawnTexture`, `fitText` from `src/toon/primitives.tsx`.
- Produces: in `letter.ts`: `LETTER_LINES: readonly { text: string; role: "head" | "date" | "address" | "subject" | "body" | "thanks" | "signature" }[]` (the spec's wording, line for line; the salutation's role is "body", so it counts as must-read); `ENVELOPE_TEXT = { sender: HAUSVERWALTUNG, to: "An alle Mieterinnen und Mieter" }`.
- Produces: in `letterShape.ts`: `A4 = [0.21, 0.297] as const`; `FOLD_MARKS = [0.105, 0.21] as const` (DIN 5008); `DL = [0.22, 0.11] as const`; `letterPanels(fold: number): { matrix: Matrix4; size: readonly [number, number] }[]` (3 panels, `fold` 0 = folded C-fold, 1 = flat); `LETTER_LAYOUT: { margins: { left: 0.025; right: 0.02; top: 0.027 }; lines: readonly { text: string; role: …; pt: number; x: number; y: number }[] }` (metres from the sheet's top-left); `envelopeFlap(open: number): Matrix4`; `paperSpotsAt(t: number, wetFrom: number): readonly { u: number; v: number; r: number }[]`.
- Produces: `<Letter matrix fold spots />`, `<Envelope matrix flap />`, `<KeyRing matrix />`.

- [ ] **Step 1: Write the failing tests** in `letterShape.test.ts`:
  - `"the wording is the spec's, word for word"`: `LETTER_LINES.map((l) => l.text)` equals the spec block's non-empty lines in order (head and date are two entries); the thanks line is exactly `"Vie-len DANK. Vie-len DANK. Vie-len DANK. Vie-len DANK."`; the head and the signature contain `HAUSVERWALTUNG`.
  - `"body 11-12 pt, every line inside the DIN 5008 margins"`: body and thanks lines have `pt` in [11, 12]; for every line, `x >= margins.left` and `x + width(text, pt) <= A4[0] - margins.right` (width from the letter font's metrics).
  - `"flat, the three panels make one A4 sheet; folded, it is a 210 × 105 mm stack that fits a DL envelope"`: `fold` 1 → coplanar, heights 105/105/87 mm summing to 297 mm; `fold` 0 → all corners within 1 mm of one plane and inside 210 × 105 mm, which leaves ≥ 2 mm each side inside `DL`.
  - `"no panel passes through another while folding"`: for 50 fold values, panel quads do not intersect (a separation ≥ 0 along each panel's normal at the hinge-free edges).
  - `"rain spots appear once the letter is out, stay where they land, inside the sheet"`: `paperSpotsAt(t, w)` is empty for t < w, its length never decreases with t, each earlier spot is unchanged later, all spots lie inside [0, 1]².
- [ ] **Step 2: Run**; expected FAIL.
- [ ] **Step 3: Implement** the font metrics (same script and format as the bubble fonts), `letter.ts`, `letterShape.ts` (C-fold: the bottom panel folds up first, then the top panel down over it), and the three components (letter texture drawn at 10 px/mm from `LETTER_LAYOUT`; spots as small darker translucent discs on the sheet with polygon offset; envelope white with the sender top left and the address field; keys as two small toon shapes on a ring, 2 mm ink).
- [ ] **Step 4: Run**; expected PASS. Dev Still (not committed) of the flat letter facing the camera: the text reads, nothing pokes through.
- [ ] **Step 5: Commit** `"The Hausverwaltung's circular: the wording, a DIN 5008 letter folded in three, its envelope and Tibik's keys"`.

### Task 5: Choreography, part 1 — home in the rain, the mailbox, the letter out

**Files:**
- Create: `src/scenes/rundschreiben/choreography.ts`, `src/scenes/rundschreiben/solve.ts`, `src/scenes/rundschreiben/physics.test.ts`
- Modify: `src/street/layout.ts` (export `entranceGround(x: number, z: number): number`, the step with the mat face, used by `src/street/entranceMat.test.ts` instead of its local `withMat`)

**Interfaces:**
- Consumes: Tasks 1–4; `planGait`, `rhythmicSteps`, `walkCadence`, `strideAt`, `touchdownTimes` (`src/characters/gait.ts`), `kf`, `armKf` (`src/characters/animate.ts`), `workArm`, `Hold` (`src/physics/holds.ts`), `holdCarried` (`src/physics/grip.ts`), `solveTibik`-style guards as in `src/scenes/papiertonnen/solve.ts`, `memoByFrame`, `worldSolids`, `sunkSoles`/`TIBIK_FOOT` (`src/scenes/drawnSoles.ts`), `penetrations`, `TOLERANCE`, `framesOf` (`src/scenes/sceneChecks.ts`).
- Produces: beat constants in story seconds — `ARRIVE = 0`, `AT_MAILBOX = 4`, `KEY_IN = 4.6`, `BOX_OPEN = [5.0, 5.6]`, `ENVELOPE_OUT = [5.8, 6.6]`, `BOX_SHUT = [7.0, 7.6]`, `FLAP = [9.0, 9.8]`, `UNFOLD = [10.4, 11.6]`, `READ = [12, 23]`, `THANKS = [23, 28]`, `REACT = [28, 30]`, `RUNDSCHREIBEN_DURATION = 39`; `rundschreibenTibikAt(t): TibikFrame`; `RUNDSCHREIBEN_HOLDS: readonly Hold[]`; `tibikGait`; `footstepTimes(fps)`; `type RundschreibenState = { tibik; haustuer: number; haustuerLever: number; lids: number[]; mailboxDoor: number; envelope: { matrix: Matrix4; flap: number } | null; letter: { matrix: Matrix4; fold: number } | null; keys: Matrix4 | null; lampOn: boolean; indoors: number }`; `solveRundschreiben(t)`; `rundschreibenSolids(state): Solid[]`.

- [ ] **Step 1: Write the failing tests** in `physics.test.ts` for t in [0, 12) at every frame:
  - `"the time jump's start: he is outside on the pavement, the Haustür and every lid shut, the bins emptied"`: state at 0 has `haustuer` 0, all `lids` 0, Tibik's root z > `FACADE_Z + DOORSTEP.depth + 0.3`.
  - `"Tibik passes through nothing, outlines included"`: `penetrations(frames, (t) => bodyContacts(solveRundschreiben(t)), seconds)` empty, against `rundschreibenSolids` (street, lids, Haustür, mailbox door at its angle).
  - `"his drawn soles never dip below the pavement, the step or the mat"`: `sunkSoles(TIBIK_FOOT, …, 0, 12, entranceGround)` empty.
  - `"the key goes into his mailbox's lock, his left hand opens and shuts the door by its free edge"`: during `KEY_IN`–`BOX_OPEN[0]` the key ring's key tip is within 4 mm of `mailboxKeyhole()`; during `BOX_OPEN` and `BOX_SHUT` the left hand touches the door's free edge (grip gap ≤ hand radius).
  - `"the envelope comes out of the box and is held, never through the door, the box or his hands"`: envelope OBB vs `mailboxInside()` walls and the door, ink included; held edges inside the hands (`gripGapViolations`).
  - `"the letter unfolds between his hands without passing through them"`: during `UNFOLD`, `letterPanels(fold)` quads vs hand spheres: no penetration beyond the paper's 2 mm ink.
- [ ] **Step 2: Run**; expected FAIL.
- [ ] **Step 3: Implement** choreography (walk from x −9 on the pavement at z −0.9 to the mailboxes; key ring in the right hand from the start; holds for the keyhole, the door edge, the envelope, both hands on the letter) and `solve.ts` (as Papiertonnen: author → guard ground/body/lean → `workArm` holds → `holdCarried` for envelope and letter; mailbox door angle from `BOX_OPEN`/`BOX_SHUT`). Move `withMat` out of `entranceMat.test.ts` into `entranceGround` and use it there.
- [ ] **Step 4: Run** the new tests and `src/street/entranceMat.test.ts`; expected PASS.
- [ ] **Step 5: Commit** `"Rundschreiben, part 1: home in the rain, his mailbox unlocked and opened, the envelope out and the letter unfolded, nothing passing through anything"`.

### Task 6: Choreography, part 2 — reading, the Papiertonne, home

**Files:**
- Modify: `src/scenes/rundschreiben/choreography.ts`, `solve.ts`, `physics.test.ts`

**Interfaces:**
- Consumes: Task 5; `tonneLidParts`, `guardLid` (`src/street/tonneShape.ts`, `src/street/restingLids.ts`); `binByName("Papier 1")`; the Papiertonnen lid motion constants (`REACH_LID`, `LIFT_LID`, `FLICK_LID` poses) as references for the arm; `HAUSTUER` with its outer bar grip and cylinder; `ENTRANCE_LAMP`.
- Produces: beats `FOLD = [30, 31.5]`, `TO_BIN = [31.5, 33.5]`, `LID_UP = [33.5, 34.2]`, `KLOPPEN = [34.2, 34.6]`, `LID_THUD = 34.9`, `TO_DOOR = [35, 36]`, `UNLOCK = [36, 36.8]`, `IN = [36.8, 38.2]`, `DOOR_SHUT = 38.6`; `lampOn` in the state; `LAMP_SENSOR = { range: 4 }`.

- [ ] **Step 1: Write the failing tests**, frames t in [12, 39):
  - Tibik passes through nothing; soles stay on top (as in Task 5, over the whole scene).
  - `"he holds the letter steady while reading"`: during `READ` and `THANKS` the letter's matrix moves less than 15 mm and 3° frame to frame.
  - `"he kloppt the envelope through the lid opening into the empty bin"` (Review Focus 4): the envelope path from `KLOPPEN[0]` to `LID_THUD` stays inside the bin's opening prism and its walls' inside faces (ink included), never in the lid; at `LID_THUD` it rests on the bin floor and the lid is shut.
  - `"the lid lifts by its handle and drops shut"`: `Papier 1`'s lid angle rises during `LID_UP`, is 0 at `LID_THUD`, `guardLid` never trims it (no lid–content contact).
  - `"he unlocks the Haustür from outside and goes in; the closer shuts it behind him"`: the key tip within 4 mm of the outer cylinder during `UNLOCK`; the right hand on the outer bar while the door opens; `haustuer` 0 at `DOOR_SHUT`; `indoors` rises to 1 by the end.
  - `"the entrance lamp switches on as he comes within range and stays on"` (Review Focus 5): `lampOn` false while every point of his root is farther than `LAMP_SENSOR.range` from the lamp, true from the first frame within range to the end, never false again.
- [ ] **Step 2: Run**; expected FAIL.
- [ ] **Step 3: Implement** the beats (letter held at reading distance in both hands; fold back to 0; letter into the envelope; walk past the Haustür to `Papier 1`; lid lifted with the left hand, the envelope flicked in with the right; lid dropped; walk back; outer cylinder, push bar, step in; closer as in the other scenes) and the sensor (`lampOn` latches true).
- [ ] **Step 4: Run** the whole physics test; expected PASS.
- [ ] **Step 5: Commit** `"Rundschreiben, part 2: he reads, folds it back, kloppt it into the blue Papiertonne and goes home; the entrance lamp comes on for him"`.

### Task 7: Cameras, the caption and readable inserts

**Files:**
- Create: `src/scenes/rundschreiben/cameras.ts`, `src/scenes/rundschreiben/cameras.test.ts`, `src/dialogue/Caption.tsx`, `src/dialogue/caption.test.ts`

**Interfaces:**
- Consumes: `Shot`, `findShot` (`src/scenes/hausmuell/cameras.ts`); `seenBy`, `onScreen` (`src/dialogue/screen.ts`); `LETTER_LAYOUT`, `letterPanels`; `TEXT`, `typeOf`, `textWidth` (`src/dialogue/bubbleText.ts`).
- Produces: `SHOTS: readonly Shot[]` named `"Wide: Zwei Wochen später"`, `"Mailbox"`, `"Opening"`, `"Insert: the letter"`, `"Insert: Vie-len DANK"`, `"Tibik"`, `"Coda"` with the spec's order and the beats from Tasks 5–6; `CAPTION = { text: "Zwei Wochen später.", from: 0, to: 3 }`; `<Caption text />` (a yellow comic caption box top left in the bubbles' lettering).

- [ ] **Step 1: Write the failing tests**:
  - `"the shots run end to end over the scene"`: consecutive `to`/`from` equal, first `from` 0, last `to` `RUNDSCHREIBEN_DURATION`.
  - `"every body line is at least 40 px tall in insert 1, the thanks line and signature in insert 2"`: at the insert's first frame and every 5th frame, project each must-read line's top and baseline (via the letter's world matrix from `solveRundschreiben` and `letterPanels(1)`) with `onScreen`; height ≥ 40 px and the whole line `seenBy` the camera.
  - `"each insert is on screen long enough to read: characters / 17 seconds"`: insert 1 duration ≥ chars(salutation + body)/17, insert 2 ≥ chars(thanks + signature)/17.
  - `"the camera stands in no solid, tree or car, and on one side of the line between Tibik and the facade"` (same checks as the other scenes' camera tests).
  - `caption.test.ts`: `"the caption says Zwei Wochen später. for three seconds and fits its box"`: text exactly `"Zwei Wochen später."`, `to - from` 3, `textWidth` inside the box.
- [ ] **Step 2: Run**; expected FAIL.
- [ ] **Step 3: Implement** the shots (wide from the far pavement towards No. 12; medium on the mailboxes from the step side; close on the hands; inserts square to the sheet with a slow push-in; a close-up; the coda medium wide covering entrance and bins) and `Caption.tsx`.
- [ ] **Step 4: Run**; expected PASS.
- [ ] **Step 5: Commit** `"Rundschreiben shots and the time-jump caption; both letter inserts read at 40 px a line and stay up long enough"`.

### Task 8: The scene in the film, with its sound

**Files:**
- Create: `src/scenes/rundschreiben/Rundschreiben.tsx`, `src/scenes/rundschreiben/RundschreibenSound.tsx`, `src/scenes/rundschreiben/soundCues.ts`, `src/scenes/rundschreiben/sounds.test.ts`, `public/sfx/rain-<name>.<ext>` (the chosen recording)
- Modify: `src/timeline.ts` (`RUNDSCHREIBEN_FRAMES`, `RUNDSCHREIBEN_FROM`, `FILM_FRAMES`, `TIME_JUMPS` + `{ from: "Klingelsturm", to: "Rundschreiben" }`, `filmIndoors` for the coda), `src/Film.tsx`, `src/Root.tsx` (`Rundschreiben` composition), `public/sfx/CREDITS.md`, `docs/CONTINUITY.md`

**Interfaces:**
- Consumes: everything above; `StreetAmbience`, `SoundCues`, `FootstepSounds`.
- Produces: `RUNDSCHREIBEN_CUES: readonly { name: string; at: number; file: string; volume: number }[]` (key in mailbox lock, lock turn, door latch and creak, paper rustle ×3, lid lift, lid thud at `LID_THUD`, Haustür key, lock, door open, door close at `DOOR_SHUT`).

- [ ] **Step 1: Find the rain recording.** Search Wikimedia Commons and Freesound for steady rain on pavement, public domain, CC0 or CC BY, at least 30 s, no voices or traffic peaks. Ledger the candidates with licence and URL. If none qualifies, stop and ask the user (spec rule).
- [ ] **Step 2: Write the failing tests** in `sounds.test.ts`:
  - `"every cue has its file and every file is credited"`: each `file` exists in `public/sfx/`, and every file name used (cues, rain loop) appears in `CREDITS.md`.
  - `"the time jump: no Klingelsturm cue runs past its scene, the rain starts at the cut"` (Review Focus 3): every Klingelsturm cue ends before `KLINGELSTURM_DURATION`; the rain loop's first frame is `RUNDSCHREIBEN_FROM`.
  - `"the rain muffles once he is inside"`: the rain's volume curve at the scene's last frame is the muffled level used for the street ambience indoors.
  - `"the declared time jumps"` in `src/scenes/klingelsturm/physics.test.ts`' neighbour test: `TIME_JUMPS` contains both jumps; `FILM_FRAMES` equals the sum of the five scenes.
- [ ] **Step 3: Run**; expected FAIL.
- [ ] **Step 4: Implement** the scene view (as `Papiertonnen.tsx`: `<Sky weather="rain">`, shot cameras, `<StreetLighting weather="rain" />`, `<Street weather="rain" lampOn mailboxDoor haustuer haustuerLever windAt />`, `<BinRow lids emptied />`, `<Rain />` from `rainAt` with Tibik's colliders as bodies, Tibik carrying keys/envelope/letter, `<Caption>`, `<InkPass />`), the sound (`StreetAmbience` with the coda's indoors curve, the rain loop with the same muffling, `FootstepSounds`, `SoundCues`), timeline, Film, Root, credits, and the CONTINUITY.md section for the epilogue (its facts with **(test)** marks), with the sun rule amended to "the sun comes from the front-left in every sunny scene" and the second declared time jump listed.
- [ ] **Step 5: Run** the full suite through `node scripts/test.mjs`; expected all green. Render stills of every shot (`node scripts/stills.mjs Rundschreiben <dir> …`) and check each for clipping, rain behind or through things, and the letter's legibility.
- [ ] **Step 6: Check the no-copies rule:** jscpd strict at 50 tokens reports no new clone involving the new files; the four existing scenes' stills (Task 1's frames) and solved-state snapshots are unchanged.
- [ ] **Step 7: Commit** `"Rundschreiben: the epilogue in the film, with rain, the letter and the Papiertonne coda"`.
