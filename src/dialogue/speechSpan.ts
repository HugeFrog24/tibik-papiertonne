type Measured = { readonly speech: readonly (readonly number[])[] };

export const spokenSpan = (take: Measured): readonly [number, number] => [take.speech[0][0], take.speech[take.speech.length - 1][1]];

export const spokenLength = (take: Measured) => {
  const [from, to] = spokenSpan(take);
  return to - from;
};
