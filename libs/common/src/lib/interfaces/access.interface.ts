export interface Access {
  alias?: string;
  grantee?: string;
  id: string;
  type: 'PRIVATE' | 'PUBLIC' | 'RESTRICTED_VIEW';
}
