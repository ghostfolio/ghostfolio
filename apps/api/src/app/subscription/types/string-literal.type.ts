// Removes the open string type (e.g. OtherString of Stripe), which matches
// every string, and keeps only the string literals
export type StringLiteral<T> = T extends string
  ? string extends T
    ? never
    : T
  : never;
