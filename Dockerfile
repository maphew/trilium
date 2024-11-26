# Build stage
FROM node:20.15.1-bullseye-slim AS builder

# Configure build dependencies in a single layer
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
    && rm -rf /var/lib/apt/lists/*

WORKDIR /usr/src/app

# Copy only necessary files for build
COPY . .
# COPY server-package.json package.json
# remove electron from package.json
RUN cat package.json | grep -v electron > server-package.json && cp server-package.json package.json

# Install dependencies
RUN npm install

# Build TypeScript (excluding docker_healthcheck.ts)
RUN npx tsc -p tsconfig.prod.json && \
    echo "TypeScript build completed"

# Debug: Show TypeScript output
RUN find build/src -type f -name "*.js" | sort

# Create dist and required directories
RUN mkdir -p dist/public/app && \
    mkdir -p src/public/app-dist

# Copy files in the correct order
RUN cp -R build/src/* dist/ && \
    cp -R src/public/app src/public/app-dist/ && \
    cp dist/services/asset_path.js src/services/

# Now compile docker_healthcheck.ts with access to compiled js files
RUN npx tsc docker_healthcheck.ts --module NodeNext --moduleResolution NodeNext --esModuleInterop --outDir . && \
    echo "Healthcheck TypeScript build completed"

# Debug: Show file structure before webpack
RUN echo "=== Directory structure before webpack ===" && \
    find src/public -type f -name "*.js" | sort

# Build and optimize for production
RUN NODE_DEBUG=webpack npm run webpack && \
    npm prune --omit=dev && \
    npm cache clean --force

# Cleanup build artifacts after webpack is done
RUN rm -rf build src/

# Runtime stage
FROM node:20.15.1-bullseye-slim

# Install runtime dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gosu \
    && rm -rf /var/lib/apt/lists/* && \
    rm -rf /var/cache/apt/*

WORKDIR /usr/src/app

# Copy only necessary files from builder
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/db ./db
COPY --from=builder /usr/src/app/docker_healthcheck.js .
COPY --from=builder /usr/src/app/start-docker.sh .
COPY --from=builder /usr/src/app/package.json .
COPY --from=builder /usr/src/app/config-sample.ini .
COPY --from=builder /usr/src/app/images ./images
COPY --from=builder /usr/src/app/translations ./translations
COPY --from=builder /usr/src/app/libraries ./libraries

# Add application user
RUN adduser -s /bin/false node; exit 0

# Set up volumes and user
VOLUME /data
RUN chown -R node:node /data

# Set up healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node docker_healthcheck.js

# Run as non-root user
USER node

# Start the application
EXPOSE 8080
CMD ["node", "dist/main.js"]

# CMD [ "./start-docker.sh" ]
# HEALTHCHECK --start-period=10s CMD exec gosu node node docker_healthcheck.js
