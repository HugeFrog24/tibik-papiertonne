# Klingelsturm Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the film with the agreed act: Hausmuell gains the „Wer sind Sie überhaupt?"/Weisungsbefugnis exchange and Tibik's exit; a new scene „Klingelsturm" shows Karen (Frau Schulz) besieging his door, calling the Hausverwaltung and 110, the light timing out, and a silent coda with the finished parcel.

**Architecture:** A new scene module `src/scenes/klingelsturm/` built like the existing scenes (choreography → solve with guards → cameras → view → sound), appended to the film with a declared time jump. Shared pieces go where they belong: the fisheye pass in `src/toon/`, mat-aware ground in `src/building/`, data-driven dialogue in `src/dialogue/`, the phone in `src/Karen/`, the Flur interior in `src/building/`, synthesised tones in `scripts/make-phone.mjs`.

**Tech Stack:** Remotion 4.0.540, @remotion/three, React Three Fiber 9, three 0.187, vitest 5, Node scripts for audio synthesis.

**Spec:** `docs/superpowers/specs/2026-11-03-klingelsturm-design.md`

## Global Constraints

- No code comments in the repo's own code; run `node scripts/strip-comments.mjs` before every commit.
- Commit and push to `main` as HugeFrog24; no AI/Claude/Co-Authored-By trailers.
- Everything is a pure function of time: no `Math.random` (use Remotion `random(seed)`), no wall-clock state; solvers go through `memoByFrame`.
- No clipping anywhere, ink outlines included; every new scene gets a per-frame „nothing passes through anything" test.
- Refactors are proven identical: solved states byte-identical (`snapshot.test.ts.tpl` in `.superpowers/sdd/2026-11-03-treppenhaus-preamble/`) and stills pixel-identical (`pngdiff.cjs` there, max 0).
- German copy exactly as in the spec; strangers say Sie; Karen shouts in capitals; no real brands, operators or legible addresses.
- Dialogue appears only as speech bubbles (no voice recordings).
- On Windows, a data module must not share a case-insensitive name with a component: use `xShape.ts` next to `X.tsx`.
- Tests run through `node scripts/test.mjs` (retries crashed Node 26 workers); stills through `node scripts/stills.mjs <Composition> <dir> <frames…>`.
- Each task ends with tsc, eslint, the touched tests green, a commit, and stills of the affected shots shown to the user before the next task starts.

## Review Focus

1. A foot half on a doormat's edge: the sole (outline included) must not sink into the mat on one side nor float on the other. Pinned in Task 2.
2. A bubble whose speaker is unseen (Tibik behind his door) or off-frame (insert, spyhole): its tail must still point at something on screen, or the bubble must not show in that shot. Pinned in Task 5.
3. Sounds at the time jump: no Klingelsturm cue starts before its scene, and no Hausmuell sound runs into it. Pinned in Task 5.
4. The fisheye pass at a different canvas size (Studio preview, half-resolution render): the render target follows the drawing-buffer size. Pinned in Task 1.
5. The landing in darkness after the light-out: the frame must still read (street spill through the stair windows, the phone screen glowing), never a black frame. Pinned in Task 8.

---

### Task 1: Fisheye pass (spike first)

**Files:**
- Create: `src/toon/fisheye.ts`, `src/toon/fisheye.test.ts`, `src/toon/FisheyePass.tsx`
- Modify: `src/Root.tsx` (dev Still `Fisheye-Test` showing the stairwell through the pass)

**Interfaces:**
- Produces: `FISHEYE = { strength: number; vignette: number }`; `barrel(p: readonly [number, number], strength: number): [number, number]` maps a screen point in [-1, 1]² (centre 0) to the source point to sample; `insideLens(p: readonly [number, number]): boolean` (round frame, radius 1); `<FisheyePass enabled: boolean />` placed inside a `ThreeCanvas`, renders the scene to a render target and draws it through the GLSL twin of `barrel` with a round vignette.

- [ ] **Step 1: Spike.** Inside a scratch `Fisheye-Test` Still, render the scene into a `WebGLRenderTarget` from `useFrame` (priority 1, manual `gl.render` of the scene, then of a full-screen quad) and render the Still with `scripts/stills.mjs`. If the frame comes out black or stale (no `useFrame` call per Remotion frame), stop and report to the user; fallback is a 120° lens plus the round vignette as a DOM overlay, no distortion.
- [ ] **Step 2: Write the failing tests** in `src/toon/fisheye.test.ts`:
  - `"the centre of the lens doesn't move"`: `barrel([0, 0], FISHEYE.strength)` equals `[0, 0]`.
  - `"distortion grows with distance from the centre and keeps direction"`: for r in 0.1…0.9, `|barrel([r, 0])|` is strictly increasing, `< r` (barrel samples inward), and `barrel([a, b])` is parallel to `[a, b]`.
  - `"the frame is round"`: `insideLens([0.7, 0.7])` false, `insideLens([0.6, 0.6])` true.
  - `"the render target follows the canvas size"` (Review Focus 4): `fisheyeTargetSize(1920, 1080, 1)` is `[1920, 1080]` and `fisheyeTargetSize(960, 540, 2)` is `[1920, 1080]` (drawing-buffer pixels = css size × pixel ratio).
- [ ] **Step 3: Run** `node scripts/test.mjs src/toon/fisheye.test.ts`; expected FAIL (module missing).
- [ ] **Step 4: Implement** `fisheye.ts` (`barrel` as r' = r·(1 − strength·(1 − r²)) along the same direction, `insideLens`, `fisheyeTargetSize(width, height, pixelRatio): [number, number]`) and `FisheyePass.tsx` (shader built from the same constants; target resized from `useThree((s) => s.size)` and `gl.getPixelRatio()`).
- [ ] **Step 5: Run** the tests; expected PASS. Render `Fisheye-Test`: straight stair lines bow outward towards the edge, the frame is round with a dark rim.
- [ ] **Step 6: Commit** `"Fisheye pass for the spyhole shot"`.

### Task 2: Mat-aware ground

**Files:**
- Create: `src/building/ground.ts`, `src/building/ground.test.ts`
- Modify: `src/building/doormatShape.ts` (export `matRise`), `src/scenes/treppenhaus/choreography.ts` (gait planned on `groundWithMats`), `src/Tibik/rig.ts` only if the drawn foot constants are not exported yet

**Interfaces:**
- Consumes: `DOORMATS`, `doormatRect`, `MAT_THICKNESS` (doormatShape.ts); `stairwellGround` (stairwell.ts); `floorLevel` (street/building.ts).
- Produces: `matRise(x: number, z: number, floor: number): number` (MAT_THICKNESS when a mat lying at `floor` contains the point, else 0); `groundWithMats(x: number, z: number): number` = stairwellGround plus the mat rise; `firstFloorGround(x: number, z: number): number` = floorLevel(1) plus the mat rise, valid anywhere on the 1. OG landing (both lanes) — the ground for Klingelsturm.

- [ ] **Step 1: Write the failing tests** in `src/building/ground.test.ts`:
  - `"on a mat the ground is the mat's top, beside it the floor"`: centre of Tibik's mat gives `floorLevel(1) + MAT_THICKNESS`; 5 cm outside its edge gives `floorLevel(1)`.
  - `"the 1. OG landing is level in both lanes"`: `firstFloorGround(-2.4, -9.6)` and `firstFloorGround(-1.0, -7.0)` both equal `floorLevel(1)`.
  - `"Tibik's drawn soles, outline included, never dip below the ground under them"` (Review Focus 1): for every plant of `treppenhausTibikGait()`, sample 21 points heel→toe along `plant.yaw` (as the existing tread test does); sole bottom = `ankle.y + RIG.foot.offset[1] − RIG.foot.size[1] − OUTLINE` must be ≥ `groundWithMats` at every sample − 1e-9.
- [ ] **Step 2: Run** `node scripts/test.mjs src/building/ground.test.ts`; expected FAIL (module missing; then the sole test fails on his mat: the outline sits 6 mm above the floor but the mat top is 20 mm up).
- [ ] **Step 3: Implement** `ground.ts`; plan `treppenhausTibikGait` on `groundWithMats`. If a preamble plant straddles the mat edge, move or resize Tibik's mat (shop sizes only), not his steps.
- [ ] **Step 4: Run** `node scripts/test.mjs src/building src/scenes/treppenhaus`; expected PASS (all existing Treppenhaus tests too). Snapshot: Treppenhaus states change only in Tibik's ankle heights over the mat; Papiertonnen and Hausmuell byte-identical.
- [ ] **Step 5: Commit** `"Stand everyone on top of the doormats"`. Stills: Treppenhaus 60 and 150.

### Task 3: Dialogue from data

**Files:**
- Create: `src/dialogue/DialogueTrack.tsx`, `src/dialogue/dialogue.test.ts`
- Modify: `src/dialogue/SpeechBubble.tsx` (tone `"phone"`), `src/scenes/hausmuell/choreography.ts` (`Line` gains layout), `src/scenes/hausmuell/Hausmuell.tsx` (bubbles from `LINES`)

**Interfaces:**
- Produces: `type Line = { speaker: "karen" | "tibik" | "phone"; from: number; to: number; text: string; name: string; tone: "shout" | "calm" | "phone"; box: { left: number; top: number; width: number; height: number; fontSize: number } }`; `<DialogueTrack lines={readonly Line[]} tailTo={(line: Line, t: number) => [number, number] | null} />` (null hides the tail); tone `"phone"`: jagged zigzag tail, ComicNeue at 0.85 of the given font size, slightly grey fill.

- [ ] **Step 1: Write the failing tests** in `src/dialogue/dialogue.test.ts`, as helpers used by every scene's lines: `"lines never overlap and run in order"`, `"karen always shouts in capitals"` (her text equals its upper-case form), `"strangers say Sie"` (no line contains „du ", „dich", „dir ", „dein").
- [ ] **Step 2: Run** it; expected FAIL (`Line` has no `tone`/`box`).
- [ ] **Step 3: Implement**: move the six Hausmuell bubbles' names, tones and boxes into `LINES` (values copied from `Hausmuell.tsx` unchanged); `Hausmuell.tsx` renders `<DialogueTrack lines={LINES} tailTo={(l, t) => (l.speaker === "phone" ? null : mouthOnScreen(t, l.speaker))} />`; add the `"phone"` tone.
- [ ] **Step 4: Run** the tests; expected PASS. Proof: Hausmuell frames 60, 150, 250, 330, 420 pixel-identical to before (`pngdiff` max 0).
- [ ] **Step 5: Commit** `"Drive the speech bubbles from the scene's lines"`.

### Task 4: Hausmuell extension

**Files:**
- Modify: `src/scenes/hausmuell/choreography.ts`, `cameras.ts`, `solve.ts` (only if the exit needs new solids), `physics.test.ts`; `src/timeline.ts` follows `HAUSMUELL_DURATION`

**Interfaces:**
- Consumes: `Line` (Task 3).
- Produces: `HAUSMUELL_DURATION = 28.5`; `hausmuellEnd(): HausmuellState` (state at 28.5, used by Task 5's continuity check).

Timetable (seconds into Hausmuell; lines 1–6 unchanged):

| Line | from–to | text |
|---|---|---|
| T | 16.0–17.4 | Wer sind Sie überhaupt? |
| K | 17.6–19.8 | SCHULZ! ICH WOHNE IHNEN GEGENÜBER! |
| T | 20.1–22.1 | Haben Sie hier eine Weisungsbefugnis? |
| K | 22.3–23.4 | …WIE BITTE?! |
| T | 23.7–25.4 | Schönen Tag noch, Frau Schulz. |
| K | 26.0–27.6 | DAS HAT EIN NACHSPIEL! |

Tibik turns towards the Haustür 24.6–25.2 and walks from 25.2, carrying the box as before; Karen follows from 27.0 at her heavy pace; the cut at 28.5 comes before Tibik reaches `DOOR_STEP` (his key stays off screen).

- [ ] **Step 1: Write the failing tests** in `physics.test.ts`: `"Tibik is still short of the door step when the scene cuts"` (`hausmuellEnd().tibik.position` lies outside the `DOOR_STEP` rectangle and more than 0.5 m from it); `"both walk off on their own feet"` (`tibikGait()` and `karenGait()` have plants after 25.2 and 27.0); the dialogue helpers from Task 3 on the new `LINES`.
- [ ] **Step 2: Run** them; expected FAIL.
- [ ] **Step 3: Implement** the lines, Tibik's turn and exit walk (gait steps with `rhythmicSteps`), Karen's follow, and two shots: Tibik answering (existing `onTibik` push-in style) and a wide in which he walks off and she storms after; the 180° rule test still covers every frame.
- [ ] **Step 4: Run** `node scripts/test.mjs src/scenes/hausmuell`; expected PASS (per-frame no-clipping over 28.5 s, 180° rule, new tests).
- [ ] **Step 5: Commit** `"Hausmuell: Wer sind Sie überhaupt?, the Weisungsbefugnis, and Tibik's exit"`. Stills: frames at 17, 21, 24, 27 s.

### Task 5: Klingelsturm blocking, bell and cameras

**Files:**
- Create: `src/scenes/klingelsturm/choreography.ts`, `cameras.ts`, `solve.ts`, `Klingelsturm.tsx`, `KlingelsturmSound.tsx`, `physics.test.ts`
- Modify: `src/building/stairwell.ts` (export `doorbellSolid(door: Door): Obb`, used by `FlatDoorView` — pixel-identical), `src/timeline.ts`, `src/Film.tsx`, `src/Root.tsx`, `scripts/make-phone.mjs` (create; chime only in this task), `scripts/make-stairwell.mjs` (new sources)

**Interfaces:**
- Consumes: `firstFloorGround` (Task 2), `FisheyePass` (Task 1), `DialogueTrack` and `Line` (Task 3), `HAUSMUELL_DURATION` (Task 4), `KAREN_SKELETON`, guards from `src/physics/guards.ts`.
- Produces: `KLINGELSTURM_DURATION`; `karenAt(t): KarenFrame`; `BELL_PRESSES: readonly (readonly [number, number])[] = [[0.6, 0.8], [1.4, 1.6], [2.2, 6.0]]`; `CHIME_PERIOD = 1.2`; `chimeTimes(): number[]` (one chime at each press start, then every `CHIME_PERIOD` while held); `solveKlingelsturm(t)` (memoByFrame); `TIME_JUMPS: readonly { from: "Hausmuell"; to: "Klingelsturm" }[]` in `src/timeline.ts`; `KLINGELSTURM_FRAMES`, `KLINGELSTURM_FROM`.

Karen stands on Tibik's mat facing his door (yaw −π/2), panting (chest bob 0.012 at 0.9 Hz, lean 0.05), right thumb to the bell. Shots: wide 0–2.4 (the „His door" set-up), Flur intercut slot 2.4–4.6 (Task 7 fills it; until then the wide continues), spyhole 4.6–6.0 (lens 1 cm outside the door leaf at the spyhole, `FisheyePass` on), wide 6.0 onward. Tibik's lines in this task: „Ja bitte?" 6.3–7.3, „Worum geht es denn?" 9.2–10.4, „Der Umwelt zuliebe nicht." 13.6–15.2; Karen's: „MACHEN SIE SOFORT AUF!" 7.5–9.0, „UM DEN KARTON! KAUFEN SIE SICH GEFÄLLIGST EINEN NEUEN!" 10.6–13.4. While Tibik is behind the door his bubble's tail points at the door leaf's centre projected on screen (until Task 7 moves „Der Umwelt zuliebe nicht." into the Flur intercut, where it points at his mouth).

- [ ] **Step 1: Write the failing tests** in `src/scenes/klingelsturm/physics.test.ts`:
  - `"Klingelsturm: nothing passes through anything, in any frame"` (pattern of the Hausmuell test, solids = stairwell walls, doors with `doorSolids`, railings, buttons, Karen).
  - `"her thumb is on the bell exactly while she presses it"`: gap between her right hand and `doorbellSolid(TIBIK_DOOR)` ≤ the Treppenhaus hold tolerance inside every `BELL_PRESSES` span, > 1 cm outside them.
  - `"her shoe outlines rest on the ground, mats included"`: lowest shoe point minus `INK_WIDTH` equals `firstFloorGround` under it ± 1 mm, every frame.
  - `"the chime repeats exactly while the button is held"`: `chimeTimes()` equals `[0.6, 1.4, 2.2, 3.4, 4.6, 5.8]`.
  - `"the cut from Hausmuell is a declared time jump"`: `TIME_JUMPS` contains `{ from: "Hausmuell", to: "Klingelsturm" }`; at t = 0 Tibik's door is shut (angle 0, lever 0) and her shoes are on her mat (`SHOES` unchanged).
  - `"cameras never sit inside or against a wall"` (pattern of the Treppenhaus test; the spyhole lens passes because it is outside the leaf).
  - `"frames solved in any order give the same result"`.
  - `"every bubble's tail points at something on screen"` (Review Focus 2): for each line and each frame it shows, `tailTo` is null or inside 0…1920 × 0…1080.
  - `"no Klingelsturm sound starts before the scene, no Hausmuell sound runs past its end"` (Review Focus 3): every cue time ≥ 0 and < duration in both scenes.
- [ ] **Step 2: Run** them; expected FAIL.
- [ ] **Step 3: Implement** in this order: `doorbellSolid` (prove `FlatDoorView` pixel-identical on Treppenhaus 0), choreography and solve (Karen guarded like `solveKaren` in Hausmuell, ground `firstFloorGround`), cameras, view (StairwellSet, StairwellLighting with lights 1, Karen, `DialogueTrack`, `FisheyePass` on the spyhole shot), chime: two-tone electronic chime synthesised in `scripts/make-phone.mjs` (E5 659 Hz then C5 523 Hz, 0.35 s each, exponential decay), muffled through the door on the landing (low-pass 1.2 kHz, −10 dB) and with the stairwell reverb via `make-stairwell.mjs`; timeline, `Film` series and a `Klingelsturm` composition.
- [ ] **Step 4: Run** `node scripts/test.mjs src/scenes src/building`; expected PASS.
- [ ] **Step 5: Commit** `"Klingelsturm: Karen at his door, the bell, the spyhole"`. Stills: 0.7, 3.0, 5.0 (fisheye), 8.0, 12.0 s.

### Task 6: The phone and the calls

**Files:**
- Create: `src/Karen/phoneShape.ts`, `src/Karen/Phone.tsx`, `src/sound/phone.test.ts`
- Modify: `src/scenes/klingelsturm/choreography.ts`, `Klingelsturm.tsx`, `KlingelsturmSound.tsx`, `physics.test.ts`; `scripts/make-phone.mjs`

**Interfaces:**
- Consumes: Task 5's scene; `Karen`'s `carrying` slot for the phone in her right hand.
- Produces: `PHONE = { size: [0.055, 0.12, 0.016] }`; `phoneAt(t): { inHand: boolean; screen: string }`; `DIALLED: readonly { digit: string; at: number }[]`; `CALLS` timetable; WAVs in `public/sfx/phone/`: `chime.wav`, `dtmf-0.wav`…`dtmf-9.wav`, `ringback.wav` (one 5 s cycle), `busy.wav` (2 s), `beep.wav`, `tape.wav`, `panting.wav`.

Timetable (seconds into Klingelsturm): she steps back off his mat to the landing beside her own door (x ≈ −1.3, z ≈ −9.3, facing his door) 14.0–15.4; phone out of the right trouser pocket 15.6–16.6 (appears in her hand only while the hand is at the pocket); speed dial 16.8; ringback 17.8; phone line „Hausverwaltung Musterstadt. Sie rufen außerhalb unserer Sprechzeiten an. Bitte hinterlassen Sie eine Nachricht nach dem Signalton." 20.0–24.0; beep 24.1; K „DAS IST EIN NOTFALL!" 24.4–25.6; hang-up 25.7; digits 1 at 26.0, 1 at 26.4, 0 at 26.8 (screen shows „1", „11", „110"); ringback 27.2; „Polizei-Notruf. Wo genau ist der Notfall?" 28.6–30.4; K „MEIN NACHBAR HAT EINEN KARTON AUS DEM HAUSMÜLL GENOMMEN!" 30.6–33.4; „Ist jemand verletzt oder in Gefahr?" 33.6–35.2; K „…Nein. ABER ER SAGT: DER UMWELT ZULIEBE!" 35.4–38.0; „Ein Karton ist kein Notfall. Missbrauch von Notrufen ist strafbar." 38.3–41.3; click 41.4; busy tone 41.5–43.5. Phone lines use tone `"phone"`, tail to the phone's screen position.

- [ ] **Step 1: Write the failing tests**:
  - `src/sound/phone.test.ts` (reads the WAVs, Goertzel power): `"each key plays its DTMF pair"` (1 → 697 + 1209 Hz, 0 → 941 + 1336 Hz dominate, the other row/column frequencies are ≥ 20 dB lower); `"the ringing tone is 425 Hz, 1 s on, 4 s off"`; `"the busy tone is 425 Hz, 480 ms on, 480 ms off"`; `"the chime is two tones, high then low"`.
  - In `physics.test.ts`: `"the phone appears only while her hand is at her pocket"`; `"the phone passes through nothing"` (phone OBB in her hand against her body and the set); `"110 is dialled before the police answer"`; `"the last spoken line is the dispatcher's"`; `"the runner comes three times"` (Hausmuell „Umwelt" line, Tibik's „Der Umwelt zuliebe nicht.", Karen's „DER UMWELT ZULIEBE!").
- [ ] **Step 2: Run** them; expected FAIL.
- [ ] **Step 3: Implement** the phone prop (body, big-key keypad texture via `drawnTexture`, glowing screen with the dialled digits), Karen's pocket and phone-holding arm poses, the calls, sounds from `make-phone.mjs` (DTMF per ITU-T Q.23 frequencies, ringing 425 Hz 1 s / 4 s, busy 425 Hz 480/480 ms, beep 1 kHz 0.4 s, tape screech as band-passed noise sweeping 2→5 kHz, panting as low-passed noise breaths at 0.9 Hz), stairwell versions, and the cues in `KlingelsturmSound.tsx`.
- [ ] **Step 4: Run** `node scripts/test.mjs src/sound src/scenes/klingelsturm src/Karen`; expected PASS.
- [ ] **Step 5: Commit** `"Klingelsturm: the phone, the Hausverwaltung and 110"`. Stills: 16.2, 21.0, 26.8, 39.0 s.

### Task 7: Tibik's Flur and the packing intercuts

**Files:**
- Create: `src/building/flurShape.ts`, `src/building/FlurSet.tsx`, `src/building/flur.test.ts`
- Modify: `src/scenes/klingelsturm/choreography.ts` (Tibik in the Flur), `cameras.ts` (two Flur shots), `solve.ts`, `Klingelsturm.tsx`, `KlingelsturmSound.tsx` (dry chime and tape in the Flur), `physics.test.ts`

**Interfaces:**
- Consumes: `FLUR` (stairwell.ts), `TIBIK_DOOR`, the Karton (`Karton`, `kartonPanels(size, open)` with open 0 for a closed box), Tibik's carrying slot.
- Produces: `FLUR_PARTS: readonly Part[]` (walls, ceiling, chest of drawers 0.9 × 0.45 × 0.8 m against the far wall, coat hooks, chime unit above the door, intercom handset beside it); `FLUR_SOLIDS`; `tibikAt(t)` for Klingelsturm; `PARCEL` states (open → closed → taped → labelled).

Intercut shots: 2.4–4.6 (folding the flaps shut, the book already inside) and 13.4–15.6 (tape across the top, screech at 14.0, „Der Umwelt zuliebe nicht." spoken here in his bubble with the tail to his mouth).

- [ ] **Step 1: Write the failing tests**: `flur.test.ts` — `"the Flur fits its floor and leaves the door's swing free"` (every part inside `FLUR`, none in the door leaf's swept area 0…SWUNG); in `physics.test.ts` — `"in the Flur nothing passes through anything"` (Tibik, box, book, tape, furniture), `"his hands are on the box while he folds and tapes"` (hold gaps like the Treppenhaus `HOLDS`), `"the chime is heard dry in the Flur and muffled on the landing"` (cue `src` per shot).
- [ ] **Step 2: Run** them; expected FAIL.
- [ ] **Step 3: Implement** the set (toon boxes, warm ceiling light, the existing door seen from inside), Tibik's packing choreography (standing, two-handed), the parcel states and label texture (no legible address), shots, sound.
- [ ] **Step 4: Run** `node scripts/test.mjs src/building src/scenes/klingelsturm`; expected PASS.
- [ ] **Step 5: Commit** `"Klingelsturm: Tibik packs the parcel in his Flur"`. Stills: 3.0, 14.0 s.

### Task 8: Light-out and the silent coda

**Files:**
- Modify: `src/scenes/klingelsturm/choreography.ts`, `solve.ts`, `cameras.ts`, `Klingelsturm.tsx`, `KlingelsturmSound.tsx`, `physics.test.ts`; `docs/CONTINUITY.md` (timer duration)

**Interfaces:**
- Consumes: `TIBIK_LIGHT_BUTTON`, `buttonSolid`, `doorSolids`, `treppenhausTibikGait` patterns (door exit, switch press, descent), `groundWithMats` / `firstFloorGround`.
- Produces: `LIGHT_TIMER` (seconds, within 30–1200); `lightsAt(t)`; `KLINGELSTURM_DURATION = 50.5`.

Timetable: switch-off warning 42.0–43.0 (two dips to 0.35, DIN 18015-2), off 43.2 with the relay click; dark until 44.5; lock click 44.6; his door opens 44.8–45.6 (inner lever, left hand); Tibik steps out with the parcel in his right arm 45.6–46.8; left hand on `TIBIK_LIGHT_BUTTON` 47.0 (lights up from 47.1); nod 47.4–47.8; to the stair top 47.9–49.0; down the first steps 49.0–50.5; end. Karen is still beside her own door (Task 6) and turns her head to follow him. No dialogue after 41.3.

- [ ] **Step 1: Write the failing tests**: `"the timer is a real stairwell timer and runs out right after the last word"` (`LIGHT_TIMER` within 30…1200; the switch-on time implied inside the time jump is before the scene; `lightsAt` falls to 0 at 43.2, two dips before); `"no word is spoken after the dispatcher's"`; `"his left hand is on the switch when the light comes back"`; `"the parcel passes through nothing on the way out and down"`; `"his soles stand on top of the mats and treads"` (the Task 2 sole test on the coda's plants); `"the dark frames still show the landing"` (Review Focus 5: a still at 44.0 s has mean luminance above 0.05 and the phone screen is the brightest region — checked from the rendered PNG in the stills review, recorded in the ledger).
- [ ] **Step 2: Run** them; expected FAIL.
- [ ] **Step 3: Implement** the light curve and relay cue, the coda (door exit and switch press adapted from the Treppenhaus choreography with the parcel in the right arm; descent planned with `groundWithMats`), Karen's step back and head turn.
- [ ] **Step 4: Run** `node scripts/test.mjs src/scenes src/building`; expected PASS.
- [ ] **Step 5: Commit** `"Klingelsturm: the light goes out, Tibik leaves with the parcel"`. Stills: 42.5, 44.0, 45.8, 47.2, 50.0 s.

### Task 9: Film review and continuity

**Files:**
- Modify: `docs/CONTINUITY.md` (Karen = Frau Schulz, 1. OG rechts, her shoes; the time jump; the light timer; the phone; the Flur), memory note via the session (not in the repo)

- [ ] **Step 1:** Full suite `node scripts/test.mjs`; expected all green.
- [ ] **Step 2:** Render Film stills across the new material (every shot of Hausmuell's extension and Klingelsturm, one frame each) and review for clipping, colour rules and bubble placement; fix anything found test-first.
- [ ] **Step 3:** jscpd (strict/mild/weak at 50 and 30 tokens) and a fresh read-only reviewer over the whole act; act on what's worthwhile.
- [ ] **Step 4:** Update `docs/CONTINUITY.md`; commit `"Klingelsturm: continuity notes"` and push.
