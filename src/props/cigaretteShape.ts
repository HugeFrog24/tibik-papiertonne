import { Vector3, type Matrix4 } from "three";
import { obb, type Obb } from "../physics/collision";

export const CIGARETTE = {
  length: 0.084,
  radius: 0.004,
  filter: 0.025,
  ink: 0.002,
  paper: "#f4f2ec",
  cork: "#c98a4b",
  ash: "#9a9893",
  tobacco: "#7a4a22",
  ember: { rest: "#b8321a", draw: "#ffb038", depth: 0.0015 },
  face: 0.0005,
  emberLight: { colour: "#ff6a2a", distance: 0.14, decay: 2, intensity: 0.004 },
  butt: 0.003,
};

const ROD = CIGARETTE.length - CIGARETTE.filter;

export const cigaretteParts = ({ burned, ash }: { readonly burned: number; readonly ash: number }) => {
  const done = Math.min(Math.max(0, burned), ROD - CIGARETTE.butt);
  const rod = ROD - done;
  return { rod, ashLength: Math.min(Math.max(0, ash), done), emberAt: CIGARETTE.filter + rod };
};

export type CigarettePart = "filter" | "paper" | "tobacco" | "ember" | "ash";

export const cigaretteSegments = ({ burned, ash, lit }: { readonly burned: number; readonly ash: number; readonly lit: boolean }) => {
  const { ashLength, emberAt } = cigaretteParts({ burned, ash });
  const end = lit ? CIGARETTE.ember.depth : CIGARETTE.face;
  const parts: { readonly part: CigarettePart; readonly from: number; readonly to: number }[] = [
    { part: "filter", from: 0, to: CIGARETTE.filter },
    { part: "paper", from: CIGARETTE.filter, to: emberAt - end },
    { part: lit ? "ember" : "tobacco", from: emberAt - end, to: emberAt },
  ];
  return ashLength > 0 ? [...parts, { part: "ash" as const, from: emberAt, to: emberAt + ashLength }] : parts;
};

const lengthOf = (burned: number, ash: number) => {
  const parts = cigaretteParts({ burned, ash });
  return parts.emberAt + parts.ashLength;
};

export const cigaretteObb = (frame: Matrix4, burned: number, ash = 0): Obb => {
  const length = lengthOf(burned, ash);
  return obb("cigarette", frame, [2 * CIGARETTE.radius, 2 * CIGARETTE.radius, length], [0, 0, length / 2]);
};

export const cigaretteTip = (frame: Matrix4, burned: number) =>
  new Vector3(0, 0, cigaretteParts({ burned, ash: 0 }).emberAt).applyMatrix4(frame);
