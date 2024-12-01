FROM triliumnext/notes

WORKDIR /usr/src/app

# Install TypeScript and build dependencies
# Only typescript, no ts-node needed
RUN npm install -g --no-cache typescript

# Copy package files and install dependencies
COPY package*.json tsconfig.json ./
RUN npm install

# Copy source files
COPY . .

# Build TypeScript files. 
# Pruning removes dev dependencies, and del .cache to reduce image size
RUN npm run webpack && \
    npm run prepare-dist && \
    cp -R dist/* src/. && \
    rm -rf dist && \
    npm prune --production && \
    rm -rf node_modules/.cache

# Set production environment
ENV NODE_ENV=production
ENV NODE_NO_WARNINGS=1
ENV TRILIUM_DATA_DIR=/data
ENV TRILIUM_PORT=8080

# Create data directory
RUN mkdir -p /data && chown -R node:node /data

# Switch to non-root user
USER node

# Run the compiled JavaScript
CMD ["node", "src/main.js"]
