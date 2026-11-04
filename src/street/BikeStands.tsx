import { useMemo } from "react";
import { CatmullRomCurve3, Vector3 } from "three";
import {
  Blob,
  InkHull,
  SegmentBetween,
  ToonTorus,
  type Vec3,
} from "../toon/primitives";
import {
  BIKE,
  BIKE_POINTS,
  BIKE_RODS,
  bikeFrame,
  standRods,
  CABLE,
  cableLoop,
  lockHead,
  STAND_XS,
} from "./bikes";

const GALVANISED = "#a7adb3";
const FRAME = "#2f5d8a";
const TYRE = "#1f2124";
const SADDLE = "#2a2622";
const CABLE_COLOR = "#1d1f22";
const LOCK_HEAD = "#b3262d";
const SADDLE_SIZE: Vec3 = [0.07, 0.03, 0.12];

const Stand: React.FC<{ readonly x: number }> = ({ x }) => (
  <>
    {standRods(x).map((rod, i) => (
      <SegmentBetween
        key={i}
        from={rod.from}
        to={rod.to}
        radius={rod.radius}
        color={GALVANISED}
      />
    ))}
  </>
);

const Wheel: React.FC<{ readonly z: number }> = ({ z }) => (
  <group position={[0, BIKE.wheel, z]} rotation={[0, Math.PI / 2, 0]}>
    <ToonTorus radius={BIKE.wheel - BIKE.tyre} tube={BIKE.tyre} color={TYRE} />
    <mesh rotation={[Math.PI / 2, 0, 0]}>
      <cylinderGeometry args={[0.03, 0.03, 0.1, 12]} />
      <meshToonMaterial color={GALVANISED} />
    </mesh>
  </group>
);

const CableLock: React.FC = () => {
  const curve = useMemo(
    () =>
      new CatmullRomCurve3(
        cableLoop().map((p) => new Vector3(...p)),
        true,
      ),
    [],
  );
  const head = lockHead();
  return (
    <>
      <mesh castShadow>
        <tubeGeometry args={[curve, 240, CABLE.radius, 10, true]} />
        <meshToonMaterial color={CABLE_COLOR} />
      </mesh>
      <mesh>
        <tubeGeometry args={[curve, 240, CABLE.radius + CABLE.ink, 10, true]} />
        <InkHull />
      </mesh>
      <SegmentBetween
        from={head.from}
        to={head.to}
        radius={head.radius}
        color={LOCK_HEAD}
        ink={CABLE.ink}
      />
    </>
  );
};

const half = BIKE.wheelbase / 2;
const P = BIKE_POINTS;

const Bike: React.FC = () => (
  <group matrixAutoUpdate={false} matrix={bikeFrame()}>
    <Wheel z={-half} />
    <Wheel z={half} />
    {BIKE_RODS.map((rod, i) => (
      <SegmentBetween
        key={i}
        from={rod.from}
        to={rod.to}
        radius={rod.radius}
        color={rod.metal === "frame" ? FRAME : GALVANISED}
      />
    ))}
    <CableLock />
    <Blob
      position={[P.post[0], P.post[1] + SADDLE_SIZE[1], P.post[2] - 0.02]}
      scale={SADDLE_SIZE}
      color={SADDLE}
    />
  </group>
);

export const BikeStands: React.FC = () => (
  <>
    {STAND_XS.map((x) => (
      <Stand key={x} x={x} />
    ))}
    <Bike />
  </>
);
