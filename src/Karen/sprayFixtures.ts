import { Vector3 } from "three";
import type { Line } from "../dialogue/line";
import type { Emitter } from "./spray";

export const karenLine = (
  text: string,
  from: number,
  to: number,
  tone: Line["tone"] = "shout",
): Line => ({
  speaker: "karen",
  from,
  to,
  text,
  name: text,
  tone,
  box: { left: 0, top: 0, width: 100, height: 100, fontSize: 40 },
});

export const AHEAD: Emitter = {
  origin: new Vector3(0, 1.45, 0),
  forward: new Vector3(0, 0, 1),
  up: new Vector3(0, 1, 0),
  open: 1,
};
