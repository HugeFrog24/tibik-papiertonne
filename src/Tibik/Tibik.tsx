import { Body } from "../characters/Body";
import { ONE_UNIT } from "../toon/inkWidth";
import { useLayoutEffect } from "react";
import { SkeletonArm, SkeletonLeg } from "../characters/Limbs";
import { useThree } from "@react-three/fiber";
import {
  CatmullRomCurve3,
  Color,
  Vector2,
  Vector3,
  type WebGLProgramParametersWithUniforms,
} from "three";
import {
  footCenter,
  headRotation,
  type ArmPose,
  type LegPose,
  type Side,
} from "../characters/skeleton";
import { TorsoMesh } from "../characters/TorsoMesh";
import {
  Blob,
  INK,
  InkHull,
  InkLine,
  OUTLINE,
  euler,
  type Vec3,
} from "../toon/primitives";
import { ellipsoidFace } from "../characters/ellipsoidFace";
import { RIG, type TibikPose } from "./rig";

export { ARM_REST, TIBIK_REST, type ArmPose, type TibikPose } from "./rig";

export const TIBIK_GREEN = "#2f6a2c";
export const TIBIK_CREAM = "#efdf8c";
export const TIBIK_IRIS = "#1aa3ab";

const HEAD_Y = RIG.headCenterY;
const HEAD = RIG.headSize;

const FACE = ellipsoidFace(HEAD);
const LINE_LIFT = 0.004;

const onFace = (x: number, y: number): Vec3 => {
  const p = FACE.point(x, y, LINE_LIFT);
  return [p.x, HEAD_Y + p.y, p.z];
};

const MOUTH_HALF: [number, number][] = [
  [0, -0.012],
  [0.05, -0.045],
  [0.13, -0.066],
  [0.21, -0.055],
  [0.245, -0.034],
  [0.275, -0.014],
];
const MOUTH_LEFT = MOUTH_HALF.map(([x, y]) => onFace(x, y));
const MOUTH_RIGHT = MOUTH_HALF.map(([x, y]) => onFace(-x, y));

const MOUTH_SAMPLES = new CatmullRomCurve3(
  MOUTH_HALF.map(([x, y]) => new Vector3(x, y, 0)),
)
  .getPoints(31)
  .map((p) => new Vector2(p.x, p.y));
const N = MOUTH_SAMPLES.length;

const INK_SCREEN = { uBufferHeight: { value: 1080 } };

const paintHead = (shader: WebGLProgramParametersWithUniforms) => {
  shader.uniforms.uCream = { value: new Color(TIBIK_CREAM) };
  shader.uniforms.uInk = { value: new Color(INK) };
  shader.uniforms.uInkWidth = { value: OUTLINE };
  shader.uniforms.uBufferHeight = INK_SCREEN.uBufferHeight;
  shader.uniforms.uHeadSize = { value: new Vector3(...HEAD) };
  shader.uniforms.uMouth = { value: MOUTH_SAMPLES };
  shader.vertexShader = shader.vertexShader
    .replace("#include <common>", "#include <common>\nvarying vec3 vUnitPos;")
    .replace(
      "#include <begin_vertex>",
      "#include <begin_vertex>\nvUnitPos = position;",
    );
  shader.fragmentShader = shader.fragmentShader
    .replace(
      "#include <common>",
      `#include <common>
varying vec3 vUnitPos;
uniform vec3 uCream;
uniform vec3 uInk;
uniform float uInkWidth;
uniform float uBufferHeight;
uniform mat4 projectionMatrix;
uniform vec3 uHeadSize;
uniform vec2 uMouth[${N}];

float mouthY(float x) {
  x = abs(x);
  float y = uMouth[${N - 1}].y;
  for (int i = 0; i < ${N - 1}; i++) {
    if (x >= uMouth[i].x && x <= uMouth[i + 1].x) {
      y = mix(uMouth[i].y, uMouth[i + 1].y, (x - uMouth[i].x) / max(uMouth[i + 1].x - uMouth[i].x, 1e-5));
    }
  }
  return y;
}

float softStep(float d) {
  float w = max(fwidth(d), 1e-4);
  return smoothstep(-w, w, d);
}`,
    )
    .replace(
      "#include <color_fragment>",
      `#include <color_fragment>
{
  vec3 p = vUnitPos * uHeadSize;
  float below = mouthY(p.x) - p.y;
  float front = vUnitPos.z - (0.5 + 0.5 * min(0.0, vUnitPos.y));
  diffuseColor.rgb = mix(diffuseColor.rgb, uCream, softStep(below) * softStep(front));
}`,
    )
    .replace(
      "#include <opaque_fragment>",
      `#include <opaque_fragment>
{
  float facing = dot(normal, normalize(vViewPosition));
  float fromEdge = 0.5 * facing / max(fwidth(facing), 1e-6);
  float pixelsPerMetre = projectionMatrix[1][1] * 0.5 * uBufferHeight / max(vViewPosition.z, 1e-3);
  float inkPixels = uInkWidth * pixelsPerMetre;
  gl_FragColor.rgb = mix(uInk, gl_FragColor.rgb, smoothstep(inkPixels - 1.25, inkPixels + 1.25, fromEdge));
}`,
    );
};

const Eye: React.FC<{
  readonly side: Side;
  readonly gazeYaw: number;
  readonly gazePitch: number;
  readonly blink: number;
}> = ({ side, gazeYaw, gazePitch, blink }) => {
  return (
    <group position={[side * RIG.eye.x, RIG.eye.y, RIG.eye.z]}>
      <mesh castShadow receiveShadow>
        <sphereGeometry args={[RIG.eye.radius, 48, 32, 0, Math.PI]} />
        <meshToonMaterial color={TIBIK_CREAM} />
      </mesh>
      <mesh castShadow receiveShadow>
        <sphereGeometry args={[RIG.eye.radius, 48, 32, Math.PI, Math.PI]} />
        <meshToonMaterial color={TIBIK_GREEN} />
      </mesh>
      <mesh>
        <sphereGeometry args={[RIG.eye.radius + OUTLINE, 48, 32]} />
        <InkHull />
      </mesh>
      <group
        rotation={euler(0.25 - gazePitch, gazeYaw + side * 0.08, 0, "YXZ")}
      >
        <group scale={[1, 1 - 0.9 * blink, 1]}>
          <group position={[0, 0, RIG.eye.iris.offset]}>
            <mesh receiveShadow>
              <sphereGeometry args={[RIG.eye.iris.radius, 32, 24]} />
              <meshToonMaterial color={TIBIK_IRIS} />
            </mesh>
            <mesh>
              <sphereGeometry args={[RIG.eye.iris.radius + 0.006, 32, 24]} />
              <InkHull />
            </mesh>
          </group>
          <mesh receiveShadow position={[0, 0, RIG.eye.pupil.offset]}>
            <sphereGeometry args={[RIG.eye.pupil.radius, 32, 24]} />
            <meshToonMaterial color="#0b0b0b" />
          </mesh>
          <group visible={blink < 0.5}>
            <mesh
              receiveShadow
              position={[0.014, 0.017, RIG.eye.pupil.offset + 0.026]}
            >
              <sphereGeometry args={[0.009, 12, 8]} />
              <meshToonMaterial color="white" />
            </mesh>
            <mesh
              receiveShadow
              position={[-0.012, -0.012, RIG.eye.pupil.offset + 0.028]}
            >
              <sphereGeometry args={[0.004, 8, 6]} />
              <meshToonMaterial color="white" />
            </mesh>
          </group>
        </group>
      </group>
    </group>
  );
};

const Arm: React.FC<{
  readonly side: Side;
  readonly pose: ArmPose;
}> = ({ side, pose }) => (
  <SkeletonArm
    skeleton={RIG}
    side={side}
    pose={pose}
    sleeve={TIBIK_GREEN}
    hand={TIBIK_GREEN}
  />
);

const Leg: React.FC<{ readonly side: Side; readonly pose: LegPose }> = ({
  side,
  pose,
}) => (
  <SkeletonLeg skeleton={RIG} side={side} pose={pose} color={TIBIK_GREEN}>
    <Blob
      position={footCenter(RIG, side)}
      scale={RIG.foot.size}
      color={TIBIK_GREEN}
    />
  </SkeletonLeg>
);

export const Tibik: React.FC<{
  readonly position: Vec3;
  readonly rotationY: number;
  readonly pose: TibikPose;
  readonly carrying?: React.ReactNode;
}> = ({ position, rotationY, pose, carrying }) => {
  const gl = useThree((s) => s.gl);
  useLayoutEffect(() => {
    INK_SCREEN.uBufferHeight.value = gl.getDrawingBufferSize(new Vector2()).y;
  });
  return (
    <Body
      position={position}
      rotationY={rotationY}
      pose={pose}
      hipHeight={RIG.hipHeight}
      Leg={Leg}
    >
      <TorsoMesh skeleton={RIG} color={TIBIK_GREEN} />

      <Arm side={1} pose={pose.leftArm} />
      <Arm side={-1} pose={pose.rightArm} />
      {carrying}

      <group
        position={[0, RIG.neckHeight, 0]}
        rotation={headRotation(pose)}
        userData={ONE_UNIT}
      >
        <group position={[0, HEAD_Y, 0]}>
          <mesh scale={HEAD} castShadow receiveShadow>
            <sphereGeometry args={[1, 96, 64]} />
            <meshToonMaterial color={TIBIK_GREEN} onBeforeCompile={paintHead} />
          </mesh>
        </group>
        <InkLine points={MOUTH_LEFT} radius={0.009} caps="start" />
        <InkLine points={MOUTH_RIGHT} radius={0.009} caps="start" />
        <Eye
          side={1}
          gazeYaw={pose.gazeYaw}
          gazePitch={pose.gazePitch}
          blink={pose.blink}
        />
        <Eye
          side={-1}
          gazeYaw={pose.gazeYaw}
          gazePitch={pose.gazePitch}
          blink={pose.blink}
        />
      </group>
    </Body>
  );
};
