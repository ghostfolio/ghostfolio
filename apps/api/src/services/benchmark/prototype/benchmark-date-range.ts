export function validateBenchmarkDateRange({
  startDate,
  endDate
}: {
  startDate: Date;
  endDate: Date;
}): void {
  if (
    !(startDate instanceof Date) ||
    !(endDate instanceof Date) ||
    !Number.isFinite(startDate.getTime()) ||
    !Number.isFinite(endDate.getTime())
  ) {
    throw new Error('Invalid benchmark date range');
  }

  if (startDate > endDate) {
    throw new Error('Reversed benchmark date range');
  }
}
