FROM triliumnext/notes

WORKDIR /usr/src/app

# Install TypeScript and development dependencies globally
RUN npm install -g typescript ts-node @types/node

# Copy package files and install dependencies
COPY package*.json tsconfig.json ./
RUN npm install

# Copy source files
COPY . .

# Set environment variables
ENV TRILIUM_ENV=dev
ENV NODE_NO_WARNINGS=1
ENV TRILIUM_DATA_DIR=/usr/src/app/data

# Run TypeScript directly with ts-node and file watching
CMD ["npx", "nodemon", "src/main.ts"]