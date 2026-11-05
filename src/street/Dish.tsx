import { DoubleSide, Quaternion, Vector3 } from "three";
import { SegmentBetween, ToonBox } from "../toon/primitives";
import { DISH, dishParts } from "./dishShape";

const METAL = "#9a9ea2";
const REFLECTOR = "#e8e8e4";
const LNB = "#3a3d40";
const CABLE = "#1f2022";
const UP = new Vector3(0, 1, 0);
const SPHERE = (DISH.diameter ** 2 / 4 + DISH.depth ** 2) / (2 * DISH.depth);
const CAP = Math.asin(DISH.diameter / 2 / SPHERE);

export const Dish: React.FC<{ readonly rail: number }> = ({ rail }) => {
  const parts = dishParts(rail);
  const sphereCentre = parts.centre.clone().addScaledVector(parts.face, SPHERE);
  const turn = new Quaternion().setFromUnitVectors(UP, parts.face.clone().negate());
  return (
    <>
      <SegmentBetween from={parts.mast.from} to={parts.mast.to} radius={DISH.mast} color={METAL} />
      <SegmentBetween from={parts.bracket.from} to={parts.bracket.to} radius={DISH.arm} color={METAL} />
      <SegmentBetween from={parts.arm.from} to={parts.arm.to} radius={DISH.arm} color={METAL} />
      <mesh position={sphereCentre} quaternion={turn}>
        <sphereGeometry args={[SPHERE, 32, 6, 0, Math.PI * 2, 0, CAP]} />
        <meshToonMaterial color={REFLECTOR} side={DoubleSide} />
      </mesh>
      <ToonBox position={parts.lnb.toArray()} size={[0.05, 0.05, 0.08]} color={LNB} />
      {parts.cable.slice(1).map((to, k) => (
        <SegmentBetween key={k} from={parts.cable[k]} to={to} radius={DISH.cable} color={CABLE} />
      ))}
    </>
  );
};
