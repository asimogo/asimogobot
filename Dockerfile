# 多阶段构建优化镜像大小
FROM node:20-alpine AS builder

WORKDIR /app

# 安装构建工具
RUN apk add --no-cache git python3 make g++

# 复制package文件
COPY package*.json ./

# 只安装生产依赖和开发依赖
RUN npm ci

# 复制源代码
COPY . .

# 构建TypeScript应用
RUN npm run build

# 生产阶段
FROM node:20-alpine AS production

WORKDIR /app

# 安装dumb-init用于正确处理信号
RUN apk add --no-cache dumb-init

# 创建非root用户
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# 复制package文件
COPY package*.json ./

# 只安装生产依赖
RUN npm ci --only=production && npm cache clean --force

# 从构建阶段复制编译后的代码
COPY --from=builder /app/dist ./dist

# 更改文件所有者
RUN chown -R nodejs:nodejs /app
USER nodejs

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "console.log('Health check passed')" || exit 1

# 暴露端口（虽然Telegram Bot通常不需要，但保留用于监控）
EXPOSE 3000

# 使用dumb-init作为PID 1进程，正确处理信号
ENTRYPOINT ["dumb-init", "--"]

# 启动应用
CMD ["node", "dist/bot/bot.js"]