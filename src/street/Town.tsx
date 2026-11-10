import { NO_INK } from "../toon/inkWidth";
import { ToonBox, drawnTexture, glowMapOf } from "../toon/primitives";
import { COPING, WINDOW_PAINT } from "./building";
import { PartBoxes } from "./PartBoxes";
import { TOWN, TOWN_GROUND, TOWN_WINDOW, roofParts, townWindows, townWindowsOn, type TownBlock } from "./townShape";

const PLASTER = "#a39c90";
const PANE = "#3e4650";
const GROUND = "#5d6058";
const PX = 16;
const DEPTH_BIAS = { polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -4 };

const drawWindows = (ctx: CanvasRenderingContext2D, block: TownBlock, h: number, keep: (k: number) => boolean, color: string) => {
  ctx.fillStyle = color;
  for (const win of townWindows(block))
    if (keep(win.k))
      ctx.fillRect((win.x - TOWN_WINDOW.w / 2) * PX, h - (win.y + TOWN_WINDOW.h / 2) * PX, TOWN_WINDOW.w * PX, TOWN_WINDOW.h * PX);
};

const size = (block: TownBlock) => [Math.round(block.w * PX), Math.round(block.h * PX)] as const;

const facadeTexture = (block: TownBlock, index: number) =>
  drawnTexture(`town-${index}-plain`, ...size(block), (ctx, w, h) => {
    ctx.fillStyle = PLASTER;
    ctx.fillRect(0, 0, w, h);
    drawWindows(ctx, block, h, () => true, PANE);
  });

const litTexture = (block: TownBlock, index: number, on: readonly number[]) =>
  drawnTexture(`town-${index}-lit-${on.length}`, ...size(block), (ctx, w, h) => {
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, w, h);
    drawWindows(ctx, block, h, (k) => on.includes(k), WINDOW_PAINT.lit);
  });

export const Town: React.FC<{ readonly lit: number }> = ({ lit }) => (
  <>
    <mesh
      position={[(TOWN_GROUND.x[0] + TOWN_GROUND.x[1]) / 2, TOWN_GROUND.y, (TOWN_GROUND.z[0] + TOWN_GROUND.z[1]) / 2]}
      rotation={[-Math.PI / 2, 0, 0]}
      userData={NO_INK}
      receiveShadow
    >
      <planeGeometry args={[TOWN_GROUND.x[1] - TOWN_GROUND.x[0], TOWN_GROUND.z[1] - TOWN_GROUND.z[0]]} />
      <meshToonMaterial color={GROUND} />
    </mesh>
    {TOWN.map((block, i) => {
      const face = block.z < 0 ? 1 : -1;
      const front = block.z + (face * block.d) / 2;
      const on = townWindowsOn(block, i, lit);
      return (
        <group key={i}>
          <ToonBox position={[block.x, block.h / 2, block.z]} size={[block.w, block.h, block.d]} color={PLASTER} />
          <mesh
            position={[block.x, block.h / 2, front + face * 0.01]}
            rotation={[0, face > 0 ? 0 : Math.PI, 0]}
            userData={NO_INK}
          >
            <planeGeometry args={[block.w, block.h]} />
            <meshToonMaterial
              map={facadeTexture(block, i)}
              {...DEPTH_BIAS}
              {...glowMapOf(on.length > 0 ? litTexture(block, i, on) : undefined)}
            />
          </mesh>
        </group>
      );
    })}
  </>
);

const ROOFING = "#7d7a76";
const DOME = "#e6ecef";

const ROOF_PAINT: Readonly<Record<string, string>> = { parapet: COPING, "smoke vent": COPING };

export const Roof: React.FC = () => {
  const parts = roofParts();
  const dome = parts.find((part) => part.name === "smoke vent dome")!;
  return (
    <>
      <PartBoxes parts={parts.filter((part) => part !== dome)} color={(part) => ROOF_PAINT[part.name] ?? ROOFING} />
      <mesh position={[dome.center[0], dome.center[1] - dome.size[1] / 2, dome.center[2]]}>
        <sphereGeometry args={[dome.size[1], 24, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshToonMaterial color={DOME} />
      </mesh>
    </>
  );
};
