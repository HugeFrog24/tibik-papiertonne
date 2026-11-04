import { loadFont as loadBangers } from "@remotion/google-fonts/Bangers";
import { loadFont as loadComicNeue } from "@remotion/google-fonts/ComicNeue";

export const { fontFamily: SHOUT_FONT } = loadBangers("normal", {
  weights: ["400"],
  subsets: ["latin"],
});
export const { fontFamily: CALM_FONT } = loadComicNeue("normal", {
  weights: ["700"],
  subsets: ["latin"],
});
