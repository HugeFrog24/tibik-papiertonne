import { seeded } from "../physics/seeded";
import { eulerFromBasis } from "../toon/orient";
import { useDisposable } from "../toon/useDisposable";
import { useMemo } from "react";
import {
  BufferGeometry,
  DoubleSide,
  ExtrudeGeometry,
  Float32BufferAttribute,
  RepeatWrapping,
  ShapeGeometry,
} from "three";
import type { Obb } from "../physics/collision";
import { floorLevel, residentOf } from "../street/building";
import { facadeOpenings, rectShape } from "../street/facade";
import {
  ToonBox,
  drawnTexture,
  framedCard,
  fitText,
  type Vec3,
} from "../toon/primitives";
import { DoorGrips } from "./DoorGrips";
import { DoorLeaf } from "./DoorLeaf";
import { FlurSet } from "./FlurSet";
import { laminate } from "./interiorTextures";
import { LivingRoomSet } from "./LivingRoomSet";
import { Doormats } from "./Doormats";
import { WallBox } from "./WallBox";
import { doorFrame, type Door } from "./doors";
import {
  CEILING_LAMPS,
  CORE,
  DOORBELL,
  doorbellCenter,
  doorLanding,
  EG_FIRST_RISER,
  EG_TOP,
  FLAT_DOORS,
  FLIGHT_SLABS,
  FLIGHTS,
  LANE_SPLIT,
  LIFT_DOORS,
  BUTTON_SIZE,
  LIGHT_BUTTONS,
  NOTICE_BOARD,
  HAUSVERWALTUNG_SHEET,
  SMOKE_VENT_BUTTON,
  SMOKE_VENT_BUTTONS,
  FLUR_FAR_WALL,
  liftDisplay,
  STAIRWELL_BOXES,
  STAIRWELL_RAILINGS,
  TREADS,
  TIBIK_DOOR,
  WALL_HEIGHT,
  WALL_PLANES,
  WALL_THICKNESS,
  type Flight,
  type Tread,
  type WallPlane,
} from "./stairwell";

export const STAIRWELL_WALLS_CAST_SHADOWS = true;

const WHITE = "#f1eee6";
const SOCKEL = "#9fb2a6";
const WOOD = "#6e4a2f";
const STEEL = "#5b6066";
const RAIL_WOOD = "#7b5233";
const ORANGE_GLOW = "#ff9c3a";

const terrazzo = () =>
  drawnTexture("terrazzo", 256, 256, (ctx, w, h) => {
    const random = seeded(4242);
    ctx.fillStyle = "#b8b4ab";
    ctx.fillRect(0, 0, w, h);
    const chips = ["#6f6a62", "#8b857b", "#d9d5cc", "#9a6f5c", "#55524d"];
    for (let i = 0; i < 900; i++) {
      ctx.fillStyle = chips[Math.floor(random() * chips.length)];
      const r = 0.8 + random() * 2.2;
      ctx.beginPath();
      ctx.ellipse(
        random() * w,
        random() * h,
        r,
        r * (0.6 + random() * 0.4),
        random() * Math.PI,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
  });

const TerrazzoSlab: React.FC<{ readonly tread: Tread }> = ({ tread }) => {
  const map = useMemo(() => {
    const t = terrazzo().clone();
    t.wrapS = RepeatWrapping;
    t.wrapT = RepeatWrapping;
    t.repeat.set(tread.size[0] / 0.5, tread.size[2] / 0.5);
    t.needsUpdate = true;
    return t;
  }, [tread]);
  return (
    <ToonBox
      position={tread.center}
      size={tread.size}
      color="#ffffff"
      map={map}
    />
  );
};

const ObbBox: React.FC<{
  readonly box: Obb;
  readonly color: string;
  readonly outline?: boolean;
}> = ({ box, color, outline }) => {
  const rotation = useMemo(
    () =>
      eulerFromBasis(...box.axes),
    [box],
  );
  return (
    <ToonBox
      position={box.center.toArray() as Vec3}
      rotation={rotation}
      size={[box.half[0] * 2, box.half[1] * 2, box.half[2] * 2]}
      color={color}
      outline={outline}
    />
  );
};

const Wall: React.FC<{ readonly wall: WallPlane }> = ({ wall }) => {
  const geometry = useDisposable(
    () =>
      new ExtrudeGeometry(
        rectShape(
          { x0: wall.along[0], x1: wall.along[1], y0: 0, y1: WALL_HEIGHT },
          wall.openings,
        ),
        {
          depth: WALL_THICKNESS,
          bevelEnabled: false,
        },
      ),
    [wall],
  );
  const placement =
    wall.plane === "z"
      ? {
          position: [0, 0, wall.at - WALL_THICKNESS / 2] as Vec3,
          rotation: [0, 0, 0] as Vec3,
        }
      : {
          position: [wall.at + WALL_THICKNESS / 2, 0, 0] as Vec3,
          rotation: [0, -Math.PI / 2, 0] as Vec3,
        };
  return (
    <mesh
      geometry={geometry}
      {...placement}
      castShadow={STAIRWELL_WALLS_CAST_SHADOWS}
      receiveShadow
    >
      <meshToonMaterial color={WHITE} />
    </mesh>
  );
};

const FacadeLining: React.FC = () => {
  const geometry = useMemo(
    () =>
      new ShapeGeometry(
        rectShape(
          { x0: CORE.x0, x1: CORE.x1, y0: 0, y1: WALL_HEIGHT },
          facadeOpenings(),
        ),
      ),
    [],
  );
  return (
    <mesh geometry={geometry} position={[0, 0, CORE.z0 - 0.005]} receiveShadow>
      <meshToonMaterial color={WHITE} side={DoubleSide} />
    </mesh>
  );
};

const Sockel: React.FC<{
  readonly x: number;
  readonly from: number;
  readonly to: number;
  readonly bottom: (z: number) => number;
  readonly top: (z: number) => number;
}> = ({ x, from, to, bottom, top }) => {
  const geometry = useDisposable(() => {
    const positions: number[] = [];
    const index: number[] = [];
    const steps = Math.ceil(Math.abs(to - from) / 0.01);
    for (let i = 0; i <= steps; i++) {
      const z = from + ((to - from) * i) / steps;
      positions.push(x, bottom(z), z, x, top(z), z);
      if (i > 0) {
        const a = (i - 1) * 2;
        index.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      }
    }
    const g = new BufferGeometry();
    g.setAttribute("position", new Float32BufferAttribute(positions, 3));
    g.setIndex(index);
    g.computeVertexNormals();
    return g;
  }, [x, from, to, bottom, top]);
  return (
    <mesh geometry={geometry} receiveShadow>
      <meshToonMaterial color={SOCKEL} side={DoubleSide} />
    </mesh>
  );
};

const profile =
  (points: readonly (readonly [number, number])[]) => (z: number) => {
    for (let i = 0; i < points.length - 1; i++) {
      const [z0, y0] = points[i];
      const [z1, y1] = points[i + 1];
      if ((z <= z0 && z >= z1) || (z >= z0 && z <= z1)) {
        return y0 + ((y1 - y0) * (z - z0)) / (z1 - z0 || 1);
      }
    }
    return points[points.length - 1][1];
  };

const EG = FLIGHTS[0];
const nosingY = (f: Flight, z: number) =>
  f.from + f.rise * (1 + ((z - f.firstRiser) * f.direction) / f.going);
const treadTop = (f: Flight, z: number) => {
  const k = Math.floor(((z - f.firstRiser) * f.direction) / f.going) + 1;
  return f.from + Math.min(Math.max(k, 1), f.risers) * f.rise;
};
const egFloor = (z: number) =>
  z > EG_FIRST_RISER
    ? floorLevel(0)
    : z < EG_TOP
      ? floorLevel(1)
      : treadTop(EG, z);
const EG_SOCKEL_TOP = profile([
  [CORE.z0, 1.35],
  [EG_FIRST_RISER + 0.2, 1.35],
  [EG_FIRST_RISER, nosingY(EG, EG_FIRST_RISER) + 1.05],
  [EG_TOP, floorLevel(1) + 1.05],
  [EG_TOP - 0.2, floorLevel(1) + 1.2],
]);
const HALLWAY = () => floorLevel(0);
const HALLWAY_TOP = () => floorLevel(0) + 1.2;

const Balustrade: React.FC<{ readonly flight: Flight }> = ({ flight }) => {
  const x = flight.lane.x0 < LANE_SPLIT ? LANE_SPLIT - 0.03 : LANE_SPLIT + 0.03;
  const start = flight.firstRiser;
  const end =
    flight.firstRiser + flight.direction * (flight.risers - 1) * flight.going;
  const bars = Math.floor(Math.abs(end - start) / 0.11);
  const railFrom: Vec3 = [x, nosingY(flight, start) + 0.9, start];
  const railTo: Vec3 = [x, nosingY(flight, end) + 0.9, end];
  const dy = railTo[1] - railFrom[1];
  const dz = railTo[2] - railFrom[2];
  return (
    <>
      <ToonBox
        position={[
          x,
          (railFrom[1] + railTo[1]) / 2,
          (railFrom[2] + railTo[2]) / 2,
        ]}
        rotation={[Math.atan2(-dy, dz), 0, 0]}
        size={[0.05, 0.03, Math.hypot(dy, dz)]}
        color={STEEL}
      />
      {Array.from({ length: bars + 1 }, (_, i) => {
        const z = start + ((end - start) * (i + 0.5)) / (bars + 1);
        const bottom = treadTop(flight, z);
        const top = nosingY(flight, z) + 0.9;
        return (
          <ToonBox
            key={i}
            position={[x, (bottom + top) / 2, z]}
            size={[0.014, top - bottom, 0.014]}
            color={STEEL}
            outline={false}
          />
        );
      })}
    </>
  );
};

const nameplate = (name: string) =>
  drawnTexture(`nameplate-${name}`, 256, 72, (ctx, w, h) => {
    framedCard(ctx, w, h, "#c9a54a", "#8d7130", 6);
    ctx.fillStyle = "#2b2416";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    fitText(ctx, name, w / 2, h / 2 + 2, w - 30, 44, "normal");
  });

const FlatDoorView: React.FC<{
  readonly door: Door;
  readonly angle: number;
  readonly lever: number;
  readonly name: string;
}> = ({ door, angle, lever, name }) => {
  const { width: w, height: h, thickness: t } = door;
  const landing = doorLanding(door);
  const facing = landing === 1 ? 0 : Math.PI;
  const shut = useMemo(() => doorFrame(door, 0), [door]);
  return (
    <>
      <group matrixAutoUpdate={false} matrix={shut}>
        <ToonBox
          position={[-0.04, (h + 0.05) / 2, -landing * 0.08]}
          size={[0.06, h + 0.05, 0.24]}
          color={WHITE}
        />
        <ToonBox
          position={[w + 0.04, (h + 0.05) / 2, -landing * 0.08]}
          size={[0.06, h + 0.05, 0.24]}
          color={WHITE}
        />
        <ToonBox
          position={[w / 2, h + 0.05, -landing * 0.08]}
          size={[w + 0.14, 0.06, 0.24]}
          color={WHITE}
        />
        <ToonBox
          position={doorbellCenter(door)}
          size={DOORBELL.size}
          color="#e4e1d8"
        />
        <mesh
          position={[w + DOORBELL.along, 1.44, landing * 0.041]}
          rotation={[0, facing, 0]}
        >
          <circleGeometry args={[0.012, 16]} />
          <meshBasicMaterial color="#333333" />
        </mesh>
      </group>
      <DoorLeaf door={door} angle={angle} color={WOOD}>
        <mesh
          position={[w / 2, 1.5, landing * (t / 2 + 0.004)]}
          rotation={[facing, 0, 0]}
        >
          <circleGeometry args={[0.012, 16]} />
          <meshBasicMaterial color="#1c1a18" />
        </mesh>
        <mesh
          position={[w / 2, 1.35, landing * (t / 2 + 0.005)]}
          rotation={[0, facing, 0]}
        >
          <planeGeometry args={[0.2, 0.056]} />
          <meshBasicMaterial map={nameplate(name)} />
        </mesh>
        <DoorGrips door={door} press={lever} />
      </DoorLeaf>
    </>
  );
};

const LiftDoorView: React.FC<{ readonly door: Door }> = ({ door }) => (
  <DoorLeaf door={door} angle={0} color="#c4c8cc">
    <ToonBox
      position={[door.width / 2, door.height / 2, door.thickness / 2 + 0.003]}
      size={[0.006, door.height, 0.004]}
      color="#8d9297"
      outline={false}
    />
    <ToonBox
      position={[door.width + 0.18, 1.1, 0.02]}
      size={[0.09, 0.16, 0.02]}
      color="#b9bdc2"
    />
    <mesh position={[door.width + 0.18, 1.1, 0.031]}>
      <circleGeometry args={[0.018, 20]} />
      <meshBasicMaterial color="#ffffff" />
    </mesh>
    <ToonBox
      position={[door.width / 2, door.height + 0.12, 0.02]}
      size={[0.3, 0.1, 0.02]}
      color="#2a2c2f"
    />
    <mesh position={[door.width / 2, door.height + 0.12, 0.031]}>
      <planeGeometry args={[0.26, 0.07]} />
      <meshBasicMaterial map={liftIndicator()} />
    </mesh>
  </DoorLeaf>
);

const liftIndicator = () =>
  drawnTexture(`lift-floor-${liftDisplay()}`, 104, 28, (ctx, w, h) => {
    ctx.fillStyle = "#121314";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#ff3b2f";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    fitText(ctx, liftDisplay(), w / 2, h / 2 + 1, 30, 24);
    ctx.fillStyle = "#3a3c3f";
    for (const [x, up] of [
      [18, true],
      [86, false],
    ] as const) {
      ctx.beginPath();
      ctx.moveTo(x - 6, up ? h / 2 + 4 : h / 2 - 4);
      ctx.lineTo(x + 6, up ? h / 2 + 4 : h / 2 - 4);
      ctx.lineTo(x, up ? h / 2 - 5 : h / 2 + 5);
      ctx.fill();
    }
  });

const noticeBoard = () =>
  drawnTexture("notice-board-12", 372, 480, (ctx, w, h) => {
    ctx.fillStyle = "#c79f6c";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#f6f3ea";
    ctx.fillRect(18, 18, w - 36, 230);
    ctx.fillRect(18, 266, w - 36, 196);
    ctx.fillStyle = "#222222";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    fitText(ctx, "Hausordnung", w / 2, 46, w - 70, 34);
    ctx.fillStyle = "#9a9a9a";
    for (let i = 0; i < 9; i++) {
      ctx.fillRect(40, 78 + i * 18, w - 80 - (i % 3) * 40, 6);
    }
    ctx.fillStyle = "#222222";
    fitText(ctx, "Reinigungsplan", w / 2, 292, w - 70, 30);
    fitText(ctx, "Treppenhausreinigung", w / 2, 334, w - 70, 22, "normal");
    fitText(ctx, "diese Woche:", w / 2, 368, w - 70, 22, "normal");
    ctx.fillStyle = "#b3121f";
    fitText(ctx, "1. OG links", w / 2, 410, w - 70, 30);
  });

const rauchabzug = () =>
  drawnTexture("rauchabzug", 128, 128, (ctx, w, h) => {
    ctx.fillStyle = SMOKE_VENT_BUTTON.color;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#f4f1ea";
    ctx.fillRect(10, 10, w - 20, 24);
    ctx.fillStyle = "#222222";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    fitText(ctx, "RAUCHABZUG", w / 2, 22, w - 28, 15);
    ctx.fillStyle = "#c9d3d8";
    ctx.fillRect(30, 42, w - 60, h - 60);
    ctx.strokeStyle = "#7d878c";
    ctx.lineWidth = 2;
    ctx.strokeRect(30, 42, w - 60, h - 60);
    ctx.fillStyle = "#26282b";
    ctx.beginPath();
    ctx.arc(w / 2, 42 + (h - 60) / 2, 15, 0, 2 * Math.PI);
    ctx.fill();
    ctx.fillStyle = "#3fbf4a";
    ctx.beginPath();
    ctx.arc(w - 18, h - 12, 4, 0, 2 * Math.PI);
    ctx.fill();
  });

const SmokeVentView: React.FC = () => (
  <>
    {SMOKE_VENT_BUTTONS.map((button) => (
      <WallBox
        key={button.name}
        on={button}
        size={SMOKE_VENT_BUTTON.size}
        color={SMOKE_VENT_BUTTON.color}
      >
        <mesh>
          <planeGeometry
            args={[SMOKE_VENT_BUTTON.size[0], SMOKE_VENT_BUTTON.size[1]]}
          />
          <meshBasicMaterial map={rauchabzug()} />
        </mesh>
      </WallBox>
    ))}
  </>
);

const hausverwaltungSheet = () =>
  drawnTexture("hausverwaltung-sheet", 296, 420, (ctx, w, h) => {
    framedCard(ctx, w, h, "#fbfaf6", "#c9ccd0", 5);
    ctx.fillStyle = "#1f3a68";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    fitText(ctx, "Hausverwaltung", w / 2, 46, w - 40, 34);
    fitText(ctx, "Musterstadt", w / 2, 86, w - 40, 34);
    ctx.fillStyle = "#222222";
    fitText(ctx, "Sprechzeiten", w / 2, 148, w - 60, 24);
    ctx.fillStyle = "#9a9a9a";
    for (let i = 0; i < 3; i++) ctx.fillRect(56, 176 + i * 22, w - 112, 7);
    ctx.fillStyle = "#b3121f";
    fitText(ctx, "Notdienst", w / 2, 270, w - 60, 26);
    ctx.fillStyle = "#9a9a9a";
    for (let i = 0; i < 2; i++) ctx.fillRect(66, 300 + i * 22, w - 132, 7);
    ctx.fillStyle = "#bdbdbd";
    for (let i = 0; i < 3; i++)
      ctx.fillRect(40, 352 + i * 16, w - 80 - i * 30, 4);
  });

const geschlossenSign = () =>
  drawnTexture("haustuer-sign", 320, 110, (ctx, w, h) => {
    framedCard(ctx, w, h, "#f6f3ea", "#333333", 4, 4);
    ctx.fillStyle = "#222222";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    fitText(ctx, "Bitte Haustür", w / 2, 38, w - 40, 30);
    fitText(ctx, "geschlossen halten", w / 2, 76, w - 40, 30);
  });

export const StairwellSet: React.FC<{
  readonly tibikDoor: number;
  readonly tibikLever?: number;
  readonly lights: number;
  readonly livingRoomLit?: boolean;
}> = ({ tibikDoor, tibikLever = 0, lights, livingRoomLit = true }) => (
  <>
    {TREADS.map((tread, i) =>
      tread.name === "Flur floor" ? (
        <ToonBox
          key={i}
          position={tread.center}
          size={tread.size}
          color="#ffffff"
          map={laminate(tread.size[0], tread.size[2])}
        />
      ) : (
        <TerrazzoSlab key={i} tread={tread} />
      ),
    )}
    {TREADS.filter((t) => /landing/.test(t.name)).map((t, i) => (
      <mesh
        key={i}
        position={[t.center[0], t.bottom - 0.005, t.center[2]]}
        rotation={[Math.PI / 2, 0, 0]}
      >
        <planeGeometry args={[t.size[0], t.size[2]]} />
        <meshToonMaterial color={WHITE} />
      </mesh>
    ))}
    {WALL_PLANES.map((wall, i) => (
      <Wall key={i} wall={wall} />
    ))}
    {STAIRWELL_BOXES.filter((box) => !FLUR_FAR_WALL.includes(box)).map(
      (box, i) => (
        <ObbBox key={i} box={box} color={WHITE} outline={false} />
      ),
    )}
    <group userData={{ inkGroup: true }}>
      {FLUR_FAR_WALL.map((box, i) => (
        <ObbBox key={i} box={box} color={WHITE} outline={false} />
      ))}
    </group>{" "}
    <FlurSet />
    <LivingRoomSet lit={livingRoomLit} />
    {FLIGHT_SLABS.map((box, i) => (
      <ObbBox key={i} box={box} color={WHITE} />
    ))}
    <FacadeLining />
    <Sockel
      x={CORE.x0 + 0.006}
      from={CORE.z0}
      to={EG_TOP - 0.2}
      bottom={egFloor}
      top={EG_SOCKEL_TOP}
    />
    <Sockel
      x={CORE.x1 - 0.006}
      from={CORE.z0}
      to={-8.75}
      bottom={HALLWAY}
      top={HALLWAY_TOP}
    />
    {FLIGHTS.slice(0, 5).map((f) => (
      <Balustrade key={f.name} flight={f} />
    ))}
    {STAIRWELL_RAILINGS.filter((r) => r.name === "handrail").map((r, i) => (
      <ObbBox key={i} box={r} color={RAIL_WOOD} />
    ))}
    {STAIRWELL_RAILINGS.filter(
      (r) => r.name === "balustrade" && Math.abs(r.axes[2].y) < 1e-6,
    ).map((r, i) => (
      <ToonBox
        key={i}
        position={[r.center.x, r.center.y + r.half[1], r.center.z]}
        size={[0.05, 0.03, r.half[2] * 2]}
        color={STEEL}
      />
    ))}
    {FLAT_DOORS.map(({ door, storey, side }) => (
      <FlatDoorView
        key={door.name}
        door={door}
        angle={door === TIBIK_DOOR ? tibikDoor : 0}
        lever={door === TIBIK_DOOR ? tibikLever : 0}
        name={residentOf(storey, side)}
      />
    ))}
    {LIFT_DOORS.map((door) => (
      <LiftDoorView key={door.name} door={door} />
    ))}
    {LIGHT_BUTTONS.map((button, i) => (
      <WallBox key={i} on={button} size={BUTTON_SIZE} color="#e9e6dd">
        <mesh>
          <planeGeometry args={[0.04, 0.04]} />
          <meshBasicMaterial color={ORANGE_GLOW} />
        </mesh>
      </WallBox>
    ))}
    {CEILING_LAMPS.map((lamp, i) => (
      <mesh key={i} position={lamp}>
        <sphereGeometry args={[0.13, 24, 16]} />
        {lights > 0.5 ? (
          <meshBasicMaterial color="#fff6e0" />
        ) : (
          <meshToonMaterial color="#e8e4da" />
        )}
      </mesh>
    ))}
    <SmokeVentView />
    <mesh position={NOTICE_BOARD.center} rotation={[0, -Math.PI / 2, 0]}>
      <planeGeometry args={NOTICE_BOARD.size} />
      <meshBasicMaterial map={noticeBoard()} />
    </mesh>
    <mesh
      position={HAUSVERWALTUNG_SHEET.center}
      rotation={[0, -Math.PI / 2, 0]}
    >
      <planeGeometry args={HAUSVERWALTUNG_SHEET.size} />
      <meshBasicMaterial map={hausverwaltungSheet()} />
    </mesh>
    <mesh position={[-1.0, 1.62, CORE.z0 - 0.006]} rotation={[0, Math.PI, 0]}>
      <planeGeometry args={[0.32, 0.11]} />
      <meshBasicMaterial map={geschlossenSign()} />
    </mesh>
    <Doormats />
  </>
);
