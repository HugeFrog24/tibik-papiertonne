export const lazy = <T>(build: () => T): (() => T) => {
  let value: { readonly built: T } | undefined;
  return () => (value ??= { built: build() }).built;
};
