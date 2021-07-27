FROM node:14.11.0-alpine3.11 as build-base

WORKDIR /lnurl

COPY package.json /lnurl

RUN apk add --update --no-cache --virtual .gyp \
  python \
  make \
  g++
RUN npm install

#---------------------------------------------------

FROM build-base as base-slim
WORKDIR /lnurl

RUN apk del .gyp

#---------------------------------------------------

FROM base-slim
WORKDIR /lnurl

COPY tsconfig.json /lnurl
COPY src /lnurl/src

RUN npm run build

EXPOSE 9229 3000

ENTRYPOINT [ "npm", "run", "start" ]
