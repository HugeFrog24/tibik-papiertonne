import { Color, type Matrix4 } from "three";
import { ToonCylinder } from "../toon/primitives";
import { CIGARETTE, cigaretteParts, cigaretteSegments, type CigarettePart } from "./cigaretteShape";

const ALONG_Z: [number, number, number] = [Math.PI / 2, 0, 0];
const SEGMENTS = 16;

const emberColour = (glow: number) =>
  `#${new Color(CIGARETTE.ember.rest).lerp(new Color(CIGARETTE.ember.draw), glow).getHexString()}`;

const LOOK: Record<CigarettePart, { readonly color: string; readonly radius: number }> = {
  filter: { color: CIGARETTE.cork, radius: CIGARETTE.radius },
  paper: { color: CIGARETTE.paper, radius: CIGARETTE.radius },
  tobacco: { color: CIGARETTE.tobacco, radius: CIGARETTE.radius },
  ember: { color: CIGARETTE.ember.rest, radius: CIGARETTE.radius },
  ash: { color: CIGARETTE.ash, radius: CIGARETTE.radius * 0.97 },
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
      {lit ? (
        <pointLight position={[0, 0, emberAt]} color={light.colour} intensity={light.intensity * glow} distance={light.distance} decay={light.decay} />
      ) : null}
    </group>
  );
};
