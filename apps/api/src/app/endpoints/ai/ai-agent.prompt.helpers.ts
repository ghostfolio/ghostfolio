import type { AiPromptMode } from '@ghostfolio/common/types';

import type { ColumnDescriptor } from 'tablemark';

const HOLDINGS_TABLE_COLUMN_DEFINITIONS: ({
  key:
    | 'ALLOCATION_PERCENTAGE'
    | 'ASSET_CLASS'
    | 'ASSET_SUB_CLASS'
    | 'CURRENCY'
    | 'NAME'
    | 'SYMBOL';
} & ColumnDescriptor)[] = [
  { key: 'NAME', name: 'Name' },
  { key: 'SYMBOL', name: 'Symbol' },
  { key: 'CURRENCY', name: 'Currency' },
  { key: 'ASSET_CLASS', name: 'Asset Class' },
  { key: 'ASSET_SUB_CLASS', name: 'Asset Sub Class' },
  {
    align: 'right',
    key: 'ALLOCATION_PERCENTAGE',
    name: 'Allocation in Percentage'
  }
];

export async function createHoldingsPrompt({
  holdings,
  languageCode,
  mode,
  userCurrency
}: {
  holdings: Record<
    string,
    {
      allocationInPercentage?: number;
      assetClass?: string;
      assetSubClass?: string;
      currency: string;
      name: string;
      symbol: string;
    }
  >;
  languageCode: string;
  mode: AiPromptMode;
  userCurrency: string;
}) {
  const holdingsTableColumns: ColumnDescriptor[] =
    HOLDINGS_TABLE_COLUMN_DEFINITIONS.map(({ align, name }) => {
      return { name, align: align ?? 'left' };
    });

  const holdingsTableRows = Object.values(holdings)
    .sort((a, b) => {
      return (b.allocationInPercentage ?? 0) - (a.allocationInPercentage ?? 0);
    })
    .map(
      ({
        allocationInPercentage = 0,
        assetClass,
        assetSubClass,
        currency,
        name: label,
        symbol
      }) => {
        return HOLDINGS_TABLE_COLUMN_DEFINITIONS.reduce(
          (row, { key, name }) => {
            switch (key) {
              case 'ALLOCATION_PERCENTAGE':
                row[name] = `${(allocationInPercentage * 100).toFixed(3)}%`;
                break;

              case 'ASSET_CLASS':
                row[name] = assetClass ?? '';
                break;

              case 'ASSET_SUB_CLASS':
                row[name] = assetSubClass ?? '';
                break;

              case 'CURRENCY':
                row[name] = currency;
                break;

              case 'NAME':
                row[name] = label;
                break;

              case 'SYMBOL':
                row[name] = symbol;
                break;

              default:
                row[name] = '';
                break;
            }

            return row;
          },
          {} as Record<string, string>
        );
      }
    );

  // Dynamic import to load ESM module from CommonJS context
  // eslint-disable-next-line @typescript-eslint/no-implied-eval
  const dynamicImport = new Function('s', 'return import(s)') as (
    s: string
  ) => Promise<typeof import('tablemark')>;
  const { tablemark } = await dynamicImport('tablemark');

  const holdingsTableString = tablemark(holdingsTableRows, {
    columns: holdingsTableColumns
  });

  if (mode === 'portfolio') {
    return holdingsTableString;
  }

  return [
    `You are a neutral financial assistant. Please analyze the following investment portfolio (base currency being ${userCurrency}) in simple words.`,
    holdingsTableString,
    'Structure your answer with these sections:',
    'Overview: Briefly summarize the portfolio’s composition and allocation rationale.',
    'Risk Assessment: Identify potential risks, including market volatility, concentration, and sectoral imbalances.',
    'Advantages: Highlight strengths, focusing on growth potential, diversification, or other benefits.',
    'Disadvantages: Point out weaknesses, such as overexposure or lack of defensive assets.',
    'Target Group: Discuss who this portfolio might suit (e.g., risk tolerance, investment goals, life stages, and experience levels).',
    'Optimization Ideas: Offer ideas to complement the portfolio, ensuring they are constructive and neutral in tone.',
    'Conclusion: Provide a concise summary highlighting key insights.',
    `Provide your answer in the following language: ${languageCode}.`
  ].join('\n');
}
