<div align="center">

[<img src="https://avatars.githubusercontent.com/u/82473144?s=200" width="100" alt="Ghostfolio logo">](https://ghostfol.io)

# Ghostfolio

**Open Source Wealth Management Software**

[**Ghostfol.io**](https://ghostfol.io) | [**Live Demo**](https://ghostfol.io/en/demo) | [**Ghostfolio Premium**](https://ghostfol.io/en/pricing) | [**FAQ**](https://ghostfol.io/en/faq) |
[**Blog**](https://ghostfol.io/en/blog) | [**Slack**](https://join.slack.com/t/ghostfolio/shared_invite/zt-vsaan64h-F_I0fEo5M0P88lP9ibCxFg) | [**X**](https://twitter.com/ghostfolio_)

[![Shield: Buy me a coffee](https://img.shields.io/badge/Buy%20me%20a%20coffee-Support-yellow?logo=buymeacoffee)](https://www.buymeacoffee.com/ghostfolio)
[![Shield: Contributions Welcome](https://img.shields.io/badge/Contributions-Welcome-orange.svg)](#contributing)
[![Shield: License: AGPL v3](https://img.shields.io/badge/License-AGPL%20v3-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)

</div>

**Ghostfolio** is an open source wealth management software built with web technology. The application empowers busy people to keep track of stocks, ETFs or cryptocurrencies and make solid, data-driven investment decisions. The software is designed for personal use in continuous operation.

<div align="center">

[<img src="./apps/client/src/assets/images/video-preview.jpg" width="600" alt="Preview image of the Ghostfolio video trailer">](https://www.youtube.com/watch?v=yY6ObSQVJZk)

</div>

## Ghostfolio Premium

Our official **[Ghostfolio Premium](https://ghostfol.io/en/pricing)** cloud offering is the easiest way to get started. Due to the time it saves, this will be the best option for most people. Revenue is used to cover the costs of the hosting infrastructure and to fund ongoing development.

If you prefer to run Ghostfolio on your own infrastructure, please find further instructions in the [Self-hosting](#self-hosting) section.

## Why Ghostfolio?

Ghostfolio is for you if you are...

- 💼 trading stocks, ETFs or cryptocurrencies on multiple platforms
- 🏦 pursuing a buy & hold strategy
- 🎯 interested in getting insights of your portfolio composition
- 👻 valuing privacy and data ownership
- 🧘 into minimalism
- 🧺 caring about diversifying your financial resources
- 🆓 interested in financial independence
- 🙅 saying no to spreadsheets
- 😎 still reading this list

## Features

- ✅ Create, update and delete transactions
- ✅ Multi account management
- ✅ Portfolio performance: Time-weighted rate of return (TWR) for `Today`, `YTD`, `1Y`, `5Y`, `Max`
- ✅ Various charts
- ✅ Static analysis to identify potential risks in your portfolio
- ✅ Import and export transactions
- ✅ Dark Mode
- ✅ Zen Mode
- ✅ Progressive Web App (PWA) with a mobile-first design

<div align="center">

<img src="./apps/client/src/assets/images/screenshot.png" width="300" alt="Image of a phone showing the Ghostfolio app open">

</div>

## Technology Stack

Ghostfolio is a modern web application written in [TypeScript](https://www.typescriptlang.org) and organized as an [Nx](https://nx.dev) workspace.

### Backend

The backend is based on [NestJS](https://nestjs.com) using [PostgreSQL](https://www.postgresql.org) as a database together with [Prisma](https://www.prisma.io) and [Redis](https://redis.io) for caching.

### Frontend

The frontend is built with [Angular](https://angular.io) and uses [Angular Material](https://material.angular.io) with utility classes from [Bootstrap](https://getbootstrap.com).

## Self-hosting

We provide official container images hosted on [Docker Hub](https://hub.docker.com/r/ghostfolio/ghostfolio) for `linux/amd64`, `linux/arm/v7` and `linux/arm64`.

<div align="center">

[<img src="./apps/client/src/assets/images/button-buy-me-a-coffee.png" width="150" alt="Buy me a coffee button"/>](https://www.buymeacoffee.com/ghostfolio)

</div>

### Supported Environment Variables

| Name                     | Type                | Default Value | Description                                                                                                                         |
| ------------------------ | ------------------- | ------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `ACCESS_TOKEN_SALT`      | string              |               | A random string used as salt for access tokens                                                                                      |
| `API_KEY_COINGECKO_DEMO` | string (`optional`) |               | The _CoinGecko_ Demo API key                                                                                                        |
| `API_KEY_COINGECKO_PRO`  | string (`optional`) |               | The _CoinGecko_ Pro API key                                                                                                         |
| `DATABASE_URL`           | string              |               | The database connection URL, e.g. `postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@localhost:5432/${POSTGRES_DB}?sslmode=prefer` |
| `HOST`                   | string (`optional`) | `0.0.0.0`     | The host where the Ghostfolio application will run on                                                                               |
| `JWT_SECRET_KEY`         | string              |               | A random string used for _JSON Web Tokens_ (JWT)                                                                                    |
| `PORT`                   | number (`optional`) | `3333`        | The port where the Ghostfolio application will run on                                                                               |
| `POSTGRES_DB`            | string              |               | The name of the _PostgreSQL_ database                                                                                               |
| `POSTGRES_PASSWORD`      | string              |               | The password of the _PostgreSQL_ database                                                                                           |
| `POSTGRES_USER`          | string              |               | The user of the _PostgreSQL_ database                                                                                               |
| `REDIS_DB`               | number (`optional`) | `0`           | The database index of _Redis_                                                                                                       |
| `REDIS_HOST`             | string              |               | The host where _Redis_ is running                                                                                                   |
| `REDIS_PASSWORD`         | string              |               | The password of _Redis_                                                                                                             |
| `REDIS_PORT`             | number              |               | The port where _Redis_ is running                                                                                                   |
| `REQUEST_TIMEOUT`        | number (`optional`) | `2000`        | The timeout of network requests to data providers in milliseconds                                                                   |

### Run with Docker Compose

#### Prerequisites

- Basic knowledge of Docker
- Installation of [Docker](https://www.docker.com/products/docker-desktop)
- Create a local copy of this Git repository (clone)
- Copy the file `.env.example` to `.env` and populate it with your data (`cp .env.example .env`)

#### a. Run environment

Run the following command to start the Docker images from [Docker Hub](https://hub.docker.com/r/ghostfolio/ghostfolio):

```bash
docker compose --env-file ./.env -f docker/docker-compose.yml up -d
```

#### b. Build and run environment

Run the following commands to build and start the Docker images:

```bash
docker compose --env-file ./.env -f docker/docker-compose.build.yml build
docker compose --env-file ./.env -f docker/docker-compose.build.yml up -d
```

#### Setup

1. Open http://localhost:3333 in your browser
1. Create a new user via _Get Started_ (this first user will get the role `ADMIN`)

#### Upgrade Version

1. Increase the version of the `ghostfolio/ghostfolio` Docker image in `docker/docker-compose.yml`
1. Run the following command to start the new Docker image: `docker compose --env-file ./.env -f docker/docker-compose.yml up -d`  
   At each start, the container will automatically apply the database schema migrations if needed.

### Home Server Systems (Community)

Ghostfolio is available for various home server systems, including [CasaOS](https://github.com/bigbeartechworld/big-bear-casaos), [Home Assistant](https://github.com/lildude/ha-addon-ghostfolio), [Runtipi](https://www.runtipi.io/docs/apps-available), [TrueCharts](https://truecharts.org/charts/stable/ghostfolio), [Umbrel](https://apps.umbrel.com/app/ghostfolio), and [Unraid](https://unraid.net/community/apps?q=ghostfolio).

## Development

### Prerequisites

- [Docker](https://www.docker.com/products/docker-desktop)
- [Node.js](https://nodejs.org/en/download) (version 18+)
- [Yarn](https://yarnpkg.com/en/docs/install)
- Create a local copy of this Git repository (clone)
- Copy the file `.env.dev` to `.env` and populate it with your data (`cp .env.dev .env`)

### Setup

1. Run `yarn install`
1. Run `docker compose --env-file ./.env -f docker/docker-compose.dev.yml up -d` to start [PostgreSQL](https://www.postgresql.org) and [Redis](https://redis.io)
1. Run `yarn database:setup` to initialize the database schema
1. Run `git config core.hooksPath ./git-hooks/` to setup git hooks
1. Start the server and the client (see [_Development_](#Development))
1. Open https://localhost:4200/en in your browser
1. Create a new user via _Get Started_ (this first user will get the role `ADMIN`)

### Start Server

#### Debug

Run `yarn watch:server` and click _Debug API_ in [Visual Studio Code](https://code.visualstudio.com)

#### Serve

Run `yarn start:server`

### Start Client

Run `yarn start:client` and open https://localhost:4200/en in your browser

### Start _Storybook_

Run `yarn start:storybook`

### Migrate Database

With the following command you can keep your database schema in sync:

```bash
yarn database:push
```

## Testing

Run `yarn test`

## Public API

### Authorization: Bearer Token

Set the header for each request as follows:

```
"Authorization": "Bearer eyJh..."
```

You can get the _Bearer Token_ via `POST http://localhost:3333/api/v1/auth/anonymous` (Body: `{ "accessToken": "<INSERT_SECURITY_TOKEN_OF_ACCOUNT>" }`)

Deprecated: `GET http://localhost:3333/api/v1/auth/anonymous/<INSERT_SECURITY_TOKEN_OF_ACCOUNT>` or `curl -s http://localhost:3333/api/v1/auth/anonymous/<INSERT_SECURITY_TOKEN_OF_ACCOUNT>`.

### Import Activities

#### Request

`POST http://localhost:3333/api/v1/import`

#### Body

```
{
  "activities": [
    {
      "currency": "USD",
      "dataSource": "YAHOO",
      "date": "2021-09-15T00:00:00.000Z",
      "fee": 19,
      "quantity": 5,
      "symbol": "MSFT",
      "type": "BUY",
      "unitPrice": 298.58
    }
  ]
}
```

| Field      | Type                | Description                                                                   |
| ---------- | ------------------- | ----------------------------------------------------------------------------- |
| accountId  | string (`optional`) | Id of the account                                                             |
| comment    | string (`optional`) | Comment of the activity                                                       |
| currency   | string              | `CHF` \| `EUR` \| `USD` etc.                                                  |
| dataSource | string              | `COINGECKO` \| `MANUAL` (for type `ITEM`) \| `YAHOO`                          |
| date       | string              | Date in the format `ISO-8601`                                                 |
| fee        | number              | Fee of the activity                                                           |
| quantity   | number              | Quantity of the activity                                                      |
| symbol     | string              | Symbol of the activity (suitable for `dataSource`)                            |
| type       | string              | `BUY` \| `DIVIDEND` \| `FEE` \| `INTEREST` \| `ITEM` \| `LIABILITY` \| `SELL` |
| unitPrice  | number              | Price per unit of the activity                                                |

#### Response

##### Success

`201 Created`

##### Error

`400 Bad Request`

```
{
  "error": "Bad Request",
  "message": [
    "activities.1 is a duplicate activity"
  ]
}
```

## Community Projects

Discover a variety of community projects for Ghostfolio: https://github.com/topics/ghostfolio

Are you building your own project? Add the `ghostfolio` topic to your _GitHub_ repository to get listed as well. [Learn more →](https://docs.github.com/en/articles/classifying-your-repository-with-topics)

## Contributing

Ghostfolio is **100% free** and **open source**. We encourage and support an active and healthy community that accepts contributions from the public - including you.

Not sure what to work on? We have [some ideas](https://github.com/ghostfolio/ghostfolio/issues?q=is%3Aissue+is%3Aopen+label%3A%22help+wanted%22), even for [newcomers](https://github.com/ghostfolio/ghostfolio/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22). Please join the Ghostfolio [Slack](https://join.slack.com/t/ghostfolio/shared_invite/zt-vsaan64h-F_I0fEo5M0P88lP9ibCxFg) channel or post to [@ghostfolio\_](https://twitter.com/ghostfolio_) on _X_. We would love to hear from you.

If you like to support this project, get [**Ghostfolio Premium**](https://ghostfol.io/en/pricing) or [**Buy me a coffee**](https://www.buymeacoffee.com/ghostfolio).

## Analytics

![Alt](https://repobeats.axiom.co/api/embed/281a80b2d0c4af1162866c24c803f1f18e5ed60e.svg 'Repobeats analytics image')

## License

© 2021 - 2024 [Ghostfolio](https://ghostfol.io)

Licensed under the [AGPLv3 License](https://www.gnu.org/licenses/agpl-3.0.html).
