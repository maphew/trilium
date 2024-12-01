FROM triliumnext/notes

WORKDIR /usr/src/app

# Install TypeScript and build dependencies
RUN npm install -g typescript

# Copy package files and install dependencies
COPY package*.json tsconfig.json ./
RUN npm install

# Copy source files
COPY . .

# Build TypeScript files and clean up
RUN npm run webpack && \
    tsc && \
    cp -R build/src/* src/. && \
    rm -rf build && \
    npm prune --production && \
    rm -rf node_modules/.cache

# Set production environment
ENV NODE_ENV=production
ENV NODE_NO_WARNINGS=1
ENV TRILIUM_DATA_DIR=/usr/src/app/data

# Run the compiled JavaScript
CMD ["node", "src/main.js"]
