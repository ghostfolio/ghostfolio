<div align="center">
  <a href="https://ghostfol.io">
    <img
      alt="Ghostfolio Logo"
      src="https://avatars.githubusercontent.com/u/82473144?s=200"
      width="100"
    />
  </a>

  <h1>Ghostfolio</h1>
  <p>
    <strong>Open Source Wealth Management Software made for Humans</strong>
  </p>
  <p>
    <a href="https://ghostfol.io"><strong>Live Demo</strong></a> | <a href="https://ghostfol.io/pricing"><strong>Ghostfolio Premium</strong></a> | <a href="https://ghostfol.io/en/blog/2021/07/hello-ghostfolio"><strong>Blog</strong></a> | <a href="https://join.slack.com/t/ghostfolio/shared_invite/zt-vsaan64h-F_I0fEo5M0P88lP9ibCxFg"><strong>Slack</strong></a> | <a href="https://twitter.com/ghostfolio_"><strong>Twitter</strong></a>
  </p>
  <p>
    <a href="#contributing">
      <img src="https://img.shields.io/badge/contributions-welcome-orange.svg"/></a>
    <a href="https://travis-ci.com/github/ghostfolio/ghostfolio" rel="nofollow">
      <img src="https://travis-ci.com/ghostfolio/ghostfolio.svg?branch=main" alt="Build Status"/></a>
    <a href="https://www.gnu.org/licenses/agpl-3.0" rel="nofollow">
      <img src="https://img.shields.io/badge/License-AGPL%20v3-blue.svg" alt="License: AGPL v3"/></a>
  </p>
</div>

**Ghostfolio** is an open source wealth management software built with web technology. The application empowers busy people to keep track of their wealth like stocks, ETFs or cryptocurrencies and make solid, data-driven investment decisions.

<div align="center">
  <img src="./apps/client/src/assets/images/screenshot.png" width="300">
</div>

## Ghostfolio Premium

Our official **[Ghostfolio Premium](https://ghostfol.io/pricing)** cloud offering is the easiest way to get started. Due to the time it saves, this will be the best option for most people. The revenue is used for covering the hosting costs.

If you prefer to run Ghostfolio on your own infrastructure, please find the source code and further instructions here on _GitHub_.

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
- ✅ Portfolio performance: Time-weighted rate of return (TWR) for `Today`, `YTD`, `1Y`, `5Y`, `Max`
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
1. Go to the _Admin Control Panel_ and click _Gather All Data_ to fetch historical data
1. Click _Sign out_ and check out the _Live Demo_

## Development

Please make sure you have completed the instructions from [_Setup_](#Setup).

### Start server

<ol type="a">
  <li>Debug: Run <code>yarn watch:server</code> and click "Launch Program" in <i>Visual Studio Code</i></li>
  <li>Serve: Run <code>yarn start:server</code></li>
</ol>

### Start client

Run `yarn start:client`

### Start _Storybook_

Run `yarn start:storybook`

## Testing

Run `yarn test`

## Contributing

Ghostfolio is **100% free** and **open source**. We encourage and support an active and healthy community that accepts contributions from the public - including you.

Not sure what to work on? We have got some ideas. Please tweet to [@ghostfolio\_](https://twitter.com/ghostfolio_) or send an e-mail to hi@ghostfol.io. We would love to hear from you.

## License

© 2021 [Ghostfolio](https://ghostfol.io)

Licensed under the [AGPLv3 License](https://www.gnu.org/licenses/agpl-3.0.html).
