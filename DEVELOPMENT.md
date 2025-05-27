# Ghostfolio Development Guide

## Development Environment

### Prerequisites

- [Docker](https://www.docker.com/products/docker-desktop)
- [Node.js](https://nodejs.org/en/download) (version 22+)
- Create a local copy of this Git repository (clone)
- Copy the file `.env.dev` to `.env` and populate it with your data (`cp .env.dev .env`)

### Setup

1. Run `npm install`
1. Run `docker compose -f docker/docker-compose.dev.yml up -d` to start [PostgreSQL](https://www.postgresql.org) and [Redis](https://redis.io)
1. Run `npm run database:setup` to initialize the database schema
1. Start the [server](#start-server) and the [client](#start-client)
1. Open https://localhost:4200/en in your browser
1. Create a new user via _Get Started_ (this first user will get the role `ADMIN`)

### Start Server

#### Debug

Run `npm run watch:server` and click _Debug API_ in [Visual Studio Code](https://code.visualstudio.com)

#### Serve

Run `npm run start:server`

### Start Client

Run `npm run start:client` and open https://localhost:4200/en in your browser

### Start _Storybook_

Run `npm run start:storybook`

### Migrate Database

With the following command you can keep your database schema in sync:

```bash
npm run database:push
```

## Testing

Run `npm test`

## Experimental Features

New functionality can be enabled using a feature flag switch from the user settings.

### Backend

Remove permission in `UserService` using `without()`

### Frontend

Use `@if (user?.settings?.isExperimentalFeatures) {}` in HTML template

## Component Library (_Storybook_)

https://ghostfol.io/development/storybook

## Git

### Rebase

`git rebase -i --autosquash main`

## Dependencies

### Angular

#### Upgrade (minor versions)

1. Run `npx npm-check-updates --upgrade --target "minor" --filter "/@angular.*/"`

### Nx

#### Upgrade

1. Run `npx nx migrate latest`
1. Make sure `package.json` changes make sense and then run `npm install`
1. Run `npx nx migrate --run-migrations`

### Prisma

#### Access database via GUI

Run `npm run database:gui`

https://www.prisma.io/studio

#### Synchronize schema with database for prototyping

Run `npm run database:push`

https://www.prisma.io/docs/concepts/components/prisma-migrate/db-push

#### Create schema migration

Run `npm run prisma migrate dev --name added_job_title`

https://www.prisma.io/docs/concepts/components/prisma-migrate#getting-started-with-prisma-migrate

## SSL

Generate `localhost.cert` and `localhost.pem` files.

```
openssl req -x509 -newkey rsa:2048 -nodes -keyout apps/client/localhost.pem -out apps/client/localhost.cert -days 365 \
  -subj "/C=CH/ST=State/L=City/O=Organization/OU=Unit/CN=localhost"
```
