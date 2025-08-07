# 第一阶段：构建阶段
FROM node:20-alpine AS builder

# 设置工作目录
WORKDIR /app

# 复制package文件
COPY package*.json ./
COPY tsconfig.json ./

# 安装所有依赖（包括开发依赖）
RUN npm install

# 复制源代码
COPY src ./src

# 构建项目
RUN npm run build

# 第二阶段：运行阶段
FROM node:20-alpine

# 设置工作目录
WORKDIR /app

# 从构建阶段复制构建结果和依赖
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY package.json ./
COPY .env ./


# 启动命令
CMD ["npm", "start"]
