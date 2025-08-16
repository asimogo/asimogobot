# 部署指南

本项目提供了完整的 Docker 化部署方案，支持开发和生产环境。

## 🚀 快速开始

### 1. 环境准备

```bash
# 克隆项目
git clone <repository-url>
cd asimoGo

# 初始化项目
make setup
```

### 2. 配置环境变量

编辑 `.env` 文件，填入必要的配置：

```bash
# 必需配置
BOT_TOKEN=your_telegram_bot_token
DEEPSEEK_API_KEY=your_deepseek_api_key

# 百度OCR

BAIDU_APPID=your_app_id
BAIDU_SECRET=your_secret

# 可选配置
FLOMO_WEBHOOK=your_flomo_webhook
NOTION_API_KEY=your_notion_key
NOTION_PAGE_ID=your_page_id
```

### 3. 启动服务

```bash
# 开发环境
make dev

# 生产环境
make deploy
```

## 📦 部署方式

### 外部 Redis 服务器配置

本项目配置为使用外部 Redis 服务器 (192.168.0.105:6379)：

**重要提醒：**

- 确保 Redis 服务器 (192.168.0.105:6379) 正在运行
- 确保网络连接正常，容器能访问该 Redis 服务器
- 如果 Redis 设置了密码，需要在 REDIS_URL 中包含认证信息

### 开发环境

适用于本地开发和测试：

```bash
# 前台启动（可以看到实时日志）
make dev

# 后台启动
make dev-bg

# 查看日志
make logs
```

**开发环境特性：**

- 包含本地 Redis 管理界面 (http://localhost:8081) - 用于管理本地 Redis，但生产数据在外部服务器
- 源代码热重载
- 详细的调试日志
- 连接外部 Redis 服务器 (192.168.0.105:6379)

### 生产环境

适用于生产部署：

```bash
# 构建并部署
make deploy

# 或者分步操作
make build
make start
```

**生产环境特性：**

- 多阶段构建优化镜像大小
- 非 root 用户运行
- 健康检查
- 资源限制
- 日志轮转
- 安全配置
- 使用外部 Redis 服务器 (192.168.0.105:6379)
- Host 网络模式确保网络连接

## 🛠️ 常用命令

### Makefile 命令

```bash
make help          # 显示所有可用命令
make setup          # 初始化项目环境
make dev            # 启动开发环境
make build          # 构建生产镜像
make start          # 启动生产环境
make stop           # 停止所有服务
make restart        # 重启服务
make logs           # 查看日志
make health         # 检查服务健康状态
make clean          # 清理Docker资源
make backup         # 备份Redis数据
make monitor        # 启动监控面板
```

### Docker Compose 命令

```bash
# 开发环境
docker-compose -f docker-compose.dev.yml up -d
docker-compose -f docker-compose.dev.yml logs -f
docker-compose -f docker-compose.dev.yml down

# 生产环境
docker-compose -f docker-compose.prod.yml up -d
docker-compose -f docker-compose.prod.yml logs -f
docker-compose -f docker-compose.prod.yml down
```

## 🏥 健康检查和监控

### 服务状态检查

```bash
# 检查所有服务状态
make health

# 查看容器状态
docker-compose ps

# 检查Redis连接
docker-compose exec redis redis-cli ping
```

### 日志查看

```bash
# 查看所有服务日志
make logs

# 查看特定服务日志
make logs-bot
make logs-redis

# 实时跟踪日志
docker-compose logs -f bot
```

### 监控面板

开发环境包含 Redis 管理界面：

```bash
# 启动监控
make monitor

# 访问地址
# Redis Commander: http://localhost:8081
# 用户名: admin, 密码: admin
```

## 🔧 故障排除

### 常见问题

1. **Bot 无法连接外部 Redis**

   ```bash
   # 检查外部Redis状态
   docker-compose exec bot sh -c "redis-cli -h 192.168.0.105 -p 6379 ping"

   # 检查网络连接
   docker-compose exec bot ping 192.168.0.105

   # 检查Redis服务器是否运行
   ping 192.168.0.105
   telnet 192.168.0.105 6379
   ```

2. **OCR 功能不工作**

   ```bash
   # 检查环境变量
   docker-compose exec bot env | grep BAIDU

   # 测试OCR配置
   make test-ocr
   ```

3. **容器启动失败**

   ```bash
   # 查看详细错误
   docker-compose logs bot

   # 重新构建镜像
   make clean
   make build
   ```

### 调试模式

```bash
# 进入Bot容器调试
make shell-bot

# 连接外部Redis服务器
make shell-redis

# 查看环境变量
docker-compose exec bot env

# 测试Redis连接
docker-compose exec bot sh -c "redis-cli -h 192.168.0.105 -p 6379 ping"
```

## 📊 性能优化

### 资源配置

生产环境资源限制：

- 内存: 512MB (限制) / 256MB (预留)
- CPU: 0.5 核 (限制) / 0.25 核 (预留)

可在 `docker-compose.prod.yml` 中调整：

```yaml
deploy:
  resources:
    limits:
      memory: 1G
      cpus: "1.0"
    reservations:
      memory: 512M
      cpus: "0.5"
```

### 队列配置

在 `.env` 中配置队列参数：

```bash
QUEUE_CONCURRENCY=5        # 并发数
QUEUE_MAX_RETRIES=3        # 最大重试次数
RATE_LIMIT_MAX_REQUESTS=30 # 速率限制
```

## 🔐 安全配置

### 生产环境安全

1. **非 root 用户运行**

   - 容器内使用 `nodejs` 用户
   - UID/GID: 1001

2. **网络隔离**

   - 使用独立 Docker 网络
   - 生产环境不暴露 Redis 端口

3. **环境变量安全**

   - 敏感信息通过 `.env` 文件管理
   - 不在镜像中包含配置文件

4. **健康检查**
   - 定期检查服务状态
   - 自动重启异常容器

## 🔄 更新部署

### 滚动更新

```bash
# 1. 备份数据
make backup

# 2. 拉取新代码
git pull

# 3. 重新部署
make deploy

# 4. 验证服务
make health
```

### 回滚操作

```bash
# 停止当前服务
make stop

# 恢复外部Redis备份（如需要）
# 注意：这会清空外部Redis服务器的所有数据，请谨慎操作
# redis-cli -h 192.168.0.105 -p 6379 flushall
# redis-cli -h 192.168.0.105 -p 6379 --rdb < backups/redis-backup-YYYYMMDD-HHMMSS.rdb

# 切换到之前的代码版本
git checkout <previous-commit>

# 重新部署
make deploy
```

## 📋 部署清单

部署前确认：

- [ ] 已配置所有必需的环境变量
- [ ] 已测试 Telegram Bot Token
- [ ] 已测试 DeepSeek API Key
- [ ] 已配置百度 OCR (可选)
- [ ] 已配置笔记服务 (可选)
- [ ] 已设置正确的时区
- [ ] 已配置适当的资源限制
- [ ] 已设置备份策略
- [ ] **外部 Redis 服务器 (192.168.0.105:6379) 正在运行**
- [ ] **网络连接正常，容器能访问 Redis 服务器**
- [ ] **Redis 服务器配置正确 (密码/权限等)**

部署后检查：

- [ ] Bot 容器正常运行
- [ ] **外部 Redis 连接正常 (192.168.0.105:6379)**
- [ ] Bot 响应 Telegram 消息
- [ ] OCR 功能正常 (如已配置)
- [ ] 队列处理正常
- [ ] 日志输出正常
- [ ] 健康检查通过
- [ ] **Redis 队列数据正常存储**

## 📞 支持

如遇到问题，请检查：

1. [故障排除文档](./TROUBLESHOOTING.md)
2. [配置验证文档](./CONFIG_VERIFICATION.md)
3. [项目日志文件](./logs/)

或创建 Issue 描述具体问题。
