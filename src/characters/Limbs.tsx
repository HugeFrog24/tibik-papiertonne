import { ONE_UNIT } from "../toon/inkWidth";
import type { ReactNode } from "react";
import { Blob, Segment, type Paint } from "../toon/primitives";
import {
  ankleRotation,
  elbowRotation,
  hipPosition,
  hipRotation,
  kneeRotation,
  shoulderRotation,
  type ArmPose,
  type LegPose,
  type Side,
  type Skeleton,
} from "./skeleton";

export const SkeletonArm: React.FC<{
  readonly skeleton: Skeleton;
  readonly side: Side;
  readonly pose: ArmPose;
  readonly sleeve: Paint;
  readonly hand: Paint;
  readonly children?: ReactNode;
}> = ({ skeleton, side, pose, sleeve, hand, children }) => (
  <group
    position={[side * skeleton.shoulder.x, skeleton.shoulder.y, 0]}
    rotation={shoulderRotation(pose, side)}
    userData={ONE_UNIT}
  >
    <Segment
      length={skeleton.upperArm.length}
      radius={skeleton.upperArm.radius}
      color={sleeve}
    />
    <group
      position={[0, -skeleton.upperArm.length, 0]}
      rotation={elbowRotation(pose, side)}
    >
      <Segment
        length={skeleton.forearm.length}
        radius={skeleton.forearm.radius}
        color={sleeve}
      />
      <Blob
        position={[0, -skeleton.hand.offset, 0]}
        scale={skeleton.hand.size}
        color={hand}
      />
      {children}
    </group>
  </group>
);

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
