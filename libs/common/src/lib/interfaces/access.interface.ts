export interface Access {
  alias?: string;
  grantee?: string;
  id: string;
  type: 'PUBLIC' | 'PRIVATE' | 'RESTRICTED_VIEW';
}
