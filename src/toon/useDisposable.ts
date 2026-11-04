import { useEffect, useMemo, type DependencyList } from "react";

export const useDisposable = <T extends { dispose(): void }>(
  make: () => T,
  deps: DependencyList,
): T => {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const value = useMemo(make, deps);
  useEffect(() => () => value.dispose(), [value]);
  return value;
};
