import { useDisposable } from "../toon/useDisposable";
import { BufferGeometry, Float32BufferAttribute } from "three";
import type { Drop } from "./rainDrops";

const STREAK = "#dfe6ec";
const RING = 8;
const RING_LIFT = 0.003;

const streakGeometry = (drops: readonly Drop[]) => {
  const positions: number[] = [];
  for (const d of drops) if (!d.splash) positions.push(...d.tail, ...d.head);
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  return geometry;
};

const ringGeometry = (drops: readonly Drop[]) => {
  const positions: number[] = [];
  for (const d of drops) {
    if (!d.splash) continue;
    const [x, y, z] = d.splash.at;
    const r = 0.02 + 0.3 * d.splash.age;
    for (let k = 0; k < RING; k++) {
      const a = (2 * Math.PI * k) / RING;
      const b = (2 * Math.PI * (k + 1)) / RING;
      positions.push(
        x + r * Math.cos(a),
        y + RING_LIFT,
        z + r * Math.sin(a),
        x + r * Math.cos(b),
        y + RING_LIFT,
        z + r * Math.sin(b),
      );
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  return geometry;
};

export const Rain: React.FC<{ readonly drops: readonly Drop[] }> = ({
  drops,
}) => {
  const streaks = useDisposable(() => streakGeometry(drops), [drops]);
  const rings = useDisposable(() => ringGeometry(drops), [drops]);
  return (
    <>
      <lineSegments geometry={streaks}>
        <lineBasicMaterial color={STREAK} transparent opacity={0.65} />
      </lineSegments>
      <lineSegments geometry={rings}>
        <lineBasicMaterial color={STREAK} transparent opacity={0.5} />
      </lineSegments>
    </>
  );
};
