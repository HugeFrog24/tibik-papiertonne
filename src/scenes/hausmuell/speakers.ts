import { mouthInWorld, onScreen } from "../../dialogue/screen";
import { KAREN_SKELETON } from "../../Karen/rig";
import { RIG } from "../../Tibik/rig";
import { cameraAt } from "./cameras";
import { solveHausmuell } from "./solve";

export type Speaker = "tibik" | "karen";
export { FRAME_SIZE } from "../../dialogue/screen";

export const mouthOnScreen = (
  t: number,
  speaker: Speaker,
): [number, number] => {
  const state = solveHausmuell(t);
  const mouth =
    speaker === "tibik"
      ? mouthInWorld(RIG, state.tibik)
      : mouthInWorld(KAREN_SKELETON, state.karen);
  return onScreen(mouth, cameraAt(t));
};
