import { Body } from "../characters/Body";
import { useDisposable } from "../toon/useDisposable";
import { ONE_UNIT } from "../toon/inkWidth";
import { useMemo } from "react";
import { SkeletonArm, SkeletonLeg } from "../characters/Limbs";
import {
  Color,
  DoubleSide,
  Vector3,
  type WebGLProgramParametersWithUniforms,
} from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import {
  footCenter,
  headRotation,
  type ArmPose,
  type LegPose,
  type Pose,
  type Side,
} from "../characters/skeleton";
import { TorsoMesh } from "../characters/TorsoMesh";
import {
  Blob,
  INK,
  Catchlight,
  InkHull,
  InkLine,
  OUTLINE,
  Segment,
  type Vec3,
} from "../toon/primitives";
import {
  BROW_INK,
  LIP_INK,
  MOUTH,
  MOUTH_HOLE_GLSL,
  browLine,
  mouthShape,
  type FacePoint,
} from "./face";
import { TEETH, TONGUE, pocketGeometry, teethAt, tongueAt } from "./cavity";
import {
  EYE,
  HIGHLIGHT,
  HIGHLIGHT_AT,
  eyeFrame,
  eyeLids,
  eyeTurn,
  irisGeometry,
  lidCovers,
  lidEdge,
  turnEuler,
} from "./eyeShape";
import { facePoint, headHull } from "./headShape";
import { WRINKLE, wrinklesAt } from "./wrinkles";
import { NOSE, potatoNose } from "./noseShape";
import { hairAt } from "./hair";
import { HairClump, rootSignOf } from "./HairClump";
import { scalpGeometry } from "./scalpShape";
import { KAREN_SKELETON as K, type HairPiece } from "./rig";

export { KAREN_POINTING, KAREN_REST } from "./rig";

export const KAREN_LILAC = "#e3a8fd";
export const KAREN_TROUSERS = "#715279";
export const KAREN_SKIN = "#fdebc8";
export const KAREN_HAIR = "#67665e";
const HAIR_SHADES = K.hair.map(
  (h) =>
    `#${new Color(KAREN_HAIR).offsetHSL(0, 0, h.shade * 0.045).getHexString()}`,
);
const ROOT_SIGNS = K.hair.map(rootSignOf);
export const KAREN_SHOES = "#2e2832";

const HEAD_CENTER = K.headCenter;
const HEAD = K.headSize;
const HULL = headHull(OUTLINE);

const onFace = (x: number, y: number, lift: number): Vec3 =>
  facePoint(x, y, lift).toArray();

const HEM_Y = 0.045;
const HEM_INK = 0.006;
const paintBody = (shader: WebGLProgramParametersWithUniforms) => {
  shader.uniforms["uTrousers"] = { value: new Color(KAREN_TROUSERS) };
  shader.uniforms["uInk"] = { value: new Color(INK) };
  shader.vertexShader = shader.vertexShader
    .replace("#include <common>", "#include <common>\nvarying vec3 vBodyPos;")
    .replace(
      "#include <begin_vertex>",
      "#include <begin_vertex>\nvBodyPos = position;",
    );
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

const HeadSkin: React.FC<{ readonly open: number }> = ({ open }) => {
  const uniforms = useMemo(() => ({ uOpen: { value: 0 } }), []);
  uniforms.uOpen.value = open;
  const openMouth = useMemo(
    () => (shader: WebGLProgramParametersWithUniforms) => {
      shader.uniforms["uOpen"] = uniforms.uOpen;
      shader.uniforms["uScale"] = { value: new Vector3(...HEAD) };
      shader.vertexShader = shader.vertexShader
        .replace(
          "#include <common>",
          "#include <common>\nuniform vec3 uScale;\nvarying vec3 vHeadPos;",
        )
        .replace(
          "#include <begin_vertex>",
          "#include <begin_vertex>\nvHeadPos = position * uScale;",
        );
      shader.fragmentShader = shader.fragmentShader
        .replace(
          "#include <common>",
          `#include <common>\nuniform float uOpen;\nvarying vec3 vHeadPos;\n${MOUTH_HOLE_GLSL}`,
        )
        .replace(
          "#include <clipping_planes_fragment>",
          "#include <clipping_planes_fragment>\nif (vHeadPos.z > 0.0 && insideMouth(vHeadPos.xy, uOpen)) discard;",
        );
    },
    [uniforms],
  );
  return (
    <mesh scale={HEAD} castShadow receiveShadow>
      <sphereGeometry args={[1, 48, 32]} />
      <meshToonMaterial color={KAREN_SKIN} onBeforeCompile={openMouth} />
    </mesh>
  );
};

const Pocket: React.FC<{ readonly open: number }> = ({ open }) => {
  const geometry = useDisposable(() => pocketGeometry(open), [open]);
  return (
    <mesh receiveShadow geometry={geometry}>
      <meshToonMaterial vertexColors side={DoubleSide} />
    </mesh>
  );
};

const TOOTH_BOXES = new Map<string, RoundedBoxGeometry>();
const toothBox = (size: readonly number[]) => {
  const key = size.map((v) => v.toFixed(6)).join();
  const found = TOOTH_BOXES.get(key);
  if (found) return found;
  const box = new RoundedBoxGeometry(
    size[0],
    size[1],
    size[2],
    3,
    Math.min(...size) * 0.35,
  );
  TOOTH_BOXES.set(key, box);
  return box;
};
const ENAMEL = new Color(TEETH.colours.front);
const DEEP_ENAMEL = new Color(TEETH.colours.back);

const Teeth: React.FC<{ readonly open: number }> = ({ open }) => (
  <>
    {teethAt(open).map((tooth) => (
      <group
        key={tooth.name}
        position={tooth.center}
        quaternion={tooth.rotation}
      >
        <mesh receiveShadow geometry={toothBox(tooth.size)} dispose={null}>
          <meshToonMaterial
            color={ENAMEL.clone().lerp(DEEP_ENAMEL, tooth.shade)}
          />
        </mesh>
        <mesh
          geometry={toothBox(tooth.size.map((v) => v + 2 * TEETH.ink))}
          dispose={null}
        >
          <InkHull grown={TEETH.ink} />
        </mesh>
      </group>
    ))}
  </>
);

const Tongue: React.FC<{ readonly open: number }> = ({ open }) => {
  const { center, size } = tongueAt(open);
  return (
    <Blob
      position={center.toArray()}
      scale={size}
      color={TONGUE.colour}
      ink={TONGUE.ink}
    />
  );
};

const Mouth: React.FC<{ readonly open: number }> = ({ open }) => {
  const lips = useMemo(() => {
    const s = mouthShape(open);
    const toFace = (edge: FacePoint[]) =>
      edge.map(([x, y]) => onFace(x, y, LIP_INK.lift));
    return { top: toFace(s.top), bottom: toFace(s.bottom) };
  }, [open]);
  if (open < MOUTH.minOpen)
    return <InkLine points={lips.top} radius={LIP_INK.radius} />;
  return (
    <>
      <Pocket open={open} />
      <Teeth open={open} />
      <Tongue open={open} />
      <InkLine points={lips.top} radius={LIP_INK.radius} />
      <InkLine points={lips.bottom} radius={LIP_INK.radius} />
    </>
  );
};

const SEGMENTS = { around: 32, down: 16 };
const LASH_INK = 0.0032;
const LOWER_LID_INK = 0.0016;

const Eye: React.FC<{
  readonly side: Side;
  readonly gazeYaw: number;
  readonly gazePitch: number;
  readonly blink: number;
  readonly anger: number;
}> = ({ side, gazeYaw, gazePitch, blink, anger }) => {
  const frame = useMemo(() => eyeFrame(side), [side]);
  const turn = eyeTurn(gazeYaw, gazePitch);
  const lids = eyeLids(side, anger, blink, turn.pitch);
  const r = EYE.radius;
  const lid = r * EYE.lid;
  const upper = Math.acos(lids.upper.height);
  const lower = Math.acos(lids.lower.height);
  const shine = !lidCovers(lids, HIGHLIGHT_AT);
  return (
    <group matrixAutoUpdate={false} matrix={frame}>
      <group rotation={turnEuler(turn)}>
        <mesh receiveShadow>
          <sphereGeometry args={[r, SEGMENTS.around, SEGMENTS.down]} />
          <meshToonMaterial color={EYE.colours.sclera} />
        </mesh>
        <mesh receiveShadow geometry={irisGeometry()} dispose={null}>
          <meshToonMaterial vertexColors />
        </mesh>
      </group>
      {shine ? <Catchlight sphere={r} spec={HIGHLIGHT} /> : null}
      <group rotation={[0, 0, lids.upper.roll]}>
        <mesh receiveShadow castShadow>
          <sphereGeometry
            args={[
              lid,
              SEGMENTS.around,
              SEGMENTS.down,
              0,
              2 * Math.PI,
              0,
              upper,
            ]}
          />
          <meshToonMaterial color={KAREN_SKIN} />
        </mesh>
      </group>
      <mesh receiveShadow>
        <sphereGeometry
          args={[
            lid * 0.995,
            SEGMENTS.around,
            SEGMENTS.down,
            0,
            2 * Math.PI,
            lower,
            Math.PI - lower,
          ]}
        />
        <meshToonMaterial color={KAREN_SKIN} />
      </mesh>
      <InkLine
        points={lidEdge(lids, "upper").map((p): Vec3 => [p.x, p.y, p.z])}
        radius={LASH_INK}
      />
      {blink < 0.95 ? (
        <InkLine
          points={lidEdge(lids, "lower").map((p): Vec3 => [p.x, p.y, p.z])}
          radius={LOWER_LID_INK}
        />
      ) : null}
    </group>
  );
};

const Brow: React.FC<{ readonly side: Side; readonly anger: number }> = ({
  side,
  anger,
}) => {
  const points = useMemo(
    () => browLine(side, anger).map(([x, y]) => onFace(x, y, BROW_INK.lift)),
    [side, anger],
  );
  return <InkLine points={points} radius={BROW_INK.radius} />;
};

const Wrinkles: React.FC<{ readonly anger: number }> = ({ anger }) => {
  const lines = useMemo(
    () =>
      wrinklesAt(anger).map((w) => ({
        name: w.name,
        radius: w.radius,
        points: w.points.map(([x, y]) => onFace(x, y, WRINKLE.lift)),
      })),
    [anger],
  );
  return (
    <>
      {lines.map((w) => (
        <InkLine key={w.name} points={w.points} radius={w.radius} />
      ))}
    </>
  );
};

const Nose: React.FC = () => {
  const { skin, hull } = potatoNose();
  return (
    <>
      <mesh geometry={skin} castShadow receiveShadow dispose={null}>
        <meshToonMaterial color={NOSE.colour} />
      </mesh>
      <mesh geometry={hull} dispose={null}>
        <InkHull grown={NOSE.ink} />
      </mesh>
    </>
  );
};

const Head: React.FC<{
  readonly pose: Pose;
  readonly hair: readonly HairPiece[];
  readonly mouthOpen: number;
  readonly browAnger: number;
}> = ({ pose, hair, mouthOpen, browAnger }) => {
  return (
    <group
      position={[0, K.neckHeight, 0]}
      rotation={headRotation(pose)}
      userData={ONE_UNIT}
    >
      <group position={HEAD_CENTER}>
        <HeadSkin open={mouthOpen} />
        <mesh position={HULL.center} scale={HULL.size}>
          <sphereGeometry args={[1, 48, 32]} />
          <InkHull />
        </mesh>
        {([1, -1] as const).map((side) => (
          <Eye
            key={side}
            side={side}
            gazeYaw={pose.gazeYaw}
            gazePitch={pose.gazePitch}
            blink={pose.blink}
            anger={browAnger}
          />
        ))}
        <Brow side={1} anger={browAnger} />
        <Brow side={-1} anger={browAnger} />
        <Wrinkles anger={browAnger} />
        <Nose />
        <Mouth open={mouthOpen} />
      </group>
      {([1, -1] as const).map((side) => (
        <Blob
          key={side}
          position={[
            side * K.jowl.center[0],
            K.jowl.center[1],
            K.jowl.center[2],
          ]}
          scale={K.jowl.size}
          color={KAREN_SKIN}
        />
      ))}
      <group userData={ONE_UNIT}>
        {hair.map((h, i) =>
          h.name === "scalp" ? (
            <mesh
              key={i}
              position={h.center}
              geometry={scalpGeometry()}
              scale={h.size}
              castShadow
              receiveShadow
              dispose={null}
            >
              <meshToonMaterial color={HAIR_SHADES[i]} />
            </mesh>
          ) : h.name === "cap" ? (
            <Blob
              key={i}
              position={h.center}
              rotation={h.rotation}
              scale={h.size}
              color={HAIR_SHADES[i]}
              outline={false}
            />
          ) : (
            <HairClump
              key={i}
              piece={h}
              rootSign={ROOT_SIGNS[i]}
              color={HAIR_SHADES[i]}
            />
          ),
        )}
      </group>
    </group>
  );
};

const Arm: React.FC<{
  readonly side: Side;
  readonly pose: ArmPose;
  readonly pointing: boolean;
}> = ({ side, pose, pointing }) => (
  <SkeletonArm
    skeleton={K}
    side={side}
    pose={pose}
    sleeve={KAREN_LILAC}
    hand={KAREN_SKIN}
    blend
  >
    {pointing ? (
      <group position={[0, -K.hand.offset - 0.04, 0.02]}>
        <Segment length={0.085} radius={0.019} color={KAREN_SKIN} />
      </group>
    ) : null}
  </SkeletonArm>
);

const Leg: React.FC<{ readonly side: Side; readonly pose: LegPose }> = ({
  side,
  pose,
}) => {
  const [x, y, z] = footCenter(K, side);
  return (
    <SkeletonLeg skeleton={K} side={side} pose={pose} color={KAREN_TROUSERS}>
      <group
        position={[x, y - K.shoe.drop, z]}
        rotation={[0, side * K.shoe.yaw, 0]}
      >
        <Blob scale={K.shoe.size} color={KAREN_SHOES} />
      </group>
    </SkeletonLeg>
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
  readonly windAt?: number | undefined;
}> = ({
  position,
  rotationY,
  pose,
  mouthOpen = 0,
  browAnger = 1,
  pointing = false,
  carrying,
  windAt,
}) => {
  const hair = windAt === undefined ? K.hair : hairAt(windAt, rotationY, pose);
  return (
    <Body
      position={position}
      rotationY={rotationY}
      pose={pose}
      hipHeight={K.hipHeight}
      Leg={Leg}
    >
      <group userData={ONE_UNIT}>
        <TorsoMesh skeleton={K} color={KAREN_LILAC} onBeforeCompile={paintBody} />
        <Arm side={1} pose={pose.leftArm} pointing={false} />
        <Arm side={-1} pose={pose.rightArm} pointing={pointing} />
      </group>
      {carrying}
      <Head
        pose={pose}
        hair={hair}
        mouthOpen={mouthOpen}
        browAnger={browAnger}
      />
    </Body>
  );
};
