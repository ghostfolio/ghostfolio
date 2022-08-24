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
    <strong>Open Source Wealth Management Software</strong>
  </p>
  <p>
    <a href="https://ghostfol.io"><strong>Ghostfol.io</strong></a> | <a href="https://ghostfol.io/en/demo"><strong>Live Demo</strong></a> | <a href="https://ghostfol.io/en/pricing"><strong>Ghostfolio Premium</strong></a> | <a href="https://ghostfol.io/en/faq"><strong>FAQ</strong></a> | <a href="https://ghostfol.io/en/blog"><strong>Blog</strong></a> | <a href="https://join.slack.com/t/ghostfolio/shared_invite/zt-vsaan64h-F_I0fEo5M0P88lP9ibCxFg"><strong>Slack</strong></a> | <a href="https://twitter.com/ghostfolio_"><strong>Twitter</strong></a>
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

**Ghostfolio** is an open source wealth management software built with web technology. The application empowers busy people to keep track of stocks, ETFs or cryptocurrencies and make solid, data-driven investment decisions.

<div align="center" style="margin-top: 1rem; margin-bottom: 1rem;">
  <a href="https://www.youtube.com/watch?v=yY6ObSQVJZk">
    <img src="./apps/client/src/assets/images/video-preview.jpg" width="600"></a>
</div>

## Ghostfolio Premium

Our official **[Ghostfolio Premium](https://ghostfol.io/en/pricing)** cloud offering is the easiest way to get started. Due to the time it saves, this will be the best option for most people. The revenue is used for covering the hosting costs.

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
- 🙅 saying no to spreadsheets in 2022
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
- ✅ Mobile-first design

<div align="center" style="margin-top: 1rem; margin-bottom: 1rem;">
  <img src="./apps/client/src/assets/images/screenshot.png" width="300">
</div>

## Technology Stack

Ghostfolio is a modern web application written in [TypeScript](https://www.typescriptlang.org) and organized as an [Nx](https://nx.dev) workspace.

### Backend

The backend is based on [NestJS](https://nestjs.com) using [PostgreSQL](https://www.postgresql.org) as a database together with [Prisma](https://www.prisma.io) and [Redis](https://redis.io) for caching.

### Frontend

The frontend is built with [Angular](https://angular.io) and uses [Angular Material](https://material.angular.io) with utility classes from [Bootstrap](https://getbootstrap.com).

## Self-hosting

### Supported Environment Variables

| Name                | Default Value | Description                                                                                                                         |
| ------------------- | ------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `ACCESS_TOKEN_SALT` |               | A random string used as salt for access tokens                                                                                      |
| `BASE_CURRENCY`     | `USD`         | The base currency of the Ghostfolio application. Caution: This cannot be changed later!                                             |
| `DATABASE_URL`      |               | The database connection URL, e.g. `postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@localhost:5432/${POSTGRES_DB}?sslmode=prefer` |
| `HOST`              | `0.0.0.0`     | The host where the Ghostfolio application will run on                                                                               |
| `JWT_SECRET_KEY`    |               | A random string used for _JSON Web Tokens_ (JWT)                                                                                    |
| `PORT`              | `3333`        | The port where the Ghostfolio application will run on                                                                               |
| `POSTGRES_DB`       |               | The name of the _PostgreSQL_ database                                                                                               |
| `POSTGRES_PASSWORD` |               | The password of the _PostgreSQL_ database                                                                                           |
| `POSTGRES_USER`     |               | The user of the _PostgreSQL_ database                                                                                               |
| `REDIS_HOST`        | `localhost`   | The host where _Redis_ is running                                                                                                   |
| `REDIS_PASSWORD`    |               | The password of _Redis_                                                                                                             |
| `REDIS_PORT`        | `6379`        | The port where _Redis_ is running                                                                                                   |

### Run with Docker Compose

#### Prerequisites

- Basic knowledge of Docker
- Installation of [Docker](https://www.docker.com/products/docker-desktop)
- Local copy of this Git repository (clone)

#### a. Run environment

Run the following command to start the Docker images from [Docker Hub](https://hub.docker.com/r/ghostfolio/ghostfolio):

```bash
docker-compose --env-file ./.env -f docker/docker-compose.yml up -d
```

#### b. Build and run environment

Run the following commands to build and start the Docker images:

```bash
docker-compose --env-file ./.env -f docker/docker-compose.build.yml build
docker-compose --env-file ./.env -f docker/docker-compose.build.yml up -d
```

#### Fetch Historical Data

Open http://localhost:3333 in your browser and accomplish these steps:

1. Create a new user via _Get Started_ (this first user will get the role `ADMIN`)
1. Go to the _Admin Control Panel_ and click _Gather All Data_ to fetch historical data
1. Click _Sign out_ and check out the _Live Demo_

#### Upgrade Version

1. Increase the version of the `ghostfolio/ghostfolio` Docker image in `docker/docker-compose.yml`
1. Run the following command to start the new Docker image: `docker-compose --env-file ./.env -f docker/docker-compose.yml up -d`  
   At each start, the container will automatically apply the database schema migrations if needed.

### Run with _Unraid_ (Community)

Please follow the instructions of the Ghostfolio [Unraid Community App](https://unraid.net/community/apps?q=ghostfolio).

## Development

### Prerequisites

- [Docker](https://www.docker.com/products/docker-desktop)
- [Node.js](https://nodejs.org/en/download) (version 16+)
- [Yarn](https://yarnpkg.com/en/docs/install)
- A local copy of this Git repository (clone)

### Setup

1. Run `yarn install`
1. Run `docker-compose --env-file ./.env -f docker/docker-compose.dev.yml up -d` to start [PostgreSQL](https://www.postgresql.org) and [Redis](https://redis.io)
1. Run `yarn database:setup` to initialize the database schema and populate your database with (example) data
1. Start the server and the client (see [_Development_](#Development))
1. Create a new user via _Get Started_ (this first user will get the role `ADMIN`)
1. Go to the _Admin Control Panel_ and click _Gather All Data_ to fetch historical data
1. Click _Sign out_ and check out the _Live Demo_

### Start Server

<ol type="a">
  <li>Debug: Run <code>yarn watch:server</code> and click "Launch Program" in <a href="https://code.visualstudio.com">Visual Studio Code</a></li>
  <li>Serve: Run <code>yarn start:server</code></li>
</ol>

### Start Client

Run `yarn start:client`

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

### Import Activities

#### Request

`POST http://localhost:3333/api/v1/import`

#### Authorization: Bearer Token

Set the header as follows:

```
"Authorization": "Bearer eyJh..."
```

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
      "symbol": "MSFT"
      "type": "BUY",
      "unitPrice": 298.58
    }
  ]
}
```

| Field      | Type                | Description                                        |
| ---------- | ------------------- | -------------------------------------------------- |
| accountId  | string (`optional`) | Id of the account                                  |
| currency   | string              | `CHF` \| `EUR` \| `USD` etc.                       |
| dataSource | string              | `MANUAL` (for type `ITEM`) \| `YAHOO`              |
| date       | string              | Date in the format `ISO-8601`                      |
| fee        | number              | Fee of the activity                                |
| quantity   | number              | Quantity of the activity                           |
| symbol     | string              | Symbol of the activity (suitable for `dataSource`) |
| type       | string              | `BUY` \| `DIVIDEND` \| `ITEM` \| `SELL`            |
| unitPrice  | number              | Price per unit of the activity                     |

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

## Contributing

Ghostfolio is **100% free** and **open source**. We encourage and support an active and healthy community that accepts contributions from the public - including you.

Not sure what to work on? We have got some ideas. Please join the Ghostfolio [Slack channel](https://join.slack.com/t/ghostfolio/shared_invite/zt-vsaan64h-F_I0fEo5M0P88lP9ibCxFg), tweet to [@ghostfolio\_](https://twitter.com/ghostfolio_) or send an e-mail to hi@ghostfol.io. We would love to hear from you.

If you like to support this project, get **[Ghostfolio Premium](https://ghostfol.io/en/pricing)** or **[Buy me a coffee](https://www.buymeacoffee.com/ghostfolio)**.

## License

© 2022 [Ghostfolio](https://ghostfol.io)

Licensed under the [AGPLv3 License](https://www.gnu.org/licenses/agpl-3.0.html).
