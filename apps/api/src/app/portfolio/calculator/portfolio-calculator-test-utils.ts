import { readFileSync } from 'fs';

export const activityDummyData = {
  accountId: undefined,
  accountUserId: undefined,
  comment: undefined,
  createdAt: new Date(),
  currency: undefined,
  fee: undefined,
  feeInBaseCurrency: undefined,
  id: undefined,
  isDraft: false,
  symbolProfileId: undefined,
  unitPrice: undefined,
  unitPriceInBaseCurrency: undefined,
  updatedAt: new Date(),
  userId: undefined,
  value: undefined,
  valueInBaseCurrency: undefined
};

export const symbolProfileDummyData = {
  activitiesCount: undefined,
  assetClass: undefined,
  assetSubClass: undefined,
  countries: [],
  createdAt: undefined,
  holdings: [],
  id: undefined,
  isActive: true,
  sectors: [],
  updatedAt: undefined
};

export const userDummyData = {
  id: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'
};

export function loadActivityExportFile(filePath: string) {
  return JSON.parse(readFileSync(filePath, 'utf8')).activities;
}
