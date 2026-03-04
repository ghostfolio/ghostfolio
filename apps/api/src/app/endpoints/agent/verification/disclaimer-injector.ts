// Keyword-triggered disclaimers
import { Injectable } from '@nestjs/common';

import type {
  DisclaimerResult,
  VerificationChecker,
  VerificationContext
} from './verification.interfaces';

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

interface DisclaimerDefinition {
  id: string;
  keywords: string[] | null;
  position: 'prepend' | 'append';
  text: string;
  priority: number;
}

const KEYWORD_DISCLAIMERS: DisclaimerDefinition[] = [
  {
    id: 'D-TAX',
    keywords: [
      'tax',
      'capital gains',
      'dividend tax',
      'deduction',
      'tax liability',
      'taxable',
      'after-tax',
      'tax-loss'
    ],
    position: 'append',
    text: 'This information is for educational purposes only and does not constitute tax advice. Tax laws vary by jurisdiction and individual circumstances. Please consult a qualified tax professional for advice specific to your situation.',
    priority: 3
  },
  {
    id: 'D-ADVICE',
    keywords: [
      'should',
      'consider',
      'recommend',
      'suggest',
      'rebalance',
      'optimize',
      'you might want to'
    ],
    position: 'append',
    text: 'This is not financial advice. The observations above are based solely on your portfolio data and general financial principles. Consider consulting a licensed financial advisor before making investment decisions.',
    priority: 4
  },
  {
    id: 'D-PREDICTION',
    keywords: [
      'will be',
      'forecast',
      'predict',
      'expect',
      'future',
      'projected',
      'outlook'
    ],
    position: 'append',
    text: 'Past performance is not indicative of future results. Market predictions are inherently uncertain.',
    priority: 5
  }
];

const STALE_DISCLAIMER: DisclaimerDefinition = {
  id: 'D-STALE',
  keywords: null,
  position: 'prepend',
  text: 'Note: The market data used in this analysis is more than 24 hours old and may not reflect current prices.',
  priority: 1
};

const PARTIAL_DISCLAIMER: DisclaimerDefinition = {
  id: 'D-PARTIAL',
  keywords: null,
  position: 'prepend',
  text: 'Some data sources were unavailable. This response may be incomplete.',
  priority: 2
};

@Injectable()
export class DisclaimerInjector implements VerificationChecker {
  public readonly stageName = 'disclaimerInjector';
  public inject(context: VerificationContext): DisclaimerResult {
    const triggered: DisclaimerDefinition[] = [];
    const responseLower = context.agentResponseText.toLowerCase();

    // Check keyword-triggered disclaimers
    for (const disclaimer of KEYWORD_DISCLAIMERS) {
      const matched = disclaimer.keywords!.some((keyword) =>
        responseLower.includes(keyword.toLowerCase())
      );

      if (matched) {
        triggered.push(disclaimer);
      }
    }

    // Check data freshness (D-STALE)
    if (context.toolCalls.length > 0) {
      const oldestTimestamp = context.toolCalls.reduce((oldest, call) => {
        const callTime =
          call.timestamp instanceof Date
            ? call.timestamp.getTime()
            : new Date(call.timestamp).getTime();
        return callTime < oldest ? callTime : oldest;
      }, Infinity);

      const requestTime =
        context.requestTimestamp instanceof Date
          ? context.requestTimestamp.getTime()
          : new Date(context.requestTimestamp).getTime();

      if (requestTime - oldestTimestamp > TWENTY_FOUR_HOURS_MS) {
        triggered.push(STALE_DISCLAIMER);
      }
    }

    // Check tool failures or partial data (D-PARTIAL)
    const hasFailedTool = context.toolCalls.some(
      (call) => call.success === false
    );
    const hasPartialData = context.toolCalls.some(
      (call) =>
        call.success === true &&
        call.outputData != null &&
        Array.isArray(call.outputData) &&
        call.outputData.length === 0
    );

    if (hasFailedTool || hasPartialData) {
      triggered.push(PARTIAL_DISCLAIMER);
    }

    // Deduplicate by ID and sort by priority (lower = higher priority)
    const seen = new Set<string>();
    const unique = triggered.filter((d) => {
      if (seen.has(d.id)) {
        return false;
      }
      seen.add(d.id);
      return true;
    });

    unique.sort((a, b) => a.priority - b.priority);

    return {
      disclaimerIds: unique.map((d) => d.id),
      texts: unique.map((d) => d.text),
      positions: unique.map((d) => d.position)
    };
  }
}
