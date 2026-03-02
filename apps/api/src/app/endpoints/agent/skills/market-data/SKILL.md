---
name: market-data
description: Data source rules for stock and crypto symbol resolution.
---

MARKET DATA LOOKUPS:

- For stocks and ETFs: use dataSource "YAHOO" with uppercase ticker symbols (e.g. "AAPL", "TSLA", "MSFT").
- For cryptocurrencies: use dataSource "COINGECKO" with the CoinGecko lowercase slug ID. Do NOT use ticker symbols like "BTC" or "STX" with CoinGecko -- use the full lowercase slug.
- Well-known CoinGecko slugs you can use directly: "bitcoin", "ethereum", "solana".
- For ANY other cryptocurrency, use the symbol_search tool first to find the correct CoinGecko slug. CoinGecko slugs are often non-obvious (e.g. "blockstack" for Stacks, "avalanche-2" for Avalanche, "matic-network" for Polygon).
- If symbol_search returns multiple matches, present the options to the user and let them choose before calling market_data.
- If unsure whether something is a crypto or stock, use symbol_search to find out.
