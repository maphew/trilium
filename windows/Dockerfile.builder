# Just compile TypeScript and exclude Electron
FROM node:20.15.1-alpine

WORKDIR /usr/src/app
COPY . .

RUN npm ci && \
    npx tsc && \
    cat package.json | grep -v electron > server-package.json

CMD ["cp", "-r", "/usr/src/app", "/output"]
