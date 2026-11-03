export const memoByFrame = <S>(solve: (t: number) => S) => {
  const solved = new Map<number, S>();
  const memo = (t: number): S => {
    const key = Math.round(t * 1000);
    let state = solved.get(key);
    if (!state) {
      state = solve(t);
      solved.set(key, state);
    }
    return state;
  };
  return Object.assign(memo, { clear: () => solved.clear() });
};
