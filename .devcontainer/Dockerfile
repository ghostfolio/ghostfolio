FROM node:22-slim

# Match the build tooling used by the production Dockerfile so native
# dependencies (e.g. Prisma) compile correctly inside the Dev Container
RUN apt-get update && apt-get install -y --no-install-recommends \
  g++ \
  git \
  make \
  openssl \
  python3 \
  && rm -rf /var/lib/apt/lists/*
