import type { Format } from "./frameRate";

export const TALL_SUFFIX = "-9x16";

export const compositionId = (name: string, format: Format) => (format === "tall" ? `${name}${TALL_SUFFIX}` : name);
