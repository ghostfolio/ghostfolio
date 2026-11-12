export interface FXMacroDataForexResponse {
  base: string;
  data: {
    date: string;
    // The rate is documented as anyOf[number, null].
    val: number | null;
  }[];
  pagination?: {
    has_more: boolean;
    next_offset: number | null;
  };
  quote: string;
}

export interface FXMacroDataSourcesResponse {
  sources: {
    served_pairs: string[];
  }[];
}
