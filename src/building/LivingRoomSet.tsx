import { floorLevel } from "../street/building";
import { ToonBox, addVec, type Vec3 } from "../toon/primitives";
import { DoorGrips } from "./DoorGrips";
import { DoorLeaf } from "./DoorLeaf";
import { WALL_WHITE, alder, laminate, patternGlass, wildOak } from "./interiorTextures";
import {
  BASE_UNIT,
  CHAISE,
  LIVING_DOOR,
  LIVING_ROOM,
  SOFA,
  TALL_UNIT,
  WALL_UNIT,
  WORKTOP,
  livingFrameParts,
} from "./livingRoomShape";
import { FLUR } from "./stairwell";

const floor = floorLevel(1);
const WALL = 0.2;
const COLOURS = {
  wall: WALL_WHITE,
  anthracite: "#3b3d40",
  sofa: "#8c8076",
  cushion: "#968a7f",
  steel: "#c3c5c7",
};

const Shell: React.FC = () => {
  const { x0, x1, z0, z1, height } = LIVING_ROOM;
  const width = x1 - x0;
  const depth = z1 - z0;
  return (
    <group>
      <ToonBox
        position={[(x0 + x1) / 2, floor - 0.025, (z0 + z1) / 2]}
        size={[width, 0.05, depth]}
        color="#ffffff"
        map={laminate(width, depth)}
        outline={false}
      />
      <ToonBox
        position={[(x0 + x1) / 2, floor + height + 0.1, (z0 + z1) / 2]}
        size={[width, 0.2, depth]}
        color={COLOURS.wall}
        outline={false}
      />
      <ToonBox
        position={[x0 - WALL / 2, floor + height / 2, (z0 + z1) / 2]}
        size={[WALL, height, depth + 2 * WALL]}
        color={COLOURS.wall}
        outline={false}
      />
      <ToonBox
        position={[(x0 + x1) / 2, floor + height / 2, z1 + WALL / 2]}
        size={[width + 2 * WALL, height, WALL]}
        color={COLOURS.wall}
        outline={false}
      />
      <ToonBox
        position={[
          (x0 - WALL + FLUR.x0 - WALL) / 2,
          floor + height / 2,
          z0 - WALL / 2,
        ]}
        size={[FLUR.x0 - x0, height, WALL]}
        color={COLOURS.wall}
        outline={false}
      />
    </group>
  );
};

const Door: React.FC = () => {
  const { width, height, thickness, glass } = LIVING_DOOR;
  const pane: Vec3 = [
    width - 2 * glass.x,
    height - glass.bottom - glass.top,
    0.004,
  ];
  const paneAt = (side: 1 | -1): Vec3 => [
    width / 2,
    glass.bottom + pane[1] / 2,
    side * (thickness / 2 + 0.001),
  ];
  return (
    <DoorLeaf
      door={LIVING_DOOR}
      angle={LIVING_DOOR.open}
      color="#ffffff"
      map={alder()}
    >
      {([1, -1] as const).map((side) => (
        <ToonBox
          key={side}
          position={paneAt(side)}
          size={pane}
          color="#ffffff"
          map={patternGlass()}
          ink={0.004}
        />
      ))}
      <DoorGrips door={LIVING_DOOR} />
    </DoorLeaf>
  );
};

const DoorFrame: React.FC = () => (
  <group>
    {livingFrameParts().map((part) => (
      <ToonBox
        key={part.name}
        position={part.center}
        size={part.size}
        color="#ffffff"
        map={alder()}
        ink={0.004}
      />
    ))}
  </group>
);

const Front: React.FC<{
  readonly at: Vec3;
  readonly size: Vec3;
  readonly handle: "vertical" | "horizontal";
  readonly handleAt: Vec3;
}> = ({ at, size, handle, handleAt }) => (
  <group>
    <ToonBox
      position={at}
      size={size}
      color="#ffffff"
      map={wildOak()}
      ink={0.004}
    />
    <ToonBox
      position={addVec(at, handleAt)}
      size={handle === "vertical" ? [0.012, 0.16, 0.02] : [0.16, 0.012, 0.02]}
      color={COLOURS.steel}
      ink={0.002}
    />
  </group>
);

const PLINTH = 0.1;

const Cabinets: React.FC = () => {
  const frontZ = (unit: {
    readonly center: readonly number[];
    readonly size: readonly number[];
  }) => unit.center[2] - unit.size[2] / 2 - 0.009;
  const body = (
    unit: typeof TALL_UNIT | typeof BASE_UNIT | typeof WALL_UNIT,
    plinth: number,
  ) => (
    <group>
      <ToonBox
        position={addVec(unit.center, [0, plinth / 2, 0])}
        size={[unit.size[0], unit.size[1] - plinth, unit.size[2]]}
        color="#ffffff"
        map={wildOak()}
      />
      {plinth > 0 ? (
        <ToonBox
          position={[unit.center[0], floor + plinth / 2, unit.center[2] + 0.03]}
          size={[unit.size[0] - 0.02, plinth, unit.size[2] - 0.06]}
          color={COLOURS.anthracite}
          outline={false}
        />
      ) : null}
    </group>
  );
  const tallFront: Vec3 = [
    TALL_UNIT.center[0],
    TALL_UNIT.center[1] + PLINTH / 2,
    frontZ(TALL_UNIT),
  ];
  const baseTop = BASE_UNIT.center[1] + BASE_UNIT.size[1] / 2;
  return (
    <group>
      {body(TALL_UNIT, PLINTH)}
      <Front
        at={tallFront}
        size={[
          TALL_UNIT.size[0] - 0.01,
          TALL_UNIT.size[1] - PLINTH - 0.01,
          0.018,
        ]}
        handle="vertical"
        handleAt={[TALL_UNIT.size[0] / 2 - 0.04, 0, -0.02]}
      />
      {body(BASE_UNIT, PLINTH)}
      <Front
        at={[BASE_UNIT.center[0], baseTop - 0.08, frontZ(BASE_UNIT)]}
        size={[BASE_UNIT.size[0] - 0.01, 0.14, 0.018]}
        handle="horizontal"
        handleAt={[0, 0, -0.02]}
      />
      <Front
        at={[
          BASE_UNIT.center[0],
          floor + PLINTH + (baseTop - 0.16 - floor - PLINTH) / 2,
          frontZ(BASE_UNIT),
        ]}
        size={[
          BASE_UNIT.size[0] - 0.01,
          baseTop - 0.17 - floor - PLINTH,
          0.018,
        ]}
        handle="vertical"
        handleAt={[-BASE_UNIT.size[0] / 2 + 0.04, 0.1, -0.02]}
      />
      <ToonBox
        position={[...WORKTOP.center]}
        size={[...WORKTOP.size]}
        color={COLOURS.anthracite}
      />
      {body(WALL_UNIT, 0)}
      <Front
        at={[WALL_UNIT.center[0], WALL_UNIT.center[1], frontZ(WALL_UNIT)]}
        size={[WALL_UNIT.size[0] - 0.01, WALL_UNIT.size[1] - 0.01, 0.018]}
        handle="vertical"
        handleAt={[-WALL_UNIT.size[0] / 2 + 0.04, -0.15, -0.02]}
      />
    </group>
  );
};

const Sofa: React.FC = () => {
  const [w, h, d] = SOFA.size;
  const [cx, , cz] = SOFA.center;
  const base = 0.3;
  const back = 0.22;
  const arm = 0.2;
  const seats = 3;
  const seatWidth = (w - arm) / seats;
  const front = cz - d / 2;
  return (
    <group>
      <ToonBox
        position={[cx, floor + base / 2, cz]}
        size={[w, base, d]}
        color={COLOURS.sofa}
      />
      <ToonBox
        position={[cx, floor + base + (h - base) / 2, cz + d / 2 - back / 2]}
        size={[w, h - base, back]}
        color={COLOURS.sofa}
      />
      <ToonBox
        position={[cx + w / 2 - arm / 2, floor + 0.6 / 2 + 0.04, cz]}
        size={[arm, 0.6, d]}
        color={COLOURS.sofa}
      />
      {Array.from({ length: seats }, (_, i) => (
        <ToonBox
          key={i}
          position={[
            cx - w / 2 + seatWidth * (i + 0.5),
            floor + base + 0.075,
            front + (d - back) / 2,
          ]}
          size={[seatWidth - 0.01, 0.15, d - back]}
          color={COLOURS.cushion}
          ink={0.006}
        />
      ))}
      <ToonBox
        position={[...CHAISE.center]}
        size={[...CHAISE.size]}
        color={COLOURS.sofa}
      />
      <ToonBox
        position={[
          CHAISE.center[0],
          CHAISE.center[1] + CHAISE.size[1] / 2 + 0.001,
          CHAISE.center[2],
        ]}
        size={[CHAISE.size[0] - 0.02, 0.002, CHAISE.size[2] - 0.02]}
        color={COLOURS.cushion}
        outline={false}
      />
    </group>
  );
};

export const LivingRoomSet: React.FC = () => (
  <group>
    <Shell />
    <DoorFrame />
    <Door />
    <Cabinets />
    <Sofa />
    <pointLight
      position={[
        (LIVING_ROOM.x0 + LIVING_ROOM.x1) / 2,
        floor + 2.3,
        (LIVING_ROOM.z0 + LIVING_ROOM.z1) / 2,
      ]}
      color="#ffd9a0"
      intensity={5}
      distance={7}
      decay={2}
    />
  </group>
);
