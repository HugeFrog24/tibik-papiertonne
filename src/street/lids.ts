import { contacts, deepest, smallestClearing } from "../physics/collision";
import { binItemColliders, type BinSpec } from "./layout";
import { tonneLid } from "./tonneShape";

export const restingLid = (bin: BinSpec, upTo: number) => {
  const items = binItemColliders(bin);
  if (items.length === 0) {
    return 0;
  }
  const pressing = (angle: number) => deepest(contacts([tonneLid(bin.name, bin.position, angle)], items));
  return Math.min(upTo, smallestClearing(pressing, upTo, 0.01));
};
