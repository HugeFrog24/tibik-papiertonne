# Continuity, norms & realism

Living reference for the Tibik film. The story is set in Germany; when in
doubt, prefer what is normal there over what is normal in American media.
Items marked **(test)** are enforced by `npm test`.

## Setting

- **Place:** a residential street in a German town that is never named, on
  screen or in dialogue (owner, 2026-11-08: no city is pinned for later
  films; organisations carry their own names, the letter its date alone). The
  building is **No. 12**, a six-storey **Wohnblock** of rented flats
  (Mietwohnungen) with a shared entrance and staircase. Nobody here owns a
  house with a lawn, porch or garage.
- **Season and light:** summer (the street tree has leaves). The sun comes
  from the front-left in every sunny scene; keep it there. The epilogue is
  overcast with steady summer rain: soft sky light, a weak diffuse sun, rain
  streaks slanting with the film's breeze, the entrance lamp switched on by
  its motion sensor. **(test)** The rain falls from far above (30 m, past every
  camera that sees it) over the street and both rows' roofs, at one density
  high and low, and stops on everything drawn there; it shows by the light
  that falls on it (only in the street lamps' cones at night) and fades with
  distance; the lee strip at the foot of No. 13 stays dry, as the slant
  shelters it. The wet pavements and road mirror the street (water's Fresnel:
  faint seen from above, strong at a flat angle, near-mirror in the puddles,
  smeared into streaks elsewhere); the soil in the tree pits stays matt.
  The rain darkens everything on the ground alike, the markings in it too
  (a tree pit's stone edging and soil, gully grates, manhole covers, the
  hydrant cap, asphalt patches), near and far and at every resolution: the
  wet sheets lie in the markings' own plane and only a fixed depth margin
  orders them, not one that grows with pixel size (owner, 2026-11-10: a
  pit's far edging was wet at 1080p and dry at 8K). **(test)**
- **Wind:** a light breeze (Beaufort 2, leaves rustle) blows down the street
  (towards +x, slightly towards the houses), with gusts. One breeze runs on
  film time across all scenes (src/physics/wind.ts). The tree crown sways a
  few centimetres and Karen's locks and strands sway on their own springs.
  Hair blown onto her shoulders rests on them, pressing at most a few
  millimetres into her knit, and slides over them without popping as she
  walks. **(test)**
- **Parking:** cars park along the kerb (Längsparken) or on a Mieterparkplatz,
  not in garages. They face the direction of travel with the kerb on their
  right (StVO § 12 (4); this is no one-way street). Plates are white with a
  blue EU band and "D", format `MU-AB 123` (fictional). Between the district
  and the letters, plates carry the round registration seal instead of a
  hyphen. On the rear plate, the HU sticker sits above that seal: yellow for
  2027, brown for 2028. Every car has the green Umweltplakette (80 mm, "4")
  inside the windscreen, lower right on the passenger side, so on the kerb
  side. **(test)** Plates sit in black holders that cover nothing of the plate;
  about two thirds carry the dealer's strip "Autohaus Weidner" under the
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
  a surface-mounted mailbox unit like KNOBLOCH's 12-box one with horizontal
  boxes (755 × 666 × 270 mm, two columns of six 370 × 110 mm doors, one row
  per storey from the 5. OG at the top to the EG at the bottom, links left and
  rechts right): every door has a full-width flap hinged at its top with a lip
  at its foot over a 335 × 33 mm slot (EN 13724; every slot 0.70-1.70 m above
  the pavement), its lock at the bottom right by the free edge and its name tag
  at the bottom left **(test)**; a "Bitte keine Werbung!" sticker on Schulz's
  box; a yellow pizza flyer stuck in Krause's slot props its flap open
  **(test)**; Tibik's box is empty; and a blue house-number sign. Doors are reached by a step; there is no porch. A
  60 × 40 cm anthracite mat in an aluminium frame is set flush into the step in
  front of the Haustür; feet walk over it at step height. **(test)**
  An anthracite wall lamp with a motion sensor hangs over the mailboxes,
  2.2 m up (off by day). **(test)**
  No. 13 across the street has its own twelve tenants (none shares a surname
  with No. 12; its "keine Werbung" sticker is on Lehmann's box) and no flyer.
  **(test)**
- **Windows:** tilt-and-turn (Dreh-Kipp); the handle is on the inside, so from
  the street no handle shows **(test)**,
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

The film plays six scenes in this order (`src/Film.tsx`), each its own
composition under "Scenes" in the Studio:

1. **Treppenhaus** (`src/scenes/treppenhaus/`): Tibik leaves his flat, presses
   the stairwell light, goes down the EG flight with his hand on the rail and
   out through the Haustür. Shots run on story time with one ellipsis (the
   middle of the descent is skipped).
2. **Papiertonnen** (`src/scenes/papiertonnen/`): he steps out of the door of
   No. 12, the door shuts behind him, he searches the Papiertonne and finds a
   box. As he opens it, Karen's "EY!" carries over from far down the street,
   off screen (owner, 2026-11-08: recorded at full voice, the distance added in
   post); it ends just before the cut, and half a second into Hausmuell she
   shouts again up close. He doesn't look up at the far shout; his eyes go to
   her on the second. **(test)**
3. **Hausmuell** (`src/scenes/hausmuell/`): Senioren-Karen confronts him.
4. **Klingelsturm** (`src/scenes/klingelsturm/`): later, on the 1. OG
   landing, she storms his doorbell, phones the Hausverwaltung and then 110;
   the light timer runs out, and Tibik leaves with the box packed as a
   parcel.
5. **Nachtruhe** (`src/scenes/nachtruhe/`), the breather: at dusk Tibik walks
   home, unlocks the Haustür and goes in; in his bedroom he climbs into bed,
   pulls the turned-back fleece over himself and clicks his lamp off by its
   cord switch; the drone rises past Karen's window, the last to go out, and
   the rain sets in as the night turns to a grey dawn; the morning (two weeks
   later, told by the light and the rain, no caption: owner, 2026-11-08), when he leaves the lamp off (the day is up, and he opens the
   curtain anyway), gets up and slides the near curtain half open onto the
   rain. **(test)** No dialogue.
6. **Rundschreiben** (`src/scenes/rundschreiben/`), the epilogue: on the same
   rainy day Tibik has just come down for his post: it opens on the Haustür
   swinging shut on its closer behind him (it latches; only his key opens it
   from outside) **(test)**, he waits clear of the leaf, walks along the front
   to the mailbox and shuffles into place, takes the Hausverwaltung's
   circular to all tenants out of his mailbox, reads it (one point-of-view
   insert, read out in the subtitles to its closing ban), folds it back, kloppt it into the blue
   Papiertonne and goes in; the Haustür shuts behind him. His one line is a
   baffled "Hä?" when the film cuts from the letter to his face.

## The epilogue (Rundschreiben)

- The letter is the HWS Hausverwaltungs-Service GmbH's circular "An alle
  Mieterinnen und Mieter, Haus Nr. 12", DIN 5008 layout, 11 pt body, folded in
  three into a DL envelope; its wording is the spec's, word for word.
  **(test)** It is read in one point-of-view insert (owner, 2026-11-08: one
  insert, not two): in 16:9 it opens readable on the letter from "Sehr
  geehrte ..." to "Mit freundlichen Grüßinnen und Grüßen", every line at
  least 32 px and above the subtitle bar, and over the last 2 s of the
  reading zooms out until the whole page, his hands and the door behind it
  show, settling level and still before the cut; in 9:16 the whole page,
  centred, zooming out until it fills half the width and both his hands
  show. The camera holds 45 cm off the sheet and zooms with the lens; he is
  drawn arms only there. **(test)**
- The letter is read out in the subtitle bar for anyone watching on mute and
  in Tibik's own voice as his inner voice, ringing as in a great hall (owner, 2026-11-08;
  recorded 2026-11-09), each sentence starting with its voice and lasting its
  take plus an even share of the reading's pauses, word for word, a sentence at a time,
  from the salutation to "... ist aus Umweltgründen nicht gestattet." and no
  further: that ban, after the demand to buy new boxes only, is the
  punchline, and narrating on would bury it (owner, 2026-11-08: also for
  audience retention; the body's wording is the owner's of 2026-11-08, three
  paragraphs set apart by a blank line). The thanks, the closing and the signature stay on the letter,
  unread, and take no film time; the deadpan after the punchline is silent
  until the cut to his face, where he first takes it in with two slow blinks, a
  finger snap on each as his lids shut (owner, 2026-11-08; 2026-11-10: unheard
  under the rain, so the street and the rain dip 8 dB from the cut to his face
  through "Hä?", as under his words, and the snaps stand ~15 dB clear of them), then says "Hä?" with a
  puzzled tilt of the head (owner, 2026-11-08; "Äääh…" is recorded as the
  alternative, picked in post); the shot holds a beat after the line. **(test)**
  **(test)**
- His mailbox is the empty one, row 5 left (1. OG links), in the unit left of
  the Haustür; his key turns a quarter turn and he pulls the box door open by
  it on its left hinge to about 80° (its stop is at 100°; 80° lets the
  envelope slide out past the door), lets go and in one unbroken reach ducks
  his hand under the open door's lower edge and on to the envelope (the key
  hangs near the bottom of the 11 cm door, and his shoulder is already round
  its free edge), and
  after handing the envelope to his right hand ducks back under it to the
  keys and pushes the door shut; with the
  key out he shuffles three short steps to his right, clear of the unit, to
  open and read the letter. **(test)**
- From outside he unlocks the Haustür with his house key, pulls it open by the
  key while stepping back off the step, takes the key out and steps back
  again, well clear of the leaf as it swings out past him (about 1.8 m from
  the hinge, so it misses his outstretched hand), then sidesteps round the
  open leaf and walks in, straight through the doorway, then steps across to his
  left into the stairs' lane and stands at the foot of the flight up to his flat,
  facing up it, his hands at rest (owner, 2026-11-10: home is upstairs, on his
  left; nothing waits for him on the right); the closer shuts it behind him, and
  the street and the rain muffle as it does. The coda's camera pans with him from
  the bin to the door and ends on the shut door, centred, in both formats
  (owner, 2026-11-10). **(test)**
- He walks up onto the doorstep and stops where his belly clears the door
  jamb, so nothing has to push him off the door as he unlocks it; his toes
  stand well on the step and his heels a few centimetres over its front edge
  (his belly will not let him stand any closer to the door); he rises onto the step as he
  reaches that spot, and his two steps back off it keep a foot on the ground
  the whole time (one lands as the other lifts). The same at dusk and two
  weeks later. **(test)**
- Rain spots the paper where it lands; no drop passes through the letter or
  ends inside Tibik. **(test)**
- The paper is never pristine (see "Everyday imperfections"). **(test)**
- Sound: a public-domain rain loop under the street ambience, the Kenney foley
  for keys, locks, paper, the bin lid and the Haustür, every file credited in
  public/sfx/CREDITS.md. **(test)**

## The staircase (Treppenhaus)

- Tibik lives on the **1. OG, links** (nameplate "Tibik"; Schulz opposite).
  The Reinigungsplan on the notice board says "1. OG links" this week.
  Beside the board hangs an A5 sheet from the **HWS Hausverwaltungs-Service GmbH**
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
  His belly keeps him far enough back for the leaf to swing in past it, so
  to reach the lever of the shut door he leans in, straightens as the leaf
  comes towards him, and leans in again to push it shut; his hand stays on
  the lever throughout. **(test)**
- The HWS answering machine plays hold music under its announcement (owner,
  2026-11-09: warteschleife.flac from 0:27, faded in), from the moment it picks
  up until its last words, faded out before the beep, through her speakerphone
  into the stairwell like its voice and 12 dB under it. **(test)**
- Her phone is a red big-button phone on speaker. She calls the
  **Hausverwaltung** (answering machine, out of hours), then **110**; the
  dispatcher has the last word. Misusing 110 is an offence (§ 145 StGB), so
  the dispatcher stays calm and asks whether anyone is hurt or in danger.
  The dispatcher's greeting is cut, a deliberate film liberty for the pace
  (user decision, 2026-11-07): after the three DTMF tones and a short ring
  she is already shouting her complaint; the tones and "verletzt / Gefahr /
  kein Notfall" make clear whom she called. Her dialling is never filmed
  (there is no pointer finger, and digits appearing on their own would look
  wrong): in "Medium: back to the phone" the phone sits at the bottom edge of
  the frame, mostly cut off, its screen out of view. Once she is already
  shouting her complaint, "Insert: her phone" (user idea, 2026-11-07) looks
  down over her right shoulder at the screen for 1.4 s: "110", readable in
  the 9:16 crop, so viewers on mute see whom she called too.
  The cut is 99 frames (3.3 s, about three of her 0.9 Hz panting breaths, so
  her breathing carries on almost seamlessly). After hanging up she lowers
  the phone to her belly.
- **She pounds on his door between the two calls** (a Ruhestörung in the
  strict sense; nobody mentions it, the circular included). After the
  answering machine she tucks the phone back into her trouser pocket, stomps
  back to his door, stands where she rang and pounds with the side of her
  left fist 1.35 m up, 8 cm in from the latch edge (well clear of the
  spyhole): four blows 0.4 s apart, a beat of 1.0 s, two more. Each blow is a
  strike from a fist drawn back by her head (at least 20 cm of swing,
  1.5 m/s or more at the leaf), touches the leaf (0-2 mm) and never goes past
  it. **(test)** Her blows never sound alike twice running: each draws its
  recording in a seeded order with no take back to back, the first four vary
  within about 0.8 dB, the two after the beat land 1.2 dB softer (her arm
  tiring), and his door settles once on its latch 0.18 s after the last.
  **(test)** In the beat she squares up, her left foot stepping out to her
  wide stance. **(test)** Every blow jolts the camera: about 4 cm and 1.3
  degrees on the landing (plain to see on a phone: the picture jumps 25 px or
  more on the 1080-line frame), six tenths of that in his Flur behind the door,
  peaking within a frame and settled in a quarter of a second (it rings out
  on a zero of its wave, so its end never pops), each blow a
  little different, and those frames carry the motion blur of a 180-degree
  shutter (user, 2026-11-07). **(test)** Back at her door she draws the phone again, her hand
  on its grip whenever she holds it. **(test)** The
  locked leaf gives at most 2 mm at its latch edge (the play in the strike
  plate) and is still again 0.1 s later. **(test)** The Wide shows the first
  four, his Flur the last two: Tibik calm at the chest, unbothered. Then she
  walks back, raises the phone and dials 110. Everything after the hang-up
  starts 6.9 s later than before. **(test)**
- His Flur: a chest of drawers by the door. He packs the found Karton with a
  paperback and tapes it shut with 50 mm packing tape on a 76 mm core, which
  stays on the chest. While Karen pounds on his door he lays a second strip
  over the first along the seam, 15 mm towards him, right hand to left this
  time (the roll lies where his right hand put it down), and sets the roll
  back where it first stood; the parcel shows both strips from then on, in
  his arms too. **(test)** (A strip across the first would need the far side
  of the parcel, 0.69 m from his shoulder; he reaches 0.46 m.) Beside his
  door, on the latch side, a white rocker
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
- **Her cigarette (Klingelsturm coda):** once he is down the stairs she puts
  the phone back in her pocket; at the cut into the close-up a king-size
  cigarette sits in the right corner of her mouth (5 mm between her lips,
  angled down and well out to her right, about 63 degrees) and a plain red disposable lighter stands up
  out of her right fist. She turns her head towards it and flicks, but the
  cold lighter doesn't catch: the first strike only throws its sparks and a
  micro flame (a third of the size, well short of the cigarette) that dies
  within three frames; she lets the gas go and strikes again 0.4 s later, and
  that one catches (each strike's wheel throws four tiny sparks sideways for
  two frames, clear of her face and the cigarette). Owner's imperfection
  idea, 2026-11-08; it makes the coda 0.4 s longer. She draws twice
  (the tip catches on the first draw), lets the flame die, and the lighter
  goes down in front of her and into her pocket, never through her bust.
  Where both came from is never shown. **(test)** Then she smokes from her
  right hand: her fist takes the cigarette from her lips (her fingers 4 cm
  from the filter end, well clear of the ember) and holds it out to her
  right at chest height; after the jump she raises it to her lips for the
  draw and lowers it again. Her fist never sinks into her drawn face, her
  jowls, her hair or her body, and between draws the cigarette touches only
  the fist. **(test)**
  The flame stands upright, lights her face at about a ceiling lamp's
  strength, and dies down rather than vanishing; the ember brightens on each
  draw and its light reaches 14 cm, her lips, nose tip and chin. **(test)**
  Lit, the coal glows over 3 mm of the rod, as a smouldering cigarette's
  does, inside a soft warm glow 25 mm across (three faint nested shells, no
  outline) that barely shows in the lit stairwell and reads as a small orange
  spot in the dim of the closing wide, even on a phone (at least 10 px of the
  1080-line frame). **(test)**
  The cigarette and lighter draw their own thin lines (2 mm and 3 mm) in the
  ink pass, and the flame blocks the ink, so no line crosses it.
- **The hidden jump in the Klingelsturm:** the close-up cuts to the wide about
  2 min 50 s later (story time runs 170 s ahead of film time after the cut):
  the cigarette has burned 4.5 mm a minute since it was lit (measured free
  and puffed burn rates are 4-5 mm a minute), about 13 mm by the second
  timeout, with a short ash tip. The
  180 s timer he restarted runs out on her exactly then: the damp relay
  click, no warning blink, and the landing drops to the windows' daylight
  as at the first timeout (the stairwell light rule above), the ember
  glowing at her lips mid-draw and then in her hand. Tibik is out of every
  shot from the cut into the close-up. **(test)** The circular in the epilogue
  stays silent on her pounding and her smoking.
- **Her ash on his landing:** after her exhale in the dim, an insert of her
  right fist from her front-left, against his door, light button and
  doormat, her face never in frame: she turns the cigarette tip-down, holds
  it out from her side (clear of her belly and arm) and flicks her wrist
  twice; the 8 mm ash breaks off at the bottom of the first flick, falls
  under gravity (about half a second, tilting to lie flat) and crumbles into
  a piece and four flecks on the terrazzo beside her shoe, short of his mat
  and of the stairs. The camera tilts after it and stays on it. Ash is light
  grey. It stays where it fell: no later shot shows his landing. The circular
  is silent on it too. **(test)**
- **Her smoke:** cartoon curls, light grey with an ink shell drawn behind
  every fill (so overlapping curls merge into one outlined cloud), fading out
  over 3-3.5 s: a thin wisp rising from the ember whenever it is lit, and her
  exhales from the other corner of her mouth, blown up and off to her left so
  her face stays clear. Each curl ages in story time, so nothing from before
  the jump is left after it, but the wisp has risen all through the skipped
  minutes, so the column stands steady from the first frame after the jump;
  a few faint flat wisps of different sizes then hang around her at forehead
  height, where exhaled smoke settles in a stairwell's still, warmer-above
  air. Curls never pass into the stairwell or her and spread flat under a
  ceiling they reach; in the dark they show at 40 %. **(test)**
- **The coda's sounds:** all through the stairwell's reverb. His steps go on
  down the flight after he is out of shot, one per footfall, quieter with his
  distance from the camera (full level within 2.5 m, then falling as 1/r)
  and further away in sound too: between 2.5 and 5 m they cross over to a
  far take whose direct sound is dulled (the flight between him and the
  camera) and whose echo is stronger (loudness, direct-to-echo balance and
  dullness are how we hear distance in a room); they stop at the jump cut,
  already faint; the Haustür far below isn't heard
  (he reaches it in the skipped minutes). Her phone going into her pocket
  rustles; the lighter's flint wheel strikes twice, a touch apart in level,
  each spark on its strike's frame; the gas hisses quietly exactly while each
  flame burns and the lever snaps back each time she lets go; each draw crackles from its start
  to its end, she inhales from each drag to its exhale (before the jump and
  in the dark), and each exhale is a long unvoiced breath. The hiss is a
  steady rush with no audible loop. No
  sound from before the jump runs over the jump cut, and none runs over the
  cut into Nachtruhe. **(test)**

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
  top, a drawer over a door) with a table lamp on each (warm, about 2700 K)
  and a socket above it on the wall; the lamps are a matching pair, each
  switched by a cord switch on its own cord, no rocker on the foot: his lies
  on his pillow, the other on its cabinet beside the lamp's foot, a little
  askew. **(test)** He sleeps
  on the door side; in the evening only his own lamp is on (user decision).
  The bottom of his body stands 5 cm below the mattress top (55 cm), so he
  no longer hops (user decision 2026-11-06: longer legs instead): he stops
  where he can turn, turns his back to the bed and shuffles back until it is
  a finger's width behind him, rises on his toes (heels up, the drawn feet
  rolling on the floor) and sits back onto its edge; his toes leave the floor
  only once his bottom rests on the mattress. In the morning he slides
  forward off the edge onto his toes and lowers his heels. **(test)**
  The fleece drapes over him only while he is on the bed, from sitting back
  onto it until he stands again; walking past the bed's foot he lifts no part
  of it, and once he is up it lies as he left it. **(test)**
- **Curtains:** two sand panels on a ceiling rail behind a wood-look pelmet,
  20 cm in front of the window wall, meeting at the window's middle, each
  1.5 times its width in fabric; drawn, they cover the window with room to
  spare; opened, each bunches at its own wall, clear of the window. The gap
  between the bed and the curtains (47 cm) is too narrow for him: he reaches
  the window only from the gap at the bed's side, by the wall: he turns to
  face it and draws the near panel in one pull, side-stepping along the
  window toward the wall with its fabric in his right hand, his free arm
  tucked in by the wall (user decision: one pull, him walking, so his arm's
  reach no longer limits it); the edge moves exactly as far as his hand, the
  near half just over half open. Their folds deepen as they bunch but never touch the
  radiator or the cabinet. From the street he sees exactly what hangs behind
  the pane. **(test)**
- **Light:** evening: the two lamps; night: dark, a faint orange street glow
  through the curtain; morning: grey daylight through the window, which is a
  real opening in No. 12's facade (No. 13's window there stays solid), so the
  room looks out onto the street. **(test)**
- **Rain on the glass:** by the morning the rain that set in towards dawn has speckled the
  outside of his window: beads of half a millimetre to two and a half
  millimetres covering about a tenth of the glass, none touching another
  (touching beads run together), bigger toward the bottom where running drops
  have gathered them; three old run tracks wander down it, each swept clear
  and ending in a fat drop, and a thin line of water stands on the bottom
  seal. The beads come with the rain and are seen only from the room. **(test)**
- **Window handle:** his window is a turn-tilt window with a white lever
  handle on the inside of the sash, on the side away from the hinges, at the
  window's mid-height: a rosette of 32 x 70 mm and a 13 cm lever
  standing 4 cm off it, hanging down because the window is shut (down shut,
  across open, up tilted). It stands no more than 6 cm into the reveal and
  keeps an ink line clear of its lining and the sill. **(test)**
- **Getting round the bed:** with his arms out as he walks he is 1.5 m wide
  and the passage past the bed's foot is 1.155 m, yet he walks round with his
  arms hanging and swinging as anywhere (owner, 2026-11-10: no tucking them
  up): his bed-side arm passes over the mattress, his wall-side arm brushes
  clear of the wall with a slight bend. **(test)**
- **Sound:** at dusk a blackbird sings (it falls silent before his lamp goes
  off, as blackbirds stop some 20 minutes after sunset) and the town is
  quieter than by day; the Haustür sounds as in the epilogue, as far off as
  the dusk wide stands (inverse distance from the epilogue's camera), and its
  closing is not heard from his bedroom. In the bedroom the street comes
  muffled through the window (the blackbird only faintly: from the cut into the
  bedroom it is the muffled twin, following the scene's own clock even though the
  film joins it 6 s in; owner, 2026-11-10); his lamp clicks on the frame his fingers press
  the cord switch, the fleece rustles under each hand, the bed creaks as he
  sits on it and gets up, his bare steps patter on the laminate. At night the
  town hushes to a faint hum (the wind in the leaves does not hush); it wakes
  with the rain at the dawn. The curtain's gliders run along the ceiling rail
  while he draws it. **(test)**

## Doors

- **Glazed doors:** the Haustür's tall glass strip and his living-room door's panel are real openings in their leaves, glazed with patterned, translucent glass (about half the light through): the hallway, his Flur and whoever stands behind show through as soft shapes and light, without crisp lines; the leaf around the glass is inked as one piece. Every other door in the film is solid (flat doors, lift doors, his bedroom door, the mailboxes). (owner, 2026-11-10) **(test)**
- **Glass out on the street reflects:** every pane facing the street (windows, balcony doors, stair windows, the neighbouring blocks' painted panes and the Haustür's glass, on both sides of the street) mirrors the street in front of it, slightly blurred (the Haustür's patterned glass more), as double glazing does: about 14 % head-on, rising to a full mirror at a grazing angle (Fresnel, glass n = 1.5, two panes). Head-on the reflection only adds to what is behind, so a lit window at night keeps all its light; the room fades only as the glass turns into a mirror. Reflections carry no ink lines. The Haustür's glass mirrors the facade's view while shut and its own, swinging with it, once open. Glass indoors (his window seen from his room, his living-room door) does not reflect. (owner, 2026-11-10) **(test)**

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
  off the step as it comes towards him, and once the key is out steps back
  again out of its swing. **(test)**
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
- His door has a **160° door viewer** (Türspion; the owner picked 160 over
  the 180 and 200 sold as cheaper flats' viewers rarely reach them). The
  spyhole shot is what it shows: a round picture whose angle grows evenly
  from the middle to 80° off the axis at the rim, looking straight out of
  the door, since a viewer set in a door can't tilt; so it never shows the
  door's own face, and Karen stands a little below the middle. **(test)**

## Waste and bins

- Bins are **anthracite with coloured lids**: blue = Papier,
  yellow = Wertstoffe (Gelbe Tonne), dark = Restmüll. Colours differ between
  real cities; this town uses these, always.
- Each bin is a standard 240 l two-wheeled Tonne (DIN EN 840): 1.10 m to the
  top of the shut lid, 58 cm wide, 74 cm deep. The lid has two grips standing
  on its top at the front left and right corners (not on its front edge), and
  a transport bar runs across the back top, a hand's width off the body. The
  row stands a few centimetres off the house wall (the bar keeps it off), so a
  flung-open lid can lean back against the wall. **(test)**
- Each bin has the house number "12" painted on and a sticker naming what
  goes in, from the fictional "Kommunaler Abfallwirtschaftsbetrieb" (no town in its name;
  AWB is a real operators' abbreviation, so it is never used). Never use a
  real operator's logo. **(test)**
- Cardboard is **flattened** in the Papiertonne. An overfull bin has
  cardboard sticking out and its lid propped open.
- Shipping labels on thrown-away boxes have the address **blacked out**
  (Datenschutz). **(test)**
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

## Voices

- No beep before a line (owner, 2026-11-09): the pluck that marked each
  speech bubble is gone with the bubbles; the voices carry the lines. **(test)**
- The film speaks with the owner's own recordings (2026-11-09): one finished
  take per line in public/dialogue/de/ and public/dialogue/en/, named by its
  recording-script ID and published with the repository (owner, 2026-11-09).
  Each take is placed so its speech starts exactly where its line (and
  subtitle) starts, with 50 ms of attack before it and 100 ms of decay after;
  no voice runs into the next line, and each line's subtitle (and Karen's
  moving mouth) lasts at least as long as its take.
  Tibik and Karen speaking on screen play as recorded; the other voices play
  processed copies that scripts/make-voices.mjs makes from the untouched takes
  (Remotion's audio has only volume, speed and pitch): the phone voices in a
  telephone band (320 Hz to 3.2 kHz, compressed, softly clipped), the letter
  as his inner voice in a great hall (owner, 2026-11-09: a church, not a small
  chamber; 2026-11-10: a bit less reverb: a 4 s tail after an 80 ms gap,
  darkened above 4.5 kHz, 10 dB under his dry voice, at least 12 dB under his
  speech just after his words; it rings on under the next sentence as a hall would), Karen on
  the landing in the same stairwell as her blows and steps (owner, 2026-11-09;
  the stairwell's own room, 2.6 s tail) and through his shut door, muffled and
  8 dB lower, whenever the camera is in his Flur, switching at the cuts; the
  phone voices from her speakerphone into the same stairwell (the telephone
  band first, then half her reverb) and Tibik's two lines through the open
  door into it (a little less than hers; "Ja bitte?" behind the shut door stays
  as recorded) (owner, 2026-11-09); the far "EY!"
  barely dulled (120 Hz to 4 kHz) with a slapback off the facades (115 and
  230 ms) at 0.85 of full level: near enough to hear clearly (owner, 2026-11-09:
  closer, the slapback kept). **(test)**
- Tibik's speaking voice is toned "full and present" (owner, 2026-11-10, picked
  by ear from five loudness-matched demos after his thin voice drowned in the
  street): before any room, every take of his is brought to -20 LUFS, high-passed
  at 80 Hz, given body (+3 dB shelf at 180 Hz), less box (-1.5 dB at 420 Hz) and
  presence (+3 dB at 3 kHz), two gentle compressors (2:1 soft, then 4:1 on
  syllables) and a heavily squashed copy 18 dB under, de-essed, barely saturated
  (tanh, 5 dB drive, slight bias) and given a touch of air (+1.5 dB above 8 kHz),
  then levelled to his loudness as before (scripts/make-voices.mjs,
  src/dialogue/voiceTone.json). Rejected: "dense radio" (distorted), "broadcast"
  (cliché); "warm audiobook" usable but less clear. His inner voice carries the
  same tone before its hall (owner, 2026-11-10, from a demo: "it sounds good").
  **(test)**
- Karen's voice is raised two semitones with her formants moving up with it
  (owner, 2026-11-10, from demos: "the most female screeching, exactly as a
  senior Karen would do it"), in every take before its room; no EQ on top (the
  screech EQ sounded the same to the owner's ear, so the simpler chain won). Her
  voice was measured first and left otherwise as recorded: little chest, a
  strong honk at 250 Hz to 1 kHz and more 1 to 2 kHz than Tibik, so she already
  carries over the street; his "full and present" chain would undo her design.
  The raise pulls speech about 4 ms early, so it is delayed back by 4 ms and the
  takes keep their exact length; her speech starts where each take's does
  (median 0 ms, every take within 4 ms). **(test)**
- Karen's mouth follows her takes: it opens two frames before the sound (the
  animator's lead) and shuts when her speech ends, not when the subtitle
  leaves; her spittle bursts fall within the spoken words, and Tibik's nod
  while he talks follows his takes too. **(test)**
- The voices sit clearly over the street (owner, 2026-11-09: they were drowning):
  every take plays a copy brought to its voice's loudness (Karen shouting at
  -15 LUFS, Tibik at -18, his inner voice at -19, the phone voices at -20,
  limited at -1 dBFS), and while anyone speaks the street, the rain and the
  music dip 8 dB, easing down 150 ms before a voice and back over 500 ms after
  it, staying down across pauses under a second so it never pumps between
  quick lines; footsteps, doors and the other effects keep their level. **(test)**
- Footsteps on the dry street, Tibik's and Karen's stomps, carry on a phone's
  small speaker (owner, 2026-11-09, as the bin lid before): lows under 160 Hz
  cut and the body, contact and scuff lifted, so what a small driver plays is
  7-8 dB louder; the thud under her stomps is softly clipped so its low thump
  gains overtones a phone can play (+14 dB there). **(test)**

- The film's sound fades in from silence over its first half second (his lever
  click still heard) and out to silence over its last 2.5 s, after the Haustür
  falls shut, both on an S-curve, through the mix bus every sound passes
  (owner, 2026-11-10). **(test)**

## Formats and subtitles

- The film and every scene render in **16:9 (1920 x 1080)** and **9:16
  (1080 x 1920)** from the same code; the 9:16 compositions sit in Studio's
  "Vertical" folder, ids ending in -9x16. **(test)**
- **4K and 8K** are the same compositions rendered at scale 2 or 4 (Studio's
  render scale, or `--scale=2` / `--scale=4`): 3840 x 2160 and 7680 x 4320 (and
  their 9:16 twins). The 3D canvas draws at the render's own pixel density up
  to 8K (React Three Fiber stopped at 4K and blew the picture up); outlines,
  the spyhole lens and the subtitles follow the real pixels; the letter, the
  one texture read up close, is painted at 10,000 px a metre at 1080p, twice
  that at 4K and four times at 8K, so its type stays crisp. The spyhole draws
  its view at twice the frame's pixels; that buffer keeps its 4x multisampling
  up to an 8K frame's worth of pixels and at 8K relies on its doubled pixels
  alone (multisampled it does not fit the GPU: a black frame). 1080p and 4K
  are pixel for pixel as before (owner, 2026-11-10). Past 8K the 3D stays at
  8K and is enlarged; only the subtitles get finer. **(test)**
- **Frame rate**: the film is timed, cut, solved and checked on a 30 fps
  timeline and renders at 30, 60, 90 or 120 fps: the `fps` prop of the Film
  and every scene (Studio's Props panel steps through them; on the command
  line `--props='{"fps":60}'`), 30 unless set (owner, 2026-11-10). Every
  cut, line, sound and footstep starts on the same instant at every rate. A
  frame between two of the timeline's ticks is drawn from the ticks around it
  (poses part way, a turn the short way round, a switch or a colour as on the
  tick before; where the story jumps at a cut, the tick before), never solved
  anew, so the 30 fps checks cover what 60 to 120 fps shows. Motion blur keeps
  its 180° shutter, so a 60 fps frame is half as blurred. **(test)**
- A shot may name its own **9:16 camera**; it keeps the 16:9 camera's place
  and only turns it (or changes its lens): it follows whoever acts, aims
  between two people, or holds a moment. Without one, the 9:16 frame is the
  middle of the 16:9 shot. Shaken shots keep their jolts in 9:16. **(test)**
- Every cut lands on a whole frame, and the camera each rendered frame uses is
  the camera the checks measure, in both formats: the framing and clipping
  tests hold for the picture as rendered. **(test)**
- In 9:16 whoever speaks keeps head and eyes in frame for the whole line
  wherever the 16:9 frame shows them, point by point (a 16:9 shot that crops
  the crown still holds the eyes it shows); a listener may leave a two-shot; in a
  shot without dialogue whoever the 16:9 frame shows stays in the 9:16 frame;
  no head leaves a shot part-way except staged entrances and exits; heads
  hidden behind a door or wall do not count. **(test)**
- In a face close-up the speaker's irises stay whole in both formats: the
  9:16 reframe aims between his eyes as the camera sees them, not at his feet,
  and keeps his eyes at the height the 16:9 frame has them (within 3 %; about
  40 % down, near the upper third) (his "Hä?" after the circular). **(test)**
- In 9:16 no speaker's eyes sit in the top 300 px of the 1920, the deepest
  band Shorts, Reels or TikTok cover with their own buttons; today the
  highest are Tibik's over Karen's shoulder at the gap (21 %). Karen's 9:16
  close-ups have her eyes near the upper third (34-40 %); the 16:9 ones
  centre them (45-51 %) and stay as they are. **(test)**
- In 9:16 a shot about an object keeps the object in frame while it is being
  used, not just the person using it: in the Treppenhaus "The light switch"
  the aim leans halfway from Tibik toward the light button from 0.4 s before
  his reach until 0.4 s after his hand is back. **(test)**
- Dialogue is shown in **one fixed subtitle bar**, not speech bubbles: low
  and centred (bottom 1010 px in 16:9, 1400 px in 9:16, at most 800 px wide
  there so it clears the platforms' buttons and caption area), a dark
  translucent panel sized to the type. **(test)**
- Each line is cut into **short phrases** of three to five words where time
  and the bar allow, at commas and clause ends, never inside a word; each up
  at least a second and never faster than 20 characters a second (17 is the
  target the voices will bring the rest down to); at most two lines, broken
  where they come out most even, after a comma when that is nearly as even,
  and never after an article, preposition, conjunction, possessive or
  "sehr", so a phrase stays with its noun. A break at a comma wins over a more
  even one, and when every clause of a line is itself a phrase of three to
  five words the line is cut at its clauses (the letter's "Sehr geehrte
  Daminnen, | sehr geehrte Herrinnen, | sehr geehrter Tibik,").
  Keeping a phrase off a word that binds to the next costs at most one more
  phrase, or a two-word phrase at the same count; never a phrase of one word.
  No two phrases in a row look the same. **(test)**
- Type: 64 px in 16:9, 66 px in 9:16. Speaker colours are tints close to
  white (owner: saturated colours are hard to read): Tibik faintly green,
  Karen faintly lilac and in the shouting face, phone voices white italic,
  the letter (Tibik's inner voice) in his green, italic (owner, 2026-11-08).
  **(test)**
- The bar never covers an eye or a mouth of anyone facing the camera while it
  shows, in either format. **(test)**
- The spyhole's round viewer is as wide as the frame's shorter side in both
  formats; in 9:16 it sits 36 px above the middle so the bar crosses it at
  the same height as in 16:9, and the picture inside it is the same.
  **(test)**

## Language

- Strangers say **Sie**. Names are surnames ("Frau Becker"). **(test)**
- Real umlauts and ß, also in capitals: DÜRFEN, not DUERFEN.
- German quotation marks („…“) in on-screen text. **(test)**
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
- A hand that takes hold of something is on it: from the grip until it lets
  go, a hand on a lever, knob, flap, the tape roll, a switch or a curtain is
  never more than 1.5 cm off it or sunk into it. **(test)** Things held at an
  exact point (her phone, the keys, the envelope and letter, the blanket's
  fold) have their own checks in their scenes.
- Nothing teleports: the box never moves more than 10 cm between frames.
  **(test)**
- Cameras stay out of everything and at least 30 cm off the characters (a
  point-of-view shot from inside the bin only keeps its near plane clear).
  **(test)** No shot loses Tibik's head part-way: in every shot his head and
  eyes are in frame throughout or out of it throughout, except his staged
  entrances and exits (out of his flat with the parcel and down the stairs in
  the Klingelsturm; into the bedroom under the camera and past the lens on
  his way round the bed in Nachtruhe). **(test)**
- A sound is heard with the motion it belongs to: on the frame the motion
  first shows (a creak as a lid starts up, a slap on the frame it lands) or a
  frame after it starts, never before it — sound ahead of the picture is
  noticed from about 45 ms, behind it only from about 125 ms. **(test)**
- Hinged lids that are open and still rest on something (the wall, or the
  cardboard propping them). **(test)**
- Bin contents fit inside their bins. **(test)**
- Respect reach: Tibik's arms reach ~46 cm from the shoulder (~55 cm to the
  centre of a handle, counting the hand), and his belly keeps him ~30 cm from
  anything he faces. He is 0.81 m wide and 0.65 m deep. Walking, his arms hang
  and swing; he never walks on camera with both tucked up in front of his chest
  (owner, 2026-11-10; only through his 0.885 m bedroom door at night, off camera,
  are they still tucked). Going in through the Haustür (1.1 m beside its open leaf) he
  turns his body some 55° to his right and swings them less; coming out he holds
  the leaf with his right hand, his left resting on his belly, and once he lets go
  he turns toward the bins; along the bins his bin-side arm rests on his belly.
  He sidles out of his flat with his arms hanging, his left on his belly once he
  lets the door swing shut beside him. Inside the Haustür, in the 1.3 m lane between
  the wall and the balustrade at the foot of the stairs, his hands rest on his
  belly. Only where a relaxed arm cannot fit does one come in: his right past his
  door's knob and the stair wall on his landing, ready for the handrail. **(test)** Plan choreography around that (doors especially: see the
  Treppenhaus door beats).
- When a hand works something (a door handle, a light button, the handrail,
  the Haustür leaf), it touches it for the whole hold. **(test)**
- Hips never rise or fall faster than 0.75 m/s, and never jump from frame to
  frame. **(test)**
- Karen is heavy: short strides, slow to speed up, audible breathing. Her head
  turns about 27 degrees and nods about 15 degrees on its own, until her chin
  would meet her shoulders and chest (pass head poses through
  `limitKarenHead`); beyond that she turns her whole body. **(test)**
- Karen's build: real shoulders — a rounded mass at each side of her torso
  top (her chest and back keep their old shape, so her chin clears them) —
  with the arm joints 0.36 m either side of her centre, 11.5 cm below her
  neck base; her torso slimmer up top than at her belly; long arms (her fist
  reaches the corner of her mouth) that taper from 11.5 cm at the shoulder
  to 8.5 cm at the elbow and 6.2 cm at the wrist and grow out of the
  shoulders: no outline is drawn where an arm grows out of her shoulder
  (within 15 cm of the joint the arm counts as her torso for the outlines)
  and the shading runs across the join, while the rest of the arm keeps its
  own outline and shading wherever it hangs against or crosses her body
  (user, 2026-11-07: "the arms look bolted on"); small hands for her size,
  and a wide, round bust that hangs,
  swelling slowly from the top to its fullest point low down and curving back
  in, two lower curves from the front and no crease between them, moulded
  into her jumper rather than stuck on. The bust is solid: her arms, the
  props she holds and anyone passing keep off it. **(test)**
- The white catchlights in both characters' eyes are flat patches lying on the
  eye (on his pupils, on her eyeballs), never bumps: they sit a fraction of a
  millimetre above the surface and so never poke past the eye's outline seen
  from the side (owner, 2026-11-08). **(test)**
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
  the hips come down where the legs couldn't otherwise reach: no foot, planted
  or lifted, is ever asked to be further from the hip than the leg is long.
  **(test)** The body is lowest around double support: from just before a foot
  lands until it has taken his weight its knee is bent at least 19° (0.33 rad),
  so a landing leg never goes dead straight for a frame. **(test)** A lifted
  foot sets off at once and slows to land. **(test)** Turning, he steps round
  instead of wringing a planted leg: setting off or arriving, the body turns
  onto the new heading at no more than 3.5 rad/s at its peak, and a planted
  foot is turned with the body just enough to stay within 60° of it. **(test)**
  No turn is a spin faster than 5 rad/s, except a few authored turns still to
  be re-timed (counted, so they can only go down). **(test)**
  Footstep sounds land on the plants, and every walker's steps (Karen's
  stomps too) draw their recordings in a seeded order, never the same take
  twice in a row and never a strict rotation (owner's pick, 2026-11-08), each
  a hair higher or lower (within 3 %) and louder or softer (within 1 dB).
  **(test)** Choreography only moves the
  body (position, turn) and says when each foot steps; where the feet land
  follows from that (`src/characters/gait.ts`). A character turning or moving
  needs steps: author them, never slide the body over planted feet. Plan
  steps so one foot is always down, and so the last step of each foot lands
  when the body is nearly where it stops (Karen's legs are straight at rest:
  she can only stand still with her body right over her feet).
- Walking pace follows leg length: over any 0.2 s, speed squared over g times
  leg length (the Froude number) stays at most 0.6. People and other two-legged
  walkers of every size break into a run near 0.5, so with legs of 0.44 m
  (Tibik) and 0.42 m (Karen) a walk tops out around 1.6 m/s. Karen's run in
  Hausmuell is a run (arms pumping, a bob) and may go faster. **(test)**
- Karen pants all through the Klingelsturm (bob and lean at 0.9 Hz) until she
  pockets her phone; by the cut into the Medium her breathing has calmed to a
  fifth of that, so she smokes standing still, and the ash she taps off
  carries only the flick and a breath of her sway. **(test)**
- Moves run into each other rather than one after the other: leaving his
  flat, Tibik starts round the door while it is still swinging open, turns
  toward the light switch while he is still stepping out, has his hand on
  its way to the switch as he arrives, turns to the stairs as he lets go,
  and gets up to the speed of the descent over 0.4 s instead of jumping to
  it. From letting go of his lever to the first stair he is never still for
  more than 0.3 s. **(test)**

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

- The letter in his rain-wet hands: where he holds its edges the paper goes a
  shade darker and faintly see-through in a hand-sized patch a few millimetres
  into the margin, spreading a millimetre or two while he reads and staying
  through the fold and the bin (he took it out in the rain).
- The hand that also holds the envelope sits a few millimetres lower, so the
  page tips about a degree to that side and bows a hair more there.

- His lamp's cord switch: the cord near the switch body carries a short kink
  where it is always bent over the pillow's edge, and lies in a slightly
  different loose curve in the morning than at night (knocked in his sleep);
  the rocker a shade shinier on the side his fingertips press.
- His fleece turned back from the door side: the fold wanders a centimetre or
  two along its length (turned by hand, never ironed), the nap a shade flatter
  along the edge he takes hold of; the sheet slightly rucked where the turned
  back half lay all day.
- His curtain: the folds bunch unevenly around the spot he grabs, and a ring
  catches for a moment on the rail before it slides on.
- His bedroom door: open, the leaf rests a degree or two off its stop; a faint
  scuff on the wall where its lever has bumped.
- His bedside lamp's shade: the fabric a shade darker on the bulb side (years
  of heat and dust), so lit at night its glow is a touch dimmer and warmer there.
- His bed's edge where he sits back onto it: the fitted sheet a shade pilled
  and slack over the mattress's front edge at that spot, and a 1-2 mm soft
  dip in the mattress top there, seen only as shading under the lamp.
- His bedroom floor: a faint sheen worn into the laminate along his daily path
  from the door to the bed, a glossier strip under the lamp, never a line.
- Karen's window at night: one slat of her blind hangs a few degrees out of step
  (its cord pulled harder on one side), a brighter hairline in the row in the
  drone shot (needs a blind on her window first).
- The kerb by the house: a small chip off its top edge where a wheel bumped it,
  pale stone under the grey, seen only in a street lamp's pool at night.
- The wet street: one car parked after the rain set in stands on wet road
  while the others keep a dry patch under them; the gutter band along each
  kerb a shade darker and glossier (the road drains to the gullies); the
  road's sealed joint and the patches' sealed edges shine a touch more; the
  sand joints between the paving slabs stay darker, and one slab by the step
  has sunk a few millimetres and holds a thin sheet that mirrors more; at the
  dawn the first drops freckle the dry slabs with dark dots before the ground
  closes wet; under the street tree fewer, fatter drips, the ground wetting
  later and patchily.
- Rain on the house: slow fat drips from the balcony slabs' fronts, the sills
  and the dish's rim, out of step with the rain; a shallow pond by the roof's
  outlet showing rings; rain ticking on the bin lids, the mailbox top and the
  car roofs apart from the hiss; at the dawn the first drops heard one by one
  before the hiss fills in.
- The curtain: the fabric's swish a few frames before the gliders run (the
  hand takes up the slack first); a soft clatter as the last gliders knock
  together at the end cap.
- The blackbird: a few soft roosting calls after its song, before silence; now
  and then a second one answering faintly from down the street, heard only
  outside.
- The bed and the lamp: a softer settling creak a moment after he sits (the
  slats take the weight after the frame), another as he sits up; the cord
  switch clicking brighter one way than the other; the warm LED bulb lighting
  a few frames after the press and fading over two or three; a tiny tick as the
  loose switch body settles.
- The street at night: a parked car's alarm LED blinking red behind its
  windscreen; the bell panel's name fields faintly lit, one dark from a dead
  LED; two or three moths in the nearer lamp cones; now and then one far-off
  car swelling past on the cross street within the hush.
- Too clean, by the rule above: rain rings spread at every hit, where real
  rings form only on standing water (a small crown splash elsewhere). (The
  footsteps' strict rotation is fixed: see Feet and legs.)
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
- A neighbour's flap or two hangs 1-2 degrees open, or has one corner bent a
  millimetre proud where a thick catalogue was forced through.
- A fine ring of key scratches circles Tibik's lock, brightest below the
  keyhole where a key tip slips while finding it in the dark.
- The "Keine Werbung!" sticker lifts at one corner, and a flyer's corner pokes
  out from under a neighbour's flap (pushed in anyway).
- Krause's pizza flyer two weeks on: the same flyer props the same flap in
  Papiertonnen and in Rundschreiben. Either Krause is away and the box shows
  it (the flyer rain-limp, a second flyer and a free weekly paper pushed in
  beside it, the flap standing wider), or someone has taken it and the flap
  rests shut.
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
  the shade's seam overlapping
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
- Her pounding: where each blow lands and how her arm swings vary by 1-2 cm
  (an angry arm never repeats); afterwards she shakes out her hand (the
  blows' sound variation and the latch settling are built); her phone's backlight has timed
  out while it hangs at her side and lights up again on her first "1".
- His second strip: it drifts 1-2 mm off the seam and its start end is cut
  slightly skew (laid while she pounds); the roll's torn-off tail stands up
  a couple of millimetres, curled.
- Her cigarette: the burn front a few degrees off square (the upper side of
  the drooping cigarette burns about 1 mm ahead, a thin char ring), the ember
  cone 1-2 mm longer on one side and the ash leaning a degree or two (a
  loosely packed cigarette burns unevenly); the filter end slightly
  damp-darkened where her lips hold it; after the jump it droops a degree or
  two lower (the filter softens between her lips over three minutes).
- Her lighter: the red corners scuffed paler from her pocket, a faint soot
  shadow on the hood by the nozzle, the wheel's knurl brighter where her
  thumb rolls it; while she lights up it stands a few degrees off plumb and
  turned a little towards her face (a fist from below never holds it square
  to the room).
- Her smoke: the wisp's puffs bunch and thin by about 10 % on a seeded
  pattern (uneven burning).
- Her jumper over the bust: the knit stretched a shade lighter at the fullest
  point, soft drag creases running from her arm into the shading under the
  bust (shading only, no ink line), a small pilling patch on the forearm side
  where her arm rubs her body.
- Her smoking hand: between draws the cigarette sits deep between her
  fingers; the hand settles a few degrees lower each time (her arm tiring);
  a faint yellow-brown stain on her first two fingers; her right cuff pushed
  a little up the forearm and rucked (she smokes with that arm raised), the
  left one down.
- Her free hand on her belly on the way to his door and back: fingers loosely
  curled, the jumper bunched a little under the palm, the hand drifting a
  centimetre or two with her steps.
- Her lowered phone: a few degrees off square in her palm, swinging a degree
  or two with each step; a faint thumb smudge on the dark glass.
- Pocketing the lighter: a short catch on the pocket's lip before her hand
  comes out empty.
- Her hair: a loose lock resting on her upper bust, lifting a little as she
  breathes.
- The coda's sounds: each draw's crackle starts from a different point of
  the recording (the first, as the paper catches, thinner; the later one
  fuller); the gas hiss dips or flutters slightly during the draws (the draw
  pulls the flame to the tip); the second exhale is a different, shorter and
  lazier breath than the first.
- Her ash tap: the break leaves a ragged 0.5-1 mm grey rim on the ember
  rather than none (ash parts at its weakest layer, rarely flush); the second
  flick a shade shallower and a frame quicker (habit, nothing left to knock
  off); a few-millimetre halo of fine ash dust round the crumbs on the
  terrazzo, a shade lighter, no outline (the impact powders some of it).
- His doormat: the coir trodden a shade flatter and darker in the band in
  front of his door.
- Karen's sleeves and shoulders: the lilac knit cuff ridden up a few
  millimetres off the wrist, the same in every shot; one shoulder 3-5 mm
  higher than the other (a habit from carrying her bag on that side); a
  faint pulled-knit drag from the bust towards the underarm on one side,
  shading only; along the set-in sleeve seam a 1 mm pucker of knit, shading
  only (no outline is drawn there, so the seam is the one place the sewn join
  shows); at each elbow two faint creases and a slight sheen from resting it
  on tables, the knit a few millimetres slack inside the bend.
- Karen's hair where it lies on her shoulders: the last few centimetres a
  little frizzed and a shade duller from rubbing the wool every day.
- The camera on her blows: in his Flur it stands on floating laminate over
  screed, so its jolt rings a touch lower and longer (about 6-7 Hz, settled
  in about 0.35 s) than on the stone landing; on the landing the tripod's
  tilt lock is not quite tight, so after her hardest blow the wide settles
  about 0.03 degrees (1 px) lower and stays there.
- Story changes (only if you want them): a throat-clear after the exhale.
  (~~The first strike doesn't catch~~ — built 2026-11-08 on the owner's idea.)
- Karen ringing his bell: her fingertip lands a few millimetres off the
  button centre on some presses and the button stays down a frame longer on
  others — a hurried, irritated press on a bell she knows, not a machine's.
- Her fist on his door: the blows land a few frames unevenly apart, and the
  paint at fist height round his door's middle is a shade scuffed and lighter
  where visitors have knocked for years.
- Tibik carrying the box: one hand sits a centimetre or two lower than the
  other, so the box tilts a degree or two, and the cardboard corner under that
  hand is a little soft and dented (old, damp cardboard grabbed in a hurry).
- Karen's phone screen in the top-down insert: a faint grease sheen where her
  thumb and cheek touch it and two hairline scratches near a corner from keys
  in the same pocket, caught only where the insert's light grazes the glass.
- His mailbox door's inner face: a small round rub, a few millimetres across,
  where the hanging key ring swings against the metal each time the door is
  open; seen only while the door stands open and his hand ducks under it.
- The tape roll: the outer turn's torn end ragged and lifting about a
  millimetre, and the roll a little out of round on one side from being
  gripped and dropped; a fine uneven edge at the handover, nothing more.
- Karen taking the cigarette out: the dry paper filter sticks to her lower
  lip for a frame or two and pulls it out about a millimetre before it lets go.
- Karen setting off after him in the Hausmuell: the knit at her waist keeps a
  few soft creases where her palm rested, easing out over half a second of
  walking, and her first arm swing is a few degrees short, the elbow still a
  little bent from resting on her hip.
- Tibik taking the handrail at the top of the flight: his hand lands about a
  centimetre off the line it then slides along and settles onto it within a
  tenth of a second (a half-awake grab, not a placed one).
- His mailbox door pushed shut: the light metal door knocks its frame and
  rebounds a degree or less for two frames before it rests flush with the
  click.
- The Papier bin's front lip: a faint pale scuff where cartons are dragged
  out over it, the found box among them.
- The found box: one lower corner a little crushed from lying under the
  other paper in the bin.
- His window's rain: each old run track keeps a sparse dotted trail of tiny
  droplets along the path it swept (a running drop sheds droplets from its
  tail where the glass holds it back), so the track reads as run, not wiped.
- His window's rain: the top two or three centimetres of glass under the
  frame's head carry fewer, smaller beads with a soft edge (the head stands
  proud of the glass and shelters it from the slanting rain).
- His window's bottom seal: the water line breaks into beaded lengths and
  swells a millimetre or two toward the corners (water runs along the seal
  to the drainage slots).
- His window handle: the lever's lower end a shade greyer and glossier where
  his hand takes it every morning to air the room, the rosette still clean.
- The Haustür's doorstep: a pale worn lip along its front top edge where
  shoes scrape up onto it, and a thin darker line at the back against the
  sill where rain stands.
- The Haustür's jamb: on the hinge side, at belly and bag height, the green
  paint a shade lighter and rubbed where people squeeze past with shopping
  and prams.
- His bedroom doorway: the threshold worn a shade shinier in the middle of
  the daily path, and a small paint chip on the latch-side jamb at lever
  height where the lever has knocked it.
- Tibik's heel: a pale scuff on the back outer corner of the heel he steps
  back off the doorstep with, where the step's nosing catches it each time.
- Inside the Papier bin: a dull grey rub on the far inner wall at carton-
  corner height, from cartons dropped in corner first.
- His parcel's flaps: the far long flap creased with one thumb stroke, so a
  faint second crease runs 2-3 mm off the first; the end flaps stand a degree
  or two proud under the long ones.
- The tape roll as one hand takes it from the other: it rocks a degree on
  the taking palm (the loose core), then settles.
- His door as he pushes it shut on her: the leaf rests a hair off the frame
  for a moment before the latch clicks home.
- Leaning in to his lever: the heel of his front foot lifts a few millimetres
  off the floor while he leans.
- The knob on the outer face of his flat door: a brighter, worn patch on top
  where his palm turns it to pull the door shut, and a faint grime ring on
  the rosette beside it.
- The fleece's hem binding at the corner his right hand takes each night:
  lifted a few millimetres, its end curled back where a fingernail caught it.
- The inner face of his flat door, at hand height on the lever side: a faint
  palm-shaped patch of dulled paint where he pushes the leaf to (seen only
  while the door stands ajar).
- His feet land turned out a few degrees (left about 5°, right about 8°, a
  lifelong habit of the hips), so his plants are never quite parallel to his
  heading.
- Turning on a planted foot past about 40°, its heel lifts 2-3 mm and the foot
  pivots on its ball (nothing slides), with a faint scuff in the sound.
- Arriving at the bin or a door, his last step lands a centimetre or two short
  and the trailing foot makes a small half-step to square up before he reaches.
- His door viewer's outer glass carries a faint greasy haze on one side of the
  lens (fingers brushing it as people peer in or wipe it): a soft,
  low-contrast arc near the rim of the spyhole picture that dulls the outlines
  behind it a little, the same in every spyhole shot.
- The viewer sits a hair off-centre in its bore (drilled by hand), so the dark
  rim of the spyhole picture is a touch wider on one side.
- The letter has one bottom corner softly dog-eared from riding loose in the
  mailbox with the flyers (the envelope already has a bent corner; this is the
  sheet inside).
- Each roll of her lighter's flint wheel rocks the lighter a degree or two
  away from her thumb for a frame or two, the second, harder roll a touch
  more (a lighter held loosely in a fist gives under the thumb).
- The two strikes do not sound like one recording twice: the second, an
  annoyed harder roll, sits 2-3 % higher and runs a hair shorter.
- His landing's light button: a soft grey smudge a few centimetres across on
  the plate around it from years of hands finding it in the dark; his
  fingertip lands a few millimetres off centre, low and toward the door,
  because he reaches while still turning.
- His first step down the flight lands a couple of frames behind the beat
  that follows, and his gaze dips a degree or two for it (checking the first
  tread edge) before he settles into the descent.
- His right foot sounds about 1 dB heavier than his left in every scene: it
  is the more turned-out foot (see the parked gait idea) and takes more
  weight.
- The HWS notice in the hall is held by its two top corners only (tape or
  tacks, a caretaker's fix in passing): about a degree off square, its lower
  edge curling 2-3 mm forward from the stairwell damp, the heading's toner a
  shade lighter along one edge (a copy of a copy).
- The bin stickers weather: a thin dark grime line along each lower edge where
  rain runs off the lid, the upper half a shade sun-bleached so the small rules
  text is a touch fainter than the issuer line (apart from the lifting corner).
- The dealer strips under the plates: the printed insert sits 1-2 mm off
  centre in its strip, and strips on the cars that have stood longest are
  yellowed a shade more, not all the same.
- The letter: a loose fleck of toner, about 0.3 mm, in the blank line between
  its second and third paragraphs (a fuser crumb from the batch run), clear of
  every letter.
- The letter's body prints a few per cent lighter towards the foot of the
  sheet (toner thinning late in a long run); the punchline's last line could
  stay at full density so it still lands.
- Karen's far-off "EY!": a short audible inhale about 0.2 s before it, a
  breathy onset and a tail a touch lower (she has been hurrying).
- The letter refolded in passing: along the old creases the panels no longer
  close flush, the top edge ending 1-2 mm off the bottom one and about a
  degree skew, so it goes into the envelope a hair crooked (a quick hand
  refold never matches the machine fold).
- His puzzled tilt during "Hä?": not a held pose; the head creeps on about a
  degree during the hold and comes back half a degree past level before it
  settles (a relaxed neck overshoots).
- The refold sounds softer than the unfolding: the broken creases give a
  duller, quieter rustle in two small presses, one per crease, rather than
  the single flip.
- The catchlights not quite mirrored: each eye's patch shifted a degree or two
  its own way (a window reflects differently in each curved eye).
- His two blinks after the circular not identical: the second a touch
  shallower or slower (about 10 %).
- The two snaps on those blinks not identical: the second a little quieter
  and a hair higher (about 0.85 of the level, rate 1.03).

## Continuity between scenes

- Each scene starts exactly where the previous one ended. **(test)** The
  Treppenhaus ends (`treppenhausEnd()`) with Tibik walking out over the
  threshold at 0.7 m/s, right hand on the outward-swung Haustür (1.5 rad); he
  never stops on the doorstep (user, 2026-11-07), and Papiertonnen cuts on
  that action: the same place, heading and pace, the door and his arms as
  they were, and he lets go of the door 0.3 s later as he walks on. Papiertonnen's last state is exported as
  `papiertonnenEnd()` (src/scenes/papiertonnen/solve.ts): searched bin lid
  open against the wall, the popped-open box in both of Tibik's hands,
  Papier 1 still overfull.
- **Declared time jumps:** Hausmuell → Klingelsturm, Klingelsturm → Nachtruhe
  and Nachtruhe → Rundschreiben are the named exceptions to "each scene starts
  where the previous one ended" (`TIME_JUMPS` in src/timeline.ts); inside the
  Klingelsturm the cut from her lighting up to the wide skips about 170 s
  (story time, `storyTimeIn` in src/toon/shots.ts); inside
  Nachtruhe the shots skip through the evening and night, and its dawn is the
  one time-lapse that takes the story two weeks on. **(test)**
  Klingelsturm starts with Tibik inside, his door shut and latched, Karen on
  the landing, her shoes on her mat. **(test)** Nachtruhe starts at dusk the same
  evening, Tibik on the pavement with only his keys in hand; its morning is the
  epilogue's rainy day. **(test)** The Rundschreiben starts on that morning,
  outside on the pavement, the Haustür and every lid shut, the
  bins emptied. **(test)** No Klingelsturm sound runs over the cut into the
  rain. **(test)** The rain that sets in towards Nachtruhe's dawn runs on over the
  cut into the epilogue without a jump. **(test)**
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
- Tibik's steps sound like the ground they land on: dry concrete on the
  sunny street and in the stairwell (with its echo), wood in his bedroom, and
  wet splashing steps on the rain-soaked pavement in the epilogue (owner's
  pick, 2026-11-08: the CC-BY "water" steps, credited in public/sfx/CREDITS.md;
  a layered public-domain transient sounded like drops on plastic). **(test)**
- Karen's footsteps are always loud, heavy stomps. Every scene plays them
  through `KarenStomp` (src/Karen/KarenStomp.tsx), so they sound the same
  everywhere. **(test)**

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
- ~~**Self-shadowing look**~~ — checked 2026-11-07 (decided on the user's
  behalf): in the sunny shots (Papiertonnen 20/160/260, Hausmuell 30) his own
  head and eyes now shade him softly, nothing blotchy; the hard diagonal
  bands seen on him in the doorway are the door frame's shadow. No change.
- ~~**Foot planting**~~ — done: feet are planted step by step and legs have
  knees (see "Feet and legs" under Physical realism).
- ~~**16:9 or 9:16**~~ — both, from one codebase (owner, 2026-11-08); see
  "Formats and subtitles". Optional English subtitles stay open.
- Frame rate: 30 fps now. Switch to 25 fps only if the film is meant for
  European broadcast.
- **His walk from the bins to the door in the rain (parked for the owner,
  2026-11-08):** 2.8 m in 2.0 s peaks at 1.9 m/s, a running pace for his legs
  (Froude 0.82); the steps are stretched to land and his knee pops at 42.33 s
  (the jump the owner named). The walk can now be retimed on its own (its
  last step lands on the doorstep foot by itself; tried at 2.4 and 2.5 s:
  every leg and pace check passes). Options: give the walk 0.4-0.5 s more (the
  scene runs that much longer, or the 2.5 s hold after the door shuts gives it
  up), or let him hurry in on a real jog (a running gait is new work).
  Recommended: 0.4 s from the closing hold. The walking-pace test excuses this
  walk by name until then.
- **How Karen walks (parked for the owner, 2026-11-08):** she walks in a deep
  squat (knees 65-100 degrees), seen as she follows him at the end of
  Hausmuell. Her legs are long for how low her hips sit (hip joints 0.48 m up,
  thigh and shin 0.42 m, ankles 0.17 m up): standing she splays them to a 1 m
  stance, but walking on a 0.3 m track they hang straight down and must fold.
  Heavy people walk on a wide base with a side-to-side sway and little knee
  bend. Options: (a) her hips rise about 8 cm while she walks, legs nearly
  straight under her (bodies do rise out of a wide stance); (b) a wider
  waddle, about 0.6-1 m track, with sway; (c) keep the squat as a cartoon
  stomp. Recommended: a bit of both, about a 0.6 m track and hips up about
  5 cm. In Klingelsturm her legs are out of frame when she walks.
- **Spyhole optics (parked for the owner, 2026-11-08):** cheap door viewers
  have small plastic lenses: the picture is a little dim, goes soft towards
  the rim and shows a faint purple fringe at the edge. Ours is sharp and
  fringe-free up to its dark rim. Ideas, each subtle: a slight softness over
  the outer third, a one-pixel colour fringe on outlines near the rim, the
  whole picture a touch dimmer than the landing.
