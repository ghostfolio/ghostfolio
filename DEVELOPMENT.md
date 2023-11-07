# Ghostfolio Development Guide

## Experimental Features

New functionality can be enabled using a feature flag switch from the user settings.

### Backend

Remove permission in `UserService` using `without()`

### Frontend

Use `*ngIf="user?.settings?.isExperimentalFeatures"` in HTML template

## Git

### Rebase

`git rebase -i --autosquash main`

## Dependencies

### Angular

#### Upgrade (minor versions)

1. Run `npx npm-check-updates --upgrade --target "minor" --filter "/@angular.*/"`

### Nx

#### Upgrade

1. Run `yarn nx migrate latest`
1. Make sure `package.json` changes make sense and then run `yarn install`
1. Run `yarn nx migrate --run-migrations`

### Prisma

#### Access database via GUI

Run `yarn database:gui`

https://www.prisma.io/studio

#### Synchronize schema with database for prototyping

Run `yarn database:push`

https://www.prisma.io/docs/concepts/components/prisma-migrate/db-push

#### Create schema migration

Run `yarn prisma migrate dev --name added_job_title`

https://www.prisma.io/docs/concepts/components/prisma-migrate#getting-started-with-prisma-migrate
