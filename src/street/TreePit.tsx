import { random } from "remotion";
import { DECAL, drawnTexture, speckle } from "../toon/primitives";
import { Decal, PAVEMENT_DECAL_Y } from "./Drains";
import { TREE_PIT, treePit } from "./layout";

const PX_PER_M = 128;
const EDGE = 0.08;
const STONE = 1.0;
const SOIL = [92, 72, 52];

const pitTexture = () =>
  drawnTexture(
    "tree-pit",
    Math.round(TREE_PIT.along * PX_PER_M),
    Math.round(TREE_PIT.across * PX_PER_M),
    (ctx, w, h) => {
      const edge = EDGE * PX_PER_M;
      ctx.fillStyle = "#b8b4ab";
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = "#8f8b83";
      for (let x = STONE * PX_PER_M; x < w; x += STONE * PX_PER_M) {
        ctx.fillRect(x, 0, 1, edge);
        ctx.fillRect(x, h - edge, 1, edge);
      }
      ctx.fillStyle = `rgb(${SOIL.join(",")})`;
      ctx.fillRect(edge, edge, w - 2 * edge, h - 2 * edge);
      ctx.save();
      ctx.beginPath();
      ctx.rect(edge, edge, w - 2 * edge, h - 2 * edge);
      ctx.clip();
      speckle(ctx, w, h, {
        seed: "tree-pit-soil",
        count: Math.round((w * h) / 10),
        base: SOIL,
        lightShare: 0.4,
        light: [6, 18],
        dark: [8, 20],
      });
      for (let i = 0; i < 26; i++) {
        const x = edge + random(`pit-leaf-x-${i}`) * (w - 2 * edge);
        const y = edge + random(`pit-leaf-y-${i}`) * (h - 2 * edge);
        ctx.fillStyle = random(`pit-leaf-c-${i}`) < 0.5 ? "#b8893c" : "#9a6f33";
        ctx.beginPath();
        ctx.ellipse(
          x,
          y,
          3,
          1.6,
          random(`pit-leaf-a-${i}`) * Math.PI,
          0,
          2 * Math.PI,
        );
        ctx.fill();
      }
      for (let i = 0; i < 9; i++) {
        const x = edge + random(`pit-weed-x-${i}`) * (w - 2 * edge);
        const y = edge + random(`pit-weed-y-${i}`) * (h - 2 * edge);
        ctx.fillStyle = "#5f7d3a";
        for (let j = 0; j < 5; j++)
          ctx.fillRect(
            x + (random(`pit-weed-${i}-${j}-x`) - 0.5) * 8,
            y + (random(`pit-weed-${i}-${j}-y`) - 0.5) * 8,
            2,
            2,
          );
      }
      ctx.restore();
    },
  );

export const TreePit: React.FC<{ readonly x: number }> = ({ x }) => {
  const {
    x: [x0, x1],
    z: [z0, z1],
  } = treePit(x);
  return (
    <Decal x={(x0 + x1) / 2} y={PAVEMENT_DECAL_Y} z={(z0 + z1) / 2}>
      <planeGeometry args={[x1 - x0, z1 - z0]} />
      <meshToonMaterial map={pitTexture()} {...DECAL} />
    </Decal>
  );
};
