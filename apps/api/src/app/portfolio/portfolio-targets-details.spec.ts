import { RedactValuesInResponseInterceptor } from '@ghostfolio/api/interceptors/redact-values-in-response/redact-values-in-response.interceptor';
import { SubscriptionType } from '@ghostfolio/common/enums';
import { PortfolioDetails } from '@ghostfolio/common/interfaces';
import { scopes } from '@ghostfolio/common/scopes';
import {
  ImpersonationContext,
  RequestWithUser
} from '@ghostfolio/common/types';

import { lastValueFrom, of } from 'rxjs';

import { GetDetailsDto } from './get-details.dto';
import { PortfolioController } from './portfolio.controller';

jest.mock('@ghostfolio/api/services/activities/activities.service', () => ({
  ActivitiesService: class {}
}));
jest.mock('@ghostfolio/api/services/api/api.service', () => ({
  ApiService: class {}
}));
jest.mock(
  '@ghostfolio/api/services/configuration/configuration.service',
  () => ({ ConfigurationService: class {} })
);
jest.mock('./portfolio.service', () => ({ PortfolioService: class {} }));

function holding() {
  return {
    investment: 600,
    marketPrice: 100,
    quantity: 6,
    valueInBaseCurrency: 600,
    assetProfile: {
      assetClass: 'EQUITY',
      assetSubClass: null,
      name: 'Synthetic equity'
    },
    markets: undefined,
    marketsAdvanced: undefined
  } as unknown as PortfolioDetails['holdings'][number];
}

async function details(
  holdings = [holding()],
  hasErrors = false,
  readValues = true,
  options: {
    restricted?: boolean;
    subscription?: SubscriptionType;
    enableSubscription?: boolean;
  } = {}
) {
  const controller = new PortfolioController(
    undefined,
    { buildFiltersFromQueryParams: () => [] } as never,
    { get: () => !!options.enableSubscription } as never,
    {
      getDetails: async () => ({
        holdings,
        hasErrors,
        accounts: {},
        platforms: {},
        summary: {
          accountCashInBaseCurrency: 100,
          cash: 100,
          emergencyFund: { cash: 0 },
          filteredValueInBaseCurrency: 600
        }
      })
    } as never,
    {
      user: {
        subscription: { type: options.subscription },
        settings: { settings: { isRestrictedView: !!options.restricted } }
      }
    } as unknown as RequestWithUser
  );
  return controller.getDetails(
    {
      userId: 'synthetic',
      scopes: readValues ? [scopes.portfolioReadValues] : []
    } as ImpersonationContext,
    {} as GetDetailsDto
  );
}

describe('Portfolio details financial error flag for Targets', () => {
  it('allows valid values with missing optional market/profile metadata', async () => {
    expect((await details()).hasError).toBe(false);
  });

  it('allows unknown asset classification without inventing one', async () => {
    const value = holding();
    value.assetProfile.assetClass = null;
    const result = await details([value]);
    expect(result.hasError).toBe(false);
    expect(result.holdings[0].assetProfile.assetClass).toBeNull();
  });

  it.each([undefined, null, NaN, Infinity])(
    'flags invalid financial value %s in a later holding',
    async (value) => {
      const bad = { ...holding(), valueInBaseCurrency: value };
      expect((await details([holding(), bad])).hasError).toBe(true);
    }
  );

  it.each(['investment', 'marketPrice', 'quantity'])(
    'flags a missing %s',
    async (field) => {
      const bad = { ...holding(), [field]: undefined };
      expect((await details([bad])).hasError).toBe(true);
    }
  );

  it('preserves genuine calculator errors', async () => {
    expect((await details([holding()], true)).hasError).toBe(true);
  });

  it('does not label finite negative positions as a data error', async () => {
    expect(
      (
        await details([
          { ...holding(), quantity: -1, valueInBaseCurrency: -100 }
        ])
      ).hasError
    ).toBe(false);
  });

  it('keeps restricted monetary summary fields redacted', async () => {
    expect((await details([holding()], false, false)).summary.cash).toBeNull();
  });

  it.each([
    {
      readValues: true,
      restricted: false,
      enableSubscription: false,
      subscription: undefined,
      masked: false
    },
    {
      readValues: false,
      restricted: false,
      enableSubscription: false,
      subscription: undefined,
      masked: true
    },
    {
      readValues: true,
      restricted: true,
      enableSubscription: false,
      subscription: undefined,
      masked: true
    },
    {
      readValues: true,
      restricted: false,
      enableSubscription: true,
      subscription: SubscriptionType.Basic,
      masked: true
    },
    {
      readValues: true,
      restricted: false,
      enableSubscription: true,
      subscription: SubscriptionType.Premium,
      masked: false
    }
  ])(
    'protects independent cash under controller permissions: %j',
    async ({ readValues, masked, ...options }) => {
      const result = await details([holding()], false, readValues, options);
      expect(result.summary.accountCashInBaseCurrency).toBe(
        masked ? null : 100
      );
      expect(result.summary.cash).toBe(masked ? null : 100);
    }
  );

  it.each([
    {
      readValues: true,
      restricted: false,
      missingContext: false,
      masked: false
    },
    {
      readValues: false,
      restricted: false,
      missingContext: false,
      masked: true
    },
    { readValues: true, restricted: true, missingContext: false, masked: true },
    { readValues: true, restricted: false, missingContext: true, masked: true }
  ])(
    'protects independent cash through the response interceptor: %j',
    async ({ readValues, restricted, missingContext, masked }) => {
      const request = {
        impersonation: missingContext
          ? undefined
          : { scopes: readValues ? [scopes.portfolioReadValues] : [] },
        user: { settings: { settings: { isRestrictedView: restricted } } }
      };
      const result = await lastValueFrom(
        new RedactValuesInResponseInterceptor().intercept(
          { switchToHttp: () => ({ getRequest: () => request }) } as never,
          { handle: () => of({ summary: { accountCashInBaseCurrency: 100 } }) }
        )
      );
      expect(result.summary.accountCashInBaseCurrency).toBe(
        masked ? null : 100
      );
    }
  );
});
