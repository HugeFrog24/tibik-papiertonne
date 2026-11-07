import { Matrix3, Matrix4, Vector3, type LatheGeometry } from "three";
import { frame } from "../physics/collision";
import { ONE_UNIT, inkJoin } from "../toon/inkWidth";
import { ARM_INK_JOIN, blendedNormal } from "./blendNormals";
import { useMemo, type ReactNode } from "react";
import { Blob, Segment, TaperedSegment, type Paint } from "../toon/primitives";
import {
  ankleRotation,
  elbowRotation,
  hipPosition,
  hipRotation,
  kneeRotation,
  shoulderPosition,
  shoulderRotation,
  type ArmPose,
  type LegPose,
  type Side,
  type Skeleton,
} from "./skeleton";

const Limb: React.FC<{ readonly length: number; readonly top: number; readonly bottom: number; readonly color: Paint; readonly reshade?: (geometry: LatheGeometry) => void; readonly userData?: Record<string, unknown>; readonly outline?: boolean }> = ({ length, top, bottom, color, reshade, userData, outline = true }) =>
  top === bottom && !reshade && outline ? <Segment length={length} radius={top} color={color} userData={userData} /> : <TaperedSegment length={length} top={top} bottom={bottom} color={color} reshade={reshade} userData={userData} outline={outline} />;

const ROOT_JOIN = inkJoin(ARM_INK_JOIN);

const intoTheTorso = (skeleton: Skeleton, side: Side, raise: number, out: number) => (geometry: LatheGeometry) => {
  const at = shoulderPosition(skeleton, side);
  const joint = new Vector3(...at);
  const toTorso = frame(new Matrix4(), at, shoulderRotation({ raise, out }, side));
  const turn = new Matrix3().getNormalMatrix(toTorso);
  const back = turn.clone().invert();
  const position = geometry.attributes.position;
  const normal = geometry.attributes.normal;
  const p = new Vector3();
  const n = new Vector3();
  for (let i = 0; i < position.count; i++) {
    p.fromBufferAttribute(position, i).applyMatrix4(toTorso);
    n.fromBufferAttribute(normal, i).applyMatrix3(turn);
    const blended = blendedNormal(skeleton, p, n, joint).applyMatrix3(back).normalize();
    normal.setXYZ(i, blended.x, blended.y, blended.z);
  }
  normal.needsUpdate = true;
};

export const SkeletonArm: React.FC<{
  readonly skeleton: Skeleton;
  readonly side: Side;
  readonly pose: ArmPose;
  readonly sleeve: Paint;
  readonly hand: Paint;
  readonly blend?: boolean;
  readonly children?: ReactNode;
}> = ({ skeleton, side, pose, sleeve, hand, blend = false, children }) => {
  const { raise, out } = pose;
  const reshade = useMemo(() => (blend ? intoTheTorso(skeleton, side, raise, out) : undefined), [blend, skeleton, side, raise, out]);
  return (
  <group
    position={shoulderPosition(skeleton, side)}
    rotation={shoulderRotation(pose, side)}
    userData={ONE_UNIT}
  >
    <Limb length={skeleton.upperArm.length} top={skeleton.upperArm.shoulder ?? skeleton.upperArm.radius} bottom={skeleton.upperArm.radius} color={sleeve} reshade={reshade} userData={blend ? ROOT_JOIN : undefined} outline={!blend} />
    <group
      position={[0, -skeleton.upperArm.length, 0]}
      rotation={elbowRotation(pose, side)}
    >
      <Limb length={skeleton.forearm.length} top={skeleton.forearm.radius} bottom={skeleton.forearm.wrist ?? skeleton.forearm.radius} color={sleeve} />
      <Blob
        position={[0, -skeleton.hand.offset, 0]}
        scale={skeleton.hand.size}
        color={hand}
      />
      {children}
    </group>
  </group>
  );
};

export const SkeletonLeg: React.FC<{
  readonly skeleton: Skeleton;
  readonly side: Side;
  readonly pose: LegPose;
  readonly color: Paint;
  readonly children?: ReactNode;
}> = ({ skeleton, side, pose, color, children }) => (
  <group
    position={hipPosition(skeleton, side)}
    rotation={hipRotation(pose)}
    userData={ONE_UNIT}
  >
    <Segment
      length={skeleton.thigh.length}
      radius={skeleton.thigh.radius}
      color={color}
    />
    <group
      position={[0, -skeleton.thigh.length, 0]}
      rotation={kneeRotation(pose)}
    >
      <Segment
        length={skeleton.shin.length}
        radius={skeleton.shin.radius}
        color={color}
      />
      <group
        position={[0, -skeleton.shin.length, 0]}
        rotation={ankleRotation(pose)}
      >
        {children}
      </group>
    </group>
  </group>
);
