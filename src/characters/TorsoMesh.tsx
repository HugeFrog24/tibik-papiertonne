import { useMemo } from "react";
import { BackSide, LatheGeometry, Vector2, type WebGLProgramParametersWithUniforms } from "three";
import { INK, OUTLINE, type Paint } from "../toon/primitives";
import { torsoProfile, type Skeleton } from "./skeleton";

export const TorsoMesh: React.FC<{
  readonly skeleton: Skeleton;
  readonly color: Paint;
  readonly onBeforeCompile?: (shader: WebGLProgramParametersWithUniforms) => void;
}> = ({ skeleton, color, onBeforeCompile }) => {
  const geometry = useMemo(() => {
    const points = torsoProfile(skeleton);
    const hullPoints = points.map((p, i) => {
      const prev = points[Math.max(0, i - 1)];
      const next = points[Math.min(points.length - 1, i + 1)];
      const tangent = new Vector2(next.x - prev.x, next.y - prev.y).normalize();
      return new Vector2(Math.max(0, p.x + tangent.y * OUTLINE), p.y - tangent.x * OUTLINE);
    });
    return { body: new LatheGeometry(points, 64), hull: new LatheGeometry(hullPoints, 64) };
  }, [skeleton]);

  return (
    <group scale={[1, 1, skeleton.torso.depthScale]}>
      <mesh geometry={geometry.body} castShadow receiveShadow>
        <meshToonMaterial color={color} onBeforeCompile={onBeforeCompile} />
      </mesh>
      <mesh geometry={geometry.hull}>
        <meshBasicMaterial color={INK} side={BackSide} />
      </mesh>
    </group>
  );
};
