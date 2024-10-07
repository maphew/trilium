# !!! Don't try to build this Dockerfile directly, run it through bin/build-docker.sh script !!!
FROM node:20.15.1-bullseye-slim

RUN echo "--- Configure system dependencies"
RUN apt-get update && apt-get install -y --no-install-recommends \
    autoconf \
    automake \
    g++ \
    gcc \
    libtool \
    make \
    nasm \
    libpng-dev \
    python3 \
    gosu \
    && rm -rf /var/lib/apt/lists/*


RUN echo "--- Create app directory"
WORKDIR /usr/src/app

# this takes quite a long time. I guess why it's usually done in bin/build-docker.sh instead.
RUN echo "--- mhw debug: compiling typescript..."
RUN npm install typescript
RUN ./node_modules/.bin/tsc


RUN echo "--- Bundle app source"
# copy target must match WORKDIR
COPY ./ /usr/src/app
COPY server-package.json package.json


RUN echo "--- Copy TypeScript build artifacts into the original directory structure."
RUN echo "--- Copy the healthcheck"
RUN cp -R build/src/* src/. && \
    cp build/docker_healthcheck.js . && \
    rm -r build && \
    rm docker_healthcheck.ts

RUN echo "--- Install app dependencies"
RUN apt-get purge -y --auto-remove \
    autoconf \
    automake \
    g++ \
    gcc \
    libtool \
    make \
    nasm \
    libpng-dev \
    python3 \
    && rm -rf /var/lib/apt/lists/*
RUN npm install && \
    npm run webpack && \
    npm prune --omit=dev
RUN cp src/public/app/share.js src/public/app-dist/. && \
    cp -r src/public/app/doc_notes src/public/app-dist/. && \
    rm -rf src/public/app && rm src/services/asset_path.ts

RUN echo "--- Some setup tools need to be kept"
RUN apt-get update && apt-get install -y --no-install-recommends \
    gosu \
    && rm -rf /var/lib/apt/lists/*

RUN echo "--- Start the application"
EXPOSE 8080
CMD [ "./start-docker.sh" ]

HEALTHCHECK --start-period=10s CMD exec gosu node node docker_healthcheck.js
