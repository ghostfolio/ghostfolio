export interface FetchFailure {
  fetchError: string;
}

export type FetchResult<T> = T | FetchFailure;
