interface BaseToggleOption {
  value: string;
}

export type ToggleOption = BaseToggleOption &
  (
    | { iconName: string; label?: never; title: string }
    | { iconName?: never; label: string; title?: never }
  );
