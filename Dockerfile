FROM node:20-alpine

WORKDIR /app

# 复制package文件
COPY package*.json ./

# 安装依赖
RUN npm install

# 复制源代码
COPY . .

# 构建应用
RUN npm run build

# 不要在镜像中包含.env文件，而是通过运行时环境变量传递
# COPY .env ./  # 删除这行

# 启动应用
CMD ["npm", "start"]