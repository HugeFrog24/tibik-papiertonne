# Treppenhaus preamble: design

Status: design agreed in chat and spec approved on 2026-11-03. Nothing built
yet.

## Goal

A short scene before the Papiertonnen scene that makes it unambiguous that
Tibik **lives in No. 12 as a tenant**. He leaves his own flat, goes down the
Treppenhaus and comes out of the front door, then walks to the bins. Nobody
watching should think he is a stranger trespassing at someone else's bins.

## Decisions

| Topic | Decision | By |
|---|---|---|
| How much to show | Staircase only: his flat door, the stairs, out the Haustür. No flat interior. | User |
| His door key | Deferred. He pulls the flat door shut by its fixed outside knob; no key shown. | User |
| Indoor and outdoor | Same building, same 3D space: the Treppenhaus stands behind the existing entrance and staircase windows of No. 12. | User |
| His floor | 1. OG (first floor above ground). | Agreed |
| Lift | Built in, doors closed. Required anyway: the 5. OG floor is at 14.7 m, and the German building code (MBO §39(4)) requires lifts above 13 m. A later revision may have him take it from a higher floor. | User (later) / code |
| Dialogue | None in this scene. | Agreed |
| Scene naming | Stable names instead of numbers ("Treppenhaus", "Papiertonnen", "Hausmuell"); story order only in `Film.tsx`. See "Structure". | User |

## Story and shots (about 12 s, 30 fps)

1. **His door (0–3.5 s).** 1. OG landing, medium shot of his wooden
   Wohnungstür: spyhole, doorbell button, nameplate "Tibik" (matching the
   doorbell panel outside), plain coir doormat. The neighbour's door opposite
   has a pair of shoes on its mat. The stairwell is dim. His door opens, light
   from the flat falls onto the landing, he steps out and pulls the door shut
   by the knob (*klack*).
2. **The light switch (3.5–5.5 s).** He presses the orange glowing
   Treppenhauslicht button by his door (*klick*). The stairwell lights come
   on. He turns to the stairs.
3. **Down the long flight (5.5–8.5 s).** Camera in the ground-floor hallway,
   looking up the straight flight. He comes down towards the daylight from the
   window above the front door, one hand sliding along the handrail. Cut
   midway down, to skip the rest of the walk down.
4. **Out the front door (8.5–12 s).** From the hallway, behind him: the last
   steps, the Haustür's glass strip glowing with daylight. He opens it,
   daylight floods in, he steps through. **Cut on the action** to the
   Papiertonnen scene, which opens outside on the same moment.

## The set

Everything sits in the street's coordinates (`src/street/layout.ts`):
entrance at x = −1.9, facade at z = −2.2, ground floor at y = 0.15 (on top of
the door step), floor N at `floorLevel(N)`, storey height 2.85 m.

- **Staircase core:** directly behind the entrance, about 2.6 m wide (x ≈ −3.2
  to −0.6), reaching back from the facade.
- **Upper storeys (1. OG and up):** two flights per storey with a half
  landing at the facade. The existing staircase windows already sit at the
  right height above those half landings, from the 2. OG up (window centre
  ≈ 1.575 m above the half landing). Floor landings are at the back, each
  with two flat doors and the lift door.
- **Ground floor:** a half landing between EG and 1. OG would sit across the
  Haustür. So the EG gets **one long straight flight** from the entrance
  hallway up to the 1. OG landing: 3.15 m rise, 18 risers of 17.5 cm, 17
  treads of 28 cm (≈ 4.8 m run). The lowest staircase window (centre 3.45 m)
  lights this tall entrance hall, which matches the facade as built.
- **Steps:** grey terrazzo, rise 17.5 cm and going 28 cm (normal for DIN 18065
  in housing). Wooden handrail on plain steel bars, 90 cm high.
- **Walls:** washable darker oil paint on the lower part (Ölsockel), white
  above.
- **Flat doors:** wood, spyhole, doorbell, nameplate, fixed outside knob.
  Opening into the flat. Rough opening 1010 mm (the wider German standard
  size), so Tibik (about 0.81 m across the body) walks through without
  squeezing.
- **Lighting:**
  - orange glowing Treppenhauslicht push buttons on each landing
  - milk-glass ceiling lamps, off until he presses the button
  - daylight through the windows, from the same sun direction as outside
- **Hallway:** Hausordnung and Reinigungsplan on a board ("Treppenhausreinigung
  diese Woche: 1. OG links").
- **Back of the Haustür:** glass strip, handle, door closer arm at the top, a
  "Bitte Haustür geschlossen halten" sign. It opens inwards and is hinged on
  the side away from the street-side handle (handle at x = −1.48).
- **Kept clear:** in Germany the stairwell is the escape route, so there's no
  shoe rack, bikes or pram, only doormats and the neighbour's shoes on theirs.
- **No mailboxes inside:** they're outside next to the door, as already
  built.
- **Facade changes:** the doorway becomes a real opening, and the staircase
  windows get real glass. You can see in from the street and out from the
  stairwell. Window positions stay as they are.

## Motion and physics

- **Walking down stairs** uses the gait system (`src/characters/gait.ts`,
  `legs.ts`).
  - Each foot is planted on a tread: the whole foot on the tread, toes allowed
    slightly over the nosing as people do going down. A planted foot doesn't
    slide.
  - The supporting knee bends to lower him onto the next step. The body
    follows the line of the stairs without bobbing through the steps.
  - The door step outside (15 cm) is stepped down the same way.
- **Handrail:** one hand slides along it, touching it, through the existing
  grip and arm reach system.
- **Doors** are hinged solids that swing. Tibik can't pass through a door
  leaf, a frame or a wall, and a door can't swing through him.
  - **His flat door:** he pulls it shut from the landing by the knob.
  - **The Haustür:** he pulls it open (inwards), steps out, and the door
    closer swings it shut behind him.
- **Collision model of the Treppenhaus:**
  - every step and both landings
  - the walls
  - the handrail and balusters
  - both doors and the lift door
  - the underside of the flight above, with at least 2.0 m headroom (DIN
    18065). With his eye bumps, Tibik is about 1.75 m tall.

## Sound

- **The street behind closed doors.** `scripts/make-ambience.mjs` also writes
  muffled, quieter versions of the two street loops (low-passed, from the same
  signal). Indoors, only those play. As the Haustür opens they crossfade into
  the full loops, which continue across the cut. The film keeps one continuous
  ambience across every cut, as now.
- **Footsteps on the stone stairs** with a short stairwell echo: each step is
  repeated a few frames later, quieter.
- **Door and switch sounds** from the free (CC0) Kenney packs, credited in
  `public/sfx/CREDITS.md`:
  - his flat door pulled shut (*klack*)
  - the light button (*klick*)
  - the Haustür opening, and the closer pulling it shut (*whump*)

## Hand-off into the Papiertonnen scene

- **The cut** happens as he steps through the Haustür: from behind him inside,
  to in front of him outside. The movement continues in the same screen
  direction.
- **The Papiertonnen scene's opening is re-staged.** He starts in the doorway
  (x = −1.9), steps down the door step, turns right and walks to the bins,
  while the door closes behind him. This replaces "already walking from
  x = −2.6".
- **Timing:** the walk is about 1.2 m longer, so that scene grows by about
  1–1.5 s and all its later beats shift. Its **end state stays exactly the
  same**, so the hand-off to the Hausmuell scene and its tests are unaffected.

## Structure

- **Naming.** Scenes get stable names instead of numbers, the way
  animation studios use sequence codes. Their order lives only in `Film.tsx`
  (the edit). Adding a scene then never renames another.
  - Folders: `src/scenes/treppenhaus/`, `src/scenes/papiertonnen/` (now
    `src/Scene1/`), `src/scenes/hausmuell/` (now `src/Scene2/`).
  - Compositions: `Treppenhaus`, `Papiertonnen`, `Hausmuell` in the "Scenes"
    folder, registered in story order. `Film` plays them in a `<Series>`.
  - Code names follow, e.g. `solveScene1` → `solvePapiertonnen`, `scene1End`
    → `papiertonnenEnd`, `SCENE1_FRAMES` → `PAPIERTONNEN_FRAMES`.
- **Frame counts** are worked out from each scene's duration, as now.

## Tests

In the style of the existing scene tests (`physics.test.ts` per scene):

- In no frame does anything pass through anything: Tibik, the doors, the
  stairs, the railing, the walls.
- Planted feet don't slide, and every planted foot rests on a tread rather
  than hanging off an edge.
- The rail hand touches the rail while it slides.
- **Cameras:** no camera is inside a wall, or so close to one that the near
  plane cuts it off.
- **Facade matches the inside:** each staircase window sits above a half
  landing at the right height, and the doorway opening matches the Haustür.
- **Hand-off:** the last frame of Treppenhaus equals the first frame of
  Papiertonnen (Tibik's position, turn and pose, legs included, and the
  Haustür angle).
- **The rename moves nothing:** the full suite passes unchanged before and
  after it.

## Out of scope / deferred

- Where Tibik keeps his key (no pockets).
- His flat's interior.
- Taking the lift from a higher floor.
- The film's ending (Viel Spaß damit / Weisungsbefugnis).
- The plush-alignment changes to Tibik's look. They are independent and can
  come before or after this.

## Risks

- **Sunlight inside.** With indoors and outdoors in one 3D scene, the sun
  would light the interior through solid walls unless the walls cast shadows.
  Plan: shadow-casting walls, so sunlight only comes through the windows and
  the open door. Check that shadow-map resolution and extent cover the
  stairwell, or else light the interior separately.
- **Tight cameras.** The stairwell is narrow, so camera placement is
  constrained (hence the camera test).
- **Test time and crashes.** The suite takes about 3 minutes now, and the
  Windows test worker sometimes crashes (0xC0000005). Keep scene tests in
  separate files and run them one file at a time.

## Build order

1. Rename the scenes (mechanical), with the full suite passing unchanged.
2. Facade openings (doorway and glass), and the Treppenhaus set with its
   collision model and the geometry tests.
3. The doors (hinged solids) and the light switch.
4. Stair walking (foot plants on treads), and the handrail hand.
5. Treppenhaus choreography and cameras, plus the camera test.
6. Re-stage the Papiertonnen opening from the doorway, plus the hand-off test.
7. Sound: muffled ambience crossfade, stair echo, door and switch sounds.
8. Renders of every shot for review.
