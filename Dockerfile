# ---- build stage ----
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# ---- runtime stage ----
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
# 只带运行期需要的文件
COPY --from=build /app/dist ./dist
COPY package*.json ./
RUN npm ci --omit=dev
# 可选：非 root 运行
USER node
CMD ["node", "dist/bot/bot.js"]
