export interface CreateOrUpdatePartnershipDialogParams {
  partnership: {
    id: string | null;
    name: string;
    type: string;
    currency: string;
    inceptionDate: string;
    fiscalYearEnd: number;
  };
}
