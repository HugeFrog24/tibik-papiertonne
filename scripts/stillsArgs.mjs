const USAGE =
  "usage: node scripts/stills.mjs <composition> <out dir> <frame>... | node scripts/stills.mjs <out dir> <composition>:<frame>,<frame> ...";

const JOB = /^([\w-]+):(\d+(?:,\d+)*)$/;

export const parseStillsArgs = (args) => {
  if (args.slice(1).some((arg) => JOB.test(arg) || /^[\w-]+:$/.test(arg))) {
    const [outDir, ...specs] = args;
    const jobs = specs.map((spec) => {
      const match = JOB.exec(spec);
      if (!match) throw new Error(USAGE);
      return { id: match[1], frames: match[2].split(",").map(Number) };
    });
    if (!outDir || jobs.length === 0) throw new Error(USAGE);
    return { outDir, jobs };
  }
  const [id, outDir, ...frames] = args;
  if (!id || !outDir || frames.length === 0) throw new Error(USAGE);
  return { outDir, jobs: [{ id, frames: frames.map(Number) }] };
};
