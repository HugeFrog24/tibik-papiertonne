import { Vector3 } from "three";
import { BALCONY } from "./building";

export const ASTRA = { azimuth: 168, elevation: 30 };

export const DISH = {
  diameter: 0.6,
  depth: 0.05,
  offset: 25,
  x: -0.8,
  mast: 0.024,
  clampBelow: 0.35,
  above: 0.45,
  bracket: 0.07,
  focal: 0.45,
  arm: 0.012,
  cable: 0.0035,
  gap: 0.003,
};

const radians = (degrees: number) => (degrees * Math.PI) / 180;

export const skyDirection = (azimuth: number, elevation: number) =>
  new Vector3(
    Math.sin(radians(azimuth)) * Math.cos(radians(elevation)),
    Math.sin(radians(elevation)),
    -Math.cos(radians(azimuth)) * Math.cos(radians(elevation)),
  );

export const dishParts = (rail: number) => {
  const [, , d] = BALCONY.slab;
  const z = d - BALCONY.bar - DISH.mast - 0.002;
  const mast = {
    from: new Vector3(DISH.x, rail - DISH.clampBelow, z),
    to: new Vector3(DISH.x, rail + DISH.above, z),
  };
  const beam = skyDirection(ASTRA.azimuth, ASTRA.elevation);
  const face = skyDirection(ASTRA.azimuth, ASTRA.elevation - DISH.offset);
  const centre = mast.to.clone().addScaledVector(face, DISH.bracket);
  const incoming = beam.clone().negate();
  const reflected = incoming.clone().addScaledVector(face, -2 * incoming.dot(face));
  const lnb = centre.clone().addScaledVector(reflected, DISH.focal);
  const side = new Vector3(0, 1, 0).cross(face).normalize();
  const up = face.clone().cross(side).normalize();
  const rimAt = (angle: number) =>
    centre
      .clone()
      .addScaledVector(face, DISH.depth)
      .addScaledVector(side, (DISH.diameter / 2) * Math.cos(angle))
      .addScaledVector(up, (DISH.diameter / 2) * Math.sin(angle));
  const back = (p: Vector3) => p.clone().addScaledVector(face, -DISH.arm);
  const armFrom = back(rimAt(-Math.PI / 2));
  const besideMast = DISH.x + DISH.mast + DISH.cable;
  const cable = [
    lnb.clone().add(new Vector3(0, -(0.025 + DISH.cable), 0)),
    armFrom.clone().add(new Vector3(0, -(DISH.arm + DISH.cable), 0)),
    new Vector3(besideMast, armFrom.y - DISH.arm - DISH.cable, z),
    new Vector3(besideMast, mast.from.y, z),
  ];
  return {
    mast,
    beam,
    face,
    centre,
    lnb,
    rimAt,
    bracket: { from: mast.to.clone(), to: back(centre).addScaledVector(face, -DISH.gap) },
    arm: { from: armFrom, to: lnb },
    cable,
  };
};
