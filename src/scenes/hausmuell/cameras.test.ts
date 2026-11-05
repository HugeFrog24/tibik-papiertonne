import { expect, test } from "vitest";
import { fixed, type Shot } from "./cameras";

test("a fixed shot holds one camera for its whole length", () => {
  const at: Shot["at"] = fixed([1, 2, 3], [4, 5, 6], 45);
  for (const t of [0, 1.5, 30]) expect(at(t)).toEqual({ position: [1, 2, 3], target: [4, 5, 6], fov: 45 });
});
