import {
  DEFAULT_DATE_FORMAT,
  DEFAULT_DATE_FORMAT_MONTH_YEAR
} from '@ghostfolio/common/config';

export const DateFormats = {
  display: {
    dateInput: DEFAULT_DATE_FORMAT,
    monthYearLabel: DEFAULT_DATE_FORMAT_MONTH_YEAR,
    dateA11yLabel: DEFAULT_DATE_FORMAT,
    monthYearA11yLabel: DEFAULT_DATE_FORMAT_MONTH_YEAR
  },
  parse: {
    dateInput: DEFAULT_DATE_FORMAT
  }
};
