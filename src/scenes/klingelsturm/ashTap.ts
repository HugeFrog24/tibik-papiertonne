import { Matrix4, Quaternion, Vector3 } from "three";
import { easeUnit } from "../../characters/scalar";
import { ASH_RADIUS, cigaretteParts } from "../../props/cigaretteShape";
import { heightAfter, landsAfter } from "../../physics/fall";
import { floorLevel } from "../../street/building";
import { ASH, CODA } from "./cigarette";

export type AshPiece = { readonly center: Vector3; readonly rotation: Quaternion; readonly length: number; readonly radius: number };
export type AshRelease = { readonly center: Vector3; readonly rotation: Quaternion; readonly velocity: Vector3 };

const FLOOR = floorLevel(1);
const LIES_FLAT_BY = 0.7;
const ALONG = new Vector3(0, 0, 1);
const UP = new Vector3(0, 1, 0);

const CRUMBS: readonly { readonly length: number; readonly radius: number; readonly at: readonly [number, number]; readonly turn: number }[] = [
  { length: 0.55, radius: 1, at: [0, 0], turn: 0 },
  { length: 0.25, radius: 0.9, at: [0.011, 0.004], turn: 0.9 },
  { length: 0.3, radius: 0.35, at: [-0.006, 0.009], turn: 2.1 },
  { length: 0.25, radius: 0.3, at: [0.004, -0.008], turn: 0.4 },
  { length: 0.2, radius: 0.3, at: [0.016, -0.004], turn: 1.4 },
];

export const ashOnTheCigarette = (frame: Matrix4, burned: number) => {
  const { emberAt } = cigaretteParts({ burned, ash: ASH.hold });
  return {
    center: new Vector3(0, 0, emberAt + ASH.hold / 2).applyMatrix4(frame),
    rotation: new Quaternion().setFromRotationMatrix(new Matrix4().extractRotation(frame)),
  };
};

const lyingFlat = (rotation: Quaternion) => {
  const heading = ALONG.clone().applyQuaternion(rotation).setY(0);
  return new Quaternion().setFromUnitVectors(ALONG, heading.lengthSq() > 1e-12 ? heading.normalize() : ALONG);
};

export const ashLandsAfter = (release: AshRelease) => landsAfter(release.center.y - (FLOOR + ASH_RADIUS), release.velocity.y);

export const fallenAshAt = (t: number, release: AshRelease): AshPiece[] => {
  const landing = ashLandsAfter(release);
  const flight = Math.min(Math.max(0, t - CODA.ashOff), landing);
  const center = release.center
    .clone()
    .addScaledVector(release.velocity, flight)
    .setY(heightAfter(release.center.y, release.velocity.y, flight));
  const flat = lyingFlat(release.rotation);
  if (t - CODA.ashOff < landing) {
    return [{ center, rotation: release.rotation.clone().slerp(flat, easeUnit(flight / (landing * LIES_FLAT_BY))), length: ASH.hold, radius: ASH_RADIUS }];
  }
  const ahead = ALONG.clone().applyQuaternion(flat);
  const side = ahead.clone().cross(UP);
  return CRUMBS.map((crumb) => {
    const radius = ASH_RADIUS * crumb.radius;
    return {
      center: center.clone().addScaledVector(ahead, crumb.at[0]).addScaledVector(side, crumb.at[1]).setY(FLOOR + radius),
      rotation: new Quaternion().setFromAxisAngle(UP, crumb.turn).multiply(flat),
      length: ASH.hold * crumb.length,
      radius,
    };
  });
};
