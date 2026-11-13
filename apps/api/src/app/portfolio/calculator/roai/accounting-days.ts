const MILLISECONDS_PER_DAY = 86_400_000;

export function differenceInAccountingDays(
  later: string,
  earlier: string
): number {
  const toDayNumber = (date: string): number => {
    const [year, month, day] = date.split('-').map(Number);

    const utcDate = new Date(0);
    utcDate.setUTCFullYear(year, month - 1, day);

    return Math.floor(utcDate.getTime() / MILLISECONDS_PER_DAY);
  };

  return toDayNumber(later) - toDayNumber(earlier);
}
