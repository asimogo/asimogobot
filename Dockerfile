# ---- Base ----
FROM node:20-alpine AS base
RUN apk add --no-cache tini
WORKDIR /app
ENV NODE_ENV=production
ENTRYPOINT ["/sbin/tini", "--"]

# ---- Production deps (no dev) ----
FROM base AS deps
COPY package*.json ./
RUN npm ci --omit=dev

# ---- Builder (含 dev 依赖，构建 TS 等) ----
FROM node:20-alpine AS builder
RUN apk add --no-cache tini
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# 如果是 TS，请确保 package.json 有 "build" 脚本
# 没有也没关系，下面这条会忽略错误继续（允许纯 JS 项目）
RUN npm run build || echo "No build script; skip build"

# ---- Production runtime ----
FROM base AS production
ENV NODE_ENV=production
USER node
WORKDIR /app
# 生产依赖
COPY --chown=node:node --from=deps /app/node_modules ./node_modules
# 复制构建产物与源码（dist 若存在则包含）
COPY --chown=node:node --from=builder /app ./

# 默认启动：可使用环境变量 START_CMD 覆盖
# 例如：START_CMD="npm run start" 或 "node dist/index.js"
CMD ["sh", "-c", "${START_CMD:-node dist/bot/bot.js}"]

# ---- Dev runtime ----
FROM node:20-alpine AS dev
RUN apk add --no-cache tini
WORKDIR /app
ENV NODE_ENV=development
ENTRYPOINT ["/sbin/tini", "--"]
COPY package*.json ./
RUN npm ci
COPY . .
CMD ["npm", "run", "dev"]
