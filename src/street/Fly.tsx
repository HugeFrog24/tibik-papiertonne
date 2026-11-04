import { DoubleSide, Vector3 } from "three";
import { NO_INK } from "../toon/inkWidth";
import {
  alongSegment,
  drawnTexture,
  euler,
  type Vec3,
} from "../toon/primitives";
import { FLY } from "./flyShape";

const { head, thorax, abdomen, wing, legs, colours } = FLY;

const stripes = () =>
  drawnTexture("fly-thorax", 64, 32, (ctx, w, h) => {
    ctx.fillStyle = colours.thorax;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = colours.stripes;
    for (let i = 0; i < 8; i++) ctx.fillRect((i + 0.3) * (w / 8), 0, w / 20, h);
  });

const patches = () =>
  drawnTexture("fly-abdomen", 64, 32, (ctx, w, h) => {
    ctx.fillStyle = colours.abdomen;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = colours.patches;
    for (let i = 0; i < 4; i++) {
      ctx.fillRect(i * (w / 4), 0, w / 40, h);
      for (let j = 0; j < 3; j++)
        ctx.fillRect(i * (w / 4) + w / 12, (j + 0.2) * (h / 3), w / 10, h / 7);
    }
  });

const blur = () =>
  drawnTexture("fly-wing", 64, 64, (ctx, w, h) => {
    const glow = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    glow.addColorStop(0, "rgba(255,255,255,0.95)");
    glow.addColorStop(0.6, "rgba(255,255,255,0.55)");
    glow.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, h);
  });

const ALONG = euler(Math.PI / 2, 0, 0, "XYZ");
const UP = new Vector3(0, 1, 0);

const Ellipsoid: React.FC<{
  readonly at: Vec3;
  readonly size: Vec3;
  readonly color: string;
  readonly map?: () => ReturnType<typeof drawnTexture>;
}> = ({ at, size, color, map }) => (
  <mesh
    position={at}
    rotation={ALONG}
    scale={[size[0] / 2, size[2] / 2, size[1] / 2]}
  >
    <sphereGeometry args={[1, 16, 12]} />
    <meshToonMaterial color={map ? "#ffffff" : color} map={map?.()} />
  </mesh>
);

const Leg: React.FC<{
  readonly hip: Vector3;
  readonly knee: Vector3;
  readonly foot: Vector3;
}> = ({ hip, knee, foot }) => (
  <>
    {[
      [hip, knee],
      [knee, foot],
    ].map(([from, to], i) => {
      const { length, turn } = alongSegment(UP, from, to);
      const middle = from.clone().add(to).multiplyScalar(0.5);
      return (
        <mesh key={i} position={middle} quaternion={turn}>
          <cylinderGeometry
            args={[legs.radius, legs.radius * 0.8, length, 5]}
          />
          <meshToonMaterial color={colours.legs} />
        </mesh>
      );
    })}
  </>
);

const LEG_ROOTS = [thorax.length * 0.3, 0, -thorax.length * 0.3];

const legsOf = (side: 1 | -1) =>
  LEG_ROOTS.map((z, k) => {
    const hip = new Vector3(
      side * thorax.width * 0.25,
      -thorax.height * 0.4,
      z,
    );
    const knee = hip
      .clone()
      .add(
        new Vector3(side * 0.35, -0.8, -0.45 - 0.1 * k)
          .normalize()
          .multiplyScalar(legs.upper),
      );
    const foot = knee
      .clone()
      .add(
        new Vector3(side * 0.1, -0.3, -0.95)
          .normalize()
          .multiplyScalar(legs.lower),
      );
    return { hip, knee, foot };
  });

const WingBlur: React.FC<{ readonly side: 1 | -1 }> = ({ side }) => (
  <mesh
    position={[0, thorax.height * 0.45, 0]}
    rotation={euler(-Math.PI / 2, 0, Math.PI + side * wing.spread, "XYZ")}
  >
    <circleGeometry
      args={[wing.length, 16, -wing.spread / 2, wing.spread * 1.6]}
    />
    <meshBasicMaterial
      color={colours.wing}
      map={blur()}
      transparent
      opacity={FLY.wingOpacity}
      side={DoubleSide}
      depthWrite={false}
    />
  </mesh>
);

export const Fly: React.FC<{
  readonly position: Vec3;
  readonly heading: number;
  readonly climb: number;
}> = ({ position, heading, climb }) => {
  const front = thorax.length / 2;
  return (
    <group
      position={position}
      rotation={euler(-climb, heading, 0, "YXZ")}
      userData={NO_INK}
    >
      <Ellipsoid
        at={[0, 0, 0]}
        size={[thorax.width, thorax.height, thorax.length]}
        color={colours.thorax}
        map={stripes}
      />
      <Ellipsoid
        at={[0, -thorax.height * 0.1, -front - abdomen.length / 2]}
        size={[abdomen.width, abdomen.height, abdomen.length]}
        color={colours.abdomen}
        map={patches}
      />
      <Ellipsoid
        at={[0, 0, front + head.length / 2]}
        size={[head.width * 0.6, head.width * 0.7, head.length]}
        color={colours.face}
      />
      {[1, -1].map((side) => (
        <Ellipsoid
          key={side}
          at={[
            side * (head.width / 2 - head.eye / 2),
            head.eye * 0.2,
            front + head.length * 0.45,
          ]}
          size={[head.eye, head.eye * 1.3, head.eye * 1.1]}
          color={colours.eyes}
        />
      ))}
      {([1, -1] as const).flatMap((side) =>
        legsOf(side).map((leg, k) => <Leg key={`${side}${k}`} {...leg} />),
      )}
      <WingBlur side={1} />
      <WingBlur side={-1} />
    </group>
  );
};
