import { AI_MAX_ACTIVITIES } from '@ghostfolio/common/config';

import { Type as ActivityType } from '@prisma/client';
import { z } from 'zod';

// The strict mode of the structured outputs requires every property, hence a
// value which the file does not show is null instead of being left out. The
// values are checked when the rows and the matches are joined to the
// activities to import, so that a wrong value or a wrong match skips its rows
// only
const PRINTED_TEXT = z.string().trim().nullable();

export const ACTIVITY_ROWS_OUTPUT = z.object({
  broker: PRINTED_TEXT.describe(
    'The name of the broker or of the bank which issued the file'
  ),
  rows: z
    .array(
      z.object({
        accountName: PRINTED_TEXT.describe(
          'The name or the number of the account, as printed'
        ),
        currency: z
          .string()
          .nullable()
          .describe(
            'The currency of the fee, tax and unit price, as an ISO 4217 code in upper case'
          ),
        date: z
          .string()
          .describe('The date of the activity, as an ISO 8601 date'),
        fee: z.number().describe('The fee of the activity'),
        isin: PRINTED_TEXT.describe('The ISIN of the asset, as printed'),
        tax: z.number().describe('The tax of the activity'),
        name: PRINTED_TEXT.describe(
          'The name of the asset, or the description of a fee, an interest or a liability, as printed'
        ),
        quantity: z.number().describe('The quantity of the activity'),
        symbol: PRINTED_TEXT.describe(
          'The ticker symbol of the asset, as printed, not a national number such as a valor, a WKN or a CUSIP'
        ),
        type: z.enum(ActivityType).describe('The type of the activity'),
        unitPrice: z.number().describe('The unit price of the activity')
      })
    )
    .describe(`The activities of the file, at most ${AI_MAX_ACTIVITIES}`)
});

export const ROW_MATCHES_OUTPUT = z.object({
  accounts: z
    .array(
      z.object({
        accountId: z
          .string()
          .nullable()
          .describe(
            'The id of the account of the user which matches, as given in the accounts, or null if no account matches'
          ),
        id: z.number().describe('The id of the account hint, as given')
      })
    )
    .describe('One entry for each account hint of the file'),
  assets: z
    .array(
      z.object({
        currency: z
          .string()
          .nullable()
          .describe(
            'The currency of the selected holding or asset profile, as given'
          ),
        dataSource: z
          .string()
          .nullable()
          .describe(
            'The data source of the selected holding or asset profile, as given'
          ),
        id: z.number().describe('The id of the asset, as given'),
        symbol: z
          .string()
          .nullable()
          .describe(
            'The symbol of the selected holding or asset profile, as given, or null if no holding and no asset profile matches'
          )
      })
    )
    .describe('One entry for each asset of the file')
});
