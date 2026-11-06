import { useDisposable } from "../toon/useDisposable";
import {
  LatheGeometry,
  Vector2,
  type WebGLProgramParametersWithUniforms,
} from "three";
import { InkHull, OUTLINE, type Paint } from "../toon/primitives";
import { bustLift, torsoProfile, type Skeleton } from "./skeleton";

const bulged = (geometry: LatheGeometry, skeleton: Skeleton) => {
  if (!skeleton.torso.bulges?.length) return geometry;
  const position = geometry.attributes.position;
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i);
    const z = position.getZ(i);
    if (z <= 0) continue;
    position.setZ(i, z + (bustLift(skeleton, x, position.getY(i)) * z) / Math.hypot(x, z) / skeleton.torso.depthScale);
  }
  geometry.computeVertexNormals();
  return geometry;
};

export const TorsoMesh: React.FC<{
  readonly skeleton: Skeleton;
  readonly color: Paint;
  readonly onBeforeCompile?: (
    shader: WebGLProgramParametersWithUniforms,
  ) => void;
}> = ({ skeleton, color, onBeforeCompile }) => {
  const geometry = useDisposable(() => {
    const points = torsoProfile(skeleton);
    const hullPoints = points.map((p, i) => {
      const prev = points[Math.max(0, i - 1)];
      const next = points[Math.min(points.length - 1, i + 1)];
      const tangent = new Vector2(next.x - prev.x, next.y - prev.y).normalize();
      return new Vector2(
        Math.max(0, p.x + tangent.y * OUTLINE),
        p.y - tangent.x * OUTLINE,
      );
    });
    const body = bulged(new LatheGeometry(points, 64), skeleton);
    const hull = bulged(new LatheGeometry(hullPoints, 64), skeleton);
    return {
      body,
      hull,
      dispose: () => {
        body.dispose();
        hull.dispose();
      },
    };
  }, [skeleton]);

  return (
    <group scale={[1, 1, skeleton.torso.depthScale]}>
      <mesh geometry={geometry.body} castShadow receiveShadow>
        <meshToonMaterial color={color} onBeforeCompile={onBeforeCompile} />
      </mesh>
      <mesh geometry={geometry.hull}>
        <InkHull />
      </mesh>
    </group>
  );
};
