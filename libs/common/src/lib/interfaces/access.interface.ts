export interface Access {
  alias?: string;
  grantee: string;
  id: string;
  type: 'PUBLIC' | 'RESTRICTED_VIEW';
}
