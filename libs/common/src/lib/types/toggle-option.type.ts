interface BaseToggleOption<T extends string = string> {
  value: T;
}

export type ToggleOption<T extends string = string> = BaseToggleOption<T> &
  (
    | { iconName: string; label?: never; title: string }
    | { iconName?: never; label: string; title?: never }
  );
