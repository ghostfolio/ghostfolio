export interface CreateOrUpdateEntityDialogParams {
  entity: {
    id: string | null;
    name: string;
    type: string;
    taxId: string;
  };
}
