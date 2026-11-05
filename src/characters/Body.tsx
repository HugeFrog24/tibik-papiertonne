import type { ReactNode } from "react";
import type { Vec3 } from "../toon/primitives";
import { torsoRotation, type LegPose, type Pose, type Side } from "./skeleton";

export const Body: React.FC<{
  readonly position: Vec3;
  readonly rotationY: number;
  readonly pose: Pose;
  readonly hipHeight: number;
  readonly Leg: React.FC<{ readonly side: Side; readonly pose: LegPose }>;
  readonly children: ReactNode;
  readonly tilt?: number;
}> = ({ position, rotationY, pose, hipHeight, Leg, children, tilt }) => {
  const body = (
    <>
      <Leg side={1} pose={pose.leftLeg} />
      <Leg side={-1} pose={pose.rightLeg} />
      <group position={[0, hipHeight, 0]} rotation={torsoRotation(pose)}>
        {children}
      </group>
    </>
  );
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <group position={[0, pose.bob, 0]}>
        {tilt ? (
          <group position={[0, hipHeight, 0]} rotation={[-tilt, 0, 0]}>
            <group position={[0, -hipHeight, 0]}>{body}</group>
          </group>
        ) : (
          body
        )}
      </group>
    </group>
  );
};
