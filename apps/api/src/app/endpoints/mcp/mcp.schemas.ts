import { DATE_RANGE_PATTERN } from '@ghostfolio/api/dtos/date-range-filter.dto';
import {
  DATE_RANGES,
  MCP_MAX_ACCOUNTS,
  MCP_MAX_ACTIVITIES
} from '@ghostfolio/common/config';
import {
  isValidCurrencyCode,
  isValidDateAfter1970
} from '@ghostfolio/common/helper';

import { AssetClass, DataSource, Type as ActivityType } from '@prisma/client';
import { z } from 'zod';

const HOLDING_PARAMETER = z.object({
  dataSource: z
    .enum(DataSource)
    .describe('The data source of the asset profile'),
  symbol: z.string().describe('The symbol of the asset profile')
});

export const GET_ACCOUNTS_PARAMETERS = z.object({
  accountIds: z
    .array(z.string().min(1))
    .min(1)
    .max(MCP_MAX_ACCOUNTS)
    .optional()
    .describe(
      `The identifiers of the accounts to get, at most ${MCP_MAX_ACCOUNTS}`
    ),
  assetClasses: z
    .array(z.enum(AssetClass))
    .min(1)
    .optional()
    .describe('The asset classes of the accounts to get'),
  holding: HOLDING_PARAMETER.optional().describe(
    'The asset profile of the accounts to get'
  )
});

export const GET_ACTIVITIES_PARAMETERS = z.object({
  activityTypes: z
    .array(z.enum(ActivityType))
    .min(1)
    .optional()
    .describe('The types of the activities to get'),
  assetClasses: z
    .array(z.enum(AssetClass))
    .min(1)
    .optional()
    .describe('The asset classes of the activities to get'),
  holding: HOLDING_PARAMETER.optional().describe(
    'The asset profile of the activities to get'
  ),
  range: z
    .string()
    .regex(DATE_RANGE_PATTERN)
    .optional()
    .describe(
      `The date range of the activities to get, either ${DATE_RANGES.join(
        ', '
      )} or a calendar year like 2024`
    ),
  skip: z
    .number()
    .int()
    .min(0)
    .optional()
    .describe('The number of activities to skip'),
  take: z
    .number()
    .int()
    .min(1)
    .max(MCP_MAX_ACTIVITIES)
    .default(MCP_MAX_ACTIVITIES)
    .describe(`The number of activities to get, at most ${MCP_MAX_ACTIVITIES}`)
});

export const IMPORT_ACTIVITIES_PARAMETERS = z.object({
  activities: z
    .array(
      z.object({
        accountId: z
          .string()
          .min(1)
          .optional()
          .describe('The identifier of the account of the activity'),
        comment: z.string().optional().describe('The comment of the activity'),
        currency: z
          .string()
          .refine(isValidCurrencyCode)
          .describe(
            'The currency of the fee and of the unit price, as an ISO 4217 code in upper case'
          ),
        dataSource: z
          .enum(DataSource)
          .optional()
          .describe('The data source of the asset profile'),
        date: z
          .string()
          .refine(isValidDateAfter1970)
          .describe(
            'The date of the activity, as an ISO 8601 date or date and time'
          ),
        fee: z.number().min(0).describe('The fee of the activity'),
        quantity: z.number().min(0).describe('The quantity of the activity'),
        symbol: z.string().min(1).describe('The symbol of the asset profile'),
        type: z.enum(ActivityType).describe('The type of the activity'),
        unitPrice: z.number().min(0).describe('The unit price of the activity')
      })
    )
    .min(1)
    .max(MCP_MAX_ACTIVITIES)
    .describe(`The activities to import, at most ${MCP_MAX_ACTIVITIES}`)
});
