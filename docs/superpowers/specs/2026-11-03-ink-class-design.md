# Swallowed outlines as a class — design

Decided by the user on 2026-11-03 ("Both"), after a run of single reports:
Karen's chin into her neckline, the back of her head into her shirt, a bin
lid into the house wall, Tibik's arm into the carton.

## The bug class

Outlines are inverted hulls: each part is drawn again 1.4 cm (`OUTLINE`)
larger, back faces only, in ink. Wherever another part comes within 1.4 cm
of a part's surface (or sinks into it), that part covers the ink band and the
outline disappears there. Spotting each case by eye does not scale.

## 1. Ink pass (render level)

One full-screen post pass replaces `FisheyePass` as the renderer of every
scene (fisheye stays an option of the same pass):

1. Colour: the scene as now, into a multisampled target.
2. Id and depth: the scene again with every mesh drawn in a flat material
   carrying its own id and its view depth (float target, no multisampling).
   Ink hulls and ink lines are hidden for this pass.
3. Composite: a pixel becomes ink when, within one outline width (1.4 cm at
   that depth, converted to pixels from the camera's field of view, capped),
   a sample shows a different part at least 2 mm nearer the camera. The line
   lands on the far side of the boundary, where a hull outline would be.

What this draws: a line wherever one part overlaps another on screen, even
when the hull band is swallowed. What it does not draw: decals and set seams
(no depth jump), a part's own smooth surface (same id).

Proof: renders of the reported frames show an unbroken line under Karen's
chin, at the back of her head, along the lid against the wall and around
Tibik's arm on the carton; a pixel check counts ink across those borders.

## 2. Sweep (geometry level)

A per-frame check across all scenes for what the ink pass cannot fix:

- parts passing into each other, including a character's own parts (head,
  jowls and hair against the torso, all around, not only the face);
- joints bent the wrong way: the elbow flexes only forward of the upper arm
  (no hyperextension), within an anatomical twist of the upper arm.

Every finding is fixed in the geometry or the pose, test first.
