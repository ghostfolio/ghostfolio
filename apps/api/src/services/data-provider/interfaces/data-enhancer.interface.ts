import { SymbolProfile } from '@prisma/client';

export interface DataEnhancerInterface {
  enhance({
    response,
    symbol
  }: {
    response: Partial<SymbolProfile>;
    symbol: string;
  }): Promise<Partial<SymbolProfile>>;

  getName(): string;
}
