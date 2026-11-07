import { Color, type WebGLRenderer } from "three";

export const withClearColor = (gl: WebGLRenderer, colour: Color, alpha: number, draw: () => void) => {
  const [before, beforeAlpha] = [gl.getClearColor(new Color()), gl.getClearAlpha()];
  gl.setClearColor(colour, alpha);
  draw();
  gl.setClearColor(before, beforeAlpha);
};

export const withShadowsKept = (gl: WebGLRenderer, draw: () => void) => {
  const auto = gl.shadowMap.autoUpdate;
  gl.shadowMap.autoUpdate = false;
  draw();
  gl.shadowMap.autoUpdate = auto;
};
