FROM node:14 as builder

WORKDIR /app

COPY ./package.json package.json
COPY ./yarn.lock yarn.lock
COPY ./prisma/schema.prisma prisma/schema.prisma

RUN yarn

COPY ./decorate-angular-cli.js decorate-angular-cli.js
RUN node decorate-angular-cli.js

COPY ./angular.json angular.json
COPY ./nx.json nx.json
COPY ./replace.build.js replace.build.js
COPY ./jest.preset.js jest.preset.js
COPY ./jest.config.js jest.config.js
COPY ./tsconfig.base.json tsconfig.base.json
COPY ./libs libs
COPY ./apps apps

RUN yarn build:all

COPY ./prisma/seed.ts prisma/seed.ts

FROM node:14
COPY --from=builder /app/dist/apps /app/apps
COPY --from=builder /app/package.json /app/package.json
# todo: change build to ensure that node_modules folder isn't required to reduce image size
COPY --from=builder /app/node_modules /app/node_modules
COPY --from=builder /app/prisma /app/prisma
WORKDIR /app
EXPOSE 3333
CMD [ "npm", "run", "start:prod" ]
