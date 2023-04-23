# Ghostfolio Development Guide

## Git

### Rebase

`git rebase -i --autosquash main`

## Dependencies

### Nx

#### Upgrade

1. Run `yarn nx migrate latest`
1. Make sure `package.json` changes make sense and then run `yarn install`
1. Run `yarn nx migrate --run-migrations`

### Prisma

#### Synchronize schema with database for prototyping

Run `yarn database:push`

https://www.prisma.io/docs/concepts/components/prisma-migrate/db-push

#### Create schema migration

Run `yarn prisma migrate dev --name added_job_title`

https://www.prisma.io/docs/concepts/components/prisma-migrate#getting-started-with-prisma-migrate
