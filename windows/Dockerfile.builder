# Build stage
# compile TypeScript files and copy them to /build
# exclude electron dependencies

FROM node:20.15.1-alpine

WORKDIR /build

# Copy package files first for better caching
COPY --chown=node:node package*.json ./
COPY --chown=node:node windows/webpack.types.d.ts ./

# Copy rest of the source
COPY --chown=node:node . .

# Switch to non-root user for building
USER node

RUN npm ci
RUN npx tsc
RUN cat package.json | grep -v electron > server-package.json

CMD ["cp", "-r", "/build", "/output"]
