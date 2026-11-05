import { random } from "remotion";
import { DoubleSide } from "three";
import { NO_INK } from "../toon/inkWidth";
import { ToonBox, drawnTexture } from "../toon/primitives";
import { TOWN, roofParts, type TownBlock } from "./townShape";

const PLASTER = "#a39c90";
const PANE = "#3e4650";
const LIT = "#ffc98a";
const PX = 8;
const WINDOW = { w: 1.2, h: 1.4, every: [2.6, 2.85] as const, lit: 0.22 };

const windowsOf = (block: TownBlock) => {
  const columns = Math.floor(block.w / WINDOW.every[0]);
  const rows = Math.floor((block.h - 1) / WINDOW.every[1]);
  return Array.from({ length: columns * rows }, (_, k) => ({
    x: (k % columns + 0.5) * (block.w / columns),
    y: 1 + (Math.floor(k / columns) + 0.5) * ((block.h - 1) / rows),
    k,
  }));
};

const facadeTexture = (block: TownBlock, index: number, lit: boolean) =>
  drawnTexture(`town-${index}-${lit ? "lit" : "plain"}`, Math.round(block.w * PX), Math.round(block.h * PX), (ctx, w, h) => {
    if (!lit) {
      ctx.fillStyle = PLASTER;
      ctx.fillRect(0, 0, w, h);
    }
    for (const win of windowsOf(block)) {
      if (lit && random(`town-light/${index}/${win.k}`) > WINDOW.lit) continue;
      ctx.fillStyle = lit ? LIT : PANE;
      ctx.fillRect((win.x - WINDOW.w / 2) * PX, h - (win.y + WINDOW.h / 2) * PX, WINDOW.w * PX, WINDOW.h * PX);
    }
  });

export const Town: React.FC<{ readonly lit: number }> = ({ lit }) => (
  <>
    {TOWN.map((block, i) => {
      const face = block.z < 0 ? 1 : -1;
      const front = block.z + (face * block.d) / 2;
      const facing = [0, face > 0 ? 0 : Math.PI, 0] as [number, number, number];
      return (
        <group key={i}>
          <ToonBox position={[block.x, block.h / 2, block.z]} size={[block.w, block.h, block.d]} color={PLASTER} />
          <mesh position={[block.x, block.h / 2, front + face * 0.01]} rotation={facing}>
            <planeGeometry args={[block.w, block.h]} />
            <meshToonMaterial map={facadeTexture(block, i, false)} />
          </mesh>
          {lit > 0 ? (
            <mesh position={[block.x, block.h / 2, front + face * 0.02]} rotation={facing} userData={NO_INK}>
              <planeGeometry args={[block.w, block.h]} />
              <meshBasicMaterial map={facadeTexture(block, i, true)} transparent opacity={lit} depthWrite={false} side={DoubleSide} />
            </mesh>
          ) : null}
        </group>
      );
    })}
  </>
);

const ROOFING = "#7d7a76";
const COPING = "#b9b2a3";
const DOME = "#e6ecef";

export const Roof: React.FC = () => (
  <>
    {roofParts().map((part, i) =>
      part.name === "smoke vent" ? (
        <group key={i}>
          <ToonBox position={part.center} size={part.size} color={COPING} />
          <mesh position={[part.center[0], part.center[1] + part.size[1] / 2, part.center[2]]}>
            <sphereGeometry args={[part.size[0] * 0.45, 24, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshToonMaterial color={DOME} />
          </mesh>
        </group>
      ) : (
        <ToonBox key={i} position={part.center} size={part.size} color={part.name === "parapet" ? COPING : ROOFING} />
      ),
    )}
  </>
);
