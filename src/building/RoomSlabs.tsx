import type { Texture } from "three";
import { ToonBox } from "../toon/primitives";
import { laminate } from "./interiorTextures";

export const RoomSlabs: React.FC<{
  readonly room: { readonly x0: number; readonly x1: number; readonly z0: number; readonly z1: number; readonly height: number };
  readonly floor: number;
  readonly ceiling: string;
  readonly ceilingMap?: Texture;
}> = ({ room, floor, ceiling, ceilingMap }) => {
  const width = room.x1 - room.x0;
  const depth = room.z1 - room.z0;
  const middle = { x: (room.x0 + room.x1) / 2, z: (room.z0 + room.z1) / 2 };
  return (
    <>
      <ToonBox
        position={[middle.x, floor - 0.025, middle.z]}
        size={[width, 0.05, depth]}
        color="#ffffff"
        map={laminate(width, depth)}
        outline={false}
      />
      <ToonBox
        position={[middle.x, floor + room.height + 0.1, middle.z]}
        size={[width, 0.2, depth]}
        color={ceiling}
        map={ceilingMap}
        outline={false}
      />
    </>
  );
};
