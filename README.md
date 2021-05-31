<div align="center">
  <h1>Ghostfolio</h1>
  <p>
    <strong>Open Source Portfolio Tracker</strong>
  </p>
  <p>
    <a href="https://ghostfol.io"><strong>Live Demo</strong></a>
  </p>
  <p>
    <img src="https://img.shields.io/badge/contributions-welcome-orange.svg"/>
    <a href="https://travis-ci.org/github/ghostfolio/ghostfolio" rel="nofollow">
      <img src="https://travis-ci.org/ghostfolio/ghostfolio.svg?branch=main" alt="Build Status"/></a>
    <a href="https://www.gnu.org/licenses/agpl-3.0" rel="nofollow">
      <img src="https://img.shields.io/badge/License-AGPL%20v3-blue.svg" alt="License: AGPL v3"/></a>
  </p>
</div>

**Ghostfolio** is an open source portfolio tracker based on web technology. The software empowers busy folks to have a sharp look of their financial assets and to make solid, data-driven investment decisions by evaluating automated static portfolio analysis rules.

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
- ✅ Multi account management
- ✅ Portfolio performance (`Today`, `YTD`, `1Y`, `5Y`, `Max`)
- ✅ Various charts
- ✅ Static analysis to identify potential risks in your portfolio
- ✅ Dark Mode
- ✅ Zen Mode
- ✅ Mobile-first design

## Technology Stack

Ghostfolio is a modern web application written in [TypeScript](https://www.typescriptlang.org) and organized as an [Nx](https://nx.dev) workspace.

### Backend

The backend is based on [NestJS](https://nestjs.com) using [PostgreSQL](https://www.postgresql.org) as a database together with [Prisma](https://www.prisma.io) and [Redis](https://redis.io) for caching.

### Frontend

The frontend is built with [Angular](https://angular.io) and uses [Angular Material](https://material.angular.io) with utility classes from [Bootstrap](https://getbootstrap.com).

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/en/download) (version 14+)
- [Yarn](https://yarnpkg.com/en/docs/install)
- [Docker](https://www.docker.com/products/docker-desktop)

### Setup

1. Run `yarn install`
1. Run `cd docker`
1. Run `docker compose up -d` to start [PostgreSQL](https://www.postgresql.org) and [Redis](https://redis.io)
1. Run `cd -` to go back to the project root directory
1. Run `yarn setup:database` to initialize the database schema and populate your database with (example) data
1. Start server and client (see [_Development_](#Development))
1. Login as _Admin_ with the following _Security Token_: `ae76872ae8f3419c6d6f64bf51888ecbcc703927a342d815fafe486acdb938da07d0cf44fca211a0be74a423238f535362d390a41e81e633a9ce668a6e31cdf9`
1. Go to the _Admin Control Panel_ and press _Gather All Data_ to fetch historical data
1. Press _Sign out_ and check out the _Live Demo_

## Development

Please make sure you have completed the instructions from [_Setup_](#Setup)

### Start server

- Debug: Run `yarn watch:server` and click "Launch Program" in _Visual Studio Code_
- Serve: Run `yarn start:server`

### Start client

- Run `yarn start:client`

## Testing

Run `yarn test`

## License

© 2021 [Ghostfolio](https://ghostfol.io)

Licensed under the [AGPLv3 License](https://www.gnu.org/licenses/agpl-3.0.html).
