<div align="center">
  <h1>Ghostfolio</h1>
  <p>
    <strong>Open Source Portfolio Tracker</strong>
  </p>
  <p>
    <a href="https://ghostfol.io"><strong>Live Demo</strong></a>
  </p>
  <p>
    <a href="https://www.gnu.org/licenses/agpl-3.0" rel="nofollow">
      <img src="https://img.shields.io/badge/License-AGPL%20v3-blue.svg" alt="License: AGPL v3">
    </a>
  </p>
</div>

**Ghostfolio** is an open source portfolio tracker. The software empowers busy folks to have a sharp look of their financial assets and to make solid, data-driven investment decisions by evaluating automated static portfolio analysis rules.

## Why Ghostfolio?

Ghostfolio is for you if you are...

- 💼 trading stocks, ETFs or cryptocurrencies on multiple platforms

- 🏦 pursuing a buy & hold strategy

- 🎯 interested in getting insights of your portfolio composition

- 👻 valuing privacy and data ownership

- 🧘 into minimalism

- 🧺 caring about diversifying your financial resources

- 🆓 interested in financial independence

- 🙅 saying no to spreadsheets in 2021

- 😎 still reading this list

## Features

- ✅ Create, update and delete transactions
- ✅ Portfolio performance (`Today`, `YTD`, `1Y`, `5Y`, `Max`)
- ✅ Various charts
- ✅ Static analysis to identify potential risks in your portfolio
- ✅ Dark Mode

## Technology

Ghostfolio is a modern web application written in [TypeScript](https://www.typescriptlang.org) and organized as an [Nx](https://nx.dev) workspace.

### Frontend

The frontend is built with [Angular](https://angular.io).

### Backend

The backend is based on [NestJS](https://nestjs.com) using [PostgreSQL](https://www.postgresql.org) as a database and [Redis](https://redis.io) for caching.

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
7. Login as _Admin_ with the following _Security Token_: `ae76872ae8f3419c6d6f64bf51888ecbcc703927a342d815fafe486acdb938da07d0cf44fca211a0be74a423238f535362d390a41e81e633a9ce668a6e31cdf9`

## Development

### Start server

- Debug: Run `yarn watch:server` and click "Launch Program" in _Visual Studio Code_
- Serve: Run `yarn start:server`

### Start client

- Run `yarn start:client`

## Testing

Run `yarn test`

## License

Licensed under the [AGPLv3 License](https://www.gnu.org/licenses/agpl-3.0.html).
