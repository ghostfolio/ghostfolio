import { I18nService } from '@ghostfolio/api/services/i18n/i18n.service';

import { Logger } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { readFileSync, readdirSync } from 'node:fs';

import { HtmlTemplateMiddleware } from './html-template.middleware';

jest.mock('@ghostfolio/api/environments/environment', () => {
  return { environment: { production: true, rootUrl: 'https://ghostfol.io' } };
});

jest.mock('node:fs', () => {
  return {
    ...jest.requireActual('node:fs'),
    readFileSync: jest.fn(),
    readdirSync: jest.fn()
  };
});

const genericDescription = 'Generic description';
const indexHtml = '<meta content="${description}" name="description" />';
const productPath =
  '/en/resources/personal-finance-tools/open-source-alternative-to-8figures';

function createLocale({
  pricingDescription = 'Pricing description',
  productDescription
}: {
  pricingDescription?: string;
  productDescription: string;
}) {
  return `
    <xliff>
      <trans-unit id="metaDescription">
        <source>${genericDescription}</source>
      </trans-unit>
      <trans-unit id="metaDescription.pricing">
        <source>${pricingDescription}</source>
      </trans-unit>
      <trans-unit id="metaDescription.resources.personalFinanceTools.product">
        <source>${productDescription}</source>
      </trans-unit>
      <trans-unit id="routes.pricing">
        <source>pricing</source>
      </trans-unit>
      <trans-unit id="routes.resources">
        <source>resources</source>
      </trans-unit>
      <trans-unit id="routes.resources.personalFinanceTools">
        <source>personal-finance-tools</source>
      </trans-unit>
      <trans-unit id="routes.resources.personalFinanceTools.openSourceAlternativeTo">
        <source>open-source-alternative-to</source>
      </trans-unit>
    </xliff>
  `;
}

function getResponseBody({
  locale,
  originalUrl
}: {
  locale: string;
  originalUrl: string;
}) {
  (readdirSync as jest.Mock).mockReturnValue(['messages.xlf']);
  (readFileSync as jest.Mock).mockImplementation((path: string) => {
    return path.endsWith('index.html') ? indexHtml : locale;
  });

  const i18nService = new I18nService();
  i18nService.onModuleInit();

  const send = jest.fn();

  new HtmlTemplateMiddleware(i18nService).use(
    { originalUrl } as Request,
    { send } as unknown as Response,
    jest.fn() as NextFunction
  );

  return send.mock.calls[0][0];
}

describe('HtmlTemplateMiddleware', () => {
  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('serves the description of a public route', () => {
    expect(
      getResponseBody({
        locale: createLocale({ productDescription: 'Compare ${name}' }),
        originalUrl: '/en/pricing'
      })
    ).toContain('content="Pricing description"');
  });

  it('interpolates the name into the description of a personal finance tool', () => {
    expect(
      getResponseBody({
        locale: createLocale({ productDescription: 'Compare ${name}' }),
        originalUrl: productPath
      })
    ).toContain('content="Compare 8FIGURES"');
  });

  it('falls back to the generic description if the name token is not in the description of a personal finance tool', () => {
    expect(
      getResponseBody({
        locale: createLocale({ productDescription: 'Compare ${product}' }),
        originalUrl: productPath
      })
    ).toContain(`content="${genericDescription}"`);
  });

  it('escapes the description for the use in an attribute', () => {
    expect(
      getResponseBody({
        locale: createLocale({
          pricingDescription: 'Compare &quot;plans&quot; &amp; prices',
          productDescription: 'Compare ${name}'
        }),
        originalUrl: '/en/pricing'
      })
    ).toContain('content="Compare &quot;plans&quot; &amp; prices"');
  });
});
