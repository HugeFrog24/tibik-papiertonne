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
  from the front-left in every sunny scene; keep it there. The epilogue is
  overcast with steady summer rain: soft sky light, a weak diffuse sun, rain
  streaks slanting with the film's breeze, the entrance lamp switched on by
  its motion sensor. **(test)**
- **Wind:** a light breeze (Beaufort 2, leaves rustle) blows down the street
  (towards +x, slightly towards the houses), with gusts. One breeze runs on
  film time across all scenes (src/physics/wind.ts). The tree crown sways a
  few centimetres and Karen's locks and strands sway on their own springs.
  Hair blown onto her shoulders rests on them. **(test)**
- **Parking:** cars park along the kerb (Längsparken) or on a Mieterparkplatz,
  not in garages. They face the direction of travel with the kerb on their
  right (StVO § 12 (4); this is no one-way street). Plates are white with a
  blue EU band and "D", format `MU-AB 123` (fictional). Between the district
  and the letters, plates carry the round registration seal instead of a
  hyphen. On the rear plate, the HU sticker sits above that seal: yellow for
  2027, brown for 2028. Every car has the green Umweltplakette (80 mm, "4")
  inside the windscreen, lower right on the passenger side, so on the kerb
  side. **(test)** Plates sit in black holders that cover nothing of the plate;
  about two thirds carry the dealer's strip "Autohaus Musterstadt" under the
  plate. The front plate's lower edge is 0.42 m over the road (§ 12 (8) FZV:
  at least 200 mm, at most 30 degrees of tilt). **(test)** The cars are compact
  hatchbacks with no brand marks.
  They have dark wheel wells and wing mirrors, and the mirrors are solid.
  Both sides of the street are parked up (17 cars, at least 35 cm between
  bumpers, every plate unique). Far-side cars face the other way, so their
  kerb is on their right as well. **(test)**
- **Across the street:** a twin block, No. 13 (odd numbers on that side,
  even on ours), in a slightly cooler plaster, with its own pavement and kerb.
  The facades are 16.7 m apart. It shows through the open Haustür.
- **The street goes on:** three more blocks each way on both sides, as a
  continuous street wall (Nos. 6–18 on our side, 7–19 opposite; numbers rise
  towards +x on both sides). Each is a simplified block: a painted facade with
  the same window layout, plus real balconies. A cross street closes the view
  at both ends (x ±118 m), and more street trees stand along both pavements.
  Every house has its own bin row by the entrance (Restmüll, two Papier,
  Wertstoffe), each bin stickered with its house number. Numbering zigzags:
  even on our side, odd across the street, both rising towards +x. **(test)**
- **Bike stands:** two galvanised Anlehnbügel by No. 12 (1.2 m long, 0.8 m
  high, knee rail, 0.8 m off the wall, 1.3 m apart) at x −7 and −8.3, clear of
  where Tibik and Karen walk. A blue city bike leans beside the first one,
  locked: a black armoured cable (15 mm) runs through its down tube and round
  the stand's lower rail, the red lock head hanging below. **(test)**
  **(test)**
- **Road level:** the carriageway lies 12 cm below the pavement (a Hochbord
  kerb, 10–12 cm in German cross-sections), and the parked cars stand on it,
  not at pavement height. **(test)**
- **Drains:** 300 × 500 gully grates (DIN 19594) in the gutter against both
  kerbs, roughly every 13–25 m and never under a parked tyre; round sewer
  covers (625 mm opening) down the middle of the road every 35 m. **(test)**
- **Asphalt:** fine grey grain (a seamless 4 m tile, seeded), laid in two
  passes with one black-sealed joint 0.75 m off the sewer line; three darker
  patches with sealed edges: a house-connection trench from No. 12 to the
  sewer and two pothole repairs, none under a tyre, gully or cover. **(test)**
- **Street trees** stand in open tree pits (2.0 × 1.3 m of soil from the kerb
  into the pavement, granite edging, fallen leaves and a few weeds). **(test)**
  Each trunk carries its tree-register number on a small aluminium tag at
  about 2 m, facing back along the pavement: 101-107 along this side, 108-113
  along the far side, every number once. **(test)**
- **Street lamps:** 5 m steel masts with a short arm over the road and a flat
  LED head (off by day). They stand 30 m apart on each side, staggered by
  15 m across the street, set back 45 cm from the kerb, and never in front of
  No. 12's entrance and bins. **(test)** Each mast carries its number on a
  small white plate at 2.15 m (201-213, for reporting a dark lamp) and a few
  stickers within reach (0.9-2 m), lying flat on the 12-sided pole; the one
  behind Karen shows its plate and three stickers. **(test)** At dusk they
  come on warm white (LED, about 3000 K) and throw a pool of light down onto
  the pavement and the road; nothing above the head is lit. **(test)**
- **Entrance:** a Türsprechanlage: a speaker grille and microphone above a bell
  button for every flat's surname (Tibik lives here; the handsets are in the flats),
  a mailbox unit with a "Bitte keine Werbung!" sticker (on Schulz's box; a
  yellow pizza flyer sticks out of Krause's slot, Tibik's box is empty), and a blue
  house-number sign. Doors are reached by a step; there is no porch. A
  60 × 40 cm anthracite mat in an aluminium frame is set flush into the step in
  front of the Haustür; feet walk over it at step height. **(test)**
  An anthracite wall lamp with a motion sensor hangs over the mailboxes,
  2.2 m up (off by day). **(test)**
  No. 13 across the street has its own twelve tenants (none shares a surname
  with No. 12; its "keine Werbung" sticker is on Lehmann's box) and no flyer.
  **(test)**
- **Windows:** tilt-and-turn (Dreh-Kipp) with the handle on the side frame,
  roller-shutter boxes above, some shutters let down, half-height lace
  curtains. Balconies on the upper floors. The street runs east-west: No. 12
  faces south, No. 13 north. One of No. 12's balconies (2. OG) carries a
  60 cm offset satellite dish aimed at Astra 19.2° Ost (azimuth 168°,
  elevation 30°, its face nearly upright), on a mast clamped inside the
  railing, the LNB on its arm and the coax cable run down the mast. No. 13's
  north-facing balconies carry none: a dish there could not see the
  satellite. **(test)** His bedroom window (No. 12, 1. OG links, the
  westmost) is the one exception: one big single sash, no roller shutter and
  no shutter box, and behind the glass a full-width curtain in a solid warm
  sand colour, gathered at the window's west side by day and drawn at night.
  Karen's window is the first one east of the stairwell on the same floor.
  Lit windows glow warm (#ffc98a), the stairwell's in its lamps' neutral
  white. **(test)**
- **Also there:** a red-and-white hydrant sign "H 80" on bare wall left of the
  mailboxes. It reads 1,4 beside the stem (1.4 m to the right) and 3,2 under
  the bar (3.2 m straight out), and that is where the oval cast-iron cap of the
  underground hydrant lies flush in the pavement. No hydrants stand on the
  sidewalk, and there are no overhead power lines. **(test)**

## Scenes

The film plays five scenes in this order (`src/Film.tsx`), each its own
composition under "Scenes" in the Studio:

1. **Treppenhaus** (`src/scenes/treppenhaus/`): Tibik leaves his flat, presses
   the stairwell light, goes down the EG flight with his hand on the rail and
   out through the Haustür. Shots run on story time with one ellipsis (the
   middle of the descent is skipped).
2. **Papiertonnen** (`src/scenes/papiertonnen/`): he steps out of the door of
   No. 12, the door shuts behind him, he searches the Papiertonne and finds a
   box.
3. **Hausmuell** (`src/scenes/hausmuell/`): Senioren-Karen confronts him.
4. **Klingelsturm** (`src/scenes/klingelsturm/`): later, on the 1. OG
   landing, she storms his doorbell, phones the Hausverwaltung and then 110;
   the light timer runs out, and Tibik leaves with the box packed as a
   parcel.
5. **Rundschreiben** (`src/scenes/rundschreiben/`), the epilogue, "Zwei Wochen
   später.": on a rainy day Tibik comes home, takes the Hausverwaltung's
   circular to all tenants out of his mailbox, reads it (two readable inserts,
   ending in four "Vie-len DANK."), folds it back, kloppt it into the blue
   Papiertonne and goes in; the Haustür shuts behind him. No dialogue.

## The epilogue (Rundschreiben)

- The letter is the Hausverwaltung Musterstadt's circular "An alle
  Mieterinnen und Mieter, Haus Nr. 12", DIN 5008 layout, 11 pt body, folded in
  three into a DL envelope; its wording is the spec's, word for word.
  **(test)** It is read only in point-of-view inserts, at least 40 px per line
  of type, and the punchline stays out of the first insert. **(test)**
- His mailbox is the empty one, row 3 right, in the unit left of the Haustür;
  his key turns a quarter turn and the box door swings open on its hinge.
  **(test)**
- From outside he unlocks the Haustür with his house key, pulls it open by the
  key while stepping back off the step, sidesteps round the open leaf and
  walks in; the closer shuts it behind him, and the street and the rain
  muffle as it does. **(test)**
- Rain spots the paper where it lands; no drop passes through the letter or
  ends inside Tibik. **(test)**
- The paper is never pristine (see "Everyday imperfections"). **(test)**
- Sound: a public-domain rain loop under the street ambience, the Kenney foley
  for keys, locks, paper, the bin lid and the Haustür, every file credited in
  public/sfx/CREDITS.md. **(test)**

## The staircase (Treppenhaus)

- Tibik lives on the **1. OG, links** (nameplate "Tibik"; Schulz opposite).
  The Reinigungsplan on the notice board says "1. OG links" this week.
  Beside the board hangs an A5 sheet from the **Hausverwaltung Musterstadt**
  (Sprechzeiten, Notdienst; the numbers are not legible) — the same
  Hausverwaltung Karen phones in the Klingelsturm and the one that will send
  the Rundschreiben. **(test)**
- Stairs follow DIN 18065: the EG flight has 18 risers of 17.5 cm on 28 cm
  treads; the handrail is 90 cm above the nosing line, 8 cm off the wall;
  balustrade bars are at most 12 cm apart. **(test)**
- Terrazzo floors, plastered walls with a green dado. Treppenlicht on a timer,
  switched by orange-lit push buttons beside each flat door.
- Orange RAUCHABZUG buttons (RAL 2011, 126 × 126 × 32 mm, 1.4 m up) open the
  smoke vent at the top of the stairwell: one on the EG east wall by the
  entrance, one beside the lift on the top landing (the 5. OG floor is
  above 13 m, so Gebäudeklasse 5). No door leaf ever covers them. **(test)**
- There is a lift (doors on every floor). Tibik takes the stairs; a later
  scene may use the lift if he ever lives higher up.
- The stairwell is acoustically hard: every sound inside it carries a long
  reverb (about 3 s; `scripts/make-stairwell.mjs` renders the stairwell
  versions in `public/sfx/stairwell/`). The street is heard through the walls,
  muffled, until the Haustür opens.

## The landing (Klingelsturm)

- Karen is **Frau Schulz**, **1. OG rechts**, directly across from Tibik
  (nameplate "Schulz"). Her shoes stand at the door edge of her coir mat.
- She rings in the **2-3-4-2** rhythm learned from the user's clapping
  (`assets/recordings/doorbell-rhythm.model.json`; the recording itself stays
  private). His door opens only to a **12 cm slit** while she is there.
- Her phone is a red big-button phone on speaker. She calls the
  **Hausverwaltung** (answering machine, out of hours), then **110**; the
  dispatcher has the last word. Misusing 110 is an offence (§ 145 StGB), so
  the dispatcher stays calm and asks what the emergency is. After hanging up
  she lowers the phone to her belly.
- His Flur: a chest of drawers by the door. He packs the found Karton with a
  paperback and tapes it shut with 50 mm packing tape on a 76 mm core, which
  stays on the chest. Beside his door, on the latch side, a white rocker
  light switch at 1.05 m, 15 cm from the door (DIN 18015-3 zone ZS-t). **(test)**
- **Stairwell light:** a 180 s timer, switched on downstairs inside the time
  jump. It runs out about 2 s after the dispatcher's last word and gives **no
  warning blink**: on, then dark (the user's experience; DIN 18015-2's
  warning isn't what people see). The timer relay is heard as a damp,
  echoing click when it switches off and again when Tibik switches it back
  on. **(test)** The orange locator lights of the push buttons glow in the
  dark; daylight from the windows keeps the landing readable.
- **His exit:** behind his shut door he takes the parcel on his left
  forearm, opens the door with his right hand on the lever, and moves the
  parcel to his right forearm while the door swings open (hidden by the
  wall). He sidles out with the parcel leading, pulls the door shut by its
  knob with his left hand, presses the light switch, nods to Karen and goes
  down the stairs without the rail. The parcel rides on his forearm at
  shoulder height: his arms are too short to hold it at the hip. **(test)**
  Karen stands aside at her door and turns to watch him go.

## His bedroom (Nachtruhe)

- **The room:** 3.3 × 4.0 m in his flat (1. OG links), its short wall on the
  street facade with his single-sash window (no roller shutter) and the
  radiator under it, 4 cm off the wall and 18 cm below the sill. White walls,
  a white woodchip ceiling with a round glass dome lamp in the middle and a
  smoke alarm on the ceiling at least 50 cm from every wall and from the lamp
  (DIN 14676), wood-look laminate with white skirting, a wood-veneer door at
  the near end that opens into the room and folds back along the east wall.
  The light switch is beside the door on the latch side at 1.05 m (DIN
  18015-3). **(test)**
- **Bed:** a 160 × 200 double in a white faux-leather frame with a tufted
  headboard against the west wall, its long side 70 cm from the window wall;
  1.15 m stay free at its foot, enough for him (1.05 m wide, arms included) to
  walk round it. Two 80 × 80 pillows in patterned covers, each a little askew.
  **(test)**
- **Bedside:** a low white cabinet on each side of the headboard (wood-look
  top, a drawer over a door) with a table lamp on each (warm, about 2700 K,
  a rocker switch on the foot) and a socket above it on the wall. **(test)**
- **Curtain:** one full-width sand panel on a ceiling rail behind a
  wood-look pelmet, 20 cm in front of the window wall, 1.5 times the rail's
  width in fabric; drawn, it covers the window with room to spare; opened, it
  bunches at the west wall, so from the street the window shows no curtain.
  Its folds deepen as it bunches but never touch the radiator or the
  cabinet. From the street he sees exactly what hangs behind the pane.
  **(test)**
- **Light:** evening: the two lamps; night: dark, a faint orange street glow
  through the curtain; morning: grey daylight through the window, which is a
  real opening in No. 12's facade (No. 13's window there stays solid), so the
  room looks out onto the street. **(test)**
- **Getting round the bed:** with his arms out as he walks he is 1.5 m wide;
  past the bed's foot he tucks them in (1.05 m) — the passage is 1.155 m.
  **(test)**

## Doors

- **Flat doors** open into the flat, with a lever inside and a fixed brass
  knob outside (Wechselgarnitur). His has no door closer (an older building),
  so it stays where it's left: he pulls it shut by the knob as he steps out,
  and it latches.
- **The Haustür** opens outwards, towards the street, as German entrance doors
  do (escape route); only flat doors open inwards. **(test)** It has an
  overhead door closer on the push side, inside under the head of the
  opening, its slide rail on the leaf. It never stays open by itself: a leaf
  pushed or pulled open coasts on, the closer waits about 1.2 s (delayed
  closing) and then swings it shut over 4 s, slowing to the latch over the
  last 15°. **(test)** From inside he presses the lever and pushes the door
  out; from outside he unlocks it and pulls it open by the key, stepping back
  off the step as it comes towards him. **(test)**
- Handles are data (`Door.grips` in `src/building/doors.ts`): what's drawn,
  what collides and what a hand holds are the same object.
- Every door with a handle has its hardware: flat doors carry a long plate on
  both faces (lever inside, knob outside) with the profile cylinder 72 mm
  below the handle; the Haustür has its inside plate, a cylinder rosette 92 mm below the lever
  and a pull bar on two posts; the living-room door has an L-lever on round roses on
  both faces, 55 mm in from its edge and 1050 mm up, with a Buntbart keyhole
  72 mm below. Lift doors have none. **(test)**
- A lever (Drücker) turns about its spindle at the edge-side end. The hand
  that grips it presses it down about 29° in the 0.15 s before the pull, so
  the latch is free before the door moves. It stays down through the pull
  and springs back within 0.08 s of being let go. **(test)**

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
- Respect reach: Tibik's arms reach ~46 cm from the shoulder (~55 cm to the
  centre of a handle, counting the hand), and his belly keeps him ~30 cm from
  anything he faces. He is 0.81 m wide and 0.65 m deep: he tucks his arms in
  through doorways and sidles sideways through narrow gaps. Plan choreography
  around that (doors especially: see the Treppenhaus door beats).
- When a hand works something (a door handle, a light button, the handrail,
  the Haustür leaf), it touches it for the whole hold. **(test)**
- Hips never rise or fall faster than 0.75 m/s, and never jump from frame to
  frame. **(test)**
- Karen is heavy: short strides, slow to speed up, audible breathing. Her head
  can only turn a little on its own (pass head poses through
  `limitKarenHead`), so turn her whole body instead.
- Karen's eyes are eyeballs set into her head, never flat black buttons: a
  white ball with a grey-blue iris (darker rim) and a small black pupil that
  turn with her gaze, under skin lids. Anger slants the upper lids down toward
  her nose and narrows the eyes; the lids ride with the gaze, never hide a
  pupil while open, and shut fully in a blink. **(test)** Anger also draws
  wrinkles: frown furrows between the brows, a crease above each inner brow
  that follows the brow, creases on the bridge and beside the nose, the
  cheek folds to the mouth, under-eye lines and crow's feet; they stay off
  her eyes, brows, nose and lips, and her fringe hides at most a third of any.
  **(test)** When she opens her mouth, her skin opens exactly along the lip
  line onto a dark pocket that goes about 5 cm back into her head, sealed
  under the lips; ten upper teeth hang fixed from the skull just behind the
  upper lip, ten lower teeth ride down and back with a rigid jaw behind the
  upper ones (overbite), each tooth its own rounded box with a thin outline,
  and a tongue lies behind the lower front teeth. Nothing of it pokes out of
  her skin, jowls or nose; the rows never bite into each other; wide open the
  front teeth and the tongue's top show. **(test)** Her head's outline shell ends at the chin, so it never pokes out
  through her top below the chin. **(test)**
- Karen's hair is short and grey, in locks, never one solid mass and never
  a smooth "icecap". Each lock is drawn as a tapered clump: thick at its root,
  curling slightly outward, ending in a point, with darker strand lines along
  it. **(test: inside its lock's ellipsoid, pointed tip, faces outward)**
  Locks radiate from the crown; three hairline locks run into seven narrow
  bangs fanned across the forehead; two side curtains of three strands each
  hang over a darker under-layer. The cap underneath is darker and has no ink
  outline, so the pointed locks make the silhouette. Each lock stands off the
  cap by more than an ink line. **(test)** Shades vary slightly from lock to
  lock (salt and pepper). Physics (sway, resting on her body) still works on
  each lock's ellipsoid, which bounds the drawn clump.
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

## Everyday imperfections

Things in this world carry the small marks of being made, used and handled
by people in an ordinary hurry, never marks staged for their own sake
(user rule, 2026-11-05). Every imperfection:

- has a real everyday cause: how the thing was made, handled, carried,
  weathered or aged;
- stays subtle: the viewer notices it second, never first, and it never
  draws focus from the action or the joke (millimetres and degrees, not
  centimetres and dozens of degrees);
- is physical: collisions, outlines and grips use the same imperfect shape
  that is drawn, and it is deterministic (seeded), so every render agrees;
- stays with its object from shot to shot and scene to scene.

In the film now:

- The Rundschreiben's envelope is torn open by hand: the flap rips along a
  ragged, slanted line and a jagged strip of it stays glued on the back.
  **(test)**
- The letter was folded by hand: its creases sit 1-1.5 mm off the DIN fold
  marks, and unfolded its outer panels keep 5-7 degrees towards the text;
  held at its sides it bows about 2 mm, and faint crease shadows stay on the
  paper. **(test)**
- The envelope is floppy: it bows 7-14 mm and flexes while held, and droops
  when he holds it in one hand. **(test)**
- Rain spots stay where they land on the paper and lie on its bow, a spot
  over a crease drawn on both panels. **(test)** Paper has its own
  finer toon ramp, so creases and bends catch the light in steps.
- Karen's locks vary slightly in shade (salt and pepper); about two thirds of
  the cars carry a dealer's plate strip; the bins carry their stickers.

Review passes check every new or changed object against this section. They
flag anything too clean for its use (perfect folds, pristine edges, identical
copies, objects aligned to the millimetre) and anything staged (too big, too
many, implausible or attention-grabbing), and they add new ideas, each with
its everyday cause, to the list below for the user to pick.

Ideas (proposed, not built; the user picks):

- The doormat lies slightly askew in front of the Haustür, where feet kick it.
- The mailbox name labels differ: printed, handwritten, one a little crooked
  or sun-faded.
- The Rundschreiben's envelope has a soft bent corner from being pushed
  through the mailbox slot.
- The house key's brass is worn brighter at its tip and bow; the ring is a
  little sprung.
- The bins are scuffed at their wheels and lid edges.
- Shut things settle a hair ajar: Papier 1's lid lands 0.5-1 degree open
  (5-8 mm at its front edge) after the thud, and the mailbox door rests about
  a degree off its stop (a slammed lid, a tired spring).
- The letter's print sits about 0.4 degree off square (a printer's paper
  feed), so the rule and the text drift about 1.5 mm across the sheet.
- The second fold was pressed harder: the lower crease's shadow is a fifth
  darker than the upper one's.
- The Haustür shows wear: scuffs at kick height on the green leaf and a paler
  patch behind the outer pull bar (feet and hands).
- Puddle edges wobble 1-2 cm with slightly darker rims (dips in the paving).
- The mailbox key's blade is bent about a degree at its tip (0.4 mm), from
  forcing a stiff lock.
- The plate holders and the doorbell panel carry a thin dirt line along
  their lower edge (road splash; a panel nobody wipes).
- One corner of the house-number plate sits a hair proud where a screw has
  worked loose.
- A faint grey streak runs down No. 12's plaster below the dish mount (rain
  run-off from the reflector).
- The bins' stickers lift at one corner (damp and daily handling).
- The mailbox name cards are slightly wavy where damp swelled them.
- One street lamp in the row glows a shade cooler than the others: its LED
  module was swapped after a fault (visible only at night).
- A few dead moths and some dust lie in the stairwell lamp's diffuser (the
  light draws insects in; nobody cleans it), showing when the Treppenlicht is
  on.
- Rain spots on the paper vary in darkness and edge instead of being uniform
  discs: water wicks unevenly along the fibres, so a rim wobbles a few
  percent of its radius, and wet paper turns translucent and greyer, with a
  faint darker tide line where an early spot starts to dry.
- Each block's roof plumbing differs: two to four vent pipes in other places,
  round, their rain caps a few degrees askew (each house's stacks run where
  its bathrooms are).
- One roof keeps the stub of an old antenna mast (left from before the
  satellite dishes).
- A darker, newer patch of roofing membrane where a leak was repaired.
- Dark dirt and a little moss along the foot of the parapets (water stands
  there and leaves collect).
- A lightning-conductor wire along the parapet coping (standard on German
  flat roofs).
- The smoke vent's dome slightly yellowed and grey (sun and dust); it could
  glow faintly while the Treppenlicht is on.
- Faint run-off streaks below the joints of the parapet coping.
- Town windows in mixed colour temperatures (a 2700 K lamp, a cool kitchen
  LED, a bluish TV); dark ones often show closed roller shutters rather than
  black glass, as German bedrooms do at night; a stairwell lit floor by floor
  on its timer.
- The town's blocks from different decades: storey heights 2.75-3.2 m, now
  and then a pitched roof, plaster repainted in slightly different years.
- His curtain hand-hung: the hem a centimetre or two off straight, a tuck at
  one end where it was pulled shut in a hurry, a gap of a few millimetres at
  the rail's end (the gliders snag).
- One lit flat a little cooler than the rest (a swapped bulb or an LED strip);
  a kitchen light left on after the family has gone to bed.
- Curtains differ from flat to flat: some blinds half down, a plant on a sill.
- A lamp's pool slightly off centre (the arm has sagged with age); lenses
  glowing a shade differently (dust); one lamp switching on a few seconds
  late (a cheap photocell).
- A wipe mark at hand height on the stairwell panes; a small stain on his
  sill under the tilt gap, where condensation runs.
- His bedroom: a shallow scuff at a headboard corner (knocked sitting down);
  a few millimetres of dip on the side of the mattress he sleeps on; one
  pillow cover creased at a corner (folded into a bag); a faint pale ring on
  a cabinet top from a mug; one drawer front a fraction proud (swollen wood);
  a lamp's rocker a degree or two off straight; the shade's seam overlapping
  by a few millimetres.
- His bedroom fittings: chipped paint at the radiator's valve corner; the
  thermostat dial a few degrees off its mark; the door lever resting a few
  degrees low (a tired spring) with a faint sheen at hand height; a faint arc
  rubbed into the laminate by the door's lower corner; the light switch plate
  yellowed round the rocker and a degree off level; a dust film on the smoke
  alarm's test button; a dry moth in the dome lamp; a roller lap line and a
  hairline crack on the ceiling.
- His fleece: light pilling where his hands grip the hem and on the side he
  lies on; folded in a hurry, the plies a centimetre or two out of line and a
  few degrees off square; lying 3-5 cm towards his side of the bed (always
  pulled from there); in the morning, pushed back into a loose heap rather
  than the evening's neat fold.
- His bed: a shallow dent in the pillow where his head lies, the pillow pushed
  a centimetre towards the headboard; a slight hollow and a few creases in the
  sheet at his usual sitting spot; one fitted-sheet corner crept a few
  millimetres (tired elastic); the mattress edge sinking a centimetre or two
  under his seat.
- How he lies: a degree or two off the bed's axis, his folded arms a few
  degrees apart, his feet falling out unevenly; sitting, one foot hangs a
  little ahead of the other.

## Continuity between scenes

- Each scene starts exactly where the previous one ended. **(test)** The
  Treppenhaus ends (`treppenhausEnd()`) with Tibik paused on the threshold,
  right hand holding the outward-swung Haustür open at 1.5 rad; Papiertonnen
  starts in that exact pose and door angle. Papiertonnen's last state is exported as
  `papiertonnenEnd()` (src/scenes/papiertonnen/solve.ts): searched bin lid
  open against the wall, the popped-open box in both of Tibik's hands,
  Papier 1 still overfull.
- **Declared time jumps:** Hausmuell → Klingelsturm and Klingelsturm →
  Rundschreiben are the named exceptions to "each scene starts where the
  previous one ended" (`TIME_JUMPS` in src/timeline.ts). **(test)**
  Klingelsturm starts with Tibik inside, his door shut and latched, Karen on
  the landing, her shoes on her mat. **(test)** The Rundschreiben starts two
  weeks later, outside on the pavement, the Haustür and every lid shut, the
  bins emptied. **(test)** No Klingelsturm sound runs over the cut into the
  rain. **(test)**
- **Hausmuell starts on the act:** Papiertonnen ends 0.35 s after the box has
  popped open; at Hausmuell's start he turns to walk off with it and Karen
  bursts in shouting within 0.8 s of the box opening, his found-it ding cut
  off by the record scratch. **(test)**
- **Music (main street):** the recording `public/music/mainstreet.flac` plays
  from its start as he opens the Haustür (a 0.5 s fade in), under his walk
  out and his search of the Papiertonne, and stops dead on the record scratch
  as Karen bursts in. Non-diegetic: never muffled indoors. It plays at its own
  recorded level (1.0), about level with the street ambience under it. A scene
  previewed alone plays the same part of it as in the film. **(test)**
- In dialogue between Tibik and Karen, keep the camera on one side of the line
  between them (180° rule), with matching eyelines in shot/reverse-shot.
- The street ambience runs under every scene and across cuts: two loops,
  atmosphere and traffic, balanced in src/street/StreetAmbience.tsx. Inside
  the building they are heard muffled (low-passed twins) and open up as the
  Haustür opens (`filmIndoors` in src/timeline.ts). **(test)**
- Karen's footsteps are always loud, heavy stomps. Every scene plays them
  through `KarenStomp` (src/Karen/KarenStomp.tsx), so they sound the same
  everywhere.

## Open items

- **Door key (deferred):** Tibik has no pockets. For now he pulls his flat
  door shut by its fixed outside knob, and no key is shown. Decide later where
  he keeps one (neck ribbon, wrist loop, ...); whatever is chosen then appears
  in every later scene.

- ~~Tibik should come **out of the door of No. 12**~~ — done: the Treppenhaus
  scene leads him there and Papiertonnen starts on the threshold.
- **Shipping label:** the parcel he carries out has a fresh A6 address label
  (148 × 105 mm, not legible, no carrier brand) stuck right over the found
  box's old blacked-out one, as carriers ask (off screen, between the taping
  and the coda). **(test)**
- **Karen's spray:** when she shouts, droplets leave from just in front of her
  lips on the plosives (P/B most, T/D, K/G a little; ch, doubled letters, z = ts
  and pf per German spelling), an extra drop per "!" at the end of a line (up
  to three). They fly at 3.6-4.6 m/s inside a 15-degree cone, slow in the air
  and fall, and stop on the first thing they meet: they never pass through
  anything (her own body included). Drawn as the streak one 1/60 s exposure
  leaves, no outline. Spots: on the pavement they dry within 4 s, on cardboard
  they stay and travel with it, spots on moving things (his door, her phone)
  move with them, none on people. **(test)** In the Hausmuell exchange it
  lands on the pavement about a metre in front of her (a few on Tibik); at his
  door it lands on the door just below the viewer (she shouts from 45 cm, mouth
  below the lens, so none reaches the lens); on the phone, on the landing.
- **Lift (later):** if a later scene has him live higher up, he takes the
  lift instead of the stairs.
- **Self-shadowing look:** in sunlight his own eyes and head cast shadows on
  his back (physically right, blotchy in toon style). Softer character
  self-shadows are a look decision for the user.
- ~~**Foot planting**~~ — done: feet are planted step by step and legs have
  knees (see "Feet and legs" under Physical realism).
- Decide **16:9 or 9:16** before the dialogue scenes (speech bubbles must fit
  the safe area).
- German captions or speech bubbles, plus optional English subtitles.
- Frame rate: 30 fps now. Switch to 25 fps only if the film is meant for
  European broadcast.
