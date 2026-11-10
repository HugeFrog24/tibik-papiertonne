# Vertical format and subtitles — design

Status: approved in direction by the owner (2026-11-08); build only after the gait rework is finished.

## Goal

Render the film in two formats from one codebase: the current 16:9 (1920 × 1080) and a vertical 9:16 (1080 × 1920) for YouTube Shorts and TikTok, which the owner leans towards as the release format. Replace the speech bubbles with one fixed subtitle bar shared by both formats.

## Owner's decisions

- Keep both formats. Nothing in 16:9 is deleted, and nothing is duplicated to make 9:16.
- Speech bubbles go. Each one sits somewhere else, which is hard to follow and does not survive reframing. Fixed-position subtitles are the norm on short-form platforms.
- Voices (narrator and actors) come later and do not change this design.

## Recommendation awaiting the owner: pacing

Short phrases, not word by word.

- A chunk is 3–5 words on one line, broken at commas and clause ends, never inside a name or a number.
- Chunks follow each other inside the line's existing `[from, to]` span, sharing it in proportion to their length.
- Each chunk stays on screen for at least 1 s (Netflix's floor is 5/6 s; short-form guides suggest 1–1.5 s) and is read at no more than 17 characters per second (Netflix's German adult limit).
- Word by word needs a timing for every word, which needs real recorded voices. Once voices exist, the chunks can be retimed to the audio by forced alignment, and the current word can optionally be lit inside its phrase. That is an add-on, not a rewrite.

If the owner chooses word by word instead, only the chunking rule changes; everything else in this design stays.

## Design

### One format setting, read by everything

- `FRAME_SIZE` (today one constant, `src/frameRate.ts`) becomes a value per format: `FORMATS = { wide: 1920 × 1080, tall: 1080 × 1920 }`.
- `Root.tsx` registers every film and scene composition twice: the existing ids (wide) and a "Vertical" folder (tall, ids suffixed `-9x16`), each with the same component. The format reaches the component as a prop.
- `dialogue/screen.ts` (`onScreen`, `seenBy`, the margin checks) takes the frame size from the format instead of the constant. Every caller passes the format; the existing tests run in the wide format unchanged.

### Cameras: one shot list, vertical framing only where needed

- three.js keeps the vertical field of view when the aspect changes, so a tall render of an unchanged camera shows the middle of today's frame.
- `Shot` gains an optional `tall?: (t: number) => CameraSetup`, the whole camera for the tall format (shots can build it from their wide camera with a shared helper that re-aims and narrows it). Without it, the tall render uses `at` unchanged.
- The 2026-11-08 census found 27 of 57 shot-and-character pairs keep the head inside a centred 9:16 crop. The others, mostly two-person dialogue shots (the Hausmuell over-the-shoulders, the Klingelsturm mediums on Karen, the Flur shots), get a tall framing: aimed at the speaker, or tighter singles where a two-shot cannot hold both.
- `lensProblems`, `headCroppedPartway` and the camera-clearance checks run for both formats (`test.each` over formats). The existing `VERTICAL_CROP` census becomes part of those checks.

### The subtitle bar

- One component, `dialogue/SubtitleBar.tsx`, replaces `SpeechBubble.tsx` in `DialogueTrack`. It is placed by the format: low in the frame and centred, inside the safe area.
  - Tall: inside a centred ~900 × 1400 area of 1080 × 1920, above the bottom ~480 px of platform buttons and captions, clear of the right-hand buttons.
  - Wide: the usual lower third.
- Pure layout and timing live in a data module (`dialogue/subtitles.ts`): chunking, timing, font size per format, line fitting. The component only draws.
- Speakers:
  - Each speaker has a colour: Tibik green, Karen lilac.
  - Karen's shouted lines (`tone: "shout"`) keep the comic beat in bold capitals.
  - Phone voices (`speaker: "phone"`: the answering machine, the dispatcher) are set in italics, the usual convention for a voice off screen.
- `Line.box` and `bubbleBox` and the 21 hand-placed boxes are removed. `Line` keeps speaker, from, to, text, name and tone; mouths, spray, voices and sound cues keep reading the same timings.

### What does not change

- Story, timing of lines, mouths and spray.
- Every scene's choreography and physics.
- The 16:9 framing: the wide format is today's film minus the bubbles plus the bar.

## Tests

- **Subtitles (data module):**
  - every chunk stays within its line's span;
  - chunks never overlap and keep the line's order;
  - each chunk is at least 1 s (or its whole line, if the line is shorter) and at most 17 characters per second;
  - one line per chunk, fitting the bar's width in both formats;
  - breaks fall only at spaces, preferring punctuation;
  - every dialogue line in the film is covered.
- **Bar placement:** inside each format's safe area, never over a speaker's face in any frame (projected head and eyes vs. the bar's rectangle, per format).
- **Framing:** the existing per-scene framing and lens checks run for both formats; a shot added later without a needed tall framing fails.
- **Removal:** no `bubbleBox` or `box` left; the bubble tests are replaced by the subtitle tests.

## Order of work

1. Subtitle bar in the wide format (replaces the bubbles). Commit.
2. Format setting threaded through `screen.ts` and `Root.tsx`, with tall compositions that render with unchanged cameras. Commit.
3. Tall framings shot by shot, dialogue shots first, each with its framing test green. Commit per scene.
4. Stills of every shot in both formats, checked by eye.

## Out of scope

- Word-level timing and highlighting (later, with voices).
- Recording or generating voices.
- Choosing the release format; both stay renderable.
- Trims and length changes (the owner's own viewing decides those).

## Open questions for the owner

- Pacing: short phrases (recommended) or word by word.
- Speaker colours: green and lilac, or plain white with a name tag the first time each speaker talks.
