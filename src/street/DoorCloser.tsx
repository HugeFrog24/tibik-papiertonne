import { useMemo } from "react";
import { Vector3 } from "three";
import { doorFrame } from "../building/doors";
import { ToonBox, alongSegment } from "../toon/primitives";
import { HAUSTUER, HAUSTUER_CLOSER, closerArm } from "./facade";

const SILVER = "#b9bcbf";
const DARK = "#55595d";
const Z = new Vector3(0, 0, 1);

const Rod: React.FC<{
  readonly from: Vector3;
  readonly to: Vector3;
  readonly thickness: number;
}> = ({ from, to, thickness }) => {
  const { length, turn } = alongSegment(Z, from, to);
  const middle = from.clone().add(to).multiplyScalar(0.5);
  return (
    <group position={middle} quaternion={turn}>
      <ToonBox size={[thickness, thickness, length]} color={DARK} />
    </group>
  );
};

export const DoorCloser: React.FC<{ readonly angle: number }> = ({ angle }) => {
  const { body, rail } = HAUSTUER_CLOSER;
  const { spindle, slider } = closerArm(angle);
  const leaf = useMemo(() => doorFrame(HAUSTUER, angle), [angle]);
  return (
    <>
      <ToonBox position={body.center} size={body.size} color={SILVER} />
      <Rod
        from={spindle.clone().setY(body.center[1])}
        to={spindle}
        thickness={0.018}
      />
      <Rod from={spindle} to={slider} thickness={0.016} />
      <group matrixAutoUpdate={false} matrix={leaf}>
        <ToonBox
          position={[(rail.from + rail.to) / 2, rail.y, rail.depth]}
          size={[rail.to - rail.from + 0.06, rail.size, rail.size]}
          color={SILVER}
        />
      </group>
    </>
  );
};
