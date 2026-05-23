export type DateRange =
  | '1d'
  | '1y'
  | '5y'
  | 'max'
  | 'mtd'
  | 'wtd'
  | 'ytd'
  | `${number}`; // '2024', '2023', '2022', etc.
