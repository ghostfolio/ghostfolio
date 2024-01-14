export interface Access {
  alias?: string;
  grantee?: string;
  id: string;
  type: 'PRIVATE' | 'PUBLIC' | 'RESTRICTED_VIEW';
  permission: 'READ' | 'READ_RESTRICTED';
}
