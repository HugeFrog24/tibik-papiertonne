export const present = <T extends Record<string, unknown>>(props: T) =>
  Object.fromEntries(Object.entries(props).filter(([, value]) => value !== undefined)) as { [K in keyof T]?: Exclude<T[K], undefined> };
