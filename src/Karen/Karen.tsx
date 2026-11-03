import { useMemo } from "react";
import {
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  Quaternion,
  Vector3,
  type WebGLProgramParametersWithUniforms,
} from "three";
import {
  ankleRotation,
  elbowRotation,
  footCenter,
  headRotation,
  hipPosition,
  hipRotation,
  kneeRotation,
  shoulderRotation,
  torsoRotation,
  type ArmPose,
  type LegPose,
  type Pose,
  type Side,
} from "../characters/skeleton";
import { TorsoMesh } from "../characters/TorsoMesh";
import { Blob, INK, InkLine, Segment, type Vec3 } from "../toon/primitives";
import { LIP_INK, mouthShape, type FacePoint } from "./face";
import { KAREN_SKELETON as K } from "./rig";

export {
  KAREN_ARM_HIPS,
  KAREN_ARM_POINT,
  KAREN_ARM_REST,
  KAREN_ARM_RUN,
  KAREN_HEAD_LIMITS,
  KAREN_POINTING,
  KAREN_REST,
  KAREN_RUN_SWING,
  KAREN_SKELETON,
  karenRunArm,
  limitKarenHead,
} from "./rig";

export const KAREN_LILAC = "#e3a8fd";
export const KAREN_TROUSERS = "#715279";
export const KAREN_SKIN = "#fdebc8";
export const KAREN_HAIR = "#67665e";
export const KAREN_SHOES = "#2e2832";
const MOUTH_INSIDE = "#4a1520";
const TONGUE = "#d0707c";

const HEAD_CENTER = K.headCenter;
const HEAD = K.headSize;

const faceNormal = (x: number, y: number) => {
  const z = HEAD[2] * Math.sqrt(Math.max(0, 1 - (x / HEAD[0]) ** 2 - (y / HEAD[1]) ** 2));
  return {
    z,
    normal: new Vector3(x / HEAD[0] ** 2, y / HEAD[1] ** 2, z / HEAD[2] ** 2).normalize(),
  };
};

const onFace = (x: number, y: number, lift: number): Vec3 => {
  const { z, normal } = faceNormal(x, y);
  return [
    HEAD_CENTER[0] + x + normal.x * lift,
    HEAD_CENTER[1] + y + normal.y * lift,
    HEAD_CENTER[2] + z + normal.z * lift,
  ];
};

const faceAlign = (x: number, y: number) =>
  new Quaternion().setFromUnitVectors(new Vector3(0, 0, 1), faceNormal(x, y).normal);

const HEM_Y = 0.045;
const HEM_INK = 0.006;
const paintBody = (shader: WebGLProgramParametersWithUniforms) => {
  shader.uniforms.uTrousers = { value: new Color(KAREN_TROUSERS) };
  shader.uniforms.uInk = { value: new Color(INK) };
  shader.vertexShader = shader.vertexShader
    .replace("#include <common>", "#include <common>\nvarying vec3 vBodyPos;")
    .replace("#include <begin_vertex>", "#include <begin_vertex>\nvBodyPos = position;");
  shader.fragmentShader = shader.fragmentShader
    .replace(
      "#include <common>",
      `#include <common>
varying vec3 vBodyPos;
uniform vec3 uTrousers;
uniform vec3 uInk;

float hemDistance() {
  float angle = atan(vBodyPos.x, vBodyPos.z);
  return vBodyPos.y - (${HEM_Y.toFixed(4)} + 0.007 * sin(angle * 5.0 + 0.6));
}`,
    )
    .replace(
      "#include <color_fragment>",
      `#include <color_fragment>
{
  float d = hemDistance();
  float w = max(fwidth(d), 1e-4);
  diffuseColor.rgb = mix(uTrousers, diffuseColor.rgb, smoothstep(-w, w, d));
}`,
    )
    .replace(
      "#include <opaque_fragment>",
      `#include <opaque_fragment>
{
  float d = abs(hemDistance());
  float w = max(fwidth(d), 1e-4);
  gl_FragColor.rgb = mix(uInk, gl_FragColor.rgb, smoothstep(${HEM_INK.toFixed(4)} - w, ${HEM_INK.toFixed(4)} + w, d));
}`,
    );
};

const PATCH_ROWS = 8;
const facePatch = (top: readonly FacePoint[], bottom: readonly FacePoint[], lift: number) => {
  const n = top.length;
  const positions: number[] = [];
  for (let row = 0; row <= PATCH_ROWS; row++) {
    const t = row / PATCH_ROWS;
    top.forEach(([x, y], i) => {
      positions.push(...onFace(x + (bottom[i][0] - x) * t, y + (bottom[i][1] - y) * t, lift));
    });
  }
  const index: number[] = [];
  for (let row = 0; row < PATCH_ROWS; row++) {
    for (let i = 0; i < n - 1; i++) {
      const a = row * n + i;
      index.push(a, a + n, a + 1, a + 1, a + n, a + n + 1);
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.setIndex(index);
  return geometry;
};

const Mouth: React.FC<{ readonly open: number }> = ({ open }) => {
  const shape = useMemo(() => {
    const s = mouthShape(open);
    const toFace = (edge: FacePoint[]) => edge.map(([x, y]) => onFace(x, y, LIP_INK.lift));
    return {
      topLine: toFace(s.top),
      bottomLine: toFace(s.bottom),
      inside: facePatch(s.top, s.bottom, 0.0015),
      teeth: facePatch(s.teethTop, s.teethBottom, 0.0025),
      tongue: facePatch(s.tongueTop, s.tongueBottom, 0.0025),
    };
  }, [open]);

  if (open < 0.03) {
    return <InkLine points={shape.topLine} radius={LIP_INK.radius} />;
  }
  return (
    <>
      <mesh geometry={shape.inside}>
        <meshBasicMaterial color={MOUTH_INSIDE} />
      </mesh>
      <mesh geometry={shape.teeth}>
        <meshBasicMaterial color="#fffaf0" />
      </mesh>
      <mesh geometry={shape.tongue}>
        <meshBasicMaterial color={TONGUE} />
      </mesh>
      <InkLine points={shape.topLine} radius={LIP_INK.radius} />
      <InkLine points={shape.bottomLine} radius={LIP_INK.radius} />
    </>
  );
};

const EYE_X = 0.058;
const EYE_Y = 0.02;

const Eye: React.FC<{
  readonly side: Side;
  readonly gazeYaw: number;
  readonly gazePitch: number;
  readonly blink: number;
}> = ({ side, gazeYaw, gazePitch, blink }) => {
  const x = side * EYE_X + Math.max(-0.012, Math.min(0.012, gazeYaw * 0.03));
  const y = EYE_Y + Math.max(-0.01, Math.min(0.01, gazePitch * 0.025));
  return (
    <group position={onFace(x, y, -0.004)} quaternion={faceAlign(x, y)}>
      <group scale={[1, 1 - 0.88 * blink, 1]}>
        <mesh scale={[0.019, 0.023, 0.012]}>
          <sphereGeometry args={[1, 24, 16]} />
          <meshBasicMaterial color={INK} />
        </mesh>
        <mesh position={[0.006, 0.008, 0.009]} visible={blink < 0.5}>
          <sphereGeometry args={[0.0055, 12, 8]} />
          <meshBasicMaterial color="white" />
        </mesh>
      </group>
    </group>
  );
};

const Brow: React.FC<{ readonly side: Side; readonly anger: number }> = ({ side, anger }) => {
  const points = useMemo(
    () =>
      [
        [0.024, 0.06 - 0.016 * anger],
        [0.064, 0.072 + 0.002 * anger],
        [0.104, 0.074 + 0.02 * anger],
      ].map(([x, y]) => onFace(side * x, y, 0.004)),
    [side, anger],
  );
  return <InkLine points={points} radius={0.0095} />;
};

const Head: React.FC<{
  readonly pose: Pose;
  readonly mouthOpen: number;
  readonly browAnger: number;
}> = ({ pose, mouthOpen, browAnger }) => {
  return (
    <group position={[0, K.neckHeight, 0]} rotation={headRotation(pose)}>
      <Blob position={HEAD_CENTER} scale={HEAD} color={KAREN_SKIN} />
      {([1, -1] as const).map((side) => (
        <Blob
          key={side}
          position={[side * K.jowl.center[0], K.jowl.center[1], K.jowl.center[2]]}
          scale={K.jowl.size}
          color={KAREN_SKIN}
        />
      ))}
      {K.hair.map((h, i) => (
        <Blob key={i} position={h.center} rotation={h.rotation} scale={h.size} color={KAREN_HAIR} />
      ))}
      <Eye side={1} gazeYaw={pose.gazeYaw} gazePitch={pose.gazePitch} blink={pose.blink} />
      <Eye side={-1} gazeYaw={pose.gazeYaw} gazePitch={pose.gazePitch} blink={pose.blink} />
      <Brow side={1} anger={browAnger} />
      <Brow side={-1} anger={browAnger} />
      <Mouth open={mouthOpen} />
    </group>
  );
};

const Arm: React.FC<{
  readonly side: Side;
  readonly pose: ArmPose;
  readonly pointing: boolean;
}> = ({ side, pose, pointing }) => {
  return (
    <group position={[side * K.shoulder.x, K.shoulder.y, 0]} rotation={shoulderRotation(pose, side)}>
      <Segment length={K.upperArm.length} radius={K.upperArm.radius} color={KAREN_LILAC} />
      <group position={[0, -K.upperArm.length, 0]} rotation={elbowRotation(pose, side)}>
        <Segment length={K.forearm.length} radius={K.forearm.radius} color={KAREN_LILAC} />
        <Blob position={[0, -K.hand.offset, 0]} scale={K.hand.size} color={KAREN_SKIN} />
        {pointing ? (
          <group position={[0, -K.hand.offset - 0.04, 0.02]}>
            <Segment length={0.085} radius={0.019} color={KAREN_SKIN} />
          </group>
        ) : null}
      </group>
    </group>
  );
};

const Leg: React.FC<{ readonly side: Side; readonly pose: LegPose }> = ({ side, pose }) => {
  const [x, y, z] = footCenter(K, side);
  return (
    <group position={hipPosition(K, side)} rotation={hipRotation(pose)}>
      <Segment length={K.thigh.length} radius={K.thigh.radius} color={KAREN_TROUSERS} />
      <group position={[0, -K.thigh.length, 0]} rotation={kneeRotation(pose)}>
        <Segment length={K.shin.length} radius={K.shin.radius} color={KAREN_TROUSERS} />
        <group position={[0, -K.shin.length, 0]} rotation={ankleRotation(pose)}>
          <group position={[x, y - K.shoe.drop, z]} rotation={[0, side * K.shoe.yaw, 0]}>
            <Blob scale={K.shoe.size} color={KAREN_SHOES} />
          </group>
        </group>
      </group>
    </group>
  );
};

export const Karen: React.FC<{
  readonly position: Vec3;
  readonly rotationY: number;
  readonly pose: Pose;
  readonly mouthOpen?: number;
  readonly browAnger?: number;
  readonly pointing?: boolean;
  readonly carrying?: React.ReactNode;
}> = ({ position, rotationY, pose, mouthOpen = 0, browAnger = 1, pointing = false, carrying }) => {
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <group position={[0, pose.bob, 0]}>
        <Leg side={1} pose={pose.leftLeg} />
        <Leg side={-1} pose={pose.rightLeg} />

        <group position={[0, K.hipHeight, 0]} rotation={torsoRotation(pose)}>
          <TorsoMesh skeleton={K} color={KAREN_LILAC} onBeforeCompile={paintBody} />
          <Arm side={1} pose={pose.leftArm} pointing={false} />
          <Arm side={-1} pose={pose.rightArm} pointing={pointing} />
          {carrying}
          <Head pose={pose} mouthOpen={mouthOpen} browAnger={browAnger} />
        </group>
      </group>
    </group>
  );
};
