<div align="center">
	<h1>Ghostfolio</h1>
	<p>
		<strong>Privacy-first Portfolio Tracker</strong>
	</p>
  <p>
    <a href="https://www.ghostfol.io"><strong>Ghostfolio</strong></a>
  </p>
</div>

## Features

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
4. Run `docker compose up -d`
5. Run `yarn setup:database`
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
