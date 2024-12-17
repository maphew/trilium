FROM triliumnext/notes

WORKDIR /usr/src/app

# Switch to root for system operations
USER root

# Install git and TypeScript
RUN apk update && apk add --no-cache git && \
    npm install -g --no-cache typescript

# we were doing this before, it might still be needed
# # Copy package files and install dependencies
# COPY package*.json tsconfig.json ./

# Clone the local repository to a temp directory and copy files
RUN git clone --depth 1 --branch feature/bare2share-container . /tmp/trilium && \
    rm -rf /tmp/trilium/.git && \
    cp -r /tmp/trilium/. . && \
    rm -rf /tmp/trilium && \
    npm install && \
    npm run webpack && \
    npm run prepare-dist && \
    cp -R dist/* src/. && \
    rm -rf dist && \
    npm prune --production && \
    rm -rf node_modules/.cache

# Set dev or production environment
ENV NODE_ENV=development
ENV NODE_NO_WARNINGS=1
ENV TRILIUM_DATA_DIR=/data/test-2024-12-06
ENV TRILIUM_PORT=8080

# Create data directory and set permissions
RUN mkdir -p /data/test-2024-12-06 && \
    chown -R node:node /data /usr/src/app

# Switch to non-root user for security
USER node

EXPOSE 8080
CMD ["node", "src/main.js"]
