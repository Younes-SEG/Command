FROM node:24-bookworm-slim AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
# The existing lockfile pins the shared reader dependencies and tsx runtime.
RUN npm ci --ignore-scripts --no-audit --no-fund

FROM node:24-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production
ENV SYLLABUS_BIND=0.0.0.0
ENV SYLLABUS_DATA_DIR=/var/lib/command-syllabus
COPY --from=dependencies /app/node_modules ./node_modules
COPY package.json ./
COPY services/syllabus/*.ts ./services/syllabus/
COPY src/lib/syllabus.ts src/lib/syllabus-result.ts src/lib/types.ts ./src/lib/
COPY src/lib/server/errors.ts src/lib/server/syllabus-ai.ts src/lib/server/syllabus-text.ts ./src/lib/server/
RUN mkdir -p /var/lib/command-syllabus && chown node:node /var/lib/command-syllabus
USER node
EXPOSE 8080
CMD ["node", "--import", "tsx", "services/syllabus/main.ts"]
