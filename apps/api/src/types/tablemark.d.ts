declare module 'tablemark' {
  interface TablemarkColumnOption {
    name: string;
    align?: 'left' | 'center' | 'right';
  }

  interface TablemarkOptions {
    columns?: (string | TablemarkColumnOption)[];
  }

  function tablemark(
    rows: Record<string, unknown>[],
    options?: TablemarkOptions
  ): string;
  export = tablemark;
}
