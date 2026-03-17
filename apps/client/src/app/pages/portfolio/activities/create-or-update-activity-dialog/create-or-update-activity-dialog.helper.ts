export function shouldEnableUpdateAccountBalance({
  accountId,
  dataSource,
  type
}: {
  accountId: string | null;
  dataSource: string | null;
  type: string;
}): boolean {
  const isManualBuy = dataSource === 'MANUAL' && type === 'BUY';

  if (['VALUABLE', 'LIABILITY'].includes(type) || isManualBuy) {
    return false;
  }

  if (['FEE', 'INTEREST'].includes(type)) {
    return !!accountId;
  }

  return true;
}
