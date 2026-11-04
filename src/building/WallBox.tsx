import type { ReactNode } from "react";
import { ToonBox, type Vec3 } from "../toon/primitives";
import { wallFrame, type WallButton } from "./stairwell";

export const WallBox: React.FC<{
  readonly on: WallButton;
  readonly size: Vec3;
  readonly color: string;
  readonly lift?: number;
  readonly children?: ReactNode;
}> = ({ on, size, color, lift = 0.001, children }) => (
  <group matrixAutoUpdate={false} matrix={wallFrame(on)}>
    <ToonBox size={size} color={color} />
    <group position={[0, 0, size[2] / 2 + lift]}>{children}</group>
  </group>
);
