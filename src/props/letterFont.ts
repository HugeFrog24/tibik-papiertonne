import { loadFont } from "@remotion/google-fonts/Arimo";
import { useEffect, useState } from "react";
import { continueRender, delayRender } from "remotion";
import { drawnTexture } from "../toon/primitives";

const { fontFamily, waitUntilDone } = loadFont("normal", {
  weights: ["400", "700"],
  subsets: ["latin"],
});

export const LETTER_FAMILY = fontFamily;

let ready = false;
const loaded = waitUntilDone().then(() => {
  ready = true;
});

export const useLetterFont = () => {
  const [done, setDone] = useState(ready);
  useEffect(() => {
    if (done) return;
    const handle = delayRender("letter font");
    void loaded.then(() => {
      setDone(true);
      continueRender(handle);
    });
  }, [done]);
  return done;
};

export const useLetterTexture = (
  key: string,
  width: number,
  height: number,
  draw: Parameters<typeof drawnTexture>[3],
) => {
  const done = useLetterFont();
  return done ? drawnTexture(key, width, height, draw) : null;
};
