import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

export const withScratch = (prefix, work) => {
  const scratch = mkdtempSync(path.join(tmpdir(), prefix));
  try {
    return work(scratch);
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
};
