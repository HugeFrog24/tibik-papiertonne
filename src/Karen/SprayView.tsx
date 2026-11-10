import type { Vector3 } from "three";
import { NO_INK } from "../toon/inkWidth";
import { Blob, SegmentBetween } from "../toon/primitives";
import type { SprayFrame } from "./spray";
import { DROP, bodyOf } from "./sprayLook";
import { WetSpot } from "./WetSpot";

const DROP_LOOK = {
  color: DROP.colour,
  ink: DROP.ink,
  castShadow: false,
  userData: NO_INK,
};

const Streak: React.FC<{
  readonly head: Vector3;
  readonly tail: Vector3;
  readonly radius: number;
}> = ({ head, tail, radius }) => (
  <SegmentBetween
    from={head}
    to={tail}
    radius={bodyOf(radius)}
    detail={[4, 8]}
    {...DROP_LOOK}
  />
);

const Bead: React.FC<{ readonly at: Vector3; readonly radius: number }> = ({
  at,
  radius,
}) => (
  <Blob position={at} scale={bodyOf(radius)} detail={[12, 8]} {...DROP_LOOK} />
);

export const SprayView: React.FC<{ readonly frame: SprayFrame }> = ({
  frame,
}) => (
  <>
    {frame.drops.map((d) => (
      <Streak key={d.id} head={d.head} tail={d.tail} radius={d.radius} />
    ))}
    {frame.spittle.map((s) => (
      <group key={s.id}>
        <Streak head={s.to} tail={s.from} radius={s.radius} />
        <Bead at={s.to} radius={s.bead} />
      </group>
    ))}
    {frame.spots.map((s) => (
      <WetSpot
        key={s.id}
        point={s.point}
        normal={s.normal}
        radius={s.radius}
        opacity={s.opacity}
      />
    ))}
  </>
);
