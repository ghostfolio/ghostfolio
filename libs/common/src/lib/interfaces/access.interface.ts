export interface Access {
  granteeAlias: string;
  id: string;
  type: 'PUBLIC' | 'RESTRICTED_VIEW';
}
