import type { ReactNode } from "react";
import type { Texture } from "three";
import { ToonBox } from "../toon/primitives";
import { doorFrame, type Door } from "./doors";
import { present } from "../toon/present";

export const DoorLeaf: React.FC<{
  readonly door: Door;
  readonly angle: number;
  readonly color: string;
  readonly map?: Texture | undefined;
  readonly ink?: number | undefined;
  readonly userData?: Record<string, unknown> | undefined;
  readonly children?: ReactNode;
}> = ({ door, angle, color, map, ink, userData, children }) => (
  <group
    matrixAutoUpdate={false}
    matrix={doorFrame(door, angle)}
    {...present({ userData })}
  >
    <ToonBox
      position={[door.width / 2, door.height / 2, 0]}
      size={[door.width, door.height, door.thickness]}
      color={color}
      map={map}
      ink={ink}
    />
    {children}
  </group>
);
