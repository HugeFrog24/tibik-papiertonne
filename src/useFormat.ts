import { useVideoConfig } from "remotion";
import { formatOf, type Format } from "./frameRate";

export const useFormat = (): Format => formatOf(useVideoConfig());
