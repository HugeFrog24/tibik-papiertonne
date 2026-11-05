# Rundschreiben — design

Date: 2026-11-04. Status: design approved in conversation, spec awaiting review.

## Goal

An epilogue that lands the film's last joke without a word. Two weeks after
the Klingelsturm, on a rainy day, Tibik comes home, finds the Hausverwaltung's
circular to all tenants in his mailbox, reads its performative "Vie-len DANK."
four times, and drops it — folded, in its envelope — into the blue
Papiertonne. The letter itself says that only paper belongs in the
Papiertonne, so he follows it to the letter.

## Settled decisions

- **No duplicated general code (user's rule):** the house facade, the cars,
  the mailboxes, the bins, the trees and lamps, the lighting and the ambience
  come from the same shared components and data every scene already uses
  (see "Reuse, not copies"). The epilogue adds only what is new to it — rain,
  the overcast variant, Tibik's mailbox door, the envelope and letter, the
  caption, its own choreography and cameras — and extends the shared pieces
  through props instead of copying them. Checked by jscpd and by the existing
  scenes rendering unchanged.
- **When:** about two weeks after the Klingelsturm. The cut from Klingelsturm
  to Rundschreiben is the film's second **declared time jump**, announced by a
  comic caption box "Zwei Wochen später." over the first shot.
- **Weather:** it rains (a summer rain; the season stays summer). Rain and its
  sound make the new day readable at once.
- **What he finds:** a Rundschreiben from "Hausverwaltung Musterstadt" (the
  constant `HAUSVERWALTUNG` in src/street/building.ts) to all tenants of No. 12,
  in a white envelope. It is not a personal letter: it implicates without
  naming anyone, and Karen gets the same one (not shown). Her "Bitte keine
  Werbung!" sticker does not stop it; a circular from the Hausverwaltung is
  not advertising.
- **His mailbox** is the empty one, row 3 right, in the unit left of the
  Haustür (`mailboxSlot("Tibik")`).
- **Keys:** he arrives with his key ring already in hand. Where he keeps it
  stays deferred, as before.
- **Reading:** outside, at the mailboxes, in the rain (user's choice).
  Raindrops spot the paper while he reads.
- **Presentation:** the letter is shown readable in his hands (inserts), never
  read aloud. No dialogue in the whole scene. Karen is not seen.
- **Ending (user's choice):** he folds the letter back into its envelope,
  walks past the Haustür to the blue Papiertonne, lifts the lid and "kloppt"
  it in with a firm flick; the lid drops shut with a thud. He goes inside and
  the Haustür closes. This is the last shot of the film.
- **Everyday imperfections (user, 2026-11-05):** the props show the subtle,
  realistic marks of handling, never staged ones: the envelope torn open by
  hand, the letter folded by hand and never quite flat again, the envelope
  floppy, light that shows the folds. The film-wide rule and its review duty
  live in docs/CONTINUITY.md, "Everyday imperfections".
- **Look decisions the user made for this scene:** overcast, soft light (the
  approved softer self-shadows on characters fall out of it naturally: the sky
  light dominates and the sun is weak and diffuse).

## Story and shots

About 37 s at 30 fps; timings are targets the plan pins.

| # | Shot | Time | What happens |
|---|------|------|--------------|
| 1 | Wide, street towards No. 12 | 4 s | Rain, grey sky, wet pavement. Caption "Zwei Wochen später." for the first 3 s. Tibik walks along the pavement to the entrance, key ring in his right hand. The entrance lamp's motion sensor switches it on as he comes within range. |
| 2 | Medium, mailboxes | 5 s | He unlocks his box (row 3 right), its door swings open, he takes out the envelope, closes the door. |
| 3 | Medium close, his hands | 3 s | He lifts the envelope flap, pulls out the sheet (A4, folded in three) and unfolds it. |
| 4 | Insert 1, the letter | ≈ 11 s | The upper part of the letter in his hands: letterhead, date, subject, salutation and the body. A slow push-in. Raindrops land on the paper and leave darker spots. |
| 5 | Insert 2, the letter | ≈ 5 s | Cut closer to the bottom: the four "Vie-len DANK." and the signature. |
| 6 | Close-up, Tibik | 2 s | Deadpan; one blink. |
| 7 | Medium wide, entrance and bins | ≈ 7 s | He folds the letter, slides it back into the envelope, walks past the Haustür to the blue Papiertonne, lifts the lid, kloppt the envelope in; the lid thuds shut. He unlocks the Haustür, goes in, the door closes behind him. |

The camera keeps one side of the line between Tibik and the facade, as the
other street scenes do.

## The letter

A4, printed, folded in three. Letterhead and layout as a German
Hausverwaltung would send. The wording (German, final once this spec is
approved):

```
Hausverwaltung Musterstadt                       Musterstadt, 14.07.2026

An alle Mieterinnen und Mieter, Haus Nr. 12

Betreff: Hausordnung

Sehr geehrte Mieterinnen und Mieter,

aus gegebenem Anlass:
In die Papiertonne gehört nur Papier. Entnehmen ist nicht gestattet.
Streit gehört nicht ins Treppenhaus.

Vie-len DANK. Vie-len DANK. Vie-len DANK. Vie-len DANK.

Mit freundlichen Grüßen
Ihre Hausverwaltung Musterstadt
```

- The two paragraphs aim at both of them — the bins (Tibik) and the stairwell
  (Karen) — without naming either. The 110 call is left out on purpose: the
  Hausverwaltung could not know of it, and it is none of its business (user's
  decision, 2026-11-04).
- "Vie-len DANK." is spelled exactly so, four times on one line, as the user
  wrote it.
- **Readable:** the reading rule for speech bubbles applies to the inserts
  (at most 17 characters per second). Insert 1 carries salutation and body
  (about 160 characters, so at least 10 s); insert 2 carries the thanks line
  and the signature (about 90 characters, at least 5 s). The letterhead, date,
  address and subject are on screen too but are not counted as must-read.
- **Size:** the letter text is normal letter size (body 11–12 pt). The inserts
  frame part of the page so that a body text line is at least 40 px tall on the
  1080 p frame; the push-in only grows it.
- **The envelope** (DL, 220 × 110 mm, white, no window) shows the sender
  "Hausverwaltung Musterstadt" top left and "An alle Mieterinnen und Mieter"
  in the address field. It is readable in shot 2 only as a white envelope.
- The date is fictional and only has to be summer and in 2026 (the HU stickers
  on the cars run to 2027/2028).

## World and weather

- **Rain:** streaks fall slightly slanted with the film's breeze (the one wind
  on film time, towards +x). Each drop falls until the first surface below it
  — ground, kerb, step, balcony slabs and coping, car bodies, bin lids, the
  entrance lamp, the mailbox unit's top, Tibik — and stops there; where it
  stops on open ground it leaves a short splash ring. No drop is ever drawn
  below the surface it hit, inside a solid, or behind a balcony that shelters
  that spot. Drops near the camera are larger and more transparent; density
  reads as steady summer rain, not a storm.
- **Wet surfaces:** pavement and asphalt darker; a few shallow puddles along
  the kerb and in paving dips, with rain rings. The paper gets dark rain spots
  that stay once they land.
- **Light:** overcast grey sky; the sky (hemisphere) light dominates and the
  sun is weak, so shadows are faint and soft. This is the one scene that is
  not sunny: the "sun from the front-left in every scene" rule in
  CONTINUITY.md becomes "in every sunny scene".
- **Entrance lamp:** off by day in the other scenes; here its motion sensor
  switches it on (emissive glass, a small warm light) when Tibik comes within
  its range, and it stays on to the end of the scene.
- **Two weeks on:** the bins have been emptied; all lids are shut. The parked
  cars may stay as they are.

## Props

- **Mailbox door** for Tibik's box only (the other boxes stay painted on the
  unit's plate): a thin steel flap hinged on one vertical side, with the name
  strip, the slot and a lock cylinder; it swings out to about 100°, clear of
  the neighbouring boxes, the unit's edge and the facade, outlines included.
- **Envelope** and **letter sheet**: the sheet is three hinged panels (A4
  folded in three, the standard letter fold); a fold state from 0 (folded) to
  1 (flat) drives the panel angles. The envelope's flap is hinged too.
- **Key ring**: two keys on a ring, held in his right hand; the mailbox key
  goes into the box's lock, the house key into the Haustür's cylinder.

## Sound

- **Rain:** a recorded rain loop (public domain, CC0 or CC BY, credited in
  public/sfx/CREDITS.md), heard under the existing street ambience; inside the
  building, as he goes in, it muffles like the street does. If no suitable
  free recording is found, the user is asked before anything is synthesised.
- **Foley** (existing CC0 Kenney sounds where they fit): key into the lock and
  the lock turning, the mailbox door's latch and creak, paper rustle (envelope,
  unfolding, folding), the bin lid lifted and the firm thud as it drops, the
  Haustür's lock, opening and closing.
- No speech, no music.

## Structure

New units, each with one job:

- `src/weather/rain.ts` — deterministic rain: which drops are in view at a
  time, where each one is, and where it stops (first surface below it from the
  scene's solids and the character colliders). No randomness at render time:
  drops are seeded by index, so every frame renders the same in any order.
- `src/weather/Rain.tsx` — draws the streaks and splash rings from rain.ts.
- `src/weather/overcast.ts` — the rainy day's sky colour, light intensities and
  wet-surface colours, used by the street set through a `weather` prop.
- `src/street/mailboxDoor.ts` (+ `MailboxDoor.tsx`) — hinge, size and lock of a
  resident's box door from the existing mailbox grid; its solid at any angle.
- `src/props/letterShape.ts` (+ `Letter.tsx`, `Envelope.tsx`) — sizes, panel
  hinges and fold states; the letter's text layout (lines, sizes, positions in
  millimetres) and the drawn textures.
- `src/scenes/rundschreiben/` — `choreography.ts` (keyframes, gait, holds),
  `cameras.ts` (shots), `solve.ts` (state per frame: Tibik, mailbox door,
  envelope and letter, lid, Haustür, lamp), `letter.ts` (the wording),
  `Rundschreiben.tsx`, `RundschreibenSound.tsx`, and the tests.
- `src/timeline.ts` and `src/Film.tsx` — the new scene after Klingelsturm;
  `TIME_JUMPS` gains Klingelsturm → Rundschreiben.
- `src/dialogue/Caption.tsx` — the comic caption box ("Zwei Wochen später."),
  in the speech bubbles' lettering, for any later time jump too.

## Reuse, not copies

The scene draws the world through the same components every scene already
mounts, so nothing of the house, the street or its furniture is copied:

- `<Street>` (src/street/Street.tsx) draws No. 12 and No. 13, the facade,
  windows and balconies, the entrance with the Haustür, mailboxes, doorbell
  panel and lamp, the bins, cars, trees and lamps. It gains a `weather` prop
  (sunny by default, so the other scenes are unchanged pixel for pixel) for
  the wet colours, puddles and the lamp being on; the bins' lid angles come in
  through the props it already has.
- `<StreetLighting>` and `<Sky>` (src/street/StreetSet.tsx) gain the overcast
  variant through the same `weather` value; `<StreetAmbience>` plays under the
  rain loop as in every street scene.
- The collision world is the existing `STREET_SOLIDS` / `worldSolids`, plus
  Tibik's mailbox door at its current angle; the rain stops on those same
  solids.
- Tibik's box door is built from the existing mailbox grid (`MAILBOX_GRID`,
  `mailboxCell`, `mailboxSlot`); his painted cell on the plate stays where the
  door covers it, the other eleven boxes stay painted.
- Tibik's rig, gait planner and arm solver, the Haustür with its closer and
  lock, the bins with their lids, the speech-bubble lettering and the sound
  mixer are used as they are.
- Acceptance: jscpd at 50 tokens finds no new clone between the new scene and
  the existing scenes or the street code; the sunny scenes render pixel-
  identical with `weather` at its default.

## Continuity

- The declared time jump is the only break: at the start of the scene Tibik
  is outside on the pavement, the Haustür is shut, the bins are shut and
  emptied. **(test)**
- Same street, same No. 12, same mailbox (row 3 right), same sender name.
  **(test)**
- The scene ends the film; CONTINUITY.md gains its facts as they are built.

## Tests

No clipping, outlines included, as everywhere else.

- **Physics:** Tibik against the street solids, the mailbox unit and his box
  door, the bin and its lid, the Haustür; his hands hold the key ring,
  envelope and letter (each held edge inside the hand, never through it); the
  letter's panels never pass through each other or his hands; the envelope
  goes into the bin through the lid opening and lies inside it.
- **Rain:** no drop drawn below its first surface or inside a solid; sheltered
  spots under balconies stay dry; seeded drops are identical when a frame is
  rendered twice or out of order.
- **Readability:** in both inserts every body line projects at least 40 px
  tall; each insert is on screen at least characters / 17 seconds.
- **Lamp:** on from the moment Tibik is within the sensor's range to the end.
- **Continuity:** the time jump is declared; mailbox, sender and house number
  match the earlier scenes; the scene starts with door and lids shut.
- **Sound:** every cue has a source file, every source is credited, the rain
  loop muffles indoors.
- **No copies:** jscpd (strict, 50 tokens) reports no new clone involving the
  new files; the four existing scenes' stills and solved states are unchanged
  by the `weather` prop at its default.

## Out of scope

Wet fur or sheen on Tibik, an umbrella, rearranged cars, Karen (in shot or at
her window), and the parked look decisions (idle breathing, a second car body)
— those are separate work.
