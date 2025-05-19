const stockExchangeCurrencies: {
  [key: string]: string;
} = require('../assets/stocks/market-currencies.json');

/**
 *
 * @param marketSuffixCode - The market suffix code (e.g. 'BK', 'VN', 'T' etc.)
 * @description This function retrieves the currency associated with a given market suffix code from Yahoo Finance.
 * It uses a "stock-exchange-currencies.json" file that contains the mapping of market suffix codes to their respective currencies.
 * If there is no matching currency for the provided market suffix code, the function returns null.
 * Please refer: https://help.yahoo.com/kb/SLN2310.html
 *
 * @returns string | null - The currency associated with the market suffix code, or null if not found.
 */
export function lookupCurrency(marketSuffixCode: string): string | null {
  if (marketSuffixCode in stockExchangeCurrencies) {
    return stockExchangeCurrencies[marketSuffixCode];
  }
  return null;
}

/**
 *
 * @param symbol - The symbol to determine the market currency for (e.g. 'MBB.VN', 'EA.BK', etc.)
 * @description This function extracts the market suffix code from the provided symbol and retrieves the corresponding currency.
 * It uses the "getMarketCurrency" function to perform the lookup.
 *
 * @returns string | null - The currency associated with the market suffix code, or null if not found or the symbol do not have market suffix code.
 */
export function determineStockCurrency(symbol: string): string | null {
  const marketSuffixCode = symbol.split('.').pop();
  if (!marketSuffixCode) {
    return null;
  }

  return lookupCurrency(marketSuffixCode);
}
