import { Type as ActivityType } from '@prisma/client';

export function getFactor(activityType: ActivityType) {
  let factor: number;

  switch (activityType) {
    case 'BUY':
    case 'STAKE':
      factor = 1;
      break;
    case 'SELL':
      factor = -1;
      break;
    default:
      factor = 0;
      break;
  }

  return factor;
}
