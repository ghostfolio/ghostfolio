FROM --platform=$BUILDPLATFORM node:20-slim as builder

# Build application and add additional files
WORKDIR /ghostfolio

# Only add basic files without the application itself to avoid rebuilding
# layers when files (package.json etc.) have not changed
COPY ./CHANGELOG.md CHANGELOG.md
COPY ./LICENSE LICENSE
COPY ./package.json package.json
COPY ./package-lock.json package-lock.json
COPY ./prisma/schema.prisma prisma/schema.prisma

RUN apt update && apt install -y \
    g++ \
    git \
    make \
    openssl \
    python3 \
    && rm -rf /var/lib/apt/lists/*
RUN npm install

# See https://github.com/nrwl/nx/issues/6586 for further details
COPY ./decorate-angular-cli.js decorate-angular-cli.js
RUN node decorate-angular-cli.js

COPY ./nx.json nx.json
COPY ./replace.build.js replace.build.js
COPY ./jest.preset.js jest.preset.js
COPY ./jest.config.ts jest.config.ts
COPY ./tsconfig.base.json tsconfig.base.json
COPY ./libs libs
COPY ./apps apps

RUN npm run build:production

# Prepare the dist image with additional node_modules
WORKDIR /ghostfolio/dist/apps/api
# package.json was generated by the build process, however the original
# package-lock.json needs to be used to ensure the same versions
COPY ./package-lock.json /ghostfolio/dist/apps/api/package-lock.json

RUN npm install
COPY prisma /ghostfolio/dist/apps/api/prisma

# Overwrite the generated package.json with the original one to ensure having
# all the scripts
COPY package.json /ghostfolio/dist/apps/api
RUN npm run database:generate-typings

# Image to run, copy everything needed from builder
FROM node:20-slim

LABEL org.opencontainers.image.source="https://github.com/ghostfolio/ghostfolio"

RUN apt update && apt install -y \
    curl \
    openssl \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /ghostfolio/dist/apps /ghostfolio/apps
COPY ./docker/entrypoint.sh /ghostfolio/entrypoint.sh
WORKDIR /ghostfolio/apps/api
EXPOSE ${PORT:-3333}
CMD [ "/ghostfolio/entrypoint.sh" ]
