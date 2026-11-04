import { Euler, Vector3 } from "three";
import { InkHull, OUTLINE, drawnTexture } from "../toon/primitives";
import { clumpGeometry } from "./clumpShape";
import type { HairPiece } from "./rig";

const strands = () =>
  drawnTexture("karen-hair-strands", 64, 128, (ctx, w, h) => {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "#a9a9a9";
    ctx.lineWidth = 3;
    for (const x of [0.16, 0.42, 0.68, 0.9]) {
      ctx.beginPath();
      ctx.moveTo(x * w, 0);
      ctx.bezierCurveTo(x * w + 4, h * 0.35, x * w - 4, h * 0.65, x * w + 2, h);
      ctx.stroke();
    }
  });

export const rootSignOf = (piece: HairPiece): 1 | -1 =>
  new Vector3(0, 1, 0).applyEuler(new Euler(...piece.rotation)).y >= 0 ? 1 : -1;

export const HairClump: React.FC<{
  readonly piece: HairPiece;
  readonly rootSign: 1 | -1;
  readonly color: string;
}> = ({ piece, rootSign, color }) => {
  const geometry = clumpGeometry(rootSign);
  const [sx, sy, sz] = piece.size;
  return (
    <group position={piece.center} rotation={piece.rotation}>
      <mesh
        geometry={geometry}
        scale={piece.size}
        castShadow
        receiveShadow
        dispose={null}
      >
        <meshToonMaterial color={color} map={strands()} />
      </mesh>
      <mesh
        geometry={geometry}
        scale={[sx + OUTLINE, sy + OUTLINE, sz + OUTLINE]}
        dispose={null}
      >
        <InkHull />
      </mesh>
    </group>
  );
};
