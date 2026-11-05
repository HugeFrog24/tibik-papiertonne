import { DataTexture, NearestFilter, RedFormat, UnsignedByteType } from "three";
import { lazy } from "../physics/lazy";

export const PAPER_LEVELS = [0.62, 0.72, 0.8, 0.87, 0.93, 1] as const;

export const paperRamp = lazy(() => {
  const ramp = new DataTexture(
    Uint8Array.from(PAPER_LEVELS, (v) => Math.round(v * 255)),
    PAPER_LEVELS.length,
    1,
    RedFormat,
    UnsignedByteType,
  );
  ramp.minFilter = NearestFilter;
  ramp.magFilter = NearestFilter;
  ramp.generateMipmaps = false;
  ramp.needsUpdate = true;
  return ramp;
});
