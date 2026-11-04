import { useMemo } from "react";
import { useDisposable } from "../toon/useDisposable";
import {
  CatmullRomCurve3,
  ExtrudeGeometry,
  Shape,
  ShapeGeometry,
  TubeGeometry,
} from "three";
import {
  Blob,
  InkHull,
  OUTLINE,
  ToonBox,
  ToonCylinder,
  type Vec3,
} from "../toon/primitives";
import {
  BUNTBART,
  LEVER,
  POST,
  PROFILE,
  VIEWER,
  keyOutline,
  leverPath,
  leverPivot,
  fittingsOf,
  type Door,
  type FittingFace,
  type Grip,
} from "./doors";

const BRASS = "#c9a54a";
const CYLINDER = "#b39446";
const KEYWAY = { colour: "#1c1a18", width: 0.0016, height: 0.022 };
const PROUD = 0.0012;
const FITTING_INK = 0.003;
const ABOVE = 0.0002;

const keyShape = (spec: typeof PROFILE) => {
  const outline = keyOutline(spec);
  const shape = new Shape();
  shape.moveTo(outline[0].x, outline[0].y);
  for (const p of outline.slice(1)) shape.lineTo(p.x, p.y);
  shape.closePath();
  return shape;
};

const useKeyShape = (spec: typeof PROFILE) =>
  useDisposable(
    () =>
      new ExtrudeGeometry(keyShape(spec), { depth: PROUD, bevelEnabled: false }),
    [spec],
  );

type Spot = {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly out: number;
};

const OnFace: React.FC<Spot & { readonly children: React.ReactNode }> = ({
  x,
  y,
  z,
  out,
  children,
}) => (
  <group position={[x, y, z]} scale={[1, 1, out]}>
    {children}
  </group>
);

const Cylinder: React.FC<Spot> = (spot) => {
  const profile = useKeyShape(PROFILE);
  return (
    <OnFace {...spot}>
      <mesh geometry={profile} dispose={null}>
        <meshToonMaterial color={CYLINDER} />
      </mesh>
      <mesh position={[0, -KEYWAY.height / 2 + 0.006, PROUD + ABOVE]}>
        <planeGeometry args={[KEYWAY.width, KEYWAY.height]} />
        <meshBasicMaterial color={KEYWAY.colour} />
      </mesh>
    </OnFace>
  );
};

const Keyhole: React.FC<Spot> = (spot) => {
  const hole = useMemo(() => new ShapeGeometry(keyShape(BUNTBART)), []);
  return (
    <OnFace {...spot} z={spot.z + spot.out * ABOVE}>
      <mesh geometry={hole} dispose={null}>
        <meshBasicMaterial color={KEYWAY.colour} />
      </mesh>
    </OnFace>
  );
};

const GLASS = "#20262c";

const Face: React.FC<{ readonly face: FittingFace }> = ({ face }) => {
  const [x, y, z] = face.center;
  const { out } = face;
  if (face.kind === "cylinder") return <Cylinder x={x} y={y} z={z} out={out} />;
  if (face.kind === "keyhole") return <Keyhole x={x} y={y} z={z} out={out} />;
  return (
    <mesh
      position={[x, y, z + out * ABOVE]}
      rotation={[0, out > 0 ? 0 : Math.PI, 0]}
    >
      <circleGeometry
        args={[face.kind === "lens" ? VIEWER.lens : VIEWER.bore, 20]}
      />
      <meshBasicMaterial color={GLASS} />
    </mesh>
  );
};

const Fittings: React.FC<{ readonly door: Door }> = ({ door }) => {
  const { parts, faces } = fittingsOf(door);
  return (
    <>
      {parts.map((part) =>
        part.shape === "box" ? (
          <ToonBox
            key={part.name}
            position={part.center}
            size={part.size}
            color={STEEL}
            ink={FITTING_INK}
          />
        ) : (
          <ToonCylinder
            key={part.name}
            position={part.center}
            rotation={[Math.PI / 2, 0, 0]}
            radius={part.size[0] / 2}
            height={part.size[2]}
            segments={32}
            color={STEEL}
            ink={FITTING_INK}
          />
        ),
      )}
      {faces.map((face, i) => (
        <Face key={i} face={face} />
      ))}
    </>
  );
};

const PullBar: React.FC<{ readonly door: Door; readonly grip: Grip }> = ({
  door,
  grip,
}) => {
  const out = Math.sign(grip.center[2]);
  const face = (out * door.thickness) / 2;
  const back = grip.center[2] - (out * grip.size[2]) / 2;
  return (
    <>
      <ToonBox position={grip.center} size={grip.size} color={STEEL} />
      {[1, -1].map((end) => (
        <ToonCylinder
          key={end}
          position={[
            grip.center[0],
            grip.center[1] + end * (grip.size[1] / 2 - POST.inset),
            (back + face) / 2,
          ]}
          rotation={[Math.PI / 2, 0, 0]}
          radius={POST.size / 2}
          height={Math.abs(back - face)}
          segments={16}
          color={STEEL}
          ink={FITTING_INK}
        />
      ))}
    </>
  );
};
const STEEL = "#c7c7c2";
const TUBE = { along: 48, around: 16 };

const useLeverTube = (radius: number) =>
  useDisposable(
    () =>
      new TubeGeometry(
        new CatmullRomCurve3(leverPath(), false, "catmullrom", 0),
        TUBE.along,
        radius,
        TUBE.around,
        false,
      ),
    [radius],
  );

const Lever: React.FC<{
  readonly door: Door;
  readonly grip: Grip;
  readonly press: number;
}> = ({ door, grip, press }) => {
  const tube = useLeverTube(LEVER.radius);
  const ink = useLeverTube(LEVER.radius + OUTLINE);
  const [x, y, z] = leverPivot(grip);
  const out = Math.sign(z);
  const tip = leverPath()[leverPath().length - 1];
  return (
    <group
      position={[x, y, (out * door.thickness) / 2]}
      rotation={[0, 0, press]}
      scale={[1, 1, out]}
    >
      <mesh geometry={tube} castShadow dispose={null}>
        <meshToonMaterial color={STEEL} />
      </mesh>
      <mesh geometry={ink} dispose={null}>
        <InkHull />
      </mesh>
      <Blob
        position={[tip.x, tip.y, tip.z]}
        scale={LEVER.radius}
        color={STEEL}
      />
    </group>
  );
};

export const DoorGrips: React.FC<{
  readonly door: Door;
  readonly press?: number;
}> = ({ door, press = 0 }) => (
  <>
    {door.grips.map((grip) =>
      grip.shape === "knob" ? (
        <Blob
          key={grip.side}
          position={grip.center}
          scale={grip.size.map((s) => s / 2) as unknown as Vec3}
          color={BRASS}
        />
      ) : grip.shape === "lever" ? (
        <Lever key={grip.side} door={door} grip={grip} press={press} />
      ) : (
        <PullBar key={grip.side} door={door} grip={grip} />
      ),
    )}
    <Fittings door={door} />
  </>
);
