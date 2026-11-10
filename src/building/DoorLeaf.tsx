import type { ReactNode } from "react";
import type { Texture } from "three";
import { ToonBox, drawnTexture, speckle } from "../toon/primitives";
import { doorFrame, type Door } from "./doors";
import { present } from "../toon/present";
import { GLASS_PANE, leafAround, type Glazing } from "./glazedLeaf";
import { INK_BLOCKER, ONE_UNIT } from "../toon/inkWidth";
import { useSignColor } from "../weather/DayLight";

export type Glass = Glazing & { readonly opacity: number; readonly pattern?: (() => Texture) | undefined };

const GLASS = { tint: [200, 214, 222], pattern: [64, 256] as const };

const patternedGlass = () =>
  drawnTexture("patterned-glass", ...GLASS.pattern, (ctx, w, h) => {
    ctx.fillStyle = `rgb(${GLASS.tint.join(",")})`;
    ctx.fillRect(0, 0, w, h);
    speckle(ctx, w, h, { seed: "patterned-glass", count: 900, base: GLASS.tint, lightShare: 0.5, light: [12, 22], dark: [12, 22] });
  });

const GlassPane: React.FC<{ readonly glass: Glass }> = ({ glass }) => (
  <mesh position={[glass.x, glass.y, 0]} userData={INK_BLOCKER}>
    <boxGeometry args={[glass.w, glass.h, GLASS_PANE]} />
    <meshBasicMaterial color={useSignColor()} map={(glass.pattern ?? patternedGlass)()} transparent opacity={glass.opacity} depthWrite={false} />
  </mesh>
);

export const DoorLeaf: React.FC<{
  readonly door: Door;
  readonly angle: number;
  readonly color: string;
  readonly map?: Texture | undefined;
  readonly ink?: number | undefined;
  readonly userData?: Record<string, unknown> | undefined;
  readonly glass?: Glass | undefined;
  readonly children?: ReactNode;
}> = ({ door, angle, color, map, ink, userData, glass, children }) => (
  <group
    matrixAutoUpdate={false}
    matrix={doorFrame(door, angle)}
    {...present({ userData })}
  >
    {glass ? (
      <>
        <group userData={ONE_UNIT}>
          {leafAround(door, glass).map((part, i) => (
            <ToonBox key={i} position={[...part.center]} size={[...part.size]} color={color} map={map} ink={ink} outline={false} />
          ))}
        </group>
        <GlassPane glass={glass} />
      </>
    ) : (
      <ToonBox
        position={[door.width / 2, door.height / 2, 0]}
        size={[door.width, door.height, door.thickness]}
        color={color}
        map={map}
        ink={ink}
      />
    )}
    {children}
  </group>
);
