export declare const parseStillsArgs: (args: readonly string[]) => {
  readonly outDir: string;
  readonly jobs: readonly { readonly id: string; readonly frames: readonly number[] }[];
};
