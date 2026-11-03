import { useMemo } from "react";
import {
  BufferGeometry,
  DoubleSide,
  Euler,
  ExtrudeGeometry,
  Float32BufferAttribute,
  Matrix4,
  Quaternion,
  RepeatWrapping,
  ShapeGeometry,
  Vector3,
} from "three";
import type { Obb } from "../physics/collision";
import { floorLevel, residentOf } from "../street/building";
import { HAUSTUER, facadeOpenings, rectShape } from "../street/facade";
import { Blob, ToonBox, drawnTexture, fitText, type Vec3 } from "../toon/primitives";
import { doorFrame, type Door } from "./doors";
import {
  CEILING_LAMPS,
  CORE,
  EG_FIRST_RISER,
  EG_TOP,
  FLAT_DOORS,
  FLIGHT_SLABS,
  FLIGHTS,
  LANE_SPLIT,
  LIFT_DOORS,
  LIGHT_BUTTONS,
  NOTICE_BOARD,
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

const seeded = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

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
      ctx.ellipse(random() * w, random() * h, r, r * (0.6 + random() * 0.4), random() * Math.PI, 0, Math.PI * 2);
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
  return <ToonBox position={tread.center} size={tread.size} color="#ffffff" map={map} />;
};

const ObbBox: React.FC<{ readonly box: Obb; readonly color: string; readonly outline?: boolean }> = ({ box, color, outline }) => {
  const rotation = useMemo(
    () => new Euler().setFromQuaternion(new Quaternion().setFromRotationMatrix(new Matrix4().makeBasis(...box.axes))),
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
  const geometry = useMemo(
    () =>
      new ExtrudeGeometry(rectShape({ x0: wall.along[0], x1: wall.along[1], y0: 0, y1: WALL_HEIGHT }, wall.openings), {
        depth: WALL_THICKNESS,
        bevelEnabled: false,
      }),
    [wall],
  );
  const placement =
    wall.plane === "z"
      ? { position: [0, 0, wall.at - WALL_THICKNESS / 2] as Vec3, rotation: [0, 0, 0] as Vec3 }
      : { position: [wall.at + WALL_THICKNESS / 2, 0, 0] as Vec3, rotation: [0, -Math.PI / 2, 0] as Vec3 };
  return (
    <mesh geometry={geometry} {...placement} castShadow={STAIRWELL_WALLS_CAST_SHADOWS} receiveShadow>
      <meshToonMaterial color={WHITE} />
    </mesh>
  );
};

const FacadeLining: React.FC = () => {
  const geometry = useMemo(
    () => new ShapeGeometry(rectShape({ x0: CORE.x0, x1: CORE.x1, y0: 0, y1: WALL_HEIGHT }, facadeOpenings())),
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
  const geometry = useMemo(() => {
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

const profile = (points: readonly (readonly [number, number])[]) => (z: number) => {
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
const nosingY = (f: Flight, z: number) => f.from + f.rise * (1 + ((z - f.firstRiser) * f.direction) / f.going);
const treadTop = (f: Flight, z: number) => {
  const k = Math.floor(((z - f.firstRiser) * f.direction) / f.going) + 1;
  return f.from + Math.min(Math.max(k, 1), f.risers) * f.rise;
};
const egFloor = (z: number) => (z > EG_FIRST_RISER ? floorLevel(0) : z < EG_TOP ? floorLevel(1) : treadTop(EG, z));
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
  const end = flight.firstRiser + flight.direction * (flight.risers - 1) * flight.going;
  const bars = Math.floor(Math.abs(end - start) / 0.11);
  const railFrom: Vec3 = [x, nosingY(flight, start) + 0.9, start];
  const railTo: Vec3 = [x, nosingY(flight, end) + 0.9, end];
  const dy = railTo[1] - railFrom[1];
  const dz = railTo[2] - railFrom[2];
  return (
    <>
      <ToonBox
        position={[x, (railFrom[1] + railTo[1]) / 2, (railFrom[2] + railTo[2]) / 2]}
        rotation={[Math.atan2(-dy, dz), 0, 0]}
        size={[0.05, 0.03, Math.hypot(dy, dz)]}
        color={STEEL}
      />
      {Array.from({ length: bars + 1 }, (_, i) => {
        const z = start + ((end - start) * (i + 0.5)) / (bars + 1);
        const bottom = treadTop(flight, z);
        const top = nosingY(flight, z) + 0.9;
        return <ToonBox key={i} position={[x, (bottom + top) / 2, z]} size={[0.014, top - bottom, 0.014]} color={STEEL} outline={false} />;
      })}
    </>
  );
};

const nameplate = (name: string) =>
  drawnTexture(`nameplate-${name}`, 256, 72, (ctx, w, h) => {
    ctx.fillStyle = "#c9a54a";
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "#8d7130";
    ctx.lineWidth = 6;
    ctx.strokeRect(3, 3, w - 6, h - 6);
    ctx.fillStyle = "#2b2416";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    fitText(ctx, name, w / 2, h / 2 + 2, w - 30, 44, "normal");
  });

const FlatDoorView: React.FC<{ readonly door: Door; readonly angle: number; readonly name: string }> = ({ door, angle, name }) => {
  const { width: w, height: h, thickness: t, handle } = door;
  const landing = door.hinge[0] < CORE.x0 ? -1 : 1;
  const shut = useMemo(() => doorFrame(door, 0), [door]);
  return (
    <>
      <group matrixAutoUpdate={false} matrix={shut}>
        <ToonBox position={[-0.04, (h + 0.05) / 2, -landing * 0.08]} size={[0.06, h + 0.05, 0.24]} color={WHITE} />
        <ToonBox position={[w + 0.04, (h + 0.05) / 2, -landing * 0.08]} size={[0.06, h + 0.05, 0.24]} color={WHITE} />
        <ToonBox position={[w / 2, h + 0.05, -landing * 0.08]} size={[w + 0.14, 0.06, 0.24]} color={WHITE} />
        <ToonBox position={[w + 0.17, 1.42, landing * 0.03]} size={[0.07, 0.1, 0.02]} color="#e4e1d8" />
        <mesh position={[w + 0.17, 1.44, landing * 0.041]} rotation={[0, landing === 1 ? 0 : Math.PI, 0]}>
          <circleGeometry args={[0.012, 16]} />
          <meshBasicMaterial color="#333333" />
        </mesh>
      </group>
      <group matrixAutoUpdate={false} matrix={doorFrame(door, angle)}>
        <ToonBox position={[w / 2, h / 2, 0]} size={[w, h, t]} color={WOOD} />
        <mesh position={[w / 2, 1.5, landing * (t / 2 + 0.004)]} rotation={[landing === 1 ? 0 : Math.PI, 0, 0]}>
          <circleGeometry args={[0.012, 16]} />
          <meshBasicMaterial color="#1c1a18" />
        </mesh>
        <mesh position={[w / 2, 1.35, landing * (t / 2 + 0.005)]} rotation={[0, landing === 1 ? 0 : Math.PI, 0]}>
          <planeGeometry args={[0.2, 0.056]} />
          <meshBasicMaterial map={nameplate(name)} />
        </mesh>
        <Blob position={[handle.x, handle.y, landing * (t / 2 + 0.035)]} scale={[0.028, 0.028, 0.028]} color="#c9a54a" />
        <ToonBox position={[handle.x - 0.05, handle.y, -landing * (t / 2 + 0.03)]} size={[0.12, 0.022, 0.022]} color="#c7c7c2" />
      </group>
    </>
  );
};

const LiftDoorView: React.FC<{ readonly door: Door }> = ({ door }) => (
  <group matrixAutoUpdate={false} matrix={doorFrame(door, 0)}>
    <ToonBox position={[door.width / 2, door.height / 2, 0]} size={[door.width, door.height, door.thickness]} color="#c4c8cc" />
    <ToonBox position={[door.width / 2, door.height / 2, door.thickness / 2 + 0.003]} size={[0.006, door.height, 0.004]} color="#8d9297" outline={false} />
    <ToonBox position={[door.width + 0.18, 1.1, 0.02]} size={[0.09, 0.16, 0.02]} color="#b9bdc2" />
    <mesh position={[door.width + 0.18, 1.1, 0.031]}>
      <circleGeometry args={[0.018, 20]} />
      <meshBasicMaterial color="#ffffff" />
    </mesh>
    <ToonBox position={[door.width / 2, door.height + 0.12, 0.02]} size={[0.3, 0.1, 0.02]} color="#2a2c2f" />
  </group>
);

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

const geschlossenSign = () =>
  drawnTexture("haustuer-sign", 320, 110, (ctx, w, h) => {
    ctx.fillStyle = "#f6f3ea";
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "#333333";
    ctx.lineWidth = 4;
    ctx.strokeRect(4, 4, w - 8, h - 8);
    ctx.fillStyle = "#222222";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    fitText(ctx, "Bitte Haustür", w / 2, 38, w - 40, 30);
    fitText(ctx, "geschlossen halten", w / 2, 76, w - 40, 30);
  });

const DoorCloser: React.FC<{ readonly angle: number }> = ({ angle }) => {
  const leaf = doorFrame(HAUSTUER, angle);
  const t = HAUSTUER.thickness;
  const elbow = new Vector3(0.45, HAUSTUER.height - 0.07, -(t / 2 + 0.06)).applyMatrix4(leaf);
  const anchor = new Vector3(HAUSTUER.hinge[0] + 0.5, 2.42, HAUSTUER.hinge[2] - 0.12);
  const along = anchor.clone().sub(elbow);
  const arm = new Quaternion().setFromUnitVectors(new Vector3(0, 0, 1), along.clone().normalize());
  return (
    <>
      <group matrixAutoUpdate={false} matrix={leaf}>
        <ToonBox position={[0.3, HAUSTUER.height - 0.07, -(t / 2 + 0.035)]} size={[0.3, 0.06, 0.05]} color="#9ea3a8" />
      </group>
      <group position={elbow.clone().add(anchor).multiplyScalar(0.5).toArray() as Vec3} quaternion={arm}>
        <ToonBox size={[0.025, 0.012, along.length()]} color="#7d8288" />
      </group>
    </>
  );
};

export const StairwellSet: React.FC<{
  readonly tibikDoor: number;
  readonly lights: number;
  readonly haustuer?: number;
}> = ({ tibikDoor, lights, haustuer = 0 }) => (
  <>
    {TREADS.map((tread, i) =>
      tread.name === "Flur floor" ? (
        <ToonBox key={i} position={tread.center} size={tread.size} color="#a87b4f" />
      ) : (
        <TerrazzoSlab key={i} tread={tread} />
      ),
    )}
    {TREADS.filter((t) => /landing/.test(t.name)).map((t, i) => (
      <mesh key={i} position={[t.center[0], t.bottom - 0.005, t.center[2]]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[t.size[0], t.size[2]]} />
        <meshToonMaterial color={WHITE} />
      </mesh>
    ))}
    {WALL_PLANES.map((wall, i) => (
      <Wall key={i} wall={wall} />
    ))}
    {STAIRWELL_BOXES.map((box, i) => (
      <ObbBox key={i} box={box} color={WHITE} outline={false} />
    ))}
    {FLIGHT_SLABS.map((box, i) => (
      <ObbBox key={i} box={box} color={WHITE} />
    ))}
    <FacadeLining />

    <Sockel x={CORE.x0 + 0.006} from={CORE.z0} to={EG_TOP - 0.2} bottom={egFloor} top={EG_SOCKEL_TOP} />
    <Sockel x={CORE.x1 - 0.006} from={CORE.z0} to={-8.75} bottom={HALLWAY} top={HALLWAY_TOP} />

    {FLIGHTS.slice(0, 5).map((f) => (
      <Balustrade key={f.name} flight={f} />
    ))}
    {STAIRWELL_RAILINGS.filter((r) => r.name === "handrail").map((r, i) => (
      <ObbBox key={i} box={r} color={RAIL_WOOD} />
    ))}
    {STAIRWELL_RAILINGS.filter((r) => r.name === "balustrade" && Math.abs(r.axes[2].y) < 1e-6).map((r, i) => (
      <ToonBox
        key={i}
        position={[r.center.x, r.center.y + r.half[1], r.center.z]}
        size={[0.05, 0.03, r.half[2] * 2]}
        color={STEEL}
      />
    ))}

    {FLAT_DOORS.map(({ door, storey, side }) => (
      <FlatDoorView key={door.name} door={door} angle={door === TIBIK_DOOR ? tibikDoor : 0} name={residentOf(storey, side)} />
    ))}
    {LIFT_DOORS.map((door) => (
      <LiftDoorView key={door.name} door={door} />
    ))}

    {LIGHT_BUTTONS.map((button, i) => (
      <group key={i} position={button.position} rotation={[0, Math.atan2(button.normal[0], button.normal[2]), 0]}>
        <ToonBox size={[0.08, 0.08, 0.02]} color="#e9e6dd" />
        <mesh position={[0, 0, 0.011]}>
          <planeGeometry args={[0.04, 0.04]} />
          <meshBasicMaterial color={ORANGE_GLOW} />
        </mesh>
      </group>
    ))}
    {CEILING_LAMPS.map((lamp, i) => (
      <mesh key={i} position={lamp}>
        <sphereGeometry args={[0.13, 24, 16]} />
        {lights > 0.5 ? <meshBasicMaterial color="#fff6e0" /> : <meshToonMaterial color="#e8e4da" />}
      </mesh>
    ))}

    <mesh position={NOTICE_BOARD.center} rotation={[0, -Math.PI / 2, 0]}>
      <planeGeometry args={NOTICE_BOARD.size} />
      <meshBasicMaterial map={noticeBoard()} />
    </mesh>
    <mesh position={[-1.0, 1.62, CORE.z0 - 0.006]} rotation={[0, Math.PI, 0]}>
      <planeGeometry args={[0.32, 0.11]} />
      <meshBasicMaterial map={geschlossenSign()} />
    </mesh>
    <DoorCloser angle={haustuer} />

    <ToonBox position={[CORE.x0 + 0.3, floorLevel(1) + 0.01, -9.3]} size={[0.42, 0.02, 0.72]} color="#9c7440" />
    <ToonBox position={[CORE.x1 - 0.3, floorLevel(1) + 0.01, -9.3]} size={[0.42, 0.02, 0.72]} color="#9c7440" />
    <Blob position={[CORE.x1 - 0.32, floorLevel(1) + 0.055, -9.45]} scale={[0.05, 0.035, 0.13]} color="#2b2b2b" />
    <Blob position={[CORE.x1 - 0.3, floorLevel(1) + 0.055, -9.2]} scale={[0.05, 0.035, 0.13]} color="#2b2b2b" />
  </>
);
