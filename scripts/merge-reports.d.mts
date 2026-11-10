export declare const mergeReports: (
  main: { readonly testResults: readonly { readonly name: string }[] } & Record<
    string,
    unknown
  >,
  reruns: readonly {
    readonly testResults: readonly { readonly name: string }[];
  }[],
) => {
  readonly testResults: readonly { readonly name: string; readonly assertionResults: readonly { readonly status: string; readonly duration: number }[] }[];
  readonly numTotalTests: number;
  readonly numPassedTests: number;
  readonly numFailedTests: number;
  readonly success: boolean;
};
export declare const lostFiles: (report: {
  readonly testResults: readonly {
    readonly name: string;
    readonly assertionResults: readonly { readonly status: string }[];
  }[];
}) => string[];
export declare const failedFiles: (report: {
  readonly testResults: readonly {
    readonly name: string;
    readonly status?: string;
    readonly assertionResults: readonly { readonly status: string }[];
  }[];
}) => string[];
