import { Euler, Matrix4, Quaternion, Vector3 } from "three";
import { hipPosition, type LegPose, type Side, type Skeleton } from "./skeleton";

export const MAX_KNEE = (150 * Math.PI) / 180;

const X_AXIS = new Vector3(1, 0, 0);
const FORWARD = new Vector3(0, 0, 1);

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

export const legLength = (skeleton: Skeleton) => skeleton.thigh.length + skeleton.shin.length;

export const shortestLeg = (skeleton: Skeleton) => {
  const { length: a } = skeleton.thigh;
  const { length: b } = skeleton.shin;
  return Math.sqrt(a * a + b * b + 2 * a * b * Math.cos(MAX_KNEE));
};

export const restAnkle = (skeleton: Skeleton, side: Side) => {
  const length = legLength(skeleton);
  return new Vector3(
    side * (skeleton.hipX + length * Math.sin(skeleton.hipSplay)),
    skeleton.hipHeight - length * Math.cos(skeleton.hipSplay),
    0,
  );
};

export const solveLeg = (skeleton: Skeleton, side: Side, ankle: Vector3, footRotation: Quaternion): LegPose => {
  const thigh = skeleton.thigh.length;
  const shin = skeleton.shin.length;
  const hip = new Vector3(...hipPosition(skeleton, side));
  const toAnkle = ankle.clone().sub(hip);
  const distance = clamp(toAnkle.length(), shortestLeg(skeleton), thigh + shin);
  const along = toAnkle.lengthSq() > 1e-12 ? toAnkle.normalize() : new Vector3(0, -1, 0);

  const foot = FORWARD.clone().applyQuaternion(footRotation).setY(0);
  const pole = FORWARD.clone().add(foot.lengthSq() > 1e-9 ? foot.normalize() : FORWARD);
  let bend = pole.addScaledVector(along, -pole.dot(along));
  if (bend.lengthSq() < 1e-9) {
    bend = FORWARD.clone().addScaledVector(along, -along.z);
  }
  bend.normalize();

  const cosHip = clamp((thigh * thigh + distance * distance - shin * shin) / (2 * thigh * distance), -1, 1);
  const thighDir = along.clone().multiplyScalar(cosHip).addScaledVector(bend, Math.sqrt(1 - cosHip * cosHip));
  const knee = hip.clone().addScaledVector(thighDir, thigh);
  const shinDir = hip.clone().addScaledVector(along, distance).sub(knee).normalize();

  const y = thighDir.clone().negate();
  const z = bend.clone().addScaledVector(thighDir, -bend.dot(thighDir)).normalize();
  const x = y.clone().cross(z);
  const hipQuaternion = new Quaternion().setFromRotationMatrix(new Matrix4().makeBasis(x, y, z));
  const kneeAngle = Math.acos(clamp(thighDir.dot(shinDir), -1, 1));

  const shinQuaternion = hipQuaternion.clone().multiply(new Quaternion().setFromAxisAngle(X_AXIS, kneeAngle));
  const ankleQuaternion = shinQuaternion.invert().multiply(footRotation);
  const hipEuler = new Euler().setFromQuaternion(hipQuaternion, "XYZ");
  const ankleEuler = new Euler().setFromQuaternion(ankleQuaternion, "XYZ");
  return {
    hip: [hipEuler.x, hipEuler.y, hipEuler.z],
    knee: kneeAngle,
    ankle: [ankleEuler.x, ankleEuler.y, ankleEuler.z],
  };
};

export const restLeg = (skeleton: Skeleton, side: Side): LegPose =>
  solveLeg(skeleton, side, restAnkle(skeleton, side), new Quaternion());
