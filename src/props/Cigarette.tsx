import { Color, type Matrix4 } from "three";
import { NO_INK } from "../toon/inkWidth";
import { ToonCylinder } from "../toon/primitives";
import type { Quaternion, Vector3 } from "three";
import { ASH_RADIUS, CIGARETTE, cigaretteParts, cigaretteSegments, type CigarettePart } from "./cigaretteShape";

const ALONG_Z: [number, number, number] = [Math.PI / 2, 0, 0];
const SEGMENTS = 16;

const emberColour = (glow: number) =>
  `#${new Color(CIGARETTE.ember.rest).lerp(new Color(CIGARETTE.ember.draw), glow).getHexString()}`;

const GLOW_SHELLS = [
  { reach: 1, opacity: 0.12 },
  { reach: 0.6, opacity: 0.22 },
  { reach: 0.35, opacity: 0.4 },
] as const;

const EmberGlow: React.FC<{ readonly at: number; readonly glow: number }> = ({ at, glow }) => (
  <group position={[0, 0, at]} userData={NO_INK}>
    {GLOW_SHELLS.map(({ reach, opacity }) => (
      <mesh key={reach} userData={NO_INK} renderOrder={1}>
        <sphereGeometry args={[(reach * CIGARETTE.halo) / 2, 16, 12]} />
        <meshBasicMaterial color={CIGARETTE.ember.draw} transparent opacity={opacity * (0.6 + 0.4 * glow)} depthWrite={false} toneMapped={false} />
      </mesh>
    ))}
  </group>
);

const LOOK: Record<CigarettePart, { readonly color: string; readonly radius: number }> = {
  filter: { color: CIGARETTE.cork, radius: CIGARETTE.radius },
  paper: { color: CIGARETTE.paper, radius: CIGARETTE.radius },
  tobacco: { color: CIGARETTE.tobacco, radius: CIGARETTE.radius },
  ember: { color: CIGARETTE.ember.rest, radius: CIGARETTE.radius },
  ash: { color: CIGARETTE.ash, radius: ASH_RADIUS },
};

export const Cigarette: React.FC<{
  readonly frame: Matrix4;
  readonly burned: number;
  readonly ash: number;
  readonly glow: number;
}> = ({ frame, burned, ash, glow }) => {
  const lit = glow > 0;
  const { emberAt } = cigaretteParts({ burned, ash });
  const light = CIGARETTE.emberLight;
  return (
    <group matrixAutoUpdate={false} matrix={frame} userData={{ ink: CIGARETTE.ink }}>
      {cigaretteSegments({ burned, ash, lit }).map(({ part, from, to }) => (
        <ToonCylinder
          key={part}
          position={[0, 0, (from + to) / 2]}
          rotation={ALONG_Z}
          radius={LOOK[part].radius}
          height={to - from}
          segments={SEGMENTS}
          color={part === "ember" ? emberColour(glow) : LOOK[part].color}
          glow={part === "ember" ? { color: emberColour(glow), light: 0.6 + 0.4 * glow } : undefined}
          ink={CIGARETTE.ink}
        />
      ))}
      {lit ? <EmberGlow at={emberAt - CIGARETTE.ember.depth / 2} glow={glow} /> : null}
      {lit ? (
        <pointLight position={[0, 0, emberAt]} color={light.colour} intensity={light.intensity * glow} distance={light.distance} decay={light.decay} />
      ) : null}
    </group>
  );
};

export const AshPieces: React.FC<{
  readonly pieces: readonly { readonly center: Vector3; readonly rotation: Quaternion; readonly length: number; readonly radius: number }[];
}> = ({ pieces }) => (
  <>
    {pieces.map((piece, i) => (
      <group key={i} position={piece.center} quaternion={piece.rotation} userData={{ ink: CIGARETTE.ink }}>
        <ToonCylinder rotation={ALONG_Z} radius={piece.radius} height={piece.length} segments={SEGMENTS} color={CIGARETTE.ash} ink={CIGARETTE.ink} />
      </group>
    ))}
  </>
);
