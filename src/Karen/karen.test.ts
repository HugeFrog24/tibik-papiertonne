import { describe, expect, test } from "vitest";
import { Euler, Matrix4, Quaternion, Vector3 } from "three";
import { legLength, restAnkle, solveLeg } from "../characters/legs";
import {
  armIntoTorso,
  bodyColliders,
  boxIntoTorso,
  footCapsule,
  footCenter,
  headRotation,
  hipPosition,
  legFrames,
  torsoMatrix,
  type ArmName,
  type ArmPose,
  type Pose,
  type Side,
} from "../characters/skeleton";
import { contacts, deepest, frame, halfSpace, obb } from "../physics/collision";
import { guardGround } from "../physics/guards";
import { OUTLINE, type Vec3 } from "../toon/primitives";
import { LIP_INK, mouthShape } from "./face";
import {
  INK_WIDTH,
  KAREN_ARM_HIPS,
  KAREN_ARM_POINT,
  KAREN_ARM_REST,
  KAREN_HEAD_LIMITS,
  KAREN_POINTING,
  KAREN_REST,
  KAREN_RUN_SWING,
  KAREN_SKELETON as K,
  karenRunArm,
  limitKarenHead,
} from "./rig";

const TOLERANCE = 0.005;
const ARMS: ArmName[] = ["leftArm", "rightArm"];

const placed = (pose: Pose) => ({ position: [0, 0, 0] as Vec3, rotationY: 0, pose });
const withArms = (left: ArmPose, right: ArmPose = left): Pose => ({ ...KAREN_REST, leftArm: left, rightArm: right });

const describeArms = (pose: Pose) =>
  ARMS.map((arm) => ({ arm, depth: armIntoTorso(K, pose, arm) }));
const sinking = (pose: Pose) => describeArms(pose).filter((a) => a.depth > TOLERANCE);

describe("her arms never sink into her own torso", () => {
  test("hanging at her sides", () => {
    expect(sinking(KAREN_REST)).toEqual([]);
  });

  test("...hugging it: tucked in any closer, they would sink in", () => {
    const tucked = { ...KAREN_ARM_REST, out: KAREN_ARM_REST.out - 0.05 };
    for (const { depth } of describeArms(withArms(tucked))) {
      expect(depth).toBeGreaterThan(TOLERANCE);
    }
  });

  test("running, across the whole pumping swing", () => {
    const problems: string[] = [];
    for (let swing = -KAREN_RUN_SWING; swing <= KAREN_RUN_SWING + 1e-9; swing += 0.05) {
      const pose = withArms(karenRunArm(swing), karenRunArm(-swing));
      problems.push(...sinking(pose).map((a) => `swing ${swing.toFixed(2)}: ${a.arm} ${(a.depth * 1000).toFixed(1)} mm`));
    }
    expect(problems).toEqual([]);
  });

  test("fists on her hips, resting on the sides of her body", () => {
    expect(sinking(withArms(KAREN_ARM_HIPS))).toEqual([]);
    const tucked = { ...KAREN_ARM_HIPS, out: KAREN_ARM_HIPS.out - 0.05 };
    for (const { depth } of describeArms(withArms(tucked))) {
      expect(depth).toBeGreaterThan(TOLERANCE);
    }
  });

  test("pointing forward", () => {
    expect(sinking(withArms(KAREN_ARM_POINT))).toEqual([]);
  });

  test("yelling: one fist on her hip, pointing with the other arm", () => {
    expect(sinking(KAREN_POINTING)).toEqual([]);
  });
});

const ellipsoidPoints = (matrix: Matrix4, front = false) => {
  const points: Vector3[] = [];
  for (let i = 0; i <= 8; i++) {
    for (let j = 0; j < 16; j++) {
      const polar = (i / 8) * Math.PI;
      const around = (j / 16) * Math.PI * 2;
      const u = new Vector3(Math.sin(polar) * Math.cos(around), Math.cos(polar), Math.sin(polar) * Math.sin(around));
      if (!front || u.z >= 0) {
        points.push(u.applyMatrix4(matrix));
      }
    }
  }
  return points;
};

const ellipsoid = (parent: Matrix4, center: Vec3, size: Vec3, rotation?: Euler) =>
  frame(parent, center, rotation).multiply(new Matrix4().makeScale(...size));

const pointIntoTorso = (pose: Pose, p: Vector3) =>
  boxIntoTorso(K, placed(pose), obb("point", new Matrix4().makeTranslation(p.x, p.y, p.z), [0, 0, 0]));

const headParts = (pose: Pose) => {
  const head = frame(torsoMatrix(K, placed(pose)), [0, K.neckHeight, 0], headRotation(pose));
  const [jx, jy, jz] = K.jowl.center;
  return [
    { name: "face", points: ellipsoidPoints(ellipsoid(head, K.headCenter, K.headSize), true) },
    { name: "left jowl", points: ellipsoidPoints(ellipsoid(head, [jx, jy, jz], K.jowl.size)) },
    { name: "right jowl", points: ellipsoidPoints(ellipsoid(head, [-jx, jy, jz], K.jowl.size)) },
    ...K.hair
      .filter((h) => h.name !== "cap")
      .map((h) => ({
        name: `hair ${h.name}`,
        points: ellipsoidPoints(ellipsoid(head, h.center, h.size, new Euler(...h.rotation))),
      })),
  ];
};

const headProblems = (pose: Pose, label: string) =>
  headParts(pose).flatMap(({ name, points }) => {
    const depth = Math.max(...points.map((p) => pointIntoTorso(pose, p)));
    return depth > TOLERANCE ? [`${label}: ${name} ${(depth * 1000).toFixed(1)} mm into her body`] : [];
  });

describe("her head rests on her body without sinking into it", () => {
  test("standing and yelling", () => {
    expect([...headProblems(KAREN_REST, "rest"), ...headProblems(KAREN_POINTING, "pointing")]).toEqual([]);
  });

  test("turning, tilting and nodding as far as limitKarenHead allows", { timeout: 60_000 }, () => {
    const problems: string[] = [];
    for (const yaw of [-1, 0, 1]) {
      for (const pitch of [-1, 0, 1]) {
        for (const roll of [-1, 0, 1]) {
          const wanted = { ...KAREN_REST, headYaw: yaw * 0.8, headPitch: pitch * 0.5, headRoll: roll * 0.8 };
          const pose = limitKarenHead(wanted);
          problems.push(...headProblems(pose, `yaw ${pose.headYaw.toFixed(3)} pitch ${pose.headPitch.toFixed(3)} roll ${pose.headRoll.toFixed(3)}`));
        }
      }
    }
    expect(problems).toEqual([]);
  });

  test("limitKarenHead leaves poses within the limits alone", () => {
    const pose = { ...KAREN_REST, headYaw: 0.1, headPitch: 0.02, headRoll: -0.05 };
    expect(limitKarenHead(pose)).toEqual(pose);
    expect(limitKarenHead(KAREN_POINTING)).toEqual(KAREN_POINTING);
  });

  test("her jowls stay behind the face around the mouth, even yelling", () => {
    const [a, b, c] = K.headSize;
    const face = (x: number, y: number) => c * Math.sqrt(Math.max(0, 1 - (x / a) ** 2 - (y / b) ** 2));
    const jowls = [1, -1].map((side) => ({
      x: side * K.jowl.center[0] - K.headCenter[0],
      y: K.jowl.center[1] - K.headCenter[1],
      z: K.jowl.center[2] - K.headCenter[2],
    }));
    const [sx, sy, sz] = K.jowl.size;
    const clearance = LIP_INK.radius - LIP_INK.lift + 0.002;
    const problems: string[] = [];
    for (const open of [0, 0.25, 0.5, 0.75, 1]) {
      for (const [x, y] of Object.values(mouthShape(open)).flat()) {
        for (const j of jowls) {
          const q = 1 - ((x - j.x) / sx) ** 2 - ((y - j.y) / sy) ** 2;
          const gap = q > 0 ? face(x, y) - (j.z + sz * Math.sqrt(q)) : Infinity;
          if (gap < clearance) {
            problems.push(`open ${open}: jowl ${(gap * 1000).toFixed(1)} mm behind the face at (${x.toFixed(3)}, ${y.toFixed(3)})`);
          }
        }
      }
    }
    expect(problems).toEqual([]);
  });

  test("the limits are tight: turning or nodding further would push her chin into her chest", () => {
    const { yaw, pitchDown } = KAREN_HEAD_LIMITS;
    expect(headProblems({ ...KAREN_REST, headYaw: yaw + 0.15 }, "turned")).not.toEqual([]);
    expect(headProblems({ ...KAREN_REST, headPitch: pitchDown + 0.1 }, "nodding")).not.toEqual([]);
  });
});

const GROUND = halfSpace("ground", new Vector3(0, 1, 0), 0);

const striding = (pose: Pose, reach: number): Pose => {
  const sides = [1, -1] as const;
  const ankles = sides.map((side) => restAnkle(K, side).add(new Vector3(0, 0, side * reach)));
  const drop = Math.max(
    ...sides.map((side, i) => {
      const hip = new Vector3(...hipPosition(K, side));
      const across = Math.hypot(ankles[i].x - hip.x, ankles[i].z - hip.z);
      return hip.y - ankles[i].y - Math.sqrt(legLength(K) ** 2 - across ** 2);
    }),
  );
  const legs = sides.map((side, i) => solveLeg(K, side, ankles[i].clone().setY(ankles[i].y + drop), new Quaternion()));
  return { ...pose, bob: -drop, leftLeg: legs[0], rightLeg: legs[1] };
};

describe("she stands on the ground", () => {
  test("feet touch the ground without sinking into it", () => {
    const { legs } = bodyColliders(K, placed(KAREN_REST));
    expect(deepest(contacts(legs, [GROUND]))).toBeLessThanOrEqual(0.001);
    const lowest = Math.min(...legs.map((s) => s.center.y - s.radius));
    expect(lowest).toBeCloseTo(0, 3);
  });

  test("mid-stride, her feet stay flat on the ground: the ground guard has nothing to lift", () => {
    for (let reach = -0.25; reach <= 0.25 + 1e-9; reach += 0.05) {
      const pose = striding(KAREN_REST, reach);
      const guarded = guardGround({ skeleton: K, ...placed(pose) }, GROUND);
      expect(guarded.pose.bob).toBeCloseTo(pose.bob, 3);
      const { legs } = bodyColliders(K, placed(pose));
      expect(deepest(contacts(legs, [GROUND]))).toBeLessThanOrEqual(0.001);
      expect(Math.min(...legs.map((s) => s.center.y - s.radius))).toBeCloseTo(0, 3);
    }
  });

  const ankleFrame = (side: Side) => legFrames(K, new Matrix4(), side === 1 ? KAREN_REST.leftLeg : KAREN_REST.rightLeg, side).ankle;
  const shoeFrame = (side: Side) => {
    const [x, y, z] = footCenter(K, side);
    return frame(ankleFrame(side), [x, y - K.shoe.drop, z], new Euler(0, side * K.shoe.yaw, 0));
  };

  test("the shoe drawn on screen fits inside the foot's collider", () => {
    for (const side of [1, -1] as const) {
      const toAnkle = ankleFrame(side).invert();
      const { heel, toe, radius } = footCapsule(K, side);
      for (const p of ellipsoidPoints(shoeFrame(side).multiply(new Matrix4().makeScale(...K.shoe.size)))) {
        const local = p.clone().applyMatrix4(toAnkle);
        const along = Math.max(heel[2], Math.min(toe[2], local.z));
        expect(local.distanceTo(new Vector3(heel[0], heel[1], along))).toBeLessThanOrEqual(radius + 0.002);
      }
    }
  });

  test("standing, the shoes are level and turned out", () => {
    for (const side of [1, -1] as const) {
      const forward = new Vector3(0, 0, 1).transformDirection(shoeFrame(side));
      expect(forward.y).toBeCloseTo(0, 6);
      expect(Math.atan2(forward.x, forward.z)).toBeCloseTo(side * K.shoe.yaw, 6);
    }
  });

  test("the outlines of the shoes and trouser cuffs rest on the ground, not below it", () => {
    expect(INK_WIDTH).toBe(OUTLINE);
    for (const side of [1, -1] as const) {
      const shoe = new Vector3().setFromMatrixPosition(shoeFrame(side));
      expect(shoe.y - K.shoe.size[1] - INK_WIDTH).toBeCloseTo(0, 4);
      const cuff = new Vector3().setFromMatrixPosition(ankleFrame(side));
      expect(cuff.y - K.shin.radius - INK_WIDTH).toBeGreaterThanOrEqual(0);
    }
  });
});

describe("her limbs stay out of each other's way", () => {
  const poses: [string, Pose][] = [
    ["rest", KAREN_REST],
    ["hands on hips", withArms(KAREN_ARM_HIPS)],
    ["pointing", KAREN_POINTING],
    ...[-KAREN_RUN_SWING, 0, KAREN_RUN_SWING].map((s): [string, Pose] => [
      `running ${s}`,
      striding({ ...withArms(karenRunArm(s), karenRunArm(-s)), lean: 0.12 }, -0.2 * Math.sign(s)),
    ]),
  ];

  test.each(poses)("%s: arms clear of her legs and head", (_, pose) => {
    const body = bodyColliders(K, placed(pose));
    for (const arm of [body.leftArm, body.rightArm]) {
      expect(deepest(contacts(arm, [...body.legs, ...body.head]))).toBeLessThanOrEqual(TOLERANCE);
    }
  });
});

test("proportions follow the sketch: ~1.62 m tall, a top much wider than tall", () => {
  const { head } = bodyColliders(K, placed(KAREN_REST));
  const top = Math.max(...head.map((s) => s.center.y + s.radius));
  expect(top).toBeGreaterThan(1.58);
  expect(top).toBeLessThan(1.66);
  const width = 2 * Math.max(...K.torso.profile.map(([r]) => r));
  expect(width).toBeGreaterThan(0.95);
  expect(width).toBeLessThan(1.15);
  const hem = 0.045;
  const height = Math.max(...K.torso.profile.map(([, y]) => y)) - hem;
  expect(width / height).toBeGreaterThan(1.2);
});
