import type * as config from '../config';

export type PropertyKey = {
  [Key in keyof typeof config]: Key extends `PROPERTY_${string}`
    ? (typeof config)[Key]
    : never;
}[keyof typeof config];
