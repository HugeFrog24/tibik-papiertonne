import { collide, smallestClearing } from "../physics/collision";
import { lazy } from "../physics/lazy";
import { OUTLINE } from "../toon/primitives";
import { BINS, STREET_SOLIDS, type BinSpec } from "./layout";
import { restingLid } from "./lids";
import { tonneLidParts } from "./tonneShape";

export const guardLid = (bin: BinSpec, authored: number, margin = 0) => {
  const hits = (angle: number) => {
    const parts = tonneLidParts(bin.name, bin.position, angle, margin);
    return Math.max(
      0,
      ...parts.flatMap((part) =>
        STREET_SOLIDS.map((s) => collide(part, s)?.depth ?? 0),
      ),
    );
  };
  if (hits(authored) <= 0) {
    return authored;
  }
  return (
    authored - smallestClearing((back) => hits(authored - back), authored, 0.02)
  );
};

export const restingLids = lazy((): readonly number[] =>
  BINS.map((bin) => guardLid(bin, restingLid(bin, bin.lid), OUTLINE)),
);
