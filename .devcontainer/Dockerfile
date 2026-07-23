FROM node:22-slim

# Match the build tooling used by the production Dockerfile (keep this
# list and the --no-install-suggests flag in sync with it) so native
# dependencies (e.g. Prisma) compile correctly inside the Dev Container
RUN apt-get update && apt-get install -y --no-install-suggests \
  g++ \
  git \
  make \
  openssl \
  python3 \
  && rm -rf /var/lib/apt/lists/*
