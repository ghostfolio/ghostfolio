import type { DATE_RANGES } from '../config';

export type DateRange = (typeof DATE_RANGES)[number] | string; // '2024', '2023', '2022', etc.
