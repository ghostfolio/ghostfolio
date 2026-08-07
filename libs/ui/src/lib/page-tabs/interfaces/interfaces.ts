interface BaseTabConfiguration {
  iconName: string;
  label: string;
  showCondition?: boolean;
}

export type TabConfiguration = BaseTabConfiguration &
  (
    | { onClick: () => void; routerLink?: never }
    | { onClick?: never; routerLink: string[] }
  );
