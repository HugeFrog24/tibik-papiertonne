import { DECAL, drawnTexture } from "../toon/primitives";
import { Decal } from "./Drains";
import { ENTRANCE_MAT, entranceMatRect } from "./layout";

const PX_PER_M = 1000;

const matTexture = () => {
  const [w, h] = ENTRANCE_MAT.size.map((m) => Math.round(m * PX_PER_M));
  const frame = Math.round(ENTRANCE_MAT.frame * PX_PER_M);
  return drawnTexture("entrance-mat", w, h, (ctx) => {
    ctx.fillStyle = "#a9adb2";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#2a2c2f";
    ctx.fillRect(frame, frame, w - 2 * frame, h - 2 * frame);
    ctx.fillStyle = "#3b3e42";
    for (let y = frame + 10; y < h - frame - 6; y += 22)
      ctx.fillRect(frame + 6, y, w - 2 * frame - 12, 9);
    ctx.strokeStyle = "#6f7378";
    ctx.lineWidth = 3;
    ctx.strokeRect(
      frame - 1.5,
      frame - 1.5,
      w - 2 * frame + 3,
      h - 2 * frame + 3,
    );
  });
};

export const EntranceMat: React.FC = () => {
  const r = entranceMatRect();
  return (
    <Decal
      x={(r.x0 + r.x1) / 2}
      y={r.y}
      z={(r.z0 + r.z1) / 2}
      scale={[r.x1 - r.x0, r.z1 - r.z0, 1]}
    >
      <planeGeometry args={[1, 1]} />
      <meshToonMaterial map={matTexture()} {...DECAL} />
    </Decal>
  );
};
