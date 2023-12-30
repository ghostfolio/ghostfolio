import { SymbolProfile } from '@prisma/client';

export interface DataEnhancerInterface {
  enhance({
    requestTimeout,
    response,
    symbol
  }: {
    requestTimeout?: number;
    response: Partial<SymbolProfile>;
    symbol: string;
  }): Promise<Partial<SymbolProfile>>;

  getName(): string;

  getTestSymbol(): string;
}
