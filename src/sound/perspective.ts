import { Vector3 } from "three";

export const heardFrom = (distance: number, reference: number) => Math.min(1, reference / distance);

export const distanceBetween = (source: readonly number[], listener: readonly number[]) =>
  new Vector3().fromArray(source).distanceTo(new Vector3().fromArray(listener));

export const heardAt = (source: readonly number[], listener: readonly number[], reference: number) =>
  heardFrom(distanceBetween(source, listener), reference);
