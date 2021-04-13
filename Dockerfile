FROM node:14

# Create app directory
WORKDIR /app

COPY . .

EXPOSE 3333
CMD [ "npm", "run", "start:prod" ]
