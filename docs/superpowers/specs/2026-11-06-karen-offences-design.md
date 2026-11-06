# Karen's two offences in the Klingelsturm — design

Date: 2026-11-06. Status: design approved in conversation (four sections),
spec awaiting review.

## Goal

Karen accuses Tibik of breaking the house rules, yet she breaks them twice
herself on the same landing, and the Hausverwaltung's circular in the
epilogue still blames Tibik alone. Both offences stay inside the existing
Klingelsturm scene (`src/scenes/klingelsturm/`):

1. **The banging.** Between the answering machine and the 110 call she
   lowers the phone, stomps back to his door and pounds on it with her fist
   (a Ruhestörung in the strict sense), then goes back and dials.
2. **The cigarette.** After Tibik has left with the parcel and switched the
   light back on for her, she lights a cigarette where she stands. Smoking in
   the stairwell, an escape route, is against the Hausordnung. The timer light
   goes out on her a second time, and only the ember glows.

Neither offence is mentioned anywhere else: no line of dialogue, no caption,
and the circular keeps its wording.

## Settled decisions (user, 2026-11-06)

- **Go-ahead** for both offences in the Klingelsturm.
- **Silent pounding, he ignores it:** four heavy blows, a beat, two more,
  echoing; a short cut to Tibik in his Flur calmly taping, unbothered; back
  to her dialling 110. She says nothing while she bangs.
- **The light goes out on her again:** she lights up, drags, blows smoke;
  the timer light runs out on her again; only the ember glows in the dark
  before the cut to the dusk.
- **Cartoon smoke curls:** soft light-grey curls with ink outlines rising
  from the ember and her exhale, drifting up, slowing and fading, flattening
  under the ceiling instead of passing through it.
- **Nothing explains where the cigarette and lighter come from.** She has
  no pockets and it stays that way. The phone goes back the way it came out.
- **The hidden time jump:** the stairwell timer is 180 s, and Tibik restarts
  it, so about 2 min 50 s pass unseen in a cut. The half-smoked cigarette,
  the ash tip and the haze under the ceiling show that time has passed.
- **The lighter is plain red,** with no brand look.
- **The circular stays exactly as it is.**

## Beats and timing

All times are Klingelsturm film seconds. The plan pins the exact values from
Karen's gait; the targets below set the order and the rough lengths.

### Offence 1: the banging

| Shot | Target time | What happens |
|---|---|---|
| Medium: the answering machine | to 29.6 | "DAS IST EIN NOTFALL!" (27.7–28.9). She hangs up at 29.35 (unchanged) and tucks the phone back into her trouser pocket by 29.8 (2026-11-06: at his door no place at her side is reachable for a held phone; tucking it away was the user's own first idea). |
| Wide: the banging (the opening's Wide set-up) | 29.6–33.2 | She turns and stomps the 1.27 m back to his doormat (the spot `KAREN_AT_DOOR`, facing his door), about 1.6 s. She hits his door four times with the side of her left fist, 0.4 s apart. Then a beat of about 0.8 s: she glares at the door and pants. |
| Flur: the banging (the existing Flur set-up) | 33.2–35.2 | Tibik stands at the chest of drawers and calmly runs a second strip of tape across the first over the parcel. The shot shows the middle of his second taping. Blows five and six land, heard and seen from inside: the door leaf shifts at most 2 mm at its latch edge on each blow and settles within 0.1 s. He doesn't look up. |
| Medium: back to the phone | 35.2 → | She walks back to her spot (partly unseen during the Flur shot), draws the phone from her pocket to her eyes, and dials 1-1-0 0.4 s after it's up. |

Everything from the first "1" on (the police call, the click, the timeout,
his exit) moves later by the same amount, Δ ≈ 7 s. The phone's places, the
keys and the call lines after the hang-up are derived from the banging's
end, not typed in again.

### Offence 2: the cigarette

Built version (2026-11-06, decided during implementation, flagged to the
user; revised the same day after the user's notes and the approved reshape
of Karen): the cigarette sits in the right corner of her mouth; she lights
it one-handed, her head turned towards the lighter in her right hand, with
no cupping hand (a still stairwell needs none); the lighter goes down in
front of her and into her trouser pocket. Then her right hand takes the
cigarette from her lips and holds it at chest height, and after the jump
raises it for the draw during which the light goes out (the user: "I want
Karen have her hand on the cigarette while she smokes"; first built
hands-free because her old arms could not reach her mouth). The table
below is the approved design these replace where they differ.

| Shot | Target length | What happens |
|---|---|---|
| Wide: the light goes out (the current coda) | unchanged + ~0.8 s | The coda plays as it does now: the light goes out, he comes out, presses the switch, nods and goes down the stairs. Once he's out of the frame she puts the phone back at her hip, the reverse of the draw (about 0.5 s), and it leaves her hand. |
| Medium: the cigarette | ~4.2 s | Cut. The cigarette is already between her lips and the red lighter is in her right hand. The flint sparks and the flame lights; her left hand cups it and lights her face with a warm flicker. She draws twice; on the first draw the tip catches and glows. The flame goes out, and the lighter goes down and stays in her right hand. Her left hand takes the cigarette from her lips, and she blows a long plume up and to the side. |
| Wide: later (the coda's Wide set-up) | ~4.7 s | The hidden time jump. Half the cigarette is gone, there's a short grey ash tip, and a few faint flat wisps hang under the ceiling. She holds the cigarette at chest height, then raises it and draws. The relay clicks and the light goes out during the drag, with no warning blink. In the dark only the ember shows: brightest during the drag, faintly lighting her lips, nose tip and fingers, dimming as she lowers it. An exhale in the dark. About 3 s after the light goes out, the cut to Nachtruhe's dusk. |

The Klingelsturm grows from 57.7 s to about 74 s (Δ plus about 9.7 s).
Every later scene starts later by the same amount through the `SCENES`
list in `src/timeline.ts`.

### The time jump

Story time equals film time up to the cut into "Wide: later" and runs
`SKIP` seconds ahead after it. `SKIP` isn't typed in. It's derived so that
the second timeout lands exactly `LIGHT.timer` (180 s) of story time after
his press on the switch (`LIGHT_BACK[0]`), at the film time the beat table
gives it. That comes to about 170 s. Choreography, cameras and sound stay
keyed to film time. Only the light timer, the cigarette's burn and the haze
count story time.

## Props and look

- **Fist and door.** Karen's hand is a single blob; she strikes with its
  little-finger side at about 1.35 m on his door leaf, clear of the spyhole.
  The hand touches the leaf's surface for one or two frames, never goes past
  it, and recoils. From the landing nothing on the door moves. In the Flur
  shot the leaf moves at most 2 mm at the latch edge on each blow (the play
  of the latch in the strike plate) and settles within 0.1 s.
- **Tape.** The second strip uses the same roll, the same strip geometry
  and the same motion as the first, laid across it. From then on the parcel
  shows two strips, in the coda too.
- **Cigarette.** King size: 84 mm long, 8 mm across, white paper, a 25 mm
  cork-coloured filter. Thin ink, about 2 mm, like the bedroom's small
  fittings. It sits between her lips by the filter, no more than 10 mm inside
  them, tilted slightly down and to one side, and moves with her head. In her
  hand it sits at the front edge of the left hand blob, as if between two
  fingers. After the jump it is shorter by the burned length (see Research),
  with a short grey ash tip (the rest of the ash isn't accounted for; see
  Parked ideas).
- **Lighter.** A plain disposable flint lighter, about 80 × 25 × 12 mm: a
  red plastic body, a metal hood with the wheel, no brand look; thin ink,
  about 3 mm. Gripped in her right hand from the Medium on; it stays in that
  hand to the end of the scene.
- **Flame.** A 25 mm teardrop: yellow-white core, orange edge, a hint of
  blue at the base. It flickers in height and leans slightly. It is unlit
  (it glows by itself) and has no ink line. While it burns (about 1.5 s) it
  carries a small warm point light that lights her face and her cupping hand.
- **Ember.** The burning end glows dull orange-red at rest and bright
  orange-yellow during a drag (rising over 0.3 s, falling over 0.8 s). It is
  unlit and carries a tiny warm point light that reaches only her lips, nose
  tip and fingers, which is all that shows in the dark.
- **Smoke curls.** Two sources: a thin steady wisp rising from the burning
  end whenever the cigarette is lit, and a plume from her mouth on each
  exhale, blown forward, up and sideways, slowing, then rising. Each curl is
  a soft light-grey ball that grows, drifts in a gentle curl, slows and fades
  out over 2–4 s. Its ink line is a dark rim drawn in the curl's own shader,
  so line and fill fade together. The curls are left out of the screen-space
  ink pass, which would keep a full-black line around a half-transparent
  puff. A curl that reaches the ceiling over the landing stops rising and
  spreads flat. After the jump a few large, very faint (opacity ≤ 0.15) flat
  wisps hang under the ceiling. The curls are lit like everything else, so in
  the dark only those near the ember show.

## Sound

- **Blows.** Kenney *impactWood_heavy* takes (CC0, the same Impact pack the
  stomps come from), varied across the six blows, each with a very quiet
  latch rattle. On the landing (the Wide) they run through the stairwell
  reverb (`scripts/make-stairwell.mjs`): loud and echoing, about as loud as
  her stomps. In the Flur they use the behind-the-door treatment
  (`scripts/make-flur.mjs`): closer and boomier, the rattle clearer.
- **Around the blows.** Her stomps to his door and back use the shared
  `KarenStomp`. She pants through the beat and the walk back (the existing
  panting sound). Tibik's second strip makes the existing tape-pull screech.
- **Coda before the jump.** His footsteps go on down the stairwell and fade
  with distance (the descent the coda already plays). The phone going back to
  her hip gets an existing cloth rustle. The lighter: the flint wheel's rasp,
  the gas catching with a soft whoomph, a quiet gas hiss while the flame
  burns, a small click as she lets go. The draw: a faint crackle of paper and
  tobacco and her inhale; then a long, breathy exhale. All through the
  stairwell reverb.
- **Correction to the approved sound section:** the Haustür shutting far
  below isn't heard. His descent from the 1. OG takes about 10 s and the jump
  cut comes first, so he reaches the bottom in the skipped minutes. His
  footsteps simply stop at the jump cut, already faint.
- **After the jump.** The draw's crackle; the timer relay's damp, echoing
  click as the light goes out (the same relay sound and rule as the first
  timeout); in the dark, the crackle and an exhale. Every coda sound ends
  before the cut into Nachtruhe.
- **Sources.** The lighter, crackle and breath sounds come from CC0 or
  public-domain recordings on sites that need no account (BigSoundBank,
  Wikimedia Commons), each licence checked and credited in
  `public/sfx/CREDITS.md`. Downloads go to their own new scratch directory.
  If no recording is good enough, the fallback is a synthesis learned from
  such a recording with the existing spectral pipeline
  (`scripts/spectral.mjs`), checked against the recording's spectrogram so it
  doesn't sound synthetic.
- **The street bed** (muffled indoors) carries on through the jump
  unchanged.
- **As built:** the lighter, crackle and flame come from BigSoundBank's
  "Cigarette, Ignition" and the inhale and exhale from its "Sigh by the
  Mouth" (both Joseph Sardin, CC0; the sigh is unvoiced, so it carries no
  voice). The lever's click is Kenney's metalClick (CC0). His steps after he
  leaves the shot are the Treppenhaus descent's own footfalls, heard at full
  level within 2.5 m of the camera and falling as 1/r beyond; nothing from
  before the jump rings on over the jump cut.
- **As built (smoke after the jump):** "under the ceiling" is never in the
  Wide's frame (the frame ends about 0.5 m above her mouth, the ceiling is
  1.2 m up), so the haze is a few faint flat wisps around her at forehead
  height, where exhaled smoke settles in still air with warmer air above; the
  wisp is born on a story-time grid, so its column stands steady from the
  first frame after the jump.
- **As built (the dark):** "in the dark only the ember shows" follows the
  stairwell light rule in CONTINUITY: when the timer runs out the landing
  drops to the windows' daylight, as at the first timeout, so the landing
  stays readable and the ember glows in her mouth corner.
- **As built (the flick):** the wheel throws four tiny sparks sideways for
  two frames as the flame catches.

## Code structure

- **Shared story time.** `StoryShot` (a `Shot` with a `story` start),
  `storyTimeIn(shots)` and `filmTimeIn(shots)` move from
  `src/scenes/treppenhaus/cameras.ts` into `src/toon/shots.ts`. The Treppenhaus
  and the Klingelsturm both use them, with no second copy.
- **`src/scenes/klingelsturm/banging.ts`**: the banging's beats (walk, blows,
  beat, walk back), Karen's path to his door and back, the left arm's strike
  solved to touch the leaf, the door's shiver, and the shift Δ that the calls
  derive from.
- **`src/scenes/klingelsturm/cigarette.ts`**: the coda's beats (phone away,
  flame, draws, exhales, the jump), where the cigarette and lighter are held,
  the ember's glow, and the burned length and ash over story time.
- **Props**: `src/props/cigaretteShape.ts` + `Cigarette.tsx` (with the ember
  and its light) and `src/props/lighterShape.ts` + `Lighter.tsx` (with the
  flame and its light). Data modules sit beside their views as `xShape.ts`
  because of the Windows case clash.
- **Smoke**: `src/smoke/smoke.ts`, a pure function from time, sources and
  solids to the live curls (position, radius, flattening, opacity), and
  `src/smoke/SmokeCurls.tsx`, the rim-shaded view. Exhale origins come from
  the existing `karenMouthEmitter`.
- **Changed**: `light.ts` (the second timeout from story time), `parcel.ts`
  (the second taping, two strips), `calls.ts`/`choreography.ts` (the shift and
  the walk), `cameras.ts` (the new shots), `doorCues.ts`/`KlingelsturmSound.tsx`
  (the new cues), `Klingelsturm.tsx` (the props and smoke), the two room
  scripts, and a new sound script if a fallback synthesis is needed.
- No code comments; `node scripts/strip-comments.mjs` after each change.

## Tests

- **Fist (no clipping).** At each blow's contact frame the hand's collider
  is 0–2 mm from the leaf's surface, and in no frame is it past it. Her arm
  and body stay clear of the leaf, frame and doormat edges. While she walks,
  the phone at her hip stays clear of her leg.
- **Cigarette and lighter.** The filter's end is between her lips, no more
  than 10 mm inside them, and the rest of the cigarette is outside her head,
  nose and chin. In her hand the cigarette touches the hand blob without
  passing through it. The lighter is gripped clear of her body. While the
  flame burns, its tip reaches the cigarette's end. Her cupping hand goes
  through neither the flame nor the lighter nor her face.
- **Smoke.** No curl goes through the ceiling, walls, doors, stair flight
  or Karen. A curl is born just in front of her lips or at the ember and
  moves away. Curls that reach the ceiling spread flat beneath it.
- **Time.** The second timeout comes exactly 180 s of story time after his
  press, and the light shows no warning blink before it (the existing rule
  extended). The burned length matches the researched burn rate over the
  story time it was lit, and the ash is never longer than what has burned.
  During each draw the ember is brighter than at rest.
- **Sound.** Each blow's cue sits on its contact frame (±1 frame): the
  stairwell version on the landing, the behind-the-door version in the Flur.
  The relay clicks at the second timeout. All new files exist and are
  credited. No Klingelsturm sound runs over the cut into Nachtruhe (existing
  test).
- **Continuity.** The parcel shows two strips from the second taping on.
  The circular's wording is unchanged (already pinned to its spec by
  `src/props/letterShape.test.ts`). Each scene still starts where its
  predecessor ended, apart from the declared jumps (existing tests).
- **Stills, checked by eye:** the blows (Wide), the Flur shot, the flame,
  the exhale, the haze after the jump, and the ember in the dark.

## Continuity and docs

- `docs/CONTINUITY.md`: the banging and the second strip; the cigarette,
  lighter, smoke and the timeout in the dark; the hidden jump inside the
  Klingelsturm next to the declared time jumps; the circular staying silent
  on both offences; updated cut frames.
- `docs/superpowers/specs/2026-11-03-klingelsturm-design.md`: the new beats
  in the beat table and the coda.
- `public/sfx/CREDITS.md` (and `recordings.json` for any learning source).

## Research for the plan

To be checked with web searches and applied where they hold up: a
cigarette's burn rate while smoked (free burn plus puffs), king-size
dimensions and filter length, a disposable lighter's size and flame height,
and how fast cigarette smoke rises and spreads in still indoor air.

## Parked ideas (for the user, not built)

- The first flick sparks without a flame (everyday imperfection).
- Ash flicked onto the landing floor, or a butt left on the landing.
- Runtime: the film is already 3:33, past YouTube's 3-minute limit for
  Shorts, and this adds about 16 s. That belongs to the parked 9:16 decision.

## Out of scope

- Any dialogue, caption or reaction about either offence.
- A smoke detector on the landing (German law requires them in bedrooms,
  children's rooms and the hallways leading to them, not in the shared
  stairwell).
- Changes to the circular or the epilogue.
