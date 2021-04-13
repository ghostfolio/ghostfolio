import { Platform } from '@angular/cdk/platform';
import { Inject, forwardRef } from '@angular/core';
import { MAT_DATE_LOCALE, NativeDateAdapter } from '@angular/material/core';
import { format, isValid } from 'date-fns';
import * as deDateFnsLocale from 'date-fns/locale/de/index';

export class CustomDateAdapter extends NativeDateAdapter {
  /**
   * @constructor
   */
  public constructor(
    @Inject(forwardRef(() => MAT_DATE_LOCALE)) matDateLocale: string,
    platform: Platform
  ) {
    super(matDateLocale, platform);
  }

  /**
   * Sets the first day of the week to Monday
   */
  public getFirstDayOfWeek(): number {
    return 1;
  }

  /**
   * Formats a date as a string according to the given format
   */
  public format(aDate: Date, aParseFormat: string): string {
    return format(aDate, aParseFormat, {
      locale: <any>deDateFnsLocale
    });
  }

  /**
   * Parses a date from a provided value
   */
  public parse(aValue: any): Date {
    let date: Date;

    try {
      // TODO
      // Native date parser from the following formats:
      // - 'd.M.yyyy'
      // - 'dd.MM.yyyy'
      // https://github.com/you-dont-need/You-Dont-Need-Momentjs#string--date-format
      const datePattern = /^(\d{1,2}).(\d{1,2}).(\d{4})$/;
      const [, day, month, year] = datePattern.exec(aValue);

      date = new Date(
        parseInt(year, 10),
        parseInt(month, 10) - 1, // monthIndex
        parseInt(day, 10)
      );
    } catch (error) {
    } finally {
      const isDateValid = date && isValid(date);

      if (isDateValid) {
        return date;
      }

      return null;
    }
  }
}
