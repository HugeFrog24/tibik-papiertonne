# Vertical Format and Subtitles Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render the film in 16:9 and 9:16 from one codebase, and replace the speech bubbles with one fixed subtitle bar shared by both formats.

**Architecture:**
- A format (`"wide"` 1920 × 1080, `"tall"` 1080 × 1920) is read from the composition size. Every projection, camera choice and overlay layout takes it as a parameter; the default is `"wide"`, so existing callers keep today's behaviour.
- Shots gain an optional tall camera. `inFormat(shot, format)` swaps it in, so `ShotCameras` and `camerasOf` need no per-scene changes.
- Dialogue lines are cut into short timed chunks by a pure data module. One `SubtitleBar` component draws the current chunk, placed per format.

**Tech Stack:** Remotion 4.0.540, React Three Fiber, three 0.187, vitest, TypeScript.

**Spec:** docs/superpowers/specs/2026-11-08-vertical-and-subtitles-design.md

## Global Constraints

- Formats: wide 1920 × 1080, tall 1080 × 1920. Tall composition ids are the wide ids suffixed `-9x16`, in a "Vertical" folder.
- Chunks: 3–5 words on one line, broken at commas and clause ends, never inside a word; at most two lines when a chunk cannot be shortened.
- Timing: chunks follow each other inside the line's `[from, to]`, sharing it in proportion to their length. Each chunk is at least 1 s, or its whole line if the line is shorter.
- Reading speed: spec target ≤ 17 cps per chunk. See Ruling R1 for how this is enforced.
- Tall safe area: the centred 900 × 1400 box of the 1080 × 1920 frame (x 90–990, y 260–1660).
- Speaker styles:
  - Tibik green, Karen lilac.
  - Karen's shouted lines (`tone: "shout"`) are bold capitals in the shout font.
  - Phone voices are italic.
- Unchanged: line timings, mouths, spray, story, choreography, physics, and the wide format's cameras.
- Repo rules:
  - no code comments (run `node scripts/strip-comments.mjs`);
  - no duplicated general code;
  - commit as HugeFrog24 on main, no AI trailers;
  - `npx tsc --noEmit -p .` and eslint clean before each commit.

## Rulings made while planning (owner, please confirm)

- **R1 — reading speed:** 13 of the film's 30 lines already run 17.4–20 cps (ledger 2026-11-04). A hard 17 cps chunk bar would force retiming those lines, with their mouths, spray and cuts. Line timing is meant to follow the recorded voices later (memory: final-format-plan).
  - So the chunk test fails above 20 cps, the film's existing line rule.
  - A census test lists chunks above 17 cps without failing, so the voice pass can fix them.
  - Cost if wrong: some chunks read at up to 20 cps until the voices retime the lines.
- **R2 — tall framing rule:** a two-shot cannot always hold both people in 9:16. The tall rule is therefore:
  - whoever is speaking keeps their head in frame for the whole line;
  - in shots with no dialogue, every character the wide shot shows keeps their head in frame;
  - staged exits and entrances are exempt as in the wide checks.
  - Cost if wrong: a listener can leave the tall frame while the other person talks.

## Review Focus

1. **A line with a long compound word and no punctuation** ("Haben Sie überhaupt eine Weisungsbefugnis?"): chunks break only at spaces and each chunk still fits the bar. Test in Task 1.
2. **Two lines back to back with no gap:** the bar never shows two chunks at once or a chunk outside its line. Test in Task 1.
3. **A medium shot where the bar sits low and a character is close** (the Klingelsturm mediums on Karen): the bar never covers an eye or the mouth of anyone on screen. Test in Task 2 (wide) and Task 4 (tall).
4. **Rain in the tall frame:** drops are culled against the tall frame, not the wide one, so the top and bottom of a tall frame still get rain. Test in Task 3.
5. **The "Zwei Wochen später." caption in tall:** it sits inside the tall safe area, not in the status-bar band. Test in Task 3.

---

### Task 1: Subtitle chunks

**Files:**
- Modify: `src/frameRate.ts`. Add `FORMATS`, `Format` and `formatOf`; `FRAME_SIZE` stays as `FORMATS.wide` until Task 3.
- Create: `src/dialogue/subtitles.ts`
- Test: `src/dialogue/subtitles.test.ts`

**Interfaces:**
- Produces:
  - `FORMATS: { readonly wide: { width: 1920; height: 1080 }; readonly tall: { width: 1080; height: 1920 } }`
  - `type Format = keyof typeof FORMATS`
  - `formatOf(size: { readonly width: number; readonly height: number }): Format`, returning `"tall"` when height > width.
  - `SUBTITLE = { words: [3, 5], minSeconds: 1, maxCps: 20, targetCps: 17, maxLines: 2 }`
  - `SUBTITLE_BAR: Record<Format, { readonly centerX: number; readonly bottom: number; readonly maxWidth: number; readonly fontSize: number; readonly lineHeight: number; readonly padding: number }>` with values:
    - wide: centerX 960, bottom 1010, maxWidth 1560, fontSize 54
    - tall: centerX 540, bottom 1400, maxWidth 900, fontSize 58
    - lineHeight and padding are proportional to fontSize; the implementer picks them so two lines fit the safe area.
  - `type Chunk = { readonly text: string; readonly lines: readonly string[]; readonly from: number; readonly to: number; readonly speaker: Speaker; readonly tone: Tone; readonly line: string }`
  - `chunksOf(line: Line, format: Format): Chunk[]`
  - `chunkAt(lines: readonly Line[], t: number, format: Format): Chunk | null`
  - `barRect(chunk: Chunk, format: Format): { left: number; top: number; width: number; height: number }`
- Consumes: `textWidth`, `typeOf` from `src/dialogue/bubbleText.ts` (moved in Task 2); `Line`, `Speaker`, `Tone` from `src/dialogue/line.ts`; the Hausmuell and Klingelsturm `LINES` exports for the film-wide tests.

- [ ] **Step 1: Write the failing tests** in `src/dialogue/subtitles.test.ts`:

```ts
test.each(["wide", "tall"] as const)("%s: every dialogue line in the film is cut into chunks that cover it in order, inside its span, never overlapping", (format) => {
  for (const line of ALL_LINES) {
    const chunks = chunksOf(line, format);
    expect(chunks.map((c) => c.text).join(" ")).toBe(line.text.replace(/\s+/g, " ").trim());
    expect(chunks[0].from).toBeCloseTo(line.from, 9);
    expect(chunks[chunks.length - 1].to).toBeCloseTo(line.to, 9);
    chunks.forEach((c, i) => i > 0 && expect(c.from).toBeCloseTo(chunks[i - 1].to, 9));
  }
});
test.each(["wide", "tall"] as const)("%s: each chunk has 3-5 words where the time allows, at least 1 s (or its whole line), at most 20 characters a second, breaks only at spaces and fits the bar in at most two lines", ...);
test("long words are never split: 'Haben Sie überhaupt eine Weisungsbefugnis?' breaks only between words", ...);
test("the bar shows at most one chunk at any moment, and only during its line", ...);
test("census: chunks above the 17 cps target are listed for the voice pass (does not fail)", ...);
```

  - `ALL_LINES` is the Hausmuell and Klingelsturm `LINES` together.
  - The two `...` tests assert exactly what their names say. For the bar width, take `textWidth` of each of `chunk.lines` with `typeOf(chunk.tone)`, at `SUBTITLE_BAR[format].fontSize`, against `maxWidth - 2 * padding`.

- [ ] **Step 2: Run** `npx vitest run src/dialogue/subtitles.test.ts`. Expected: FAIL, module `./subtitles` not found.

- [ ] **Step 3: Implement `src/frameRate.ts` additions and `src/dialogue/subtitles.ts`.**
  - Chunking:
    - Split the line's words.
    - n = clamp(ceil(words / 5), 1, max(1, floor((to − from) / 1 s))).
    - Pick break points among the spaces so chunk word counts are as even as possible, preferring the spaces after `,` `.` `?` `!` `…` `—`.
  - Time: share `[from, to]` in proportion to each chunk's character count.
  - Lines: wrap each chunk greedily to `maxWidth − 2 · padding`, at most two lines.
  - `chunkAt`: the chunk whose `[from, to)` holds t.
  - `barRect`: width = widest line + 2 · padding, height = lines · lineHeight + 2 · padding, centred on centerX, bottom edge at `bottom`.

- [ ] **Step 4: Run** `npx vitest run src/dialogue/subtitles.test.ts`. Expected: PASS. Read the census output and ledger the lines above 17 cps.

- [ ] **Step 5: Commit.** `git add -A && git -c user.name=HugeFrog24 commit -m "Subtitle chunks for both formats: ..."`

---

### Task 2: The subtitle bar replaces the speech bubbles (wide)

**Files:**
- Create: `src/dialogue/SubtitleBar.tsx`, `src/useFormat.ts`
- Rename: `src/dialogue/bubbleText.ts` → `src/dialogue/text.ts`, keeping only `TEXT`, `typeOf`, `textWidth` and `wrapText`. Update imports in `subtitles.ts`, `caption.test.ts` and any others tsc reports.
- Delete: `src/dialogue/SpeechBubble.tsx`, `src/dialogue/bubbleText.test.ts`, and the bubble-only parts of `src/dialogue/dialogue.test.ts` (`bubbleShapes` / `depthIn` / tail tests). Keep its line-order and reading-time tests.
- Modify:
  - `src/dialogue/line.ts`: remove `Box`, `bubbleBox` and `Line.box`.
  - `src/dialogue/DialogueTrack.tsx`: props `{ lines }` only; renders `<SubtitleBar chunk={chunkAt(lines, t, format)} format={format} />`.
  - `src/scenes/hausmuell/choreography.ts`, `src/scenes/klingelsturm/choreography.ts` and `calls.ts`: drop every `box:`.
  - `Hausmuell.tsx`, `Klingelsturm.tsx`: drop `tailTo`.
  - `src/scenes/klingelsturm/solve.ts`: remove `tailTo` and `karenVoice`.
  - `src/scenes/hausmuell/speakers.ts`: remove `mouthOnScreen` if nothing else uses it.
  - Tests: remove the tail tests in `src/scenes/klingelsturm/physics.test.ts` (~221, ~437, ~533) and `voice.test.ts`. Where such a test also checks that his mouth is visible while he speaks (~533), keep that part.
- Modify: `src/scenes/sceneChecks.ts`. Add `facesUnderBar`.
- Test: `src/scenes/hausmuell/physics.test.ts`, `src/scenes/klingelsturm/physics.test.ts` (one new test each).

**Interfaces:**
- Produces:
  - `useFormat(): Format`, which is `formatOf(useVideoConfig())`.
  - `SubtitleBar: React.FC<{ readonly chunk: Chunk | null; readonly format: Format }>`
  - `SPEAKER_INK: Record<Speaker, { readonly color: string; readonly italic: boolean }>`, defined in `subtitles.ts`:
    - tibik `#7bd65a`, not italic;
    - karen `#e6b3ff`, not italic;
    - phone `#ffffff`, italic.
  - The shout tone uses the shout font, bold.
  - `facesUnderBar(times: readonly number[], chunkAt: (t: number) => Chunk | null, cameraAt: (t: number) => CameraSetup, facesAt: (t: number) => readonly Vector3[], format: Format): string[]`
    - It reports any face point (each eye, the mouth) that projects inside the bar's rectangle grown by 12 px while a chunk shows.
- Consumes: Task 1's `chunkAt`, `barRect`, `SUBTITLE_BAR`, `Chunk`, `Format`. From `screen.ts`: `onScreen` and `inFront`; Task 3 adds their format parameter, so in this task call them without it (wide).

- [ ] **Step 1: Write the failing tests.**
  - Hausmuell and Klingelsturm `physics.test.ts`, each: `"the subtitle bar never covers an eye or the mouth of anyone on screen while it shows"`, which expects `facesUnderBar(dialogueFrames, (t) => chunkAt(LINES, t, "wide"), cameraAt, facesAt, "wide")` toEqual `[]`.
    - `facesAt` returns the eye and mouth points of each character in the frame (`mouthInWorld` plus the eye spheres from `bodyColliders(...).head` filtered by `/eye/`).
  - `src/dialogue/line.test.ts`: `"no dialogue line carries a screen position any more"`, which expects `ALL_LINES.every((l) => !("box" in l))`.
- [ ] **Step 2: Run** both files. Expected: FAIL. `facesUnderBar` is not exported, and the lines still have `box`.
- [ ] **Step 3: Implement** the files above.
  - The bar: a dark translucent rounded panel `rgba(10,10,12,0.62)`, positioned absolutely from `barRect`, with text in `SPEAKER_INK`.
  - Add the deletions and renames listed under Files.
- [ ] **Step 4: Run** the full suite, `node scripts/test.mjs --reporter=default`. Expected: all green, with the bubble tests gone.
- [ ] **Step 5: Stills.** `node scripts/stills.mjs <out> Hausmuell:150,450 Klingelsturm:600,1290`. Check by eye that the bar reads, sits low and centred, and covers no face. Then commit.

---

### Task 3: The format reaches cameras, projection, rain and the caption; tall compositions exist

**Files:**
- Modify:
  - `src/frameRate.ts`: remove `FRAME_SIZE` and update its users.
  - `src/dialogue/screen.ts`: `onScreen(point, setup, format: Format = "wide")`, `withinFrame(xy, margin = 0, format: Format = "wide")`, `seenBy(point, setup, margin = 0, format: Format = "wide")`. The projection camera's aspect comes from `FORMATS[format]`, one camera per format.
  - `src/Karen/sprayChecks.ts`: use `FORMATS.wide` where it used `FRAME_SIZE`.
  - `src/weather/rainDrops.ts`: `rainSeenBy(t, camera, solids, bodies, share = 1, format: Format = "wide")`; the view aspect comes from `FORMATS[format]`.
  - `src/toon/shots.ts`:
    - `Shot.tall?: (t: number) => CameraSetup`;
    - `inFormat<S extends Shot>(shot: S, format: Format): S`, which swaps `at` for `tall` when tall;
    - `camerasOf(...).cameraAt(t, format: Format = "wide")`;
    - `reframe(at: (t: number) => CameraSetup, change: { readonly aimAt?: (t: number) => Vec3; readonly fov?: number }) => (t: number) => CameraSetup`, the shared helper for tall cameras.
  - `src/toon/ShotCameras.tsx`: call `camera(inFormat(shot, useFormat()), sinceCut)`.
  - `src/scenes/nachtruhe/Nachtruhe.tsx` and `src/scenes/rundschreiben/Rundschreiben.tsx`: `cameraAt(t, format)` and `rainSeenBy(..., format)` with `format = useFormat()`.
  - `src/dialogue/Caption.tsx`: `CAPTION_BOX` keyed by format; tall at left 90, top 300.
  - `src/Root.tsx`: register every Film and scene composition for each format. Wide ids stay unchanged; tall ids get `-9x16` and go in a `Folder name="Vertical"`. Use one map over `FORMATS`.
- Test: `src/dialogue/screen.test.ts` (new), `src/toon/shots.test.ts` (new or existing), `src/weather/rainDrops.test.ts`, `src/dialogue/caption.test.ts`.

**Interfaces:**
- Produces: the signatures above. Every later caller passes `format` explicitly.
- Consumes: Task 1's `FORMATS`, `Format`, `formatOf`; Task 2's `useFormat`.

- [ ] **Step 1: Write the failing tests.**
  - `screen.test.ts`:
    - `"a point straight ahead projects to the middle of the frame in both formats"`: `onScreen(ahead, setup, f)` equals `[FORMATS[f].width / 2, FORMATS[f].height / 2]` within 1e-6.
    - `"a point 40° to the side is in the wide frame and outside the tall one"`.
  - `shots.test.ts`:
    - `"a shot without a tall camera films the same in both formats; with one, the tall format uses it"`.
    - `"reframe keeps the camera's position and changes only its aim and lens"`.
  - `rainDrops.test.ts`: `"in the tall format the rain reaches the top and bottom of the frame"`.
    - Some drop whose screen y in tall is < 200 and one > 1720, for a fixed street setup.
  - `caption.test.ts`: `"in the tall format the caption sits inside the safe area"`, with box x in [90, 990] and y in [260, 1660].
- [ ] **Step 2: Run** the four files. Expected: FAIL, with no format parameter and no `inFormat`.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** the full suite. Expected: green; the wide behaviour is unchanged.
- [ ] **Step 5: Render tall stills.** `node scripts/stills.mjs <out> Hausmuell-9x16:150 Klingelsturm-9x16:600 Treppenhaus-9x16:200 Papiertonnen-9x16:285 Nachtruhe-9x16:400 Rundschreiben-9x16:450`. Expected: tall frames render with unchanged cameras and a bar inside the safe area. Then commit.

---

### Task 4: Tall framings, scene by scene

**Files:**
- Modify: `src/scenes/sceneChecks.ts`. Add `speakerOutOfTallFrame(times, linesAt, cameraAt, headsAt, staged)`, which reports frames where the speaking character's crown or eyes are outside the tall frame.
- Modify: each scene's `cameras.ts`, adding `tall` (via `reframe`) on the shots the checks flag. Dialogue scenes first.
- Test: each scene's `physics.test.ts` gets the tall checks below. Rundschreiben's `insert.test.ts` or `physics.test.ts` gets the letter check.

**Interfaces:**
- Consumes:
  - Task 3: `cameraAt(t, "tall")`, `reframe`, `seenBy(…, "tall")`;
  - Task 2: `facesUnderBar(…, "tall")`;
  - the existing `headCroppedPartway(times, shotAt, cameraAt, tibikAt, staged)`, called with a tall `cameraAt`.
- Produces: `speakerOutOfTallFrame` in sceneChecks.

- [ ] **Step 1: Write the failing tests (all scenes at once).**
  - Hausmuell and Klingelsturm: `"in the tall format whoever speaks keeps their head in frame for the whole line"` and `"in the tall format the bar never covers an eye or a mouth"`.
  - Every scene: `"in the tall format no shot loses his head part-way"`, which reuses `headCroppedPartway` with the tall camera and the scene's existing staged windows.
  - Shots with no dialogue: each character the wide shot shows stays in the tall frame (Ruling R2).
  - Rundschreiben: `"in the tall format every line of the letter insert is inside the frame"`, projecting the letter's text-block corners.
- [ ] **Step 2: Run** them. Expected: FAIL on the shots the 2026-11-08 census found (30 of 57 shot-and-character pairs).
- [ ] **Step 3: Add `tall` cameras shot by shot until each scene's tall tests pass.** Order: Hausmuell, Klingelsturm, Rundschreiben, Papiertonnen, Treppenhaus, Nachtruhe.
  - Prefer `reframe` aimed at the current speaker over cutting.
  - Render tall stills of each changed shot and check them by eye.
  - Commit per scene.
- [ ] **Step 4: Run** the full suite. Expected: green.
- [ ] **Step 5: Commit** (the last scene's).

---

### Task 5: Audit both formats and record the settled facts

**Files:**
- Modify:
  - `docs/CONTINUITY.md`: replace the bubble rules with the subtitle rules; add the two formats and the tall framing rule, with **(test)** marks.
  - The ledger.

- [ ] **Step 1: Render stills of every shot in both formats.** Take each shot's middle frame; use `node scripts/stills.mjs` with all compositions in one run.
- [ ] **Step 2: Check them by eye**: bar placement, faces clear, nothing cropped that matters, nothing passing through anything. Fix anything found test-first, inside the owning task's files.
- [ ] **Step 3: Update CONTINUITY.** Run `node scripts/strip-comments.mjs`, tsc, eslint and the full suite. Commit.
