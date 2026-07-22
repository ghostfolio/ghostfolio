# Ghostfolio Development Guide

## Development Environment

### Prerequisites

- [Docker](https://www.docker.com/products/docker-desktop)
- [Node.js](https://nodejs.org/en/download) (version `>=22.18.0`)
- Create a local copy of this Git repository (clone)
- Copy the file `.env.dev` to `.env` and populate it with your data (`cp .env.dev .env`)

### Setup

1. Run `npm install`
1. Run `docker compose -f docker/docker-compose.dev.yml up -d` to start [PostgreSQL](https://www.postgresql.org) and [Redis](https://redis.io)
1. Run `npm run database:setup` to initialize the database schema
1. Start the [server](#start-server) and the [client](#start-client)
1. Open https://localhost:4200/en in your browser
1. Create a new user via _Get Started_ (this first user will get the role `ADMIN`)

### Dev Container

As an alternative to the manual _Setup_ above, [Visual Studio Code](https://code.visualstudio.com) users can develop inside a [Dev Container](https://containers.dev). It runs the application in a Docker container alongside [PostgreSQL](https://www.postgresql.org) and [Redis](https://redis.io), pre-installed with the required build tooling (Node.js 22, `g++`, `git`, `make`, `openssl`, `python3`).

#### Prerequisites

- [Docker](https://www.docker.com/products/docker-desktop)
- [Visual Studio Code](https://code.visualstudio.com) with the [Dev Containers](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers) extension
- Copy the file `.env.dev` to `.env` and populate it with your data (`cp .env.dev .env`)

**Info:** Use `.env.dev`, not `.env.example`, as the base for `.env`, since it also sets `NX_ADD_PLUGINS=false` to keep _Nx_ behaving the same as in the manual _Setup_ above. Inside the Dev Container, the application and the databases run as separate containers on the same Docker network, so after copying, change `DATABASE_URL` and `REDIS_HOST` to point to the service names `postgres` and `redis` instead of `localhost`.

#### Setup

1. Open the repository folder in Visual Studio Code
1. Run the command _Dev Containers: Reopen in Container_ (this builds the container and runs `npm install` automatically)
1. In the container's integrated terminal, run `npm run database:setup` to initialize the database schema
1. Start the [server](#start-server)
1. Start the client with `npm run start:client -- --host 0.0.0.0` instead of the usual command (see note below)
1. Open https://localhost:4200/en in your browser
1. Create a new user via _Get Started_ (this first user will get the role `ADMIN`)

**Info:** The client dev server binds to `localhost` by default, which is only reachable from within the container itself. Passing `--host 0.0.0.0` makes it listen on all interfaces so Visual Studio Code's forwarded port reaches it from your browser on the host. This is not required for the server, which already binds to `0.0.0.0` by default. The `start:client` script also passes `-o` to open a browser automatically; since there is no browser inside the container, this will harmlessly fail and can be ignored.

### Start Server

#### Debug

Run `npm run watch:server` and click _Debug API_ in [Visual Studio Code](https://code.visualstudio.com)

#### Serve

Run `npm run start:server`

### Start Client

#### English (Default)

Run `npm run start:client` and open https://localhost:4200/en in your browser.

#### Other Languages

To start the client in a different language, such as German (`de`), adapt the `start:client` script in the `package.json` file by changing `--configuration=development-en` to `--configuration=development-de`. Then, run `npm run start:client` and open https://localhost:4200/de in your browser.

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

### NestJS

#### Upgrade (minor versions)

1. Run `npx npm-check-updates --upgrade --target "minor" --filter "/@nestjs.*/"`

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
