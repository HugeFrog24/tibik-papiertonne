import { test } from "vitest";
import { writeFileSync } from "node:fs";
import { SPOKEN } from "./scenes/spokenLines";
import { clockOf } from "./scenes/clocks";
import { englishEdition } from "./dialogue/edition";
import { chunksOf } from "./dialogue/subtitles";
test("en", () => {
  const rows: string[] = [];
  for (const { key, lines } of SPOKEN) {
    const ed = englishEdition(key, lines, clockOf(key, "en"));
    for (const l of [...lines].sort((a, b) => a.from - b.from)) {
      const { line } = ed.get(l)!;
      for (const format of ["wide", "tall"] as const) {
        const chunks = chunksOf(line, format);
        if (chunks.length > 1 || line.text.split(" ").length > 7) rows.push(`${format} ${line.take} (${(line.to - line.from).toFixed(2)} s): ${chunks.map((c) => `[${c.lines.join(" / ")}] ${(c.to - c.from).toFixed(2)}s`).join(" ")}`);
      }
    }
  }
  writeFileSync("zz-en.txt", rows.join("\n"));
});
