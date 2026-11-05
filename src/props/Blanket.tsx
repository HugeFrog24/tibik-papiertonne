import { DoubleSide } from "three";
import type { Sphere } from "../physics/collision";
import { useDisposable } from "../toon/useDisposable";
import { bentPlane } from "./bentPlane";
import { BLANKET, blanketGrid, type BedRect } from "./blanketShape";

export const Blanket: React.FC<{ readonly bed: BedRect; readonly body: readonly Sphere[]; readonly cover: number }> = ({ bed, body, cover }) => {
  const grid = blanketGrid(bed, body, cover);
  const x0 = grid.columns[0];
  const far = grid.rows[grid.rows.length - 1];
  const geometry = useDisposable(
    () =>
      bentPlane(
        [grid.columns[grid.columns.length - 1] - x0, far - grid.rows[0]],
        [grid.columns.length - 1, grid.rows.length - 1],
        (u, v) => grid.height(x0 + u, far - v),
      ),
    [bed, body, cover],
  );
  return (
    <mesh geometry={geometry} position={[x0, 0, far]} rotation={[-Math.PI / 2, 0, 0]}>
      <meshToonMaterial color={BLANKET.color} side={DoubleSide} />
    </mesh>
  );
};
