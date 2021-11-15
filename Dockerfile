# arm32 for arm32
ARG ARCH="all"

#--------------------------------------------------------------

FROM node:17.1-bullseye-slim as build-base-all

WORKDIR /lnurl

RUN apt-get update && apt-get install -y openssl

COPY package.json /lnurl

RUN npm install

#--------------------------------------------------------------

# Prisma team officially doesn't support arm32 engines binaries.
# pantharshit00 put together what's needed to build them:
# https://github.com/prisma/prisma/issues/5379#issuecomment-843961332
# https://github.com/pantharshit00/prisma-rpi-builds

# We will be using those.

# This stage will only be used when building the image with build-arg ARCH=arm32

FROM node:17.1-bullseye-slim as build-base-arm32

WORKDIR /lnurl

RUN apt-get update && apt-get install -y openssl wget

COPY --from=build-base-all /lnurl/node_modules/ /lnurl/node_modules/

RUN wget --quiet -O /lnurl/node_modules/@prisma/engines/introspection-engine https://github.com/pantharshit00/prisma-rpi-builds/releases/download/3.2.1/introspection-engine \
 && wget --quiet -O /lnurl/node_modules/@prisma/engines/libquery_engine.so https://github.com/pantharshit00/prisma-rpi-builds/releases/download/3.2.1/libquery_engine.so \
 && wget --quiet -O /lnurl/node_modules/@prisma/engines/migration-engine https://github.com/pantharshit00/prisma-rpi-builds/releases/download/3.2.1/migration-engine \
 && wget --quiet -O /lnurl/node_modules/@prisma/engines/prisma-fmt https://github.com/pantharshit00/prisma-rpi-builds/releases/download/3.2.1/prisma-fmt \
 && wget --quiet -O /lnurl/node_modules/@prisma/engines/query-engine https://github.com/pantharshit00/prisma-rpi-builds/releases/download/3.2.1/query-engine

RUN cd /lnurl/node_modules/@prisma/engines/ \
 && chmod +x introspection-engine migration-engine prisma-fmt query-engine

ENV PRISMA_QUERY_ENGINE_BINARY=/lnurl/node_modules/@prisma/engines/query-engine
ENV PRISMA_MIGRATION_ENGINE_BINARY=/lnurl/node_modules/@prisma/engines/migration-engine
ENV PRISMA_INTROSPECTION_ENGINE_BINARY=/lnurl/node_modules/@prisma/engines/introspection-engine
ENV PRISMA_FMT_BINARY=/lnurl/node_modules/@prisma/engines/prisma-fmt
ENV PRISMA_QUERY_ENGINE_LIBRARY=/lnurl/node_modules/@prisma/engines/libquery_engine.so
ENV PRISMA_CLI_QUERY_ENGINE_TYPE=binary
ENV PRISMA_QUERY_ENGINE_TYPE=binary

#--------------------------------------------------------------

FROM build-base-${ARCH}

ENV PRISMA_CLI_QUERY_ENGINE_TYPE=binary
ENV PRISMA_QUERY_ENGINE_TYPE=binary

COPY package.json /lnurl
COPY tsconfig.json /lnurl
COPY prisma /lnurl/prisma
COPY src /lnurl/src

RUN npx prisma generate
RUN npm run build

EXPOSE 9229 3000

ENTRYPOINT [ "npm", "run", "start" ]
