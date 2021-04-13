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
2. Run `yarn docker:dockerize`
3. Copy `.env.sample` to `docker/.env`
4. Run `cd docker/<version>`
5. Run `docker-compose build`
6. Run `docker-compose up -d`

## Development

- Start server
  - Serve: Run `yarn start:server`
  - Debug: Run `yarn watch:server` and run "Launch Program" in _Visual Studio Code_
- Start client
  - Run `yarn start:client`
