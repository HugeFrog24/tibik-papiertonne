const round = (v) => Math.round(v * 1e6) / 1e6;

export const bellPresses = (storm, rhythm) => {
  const presses = [];
  for (let k = 0; ; k++) {
    const slot = storm.period * Math.floor(k / rhythm.slots.length) + rhythm.slots[k % rhythm.slots.length];
    const at = round(storm.from + slot * rhythm.eighth);
    const until = round(at + storm.press * rhythm.eighth);
    if (until > storm.until) return presses;
    presses.push([at, until]);
  }
};
