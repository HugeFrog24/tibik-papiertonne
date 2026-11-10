import { useDisposable } from "../toon/useDisposable";
import { SphereGeometry, Vector2, Vector3, type WebGLProgramParametersWithUniforms } from "three";
import { blendedNormal } from "./blendNormals";
import { InkHull, OUTLINE, type Paint } from "../toon/primitives";
import { torsoProfile, type Skeleton } from "./skeleton";
import { torsoLathe } from "./torsoShape";
import { present } from "../toon/present";

export const TorsoMesh: React.FC<{
  readonly skeleton: Skeleton;
  readonly color: Paint;
  readonly onBeforeCompile?: ((
    shader: WebGLProgramParametersWithUniforms,
  ) => void) | undefined;
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
    const body = torsoLathe(points, skeleton);
    const hull = torsoLathe(hullPoints, skeleton);
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
    <>
      <group scale={[1, 1, skeleton.torso.depthScale]}>
        <mesh geometry={geometry.body} castShadow receiveShadow>
          <meshToonMaterial color={color} {...present({ onBeforeCompile })} />
        </mesh>
        <mesh geometry={geometry.hull}>
          <InkHull grown={OUTLINE} />
        </mesh>
      </group>
      {skeleton.torso.shoulders
        ? ([1, -1] as const).map((side) => <ShoulderMass key={side} skeleton={skeleton} side={side} color={color} onBeforeCompile={onBeforeCompile} />)
        : null}
    </>
  );
};

const ShoulderMass: React.FC<{
  readonly skeleton: Skeleton;
  readonly side: 1 | -1;
  readonly color: Paint;
  readonly onBeforeCompile?: ((shader: WebGLProgramParametersWithUniforms) => void) | undefined;
}> = ({ skeleton, side, color, onBeforeCompile }) => {
  const geometry = useDisposable(() => {
    const mass = skeleton.torso.shoulders!;
    const [wide, high, deep] = mass.size;
    const centre = new Vector3(side * mass.x, mass.y, 0);
    const shape = new SphereGeometry(1, 40, 24);
    const position = shape.attributes["position"];
    const normal = shape.attributes["normal"];
    const unit = new Vector3();
    for (let i = 0; i < position.count; i++) {
      unit.fromBufferAttribute(position, i);
      const p = new Vector3(unit.x * wide, unit.y * high, unit.z * deep).add(centre);
      const n = blendedNormal(skeleton, p, new Vector3(unit.x / wide, unit.y / high, unit.z / deep));
      position.setXYZ(i, p.x, p.y, p.z);
      normal.setXYZ(i, n.x, n.y, n.z);
    }
    shape.computeBoundingSphere();
    return shape;
  }, [skeleton, side]);
  return (
    <mesh geometry={geometry} castShadow receiveShadow>
      <meshToonMaterial color={color} {...present({ onBeforeCompile })} />
    </mesh>
  );
};
