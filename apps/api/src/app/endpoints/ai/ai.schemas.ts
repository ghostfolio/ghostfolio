import {
  MCP_MAX_ACTIVITIES,
  SEARCH_QUERY_MAXIMUM_LENGTH
} from '@ghostfolio/common/config';
import {
  isValidCurrencyCode,
  isValidDateAfter1970
} from '@ghostfolio/common/helper';

import { Type as ActivityType } from '@prisma/client';
import { z } from 'zod';

// The strict mode of the structured outputs requires every property, hence a
// value which the file does not show is null instead of being left out. The
// maximum length is checked by a refinement, because the strict mode does not
// support every keyword of JSON Schema
const PRINTED_TEXT = z
  .string()
  .trim()
  .refine(
    (value) => {
      return value.length <= SEARCH_QUERY_MAXIMUM_LENGTH;
    },
    { error: `Too long: expected at most ${SEARCH_QUERY_MAXIMUM_LENGTH}` }
  )
  .nullable();

export const ACTIVITY_ROWS_OUTPUT = z.object({
  rows: z
    .array(
      z.object({
        accountName: PRINTED_TEXT.describe(
          'The name or the number of the account, as printed'
        ),
        currency: z
          .string()
          .refine(isValidCurrencyCode)
          .nullable()
          .describe(
            'The currency of the fee and of the unit price, as an ISO 4217 code in upper case'
          ),
        date: z
          .string()
          .refine(isValidDateAfter1970)
          .describe('The date of the activity, as an ISO 8601 date'),
        fee: z.number().min(0).describe('The fee of the activity'),
        isin: PRINTED_TEXT.describe('The ISIN of the asset, as printed'),
        name: PRINTED_TEXT.describe(
          'The name of the asset, or the description of a fee, an interest or a liability, as printed'
        ),
        quantity: z.number().min(0).describe('The quantity of the activity'),
        symbol: PRINTED_TEXT.describe(
          'The ticker symbol of the asset, as printed'
        ),
        type: z.enum(ActivityType).describe('The type of the activity'),
        unitPrice: z.number().min(0).describe('The unit price of the activity')
      })
    )
    .max(MCP_MAX_ACTIVITIES)
    .describe(`The activities of the file, at most ${MCP_MAX_ACTIVITIES}`)
});
