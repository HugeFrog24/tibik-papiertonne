# Continuity, norms & realism

Living reference for the Tibik film. The story is set in Germany; when in
doubt, prefer what is normal there over what is normal in American media.
Items marked **(test)** are enforced by `npm test`.

## Setting

- **Place:** a residential street in the fictional town of Musterstadt. The
  building is **No. 12**, a six-storey **Wohnblock** of rented flats
  (Mietwohnungen) with a shared entrance and staircase. Nobody here owns a
  house with a lawn, porch or garage.
- **Season and light:** summer (the street tree has leaves). The sun comes
  from the front-left in every scene; keep it there.
- **Parking:** cars park along the kerb (Längsparken) or on a Mieterparkplatz,
  not in garages. Plates are white with a blue EU band and "D", format
  `MU-AB 123` (fictional).
- **Entrance:** a doorbell panel with every flat's surname (Tibik lives here),
  a mailbox unit with a "Bitte keine Werbung!" sticker, and a blue
  house-number sign. Doors are reached by a step; there is no porch.
- **Windows:** tilt-and-turn (Dreh-Kipp) with the handle on the side frame,
  roller-shutter boxes above, some shutters let down, half-height lace
  curtains. Balconies on the upper floors, one with a satellite dish.
- **Also there:** a red-and-white hydrant sign (H) on the wall; no hydrants
  standing on the sidewalk, and no overhead power lines.

## Waste and bins

- Bins are **anthracite with coloured lids**: blue = Papier,
  yellow = Wertstoffe (Gelbe Tonne), dark = Restmüll. Colours differ between
  real cities; Musterstadt uses these, always.
- Each bin has the house number "12" painted on and a sticker naming what
  goes in, from the fictional "Abfallwirtschaft Musterstadt". Never use a
  real operator's logo.
- Cardboard is **flattened** in the Papiertonne. An overfull bin has
  cardboard sticking out and its lid propped open.
- Shipping labels on thrown-away boxes have the address **blacked out**
  (Datenschutz).
- Pfand bottles never go into bins; if any appear, they stand next to the
  bins for collectors.

## Story logic

- Tibik is a **resident** of No. 12 (his name is on the doorbell panel). That
  makes Karen's threat to report him to the **Hausverwaltung** plausible, and
  his use of the building's bins legitimate.
- Whether taking something out of someone else's bin is allowed is a genuine
  grey area in Germany (rubbish isn't automatically ownerless), so Karen's
  accusation has a kernel of truth. Tibik's "Haben Sie hier eine
  Weisungsbefugnis?" works because, as a private person, she has none.
- Tone: the jokes are about Karen's behaviour (petty rule-enforcing), not
  her body or age.

## Language

- Strangers say **Sie**. Names are surnames ("Frau Becker").
- Real umlauts and ß, also in capitals: DÜRFEN, not DUERFEN.
- German quotation marks („…") in on-screen text.
- Floors: Erdgeschoss = ground floor, "1. Stock" = the first floor above it.

## Physical realism

- Nothing passes through anything: bodies, arms (including into the
  character's own body), the carried box, lids, bins and the house.
  **(test)**
- Outlines count as part of an object. Things may not come so close that
  one hides another's black outline (14 mm, `OUTLINE`), even without
  touching. Tibik's real head (not its collision spheres) keeps at least that
  far from the box and its splayed top flaps. **(test)**
- Carried things are held: both hands touch the box. **(test)**
- Nothing teleports: the box never moves more than 10 cm between frames.
  **(test)**
- Hinged lids that are open and still rest on something (the wall, or the
  cardboard propping them). **(test)**
- Bin contents fit inside their bins. **(test)**
- Respect reach: Tibik's arms reach ~46 cm from the shoulder, and his belly
  keeps him ~30 cm from anything he faces. Plan choreography around that.
- Karen is heavy: short strides, slow to speed up, audible breathing. Her head
  can only turn a little on its own (pass head poses through
  `limitKarenHead`), so turn her whole body instead.
- Feet and legs: a foot carrying weight stays planted until it lifts off; it
  rolls heel to toe without sliding, and swings to its next plant in a low
  arc. **(test)** Knees bend like a human's (0–150°, pointing forwards), and
  the hips come down where the legs couldn't otherwise reach. **(test)**
  Footstep sounds land on the plants. **(test)** Choreography only moves the
  body (position, turn) and says when each foot steps; where the feet land
  follows from that (`src/characters/gait.ts`). A character turning or moving
  needs steps: author them, never slide the body over planted feet. Plan
  steps so one foot is always down, and so the last step of each foot lands
  when the body is nearly where it stops (Karen's legs are straight at rest:
  she can only stand still with her body right over her feet).

## Continuity between scenes

- Each scene starts exactly where the previous one ended. Papiertonnen's last
  state is exported as `papiertonnenEnd()` (src/scenes/papiertonnen/solve.ts): searched bin lid
  open against the wall, the popped-open box in both of Tibik's hands,
  Papier 1 still overfull.
- In dialogue between Tibik and Karen, keep the camera on one side of the line
  between them (180° rule), with matching eyelines in shot/reverse-shot.
- The street ambience runs under every scene and across cuts: two loops,
  atmosphere and traffic, balanced in src/street/StreetAmbience.tsx.
- Karen's footsteps are always loud, heavy stomps. Every scene plays them
  through `KarenStomp` (src/Karen/KarenStomp.tsx), so they sound the same
  everywhere.

## Open items

- **Door key (deferred):** Tibik has no pockets. For now he pulls his flat
  door shut by its fixed outside knob, and no key is shown. Decide later where
  he keeps one (neck ribbon, wrist loop, ...); whatever is chosen then appears
  in every later scene.

- Tibik should come **out of the door of No. 12** at the start of Papiertonnen.
  This needs a real doorway in the facade's collision model and stepping down
  the door step.
- ~~**Foot planting**~~ — done: feet are planted step by step and legs have
  knees (see "Feet and legs" under Physical realism).
- Decide **16:9 or 9:16** before the dialogue scenes (speech bubbles must fit
  the safe area).
- German captions or speech bubbles, plus optional English subtitles.
- Frame rate: 30 fps now. Switch to 25 fps only if the film is meant for
  European broadcast.
