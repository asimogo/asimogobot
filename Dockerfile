FROM node:20-alpine3.19

# 添加必要的系统包和安全更新
RUN apk update && apk upgrade && \
    apk add --no-cache dumb-init curl && \
    rm -rf /var/cache/apk/*

# 创建非root用户
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

# 复制package文件并更改所有权
COPY --chown=nodejs:nodejs package*.json ./

# 安装依赖（仅生产依赖）
RUN npm ci --only=production && npm cache clean --force

# 复制源代码并更改所有权
COPY --chown=nodejs:nodejs . .

# 构建应用
RUN npm run build

# 删除源码和开发依赖，只保留编译后的代码
RUN rm -rf src tsconfig.json nodemon.json && \
    rm -rf node_modules && \
    npm ci --only=production && \
    npm cache clean --force

# 切换到非root用户
USER nodejs

# 暴露端口（用于健康检查）
EXPOSE 3000

# 设置环境变量
ENV NODE_ENV=production
ENV PORT=3000

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# 使用dumb-init启动应用
ENTRYPOINT ["dumb-init", "--"]
CMD ["npm", "start"]
