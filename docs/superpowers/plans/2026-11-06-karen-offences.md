# Karen's Two Offences Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** In the Klingelsturm, Karen silently pounds on Tibik's door between the answering machine and the 110 call (a Flur intercut shows him calmly laying a second tape strip), and after he leaves she lights a cigarette; behind a hidden ~170 s story-time jump the 180 s timer light runs out on her again and only the ember glows.

**Architecture:** Two new beat modules in `src/scenes/klingelsturm/` (`banging.ts`, `cigarette.ts`) feed the existing choreography → `solve.ts` (holds and guards) → cameras → view → sound chain. Everything after the hang-up moves by one frame-aligned constant `LATER`. Story time becomes a shared helper in `src/toon/shots.ts`, keyed props a shared helper in `src/characters/propPlace.ts`. New props (`Cigarette`, `Lighter`) and a pure, story-timed smoke-curl system (`src/smoke/`) render in the scene.

**Tech Stack:** Remotion 4, @remotion/three, React Three Fiber, three, vitest, Node scripts (`scripts/sfx-audio.mjs`, `make-stairwell.mjs`, `make-flur.mjs`, `spectral.mjs`).

**Spec:** `docs/superpowers/specs/2026-11-06-karen-offences-design.md`

**Workspace and ledger:** `.superpowers/sdd/2026-11-06-karen-offences/progress.md` (first line names this plan).

## Global Constraints

- No duplicated general code (user's rule): holds, gaits, guards, places, story time, room sounds and cues come from the shared pieces; jscpd strict at 50 tokens reports no new clone involving the new files.
- Everything is a pure function of time; solvers go through `memoByFrame`; randomness only through Remotion `random(seed)` with stable seeds.
- Every beat time is on a whole frame at FPS 30 (`Math.abs(t * 30 - Math.round(t * 30)) < 1e-6`). `LATER = 6.9` (207 frames).
- No clipping anywhere, ink outlines included (OUTLINE = 14 mm unless a part sets its own ink). Contact is allowed only where the spec puts it (fist on the leaf, cigarette in lips and hand, lighter in hand).
- Windows: a data module never shares a case-insensitive name with a component in its folder (`cigaretteShape.ts` beside `Cigarette.tsx`, `lighterShape.ts` beside `Lighter.tsx`).
- No code comments; `node scripts/strip-comments.mjs` before every commit. Commit and push to `main` (`git add -A`) as HugeFrog24, no AI/Claude/Co-Authored-By trailers, never a feature branch.
- Key action near the frame centre for a later 9:16 crop: |NDC x| ≤ 0.316.
- Karen's footsteps are always `KarenStomp` stomps (they come from `karenStandGait()` touchdowns automatically).
- New sounds: CC0 / public domain from sites that need no account, or synthesised by our own scripts from such recordings; downloads go to their own new scratch directory; credited in `public/sfx/CREDITS.md` (learning sources also in `assets/recordings/recordings.json`). If no free source exists, stop and ask the user.
- Values fixed by the spec: blows 0.4 s apart, four, a ~1 s beat, two more; fist at ~1.35 m, clear of the spyhole, 0–2 mm from the leaf at contact; leaf shiver ≤ 2 mm at the latch edge, still within 0.1 s; cigarette 84 × 8 mm, filter 25 mm cork, ink 2 mm, filter ≤ 10 mm inside the lips; lighter ~80 × 25 × 12 mm, red plastic, metal hood, ink 3 mm; flame 25 mm, unlit, no ink; ember rise 0.3 s, fall 0.8 s; curls live 2–4 s; haze opacity ≤ 0.15; `LIGHT.timer` 180 s, no warning blink; the circular unchanged.
- Each task ends with `npm run lint`, the touched tests green (`npm test -- <files>`), stills of the affected shots checked by eye for clipping (`node scripts/stills.mjs <out> Klingelsturm:<frame>,…`), CONTINUITY/spec updates for what the task changed, a commit, a push and a ledger line.

## Review Focus

1. Out-of-order rendering: Remotion renders frames in any order on several threads; `solveKlingelsturm(t)` and the smoke curls must give the same result for a frame whether or not other frames were computed first. Pinned in Task 8.
2. Beats off the frame grid put a blow's sound a frame away from its contact or a cut a frame early. Pinned in Tasks 2, 3 and 7.
3. Props popping: the cigarette and lighter may appear only at the cut into "Medium: the cigarette", and the phone may leave her hand only at its pocket place. Pinned in Task 7.
4. The 9:16 crop loses the action: the fist on the door (Wide), the parcel (Flur), the flame and the ember must lie within |NDC x| ≤ 0.316. Pinned in Tasks 3 and 7.
5. The time jump leaks: no curl born before the jump cut and no Tibik in the building after it. Pinned in Tasks 7 and 8.

---

### Task 1: Shared story time and keyed prop places

**Files:**
- Modify: `src/toon/shots.ts`, `src/scenes/treppenhaus/cameras.ts`, `src/Karen/phoneShape.ts`, `src/scenes/klingelsturm/calls.ts`
- Create: `src/characters/propPlace.ts`, `src/characters/propPlace.test.ts`, `src/toon/shots.test.ts`

**Interfaces:**
- Produces: `Shot` gains `readonly story?: number`; `storyTimeIn(shots: readonly Shot[]) => (filmT: number) => number` (`(shot.story ?? shot.from) + filmT - shot.from`); `filmTimeIn(shots: readonly Shot[]) => (storyT: number) => number | null`.
- Produces: `type PropPlace = { readonly position: Vec3; readonly rotation: Vec3 }` (`PhonePlace` becomes an alias of it); `type PlaceStop = { readonly at: number; readonly place: PropPlace }`; `stopsAt<T>(stops: readonly { at: number; value: T }[], t: number): { a; b; w }` (the current `between` from `calls.ts`, smoothstep weight); `placesAt(stops: readonly PlaceStop[]) => (t: number) => PropPlace`; `placeFrame(base: Matrix4, place: PropPlace): Matrix4`.

- [ ] **Step 1: Write the failing tests.** `shots.test.ts`: `"story time equals film time in a shot without a story start, and runs from its story start in one with it"` (two shots `{from 0, to 2}` and `{from 2, to 4, story 100}`: `storyTimeIn(s)(1) === 1`, `storyTimeIn(s)(3) === 101`, `filmTimeIn(s)(101) === 3`, `filmTimeIn(s)(50) === null`). `propPlace.test.ts`: `"placesAt holds the first place before the first stop, the last after the last, and eases between with smoothstep"` (position at the midpoint of two stops is the midpoint; at a quarter it is `smoothstep(0.25)` of the way).
- [ ] **Step 2: Run** `npm test -- src/toon/shots.test.ts src/characters/propPlace.test.ts`. Expected: FAIL, `storyTimeIn`/`placesAt` not exported.
- [ ] **Step 3: Implement** in `shots.ts` and `propPlace.ts`; make the Treppenhaus use `storyTimeIn(SHOTS)` / `filmTimeIn(SHOTS)` for its `storyTime` / `filmTimeOf` (its shot type becomes `Shot` with `story`); make `calls.ts` use `stopsAt` and `placesAt` (no local `between`); `phoneFrame` uses `placeFrame`.
- [ ] **Step 4: Run** `npm test -- src/toon src/characters src/scenes/treppenhaus src/scenes/klingelsturm`. Expected: PASS, no existing test changed.
- [ ] **Step 5: Commit and push.**

### Task 2: Everything after the hang-up starts `LATER` seconds later

**Files:**
- Create: `src/scenes/klingelsturm/banging.ts`, `src/scenes/klingelsturm/banging.test.ts`
- Modify: `calls.ts` (`KEYS[2..]`, `CLICK`, `LOWERED`, the call lines from „Polizei-Notruf." on, the phone places from 31.1 on), `choreography.ts` (blinks after 29.35), `exit.ts` (`EXIT.offset`, `pickup`, `walk`, `end`), `light.ts` (`LIGHT.out`)

**Interfaces:**
- Produces: `LATER = 6.9`; `later(t: number): number` (`round6(t + LATER)`). `banging.ts` imports nothing from `calls.ts`, `choreography.ts`, `door.ts`, `exit.ts` or `light.ts` (they import it).

- [ ] **Step 1: Write the failing test** `"everything after the hang-up keeps its spacing and starts LATER s later, on whole frames"`: `KEYS[2].at - KEYS[1].at` ≈ `0.35 + LATER`; `KEYS[5].at - KEYS[2].at` ≈ 1.2; `CLICK - KEYS[5].at` ≈ 14.7; `LIGHT.out - CLICK` ≈ 2.0; `EXIT.end - LIGHT.out` ≈ 10.1; `EXIT.offset * FPS` ≈ 1675; `LATER * FPS` ≈ 207; the „Polizei-Notruf." line starts at `later(32.0)`.
- [ ] **Step 2: Run** `npm test -- src/scenes/klingelsturm/banging.test.ts`. Expected: FAIL, module not found.
- [ ] **Step 3: Implement** `LATER`/`later` and apply `later()` to the listed constants (values written as `later(<old value>)`).
- [ ] **Step 4: Run** `npm test -- src/scenes/klingelsturm src/scenes/nachtruhe src/scenes/rundschreiben src/street/ambience.test.ts`. Expected: PASS; `phone.test.ts:26` `solveKlingelsturm(50.9)` becomes `solveKlingelsturm(later(50.9))` (ledger the edit).
- [ ] **Step 5: Commit and push.**

### Task 3: The banging

**Files:**
- Modify: `banging.ts`, `banging.test.ts`, `choreography.ts` (`karenRoot`, `karenStandGait` steps, the authored left arm, glare), `calls.ts` (phone to her hip and back), `door.ts` (`tibikDoorAt` + shiver), `cameras.ts` (shots), `solve.ts` (left-arm holds), `docs/CONTINUITY.md` (the landing), `docs/superpowers/specs/2026-11-03-klingelsturm-design.md` (beat table rows 11a–11c)

**Interfaces:**
- Consumes: `LATER`, `later` (Task 2); `handHold`-style holds and `workArm` (`src/physics/holds.ts`); `doorFrame`, `doorSolids`, `gripSolid`, `viewerLens` (building).
- Produces: `BANGING = { hip: [29.4, 29.8], wideCut: 29.6, walk: [29.6, 31.2], blows: [31.4, 31.8, 32.2, 32.6, 33.6, 34.0], flurCut: [33.2, 35.2], back: [34.2, 35.8], raise: [35.8, 36.2], dial: later(29.7) }`; `BLOW = { height: 1.35, fromLatchEdge: 0.25, lead: 0.2, tail: 0.17 }`; `blowPoint(t: number): Vector3` (on the leaf's landing face, from `doorFrame(TIBIK_DOOR, doorShiverAt(t))`: the door is shut through the banging, so its angle is the shiver alone); `BLOW_HOLDS: readonly Hold[]` (left arm, one per blow: `reach = at - lead`, `grip = at`, `release = at + 1/30`, `done = at + tail`, `exact: true`, `near` = `blowPoint` + outward × (largest hand half-size + 0.001), as `PRESSED_HAND` does for the bell); `BANG_READY: ArmPose` (raised fist, start `{ raise: 1.3, out: 0.5, elbow: 1.9, inward: 0.4 }`, authored on the left arm from `walk[1] - 0.2` to `blows[5] + tail`); `SHIVER = { edge: 0.002, settle: 0.1 }`; `doorShiverAt(t: number): number` (radians, added in `tibikDoorAt`).
- Karen's path: from `KAREN_HOME` back to `KAREN_AT_DOOR` facing his door over `walk`, and home again over `back`, six steps each way at the 0.26 s cadence of her home walk, `width: KAREN_HOME.width`. Phone stops: look until 29.4, hip at `hip[1]`, hip until `raise[0]`, look at `raise[1]`.
- Shots: "Medium: the answering machine" to `wideCut`; "Wide: the banging" (`WIDE`) to `flurCut[0]`; "Flur: the banging" (`FLUR_SHOT`) to `flurCut[1]`; "Medium: back to the phone" (`PHONE_SHOT`) to `DIALLING[1]`.

- [ ] **Step 1: Write the failing tests** in `banging.test.ts`:
  - `"four blows 0.4 s apart, a beat of 1.0 s, two more, all on whole frames"`.
  - `"each blow lands on his door leaf: at the contact frame her left hand is 0-2 mm off the leaf's landing face"` (`sphereObbGap(handSphere(KAREN_SKELETON, state.karen, "leftArm"), leaf)` with the leaf from `doorSolids(TIBIK_DOOR, tibikDoorAt(t))`, `src/building/doors.ts`).
  - `"in no frame from the walk to the walk back does any part of her pass into his door, its frame or the doormat"` (`characterViolations` with the scene solids, every frame of `[walk[0], back[1]]`).
  - `"the fist strikes 1.35 m above the landing, 0.25 m in from the latch edge, at least 0.15 m from the spyhole"`.
  - `"the leaf gives at most 2 mm at its latch edge on each blow and is still again 0.1 s later"` (> 0 one frame after each blow, 0 from `at + 0.1`).
  - `"the phone rests at her hip clear of her leg while she walks and bangs"` (`phoneObb` vs her leg colliders, gap > 0, `[hip[1], raise[0]]`).
  - `"the Wide shows the first four blows, the Flur the last two, and she dials in the Medium"` (`shotAt(blows[i]).name`, `shotAt(BANGING.dial)`).
  - `"the fist on the door in the Wide and the parcel in the Flur sit within the 9:16 centre band"` (project with `cameraAt`, |NDC x| ≤ 0.316).
- [ ] **Step 2: Run** `npm test -- src/scenes/klingelsturm/banging.test.ts`. Expected: FAIL (`BANGING` not exported).
- [ ] **Step 3: Implement** the beats, path, gait steps, phone stops, holds, shiver and shots; add `BLOW_HOLDS` to the left-arm holds in `solve.ts` after `BELL_HOLDS`; glare (`glaring`) at 1 from `blows[0]` to `blows[5]`.
- [ ] **Step 4: Run** `npm test -- src/scenes/klingelsturm`. Expected: PASS (the existing physics, soles, phone and phoneGrip tests included).
- [ ] **Step 5: Stills** at the frames of blows 1, 4 and 5, the beat and the walk back; check the fist on the leaf and the phone at her hip by eye. Update CONTINUITY and the Klingelsturm spec. Commit and push.

### Task 4: Tibik's second tape strip

**Files:**
- Modify: `src/scenes/klingelsturm/parcel.ts`, `door.ts` (packing lean over the second taping), `FlurProps.tsx` (all strips, in the Flur and on the carried parcel), `doorCues.ts` (second tape-pull cue), `packing.test.ts`, `sounds.test.ts`, `docs/CONTINUITY.md`

**Interfaces:**
- Produces: `TAPING_AGAIN = { at: 32.2, pick: 32.45, start: 32.8, handover: 33.7, end: 34.6, down: 35.0, done: 35.3 }` (the first taping 15 s later); `type TapeStrip = { readonly name: string; readonly times: typeof TAPING; readonly across: boolean }`; `TAPE_STRIPS: readonly TapeStrip[]` (the first along the lid, the second across it over the lid's width, laid on the first); `tapeStripAt(t)` returns the pieces of every strip pulled by `t`; `rollAt`/`tapeRollFrame` follow both tapings (the second starts and ends at `TAPE_PUT_DOWN`); `TAPING_HOLDS` holds both tapings.

- [ ] **Step 1: Write the failing tests:** `"the second strip runs across the first, on top of it, over the lid's width and down both sides by the overhang"`; `"from TAPING_AGAIN.end on the parcel shows two strips, the carried parcel too"`; `"the roll is picked up from where he put it down and goes back there"`; `"his hands hold the roll and touch nothing else through the second taping"` (extend the existing hand/parcel physics check to `[TAPING_AGAIN.at, TAPING_AGAIN.done]`); `"the second strip screeches as it is pulled"` (a `flur/tape-pull` cue at `TAPING_AGAIN.start - 0.04`).
- [ ] **Step 2: Run** `npm test -- src/scenes/klingelsturm/packing.test.ts src/scenes/klingelsturm/sounds.test.ts`. Expected: FAIL (`TAPING_AGAIN` not exported).
- [ ] **Step 3: Implement** by parametrising the existing strip path (`along`, `pulled`, `stripPiece`) with a `TapeStrip`, not by copying it.
- [ ] **Step 4: Run** `npm test -- src/scenes/klingelsturm`. Expected: PASS.
- [ ] **Step 5: Stills** in the Flur shot (start, middle and end of the second pull) and of the coda's carried parcel. Update CONTINUITY. Commit and push.

### Task 5: The banging's sounds

**Files:**
- Add: `public/sfx/impactWood_heavy_000.ogg` … `_004.ogg`, `public/sfx/impactMetal_light_000.ogg` … `_004.ogg` (Kenney Impact Sounds, CC0, https://kenney.nl/assets/impact-sounds, downloaded into a fresh scratch directory)
- Modify: `scripts/make-stairwell.mjs` (`SOURCES`), `scripts/make-flur.mjs` (`flur/door-blow-<n>.wav`), `public/sfx/CREDITS.md`
- Create: `src/scenes/klingelsturm/offenceCues.ts`
- Modify: `doorCues.ts` (spread the new cues), `calls.ts` (`phoneCues`: a panting cue from `blows[3]` to `raise[0]`), `sounds.test.ts`

**Interfaces:**
- Produces: `blowCues(): BellCue[]`: per blow `i`, at `BANGING.blows[i]`: in the Wide `stairwell/impactWood_heavy_00<i % 5>` (volume 0.9) and `stairwell/impactMetal_light_00<i % 5>` 0.01 s later (0.15); in the Flur `flur/door-blow-<i % 5>` (1.0) and the dry rattle (0.3). `ON_HIS_SIDE = { cutoff: 2 * THROUGH_THE_DOOR.cutoff, level: 1 }` (the muffle box in `make-flur.mjs`).

- [ ] **Step 1: Write the failing tests:** `"each blow sounds on its contact frame, the stairwell take on the landing, the door take in the Flur"`; `"the latch rattle follows each blow, quieter than the blow"`; `"heard in his Flur a blow is duller than the dry take and has no stairwell tail"` (the `brightness`/`tail` measures of `light.test.ts`, moved to a shared test helper rather than copied); `"a blow on the landing plays at least as loud as her stomp, at most 1.5 times"` (cue volume × file peak); `"she pants through the beat and the walk back"`; `"every new file exists and is credited"`.
- [ ] **Step 2: Run** `npm test -- src/scenes/klingelsturm/sounds.test.ts`. Expected: FAIL (no blow cues).
- [ ] **Step 3: Implement:** download and copy the takes, credit them, run `node scripts/make-stairwell.mjs` and `node scripts/make-flur.mjs`, add `offenceCues.ts`.
- [ ] **Step 4: Run** `npm test -- src/scenes/klingelsturm src/sound`. Expected: PASS.
- [ ] **Step 5:** Render the banging's audio (`npx remotion render Klingelsturm --frames=<wideCut × 30>-<dial × 30> --codec=wav <scratch>/bang.wav`) and compare the blows' and stomps' peak levels in it. Commit and push.

### Task 6: Cigarette and lighter

**Files:**
- Create: `src/props/cigaretteShape.ts`, `src/props/Cigarette.tsx`, `src/props/lighterShape.ts`, `src/props/Lighter.tsx`, `src/props/cigaretteShape.test.ts`, `src/props/lighterShape.test.ts`

**Interfaces:**
- Produces: `CIGARETTE = { length: 0.084, radius: 0.004, filter: 0.025, ink: 0.002, paper: "#f4f2ec", cork: "#c98a4b", ash: "#9a9893", ember: { rest: "#b8321a", draw: "#ffb038" } }`; `cigaretteParts({ burned, ash }): { rod: number; ashLength: number; emberAt: number }` (local frame: origin at the filter's mouth end, +z towards the burning end); `cigaretteObb(frame: Matrix4, burned: number): Obb`; `cigaretteTip(frame: Matrix4, burned: number): Vector3`; `<Cigarette frame burned ash glow />` (paper, filter, ash and an ember cap `glowOf`, plus a point light `#ff6a2a`, distance 0.4, decay 2, intensity ∝ glow).
- Produces: `LIGHTER = { body: [0.025, 0.065, 0.012], hood: [0.025, 0.015, 0.012], wheel: { radius: 0.0045, width: 0.008 }, ink: 0.003, plastic: "#c8202a", metal: "#b9bcc0" }`; `FLAME = { height: 0.025, radius: 0.005, flicker: 0.1, lean: 0.08, core: "#fff6d8", edge: "#ffb347", base: "#6fa8ff", light: { colour: "#ffb35c", distance: 1.2 } }`; `flameAt(t: number): { height: number; lean: number }` (pure, two incommensurate sines); `lighterObb(frame: Matrix4): Obb`; `flameTip(frame: Matrix4, t: number): Vector3`; `<Lighter frame flame t />` (the flame unlit, `NO_INK`, with its point light only while `flame > 0`).

- [ ] **Step 1: Write the failing tests:** `"a king-size cigarette: 84 x 8 mm, a 25 mm filter, a 2 mm ink line"`; `"burning shortens the rod; the ash is never longer than what has burned; the ember sits at the burning end"`; `"a plain disposable lighter: about 80 x 25 x 12 mm, red plastic, a metal hood, a 3 mm ink line"`; `"the flame is 25 mm and flickers within 10 % and 0.08 rad, the same at the same time"`; `"the ember's light reaches 0.4 m, the flame's 1.2 m"`.
- [ ] **Step 2: Run** `npm test -- src/props/cigaretteShape.test.ts src/props/lighterShape.test.ts`. Expected: FAIL (modules not found).
- [ ] **Step 3: Implement** the shapes and views with the toon primitives (`ToonCylinder`, `ToonBox`, `glowOf`, `ink`).
- [ ] **Step 4: Run** the same command. Expected: PASS.
- [ ] **Step 5: Commit and push.**

### Task 7: The cigarette coda and the hidden jump

**Files:**
- Create: `src/scenes/klingelsturm/cigarette.ts`, `src/scenes/klingelsturm/cigarette.test.ts`
- Modify: `calls.ts` (phone back to its pocket), `choreography.ts` (`PHONE_HOLD.release`, mouth and head in the coda, `KLINGELSTURM_DURATION = CODA.end`), `light.ts` (second timeout, `STORY_SKIP`), `cameras.ts` (shots, `storyTime`), `solve.ts` (state, holds), `Klingelsturm.tsx`, `light.test.ts`, `coda.test.ts`, `docs/CONTINUITY.md`, the Klingelsturm spec's coda

**Interfaces:**
- Consumes: `EXIT.end` (Task 2) as `GONE`; `placesAt`, `placeFrame`, `storyTimeIn` (Task 1); Task 6's shapes; `karenHeadMatrix`, `karenMouthEmitter`.
- Produces: `CODA = { phoneAway: [GONE, GONE + 0.5], mediumCut: GONE + 0.8, flick: mediumCut + 0.3, flame: [flick, flick + 1.5], cup: [mediumCut, flame[1]], draws: [[flick + 0.5, flick + 0.8], [flick + 1.0, flick + 1.4]], lit: flick + 0.6, lighterDown: [flame[1], flame[1] + 0.4], takeOut: [flame[1] + 0.3, flame[1] + 0.8], exhale: [takeOut[1], takeOut[1] + 1.5], jumpCut: mediumCut + 4.2, raise: [jumpCut + 0.5, jumpCut + 0.8], laterDraw: [jumpCut + 0.8, jumpCut + 1.7], outAgain: jumpCut + 1.4, lower: [jumpCut + 1.7, jumpCut + 2.1], darkExhale: [jumpCut + 2.3, jumpCut + 3.6], end: outAgain + 3.0 }` (all on whole frames; `end` ≈ 74.0 s).
- Produces: `BURN = { rate: 0.008 / 60 }` (m/s: a cigarette takes 5–7 min to smoke down a ~54 mm rod; free burn alone is 3–5 mm/min. At the second timeout about 23 mm, ≈ 40 % of the 59 mm tobacco rod: ledger as `Ruling: burn rate from research, so "half" in the spec's beat table reads as ≈ 40 %`); `ASH = { hold: 0.008 }`; `burnedAt(storyT: number): number`; `ashAt(storyT: number): number`; `GLOW = { rest: 0.35, rise: 0.3, fall: 0.8 }`; `emberGlowAt(t: number): number` (0 before `lit`); `CIGARETTE_AT_THE_LIPS: PropPlace` (head frame; the filter end 8 mm inside the lips, drooping 0.25 rad, 0.15 rad to her left); `CIGARETTE_IN_HAND: PropPlace` (torso frame, left hand, chest height); `cigaretteFrame(karen: KarenFrame, t: number): Matrix4 | null` (null before `mediumCut`; blends lips ↔ hand over `takeOut`, `raise`, `lower`); `LIGHTER_LOW: PropPlace` (torso frame, right hip); `lighterFrame(karen, t, cigarette: Matrix4, burned): Matrix4 | null` (during `flame` placed so the flame tip touches the cigarette's end; null before `mediumCut`); `CIGARETTE_HOLDS`, `LIGHTER_HOLD`, `CUP_HOLD` (left hand beside the flame, away from her face).
- Produces in `light.ts`: `STORY_SKIP = LIGHT_BACK[0] + LIGHT.timer - CODA.outAgain` (≈ 170 s); `lightsAt(t)` 0 from `CODA.outAgain`. In `cameras.ts`: "Wide: the light goes out" to `mediumCut`; "Medium: the cigarette" (from `PHONE_EYE`, aimed at her mouth at `mediumCut`, fov 32) to `jumpCut`; "Wide: later" (`CODA_WIDE`, `story: CODA.jumpCut + STORY_SKIP`) to `CODA.end`; `storyTime = storyTimeIn(SHOTS)`.
- `KlingelsturmState` gains `storyT: number`, `cigarette: { frame: Matrix4; burned: number; ash: number; glow: number } | null`, `lighter: { frame: Matrix4; flame: number } | null`, `tibikHere: boolean` (false from `jumpCut`). Karen's `mouthOpen` ≤ 0.1 while the cigarette is at her lips, 0.3 and head pitch −0.2 while exhaling. `PHONE_HOLD.release = CODA.phoneAway[1]`; phone stops hip → `PHONE_AT_POCKET` over `phoneAway`; `inHand` false from `phoneAway[1]`.

- [ ] **Step 1: Write the failing tests:**
  - `light.test.ts`: `"the light goes out on her again exactly LIGHT.timer of story time after his press, with no warning blink"` (`storyTime(CODA.outAgain) - LIGHT_BACK[0] === 180`; `lightsAt` 1 on every frame of `[LIGHT_BACK[1], outAgain)`, 0 after); `"the timer relay clicks at the second timeout too"` (extend the relay test: three relay cues, the third at `CODA.outAgain`).
  - `cigarette.test.ts`: `"story time equals film time up to the jump cut and runs STORY_SKIP ahead after it"`; `"every coda time is on a whole frame and the scene ends about 74 s in"`; `"no cigarette or lighter before the cut into the Medium; the phone leaves her hand only at its pocket"`; `"the filter sits between her lips, at most 10 mm inside, and the rest of the cigarette is outside her head, nose and chin"`; `"held in her hand the cigarette touches the hand without passing through it"` (gap 0–2 mm, never < 0); `"the lighter is gripped clear of her body and the flame's tip reaches the cigarette's end while it burns"` (≤ 3 mm); `"her cupping hand passes through neither the flame, the lighter nor her face"`; `"the burned length follows BURN.rate over the story time since it was lit, about 23 mm at the second timeout, and the ash is never longer"`; `"the ember is brighter during each draw than at rest"`; `"Tibik is gone from the building after the jump cut"`; `"the flame in the Medium and the ember in the Wide: later sit within the 9:16 centre band"`.
- [ ] **Step 2: Run** `npm test -- src/scenes/klingelsturm/cigarette.test.ts src/scenes/klingelsturm/light.test.ts`. Expected: FAIL (`CODA` not exported).
- [ ] **Step 3: Implement** `cigarette.ts`, the phone's way back, the second timeout and `STORY_SKIP`, the shots, the state and holds (left arm: `BELL_HOLDS`, `BLOW_HOLDS`, `CUP_HOLD`, `CIGARETTE_HOLDS`; right arm: `PHONE_HOLD`, `LIGHTER_HOLD`), and render `Cigarette`/`Lighter` at world level in `Klingelsturm.tsx`, Tibik only while `tibikHere`. The relay cue at `outAgain` joins `relayCues`.
- [ ] **Step 4: Run** `npm test -- src/scenes/klingelsturm src/scenes/nachtruhe src/scenes/rundschreiben src/street/ambience.test.ts`. Expected: PASS (scene continuity, time-jump and sound-over-the-cut tests included).
- [ ] **Step 5: Stills** of the flick, the flame at the tip, the take-out, the exhale, the first frame after the jump, the drag at the timeout and the ember 1 s into the dark. Update CONTINUITY (in-scene jump beside the declared jumps; the circular silent on both offences) and the spec's coda. Commit and push.

### Task 8: Smoke curls

**Files:**
- Create: `src/smoke/smoke.ts`, `src/smoke/SmokeCurls.tsx`, `src/smoke/smoke.test.ts`, `src/scenes/klingelsturm/codaSmoke.ts` (`SMOKE_SOURCES`, `HAZE`; it imports `choreography.ts` and `cigarette.ts`, which `cigarette.ts` must not)
- Modify: `solve.ts` (`smoke` in the state), `Klingelsturm.tsx`, `docs/CONTINUITY.md`

**Interfaces:**
- Produces: `SMOKE = { wispEvery: 0.15, exhaleEvery: 0.05, life: { wisp: 3, exhale: 3.5 }, wispRise: 0.15, exhaleSpeed: 1.2, drag: 0.4, buoyancy: 0.1, radius: { born: 0.006, wisp: 0.05, exhale: 0.14 }, peak: 0.5, sway: { amplitude: 0.03, period: 1.7 }, flatten: { y: 0.4, xz: 1.6 }, step: 1 / 60, colour: "#d9d9d4", rim: 0.35 }`; `type SmokeSource = { readonly name: string; readonly kind: "wisp" | "exhale"; readonly windows: readonly (readonly [number, number])[]; readonly origin: (t: number) => Vector3; readonly direction?: (t: number) => Vector3 }`; `type Curl = { readonly center: Vector3; readonly radius: number; readonly flat: number; readonly opacity: number }`; `curlExtent(curl: Curl): Obb` (the flattened ellipsoid's box); `curlsAt(t: number, storyAt: (t: number) => number, sources: readonly SmokeSource[], solids: readonly Solid[]): Curl[]` (births on fixed film times inside each window; each curl integrated from its birth in `SMOKE.step` steps, ages counted in story time; overlaps resolved by moving out along `collide`'s normal and dropping the velocity into the solid; under a solid above, `flat` grows to 1 as it spreads); `<SmokeCurls curls />` (one `InstancedMesh`, `meshToonMaterial` with `onBeforeCompile` adding a per-instance opacity and an ink rim where `dot(normal, view) < SMOKE.rim`, `transparent`, `depthWrite: false`, `userData: NO_INK`).
- In `codaSmoke.ts`: the wisp source at the ember from `lit` while lit; exhale sources at `karenMouthEmitter` over `exhale` and `darkExhale`, forward + 0.5 up + 0.4 towards the open stairwell side; `HAZE`: four flat curls under the landing above her, opacity 0.1, drifting 0.02 m/s, from `jumpCut`.

- [ ] **Step 1: Write the failing tests:** `"the same frame gives the same curls whether or not other frames were computed first"` (`curlsAt(t)` fresh vs after computing `t - 1` and `t + 1`); `"no curl passes into the ceiling, walls, doors, stair flight or Karen"` (every 3rd frame from `lit` to `end`, `curlExtent` vs `stairwellSolids` and her colliders); `"curls that reach the landing above stop below it and spread flat"`; `"each curl grows, fades out within its life of 2-4 s and is gone after it"`; `"no curl born before the jump cut is left after it; only the haze hangs there, opacity at most 0.15"`; `"the wisp rises only while it is lit; an exhale's curls are born within 15 mm in front of her lips"`.
- [ ] **Step 2: Run** `npm test -- src/smoke/smoke.test.ts`. Expected: FAIL (module not found).
- [ ] **Step 3: Implement** `smoke.ts`, `SmokeCurls.tsx`, the sources and haze; add `smoke` to the state (computed with `storyTime`) and render it.
- [ ] **Step 4: Run** `npm test -- src/smoke src/scenes/klingelsturm`. Expected: PASS; profile `smoke.test.ts` in the task-done JSON report and keep a frame's `curlsAt` under 50 ms.
- [ ] **Step 5: Stills** of the wisp, the exhale plume at 0.5 s and 1.5 s, the haze after the jump and the ember in the dark; check the curls' rims and that nothing crosses the ceiling. Update CONTINUITY. Commit and push.

### Task 9: The coda's sounds

**Files:**
- Add: recordings for a flint lighter (strike, gas, release), cigarette crackle, an inhale and an exhale (CC0 / public domain, BigSoundBank or Wikimedia Commons, downloaded into a fresh scratch directory) under `assets/recordings/` with entries in `assets/recordings/recordings.json`
- Create: `scripts/make-cigarette.mjs` (cuts and levels `public/sfx/coda/lighter-strike.wav`, `lighter-hiss.wav`, `lighter-release.wav`, `drag.wav`, `inhale.wav`, `exhale.wav`)
- Modify: `scripts/make-stairwell.mjs` (`WAV_SOURCES` += `coda/*`, `SOURCES` += `cloth2`), `public/sfx/CREDITS.md`, `offenceCues.ts` (`codaCues()`), `doorCues.ts` (`hisSteps` until `jumpCut`, fading), `sounds.test.ts`

**Interfaces:**
- Produces: `codaCues(): BellCue[]`: `stairwell/cloth2` at `phoneAway[0]`; `stairwell/coda/lighter-strike` at `flick`; `lighter-hiss` over `flame`; `lighter-release` at `flame[1]`; `drag` over each draw and `laterDraw`; `inhale` with the first draw; `exhale` over `exhale` and `darkExhale`. His steps after he comes out: only before `jumpCut`, length ending by `jumpCut`, volume `OUT_ON_THE_LANDING × heardFrom(distance from the camera, 2.5)`.

- [ ] **Step 1: Write the failing tests:** `"the lighter strikes on the flick, hisses while the flame burns and clicks when she lets go"`; `"every draw crackles and every exhale breathes, all through the stairwell"`; `"his steps fade as he goes down and stop at the jump cut"`; `"every new file exists, comes from a CC0 or public-domain recording and is credited"`; the existing `"no Klingelsturm sound runs over the cut into the rain"` stays green.
- [ ] **Step 2: Run** `npm test -- src/scenes/klingelsturm/sounds.test.ts`. Expected: FAIL (no coda cues).
- [ ] **Step 3: Implement:** find the recordings (check each licence page; no account), write `make-cigarette.mjs`, run it and `make-stairwell.mjs`, add the cues. If a recording is unusable, learn a synthesis from one with `scripts/spectral.mjs` and compare spectrograms; if no free source exists, stop and ask the user.
- [ ] **Step 4: Run** `npm test -- src/scenes/klingelsturm src/sound`. Expected: PASS.
- [ ] **Step 5:** Render the coda's audio (`npx remotion render Klingelsturm --frames=<GONE × 30>-<end × 30> --codec=wav <scratch>/coda.wav`) and check the cues' levels and onsets in it. Update CREDITS and CONTINUITY. Commit and push.
