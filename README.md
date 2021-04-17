<div align="center">
	<h1>Ghostfolio</h1>
	<p>
		<strong>Privacy-first Portfolio Tracker</strong>
	</p>
  <p>
    <a href="https://www.ghostfol.io"><strong>Live Demo</strong></a>
  </p>
</div>

**Ghostfolio** is a privacy-first portfolio tracker. It empowers busy folks to have a sharp look of their financial assets and to make solid, data-driven investment decisions by evaluating automated Static Portfolio Analysis Rules.

## Why Ghostfolio?

Ghostfolio is for you if you are...

<ul>
  <li>
    💼 trading stocks, ETFs or cryptocurrencies on multiple platforms
  </li>
  <li>
    🏦 pursuing a buy & hold strategy
  </li>
  <li>
    🎯 interested in getting insights of your portfolio composition
  </li>
  <li>
    👻 valuing privacy and data ownership
  </li>
  <li>
    🧘 into minimalism
  </li>
  <li>
    🧺 caring about diversifying your financial resources
  </li>
  <li>
    🆓 interested in financial independence
  </li>
  <li>
    🙅 saying no to spreadsheets in 2021
  </li>
  <li>
    😎 still reading this list
  </li>
</ul>

## Features

- ✅ Create, update and delete transactions
- ✅ Portfolio performance (`Today`, `YTD`, `1Y`, `5Y`, `Max`)
- ✅ Various charts
- ✅ Static analysis to identify potential risks in your portfolio
- ✅ Dark Mode

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/en/download)
- [Yarn](https://yarnpkg.com/en/docs/install)
- [Docker](https://www.docker.com/products/docker-desktop)

### Setup

1. Run `yarn install`
2. Run `cd docker`
3. Run `docker compose build`
4. Run `docker compose up -d` to start [PostgreSQL](https://www.postgresql.org) and [Redis](https://redis.io)
5. Run `yarn setup:database` to initialize the database schema and populate your database with (example) data
6. Start server and client (see _Development_)
7. Login as _Admin_ with the `Security Token`: `ae76872ae8f3419c6d6f64bf51888ecbcc703927a342d815fafe486acdb938da07d0cf44fca211a0be74a423238f535362d390a41e81e633a9ce668a6e31cdf9`

## Development

### Start server

- Debug: Run `yarn watch:server` and click "Launch Program" in _Visual Studio Code_
- Serve: Run `yarn start:server`

### Start client

- Run `yarn start:client`

## Testing

Run `yarn test`
