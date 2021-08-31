FROM node:14.11.0-alpine3.11 as build-base

WORKDIR /lnurl

COPY package.json /lnurl

RUN apk add --update --no-cache --virtual .gyp \
  python \
  make \
  g++
RUN npm install

#--------------------------------------------------------------

FROM node:14.11.0-alpine3.11
WORKDIR /lnurl

COPY --from=build-base /lnurl/node_modules/ /lnurl/node_modules/
COPY package.json /lnurl
COPY tsconfig.json /lnurl
COPY prisma /lnurl/prisma
COPY src /lnurl/src

RUN npx prisma generate
RUN npm run build

EXPOSE 9229 3000

ENTRYPOINT [ "npm", "run", "start" ]
