import { useMemo } from "react";
import { DoubleSide, LatheGeometry, Matrix4, Quaternion, Vector2, Vector3 } from "three";
import { INK_BLOCKER } from "../toon/inkWidth";
import { ToonBox, ToonCylinder } from "../toon/primitives";
import { useDisposable } from "../toon/useDisposable";
import { FLAME, LIGHTER, SPARKS, flameAt, sparksAt, wheelAt } from "./lighterShape";

const PROFILE = 16;
const CORE = 0.55;
const ORDER = { base: 1, edge: 2, core: 3 };

const teardrop = (radius: number) =>
  new LatheGeometry(
    Array.from({ length: PROFILE + 1 }, (_, i) => {
      const u = i / PROFILE;
      return new Vector2(radius * Math.sin(Math.PI * Math.pow(u, 0.6)) * Math.pow(1 - u, 0.35), u);
    }),
    20,
  );

const uprightIn = (frame: Matrix4) => {
  const turn = new Quaternion();
  frame.decompose(new Vector3(), turn, new Vector3());
  return turn.invert();
};

const Flame: React.FC<{ readonly frame: Matrix4; readonly t: number; readonly amount: number }> = ({ frame, t, amount }) => {
  const outer = useDisposable(() => teardrop(FLAME.radius), []);
  const inner = useDisposable(() => teardrop(FLAME.radius * CORE), []);
  const upright = useMemo(() => uprightIn(frame), [frame]);
  const { height, lean } = flameAt(t, amount);
  return (
    <group position={LIGHTER.nozzle} quaternion={upright}>
      <group rotation={[0, 0, -lean]}>
        <mesh geometry={outer} scale={[amount, height, amount]} userData={INK_BLOCKER} renderOrder={ORDER.edge}>
          <meshBasicMaterial color={FLAME.edge} transparent opacity={0.85} depthWrite={false} side={DoubleSide} />
        </mesh>
        <mesh geometry={inner} scale={[amount, height * 0.7, amount]} position={[0, height * 0.08, 0]} userData={INK_BLOCKER} renderOrder={ORDER.core}>
          <meshBasicMaterial color={FLAME.core} transparent opacity={0.95} depthWrite={false} />
        </mesh>
        <mesh position={[0, height * 0.04, 0]} scale={amount} userData={INK_BLOCKER} renderOrder={ORDER.base}>
          <sphereGeometry args={[FLAME.radius * 0.5, 12, 8]} />
          <meshBasicMaterial color={FLAME.base} transparent opacity={0.6} depthWrite={false} />
        </mesh>
      </group>
      <pointLight position={[0, height * 0.5, 0]} color={FLAME.light.colour} intensity={FLAME.light.intensity * amount} distance={FLAME.light.distance} decay={FLAME.light.decay} />
    </group>
  );
};

const Sparks: React.FC<{ readonly sinceStruck: number }> = ({ sinceStruck }) => (
  <>
    {sparksAt(sinceStruck).map((spark, i) => (
      <mesh key={i} position={spark} userData={INK_BLOCKER} renderOrder={ORDER.core}>
        <sphereGeometry args={[SPARKS.radius, 6, 4]} />
        <meshBasicMaterial color={SPARKS.colour} />
      </mesh>
    ))}
  </>
);

export const Lighter: React.FC<{
  readonly frame: Matrix4;
  readonly flame: number;
  readonly t: number;
  readonly sinceStruck?: number | undefined;
}> = ({ frame, flame, t, sinceStruck }) => {
  const [, bh, bd] = LIGHTER.body;
  const [, hh] = LIGHTER.hood;
  return (
    <group matrixAutoUpdate={false} matrix={frame} userData={{ ink: LIGHTER.ink }}>
      <ToonBox position={[0, bh / 2, 0]} size={LIGHTER.body} color={LIGHTER.plastic} ink={LIGHTER.ink} />
      <ToonBox position={[0, bh + hh / 2, 0]} size={LIGHTER.hood} color={LIGHTER.metal} ink={LIGHTER.ink} />
      <ToonBox position={LIGHTER.lever.center} size={LIGHTER.lever.size} color={LIGHTER.steel} ink={LIGHTER.ink} />
      <ToonCylinder
        position={wheelAt()}
        rotation={[Math.PI / 2, 0, 0]}
        radius={LIGHTER.wheel.radius}
        height={Math.min(LIGHTER.wheel.width, bd)}
        segments={14}
        color={LIGHTER.steel}
        ink={LIGHTER.ink}
      />
      {flame > 0 ? <Flame frame={frame} t={t} amount={flame} /> : null}
      {sinceStruck === undefined ? null : <Sparks sinceStruck={sinceStruck} />}
    </group>
  );
};
