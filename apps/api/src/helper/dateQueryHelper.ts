import { resetHours } from '@ghostfolio/common/helper';

import { addDays } from 'date-fns';

import { DateQuery } from '../app/portfolio/interfaces/date-query.interface';

export class DateQueryHelper {
  public handleDateQueryIn(dateQuery: DateQuery): {
    query: DateQuery;
    dates: Date[];
  } {
    let dates = [];
    let query = dateQuery;
    if (dateQuery.in?.length > 0) {
      dates = dateQuery.in;
      let end = Math.max(...dates.map((d) => d.getTime()));
      let start = Math.min(...dates.map((d) => d.getTime()));
      query = {
        gte: resetHours(new Date(start)),
        lt: resetHours(addDays(end, 1))
      };
    }
    return { query, dates };
  }
}
