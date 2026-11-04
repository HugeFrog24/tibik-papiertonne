import { expect, test } from "vitest";
import { CAPTION } from "../scenes/rundschreiben/cameras";
import { textWidth, typeOf } from "./bubbleText";
import { CAPTION_BOX } from "./Caption";

test("the caption says Zwei Wochen später. for three seconds and fits its box", () => {
  expect(CAPTION.text).toBe("Zwei Wochen später.");
  expect(CAPTION.to - CAPTION.from).toBe(3);
  const { font, spacing } = typeOf("calm");
  const inner = CAPTION_BOX.width - 2 * (CAPTION_BOX.padding + CAPTION_BOX.border);
  expect(textWidth(CAPTION.text, font, CAPTION_BOX.size, spacing)).toBeLessThanOrEqual(inner);
  expect(CAPTION_BOX.size).toBeGreaterThanOrEqual(46);
});
