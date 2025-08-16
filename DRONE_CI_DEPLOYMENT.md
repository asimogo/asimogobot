# Drone CI 自动部署指南

本文档介绍如何使用 Drone CI 自动构建和部署 Telegram Bot 到使用外部 Redis 服务器 (192.168.0.105:6379) 的环境。

## 🚀 Drone CI 配置概览

### 配置特点

- **外部 Redis**: 使用 192.168.0.105:6379 作为队列存储
- **Docker Compose**: 使用 `docker-compose.prod.yml` 进行生产部署
- **健康检查**: 自动验证服务状态和 Redis 连接
- **环境变量**: 通过 Drone Secrets 安全管理敏感信息

### 部署流程

1. **检查 Redis 连接** - 验证外部 Redis 服务器可达性
2. **配置环境变量** - 从 Drone Secrets 创建 `.env` 文件
3. **停止旧服务** - 清理之前的部署
4. **构建镜像** - 使用多阶段 Dockerfile 构建优化镜像
5. **启动服务** - 使用 host 网络模式启动容器
6. **健康检查** - 验证 Bot 和 Redis 连接状态

## 🔧 Drone CI 配置

### 必需的 Secrets

在 Drone CI 中配置以下 Secrets：

#### 必需配置

```
BOT_TOKEN               # Telegram Bot Token
DEEPSEEK_API_KEY        # DeepSeek AI API Key
```

#### 可选配置 (根据需要配置)

```
BAIDU_APPID            # 百度 OCR App ID
BAIDU_SECRET           # 百度 OCR Secret
BAIDU_OCR_TOKEN        # 百度 OCR Token (推荐方式)
FLOMO_WEBHOOK          # Flomo 笔记服务 Webhook
NOTION_API_KEY         # Notion API Key
NOTION_PAGE_ID         # Notion 页面 ID
```

### 配置步骤

1. **添加 Secrets**

   ```bash
   # 使用 Drone CLI 添加 Secrets
   drone secret add your-repo/asimoGo BOT_TOKEN "your_bot_token"
   drone secret add your-repo/asimoGo DEEPSEEK_API_KEY "your_api_key"

   # 可选配置
   drone secret add your-repo/asimoGo BAIDU_OCR_TOKEN "your_ocr_token"
   drone secret add your-repo/asimoGo FLOMO_WEBHOOK "your_webhook_url"
   drone secret add your-repo/asimoGo NOTION_API_KEY "your_notion_key"
   drone secret add your-repo/asimoGo NOTION_PAGE_ID "your_page_id"
   ```

2. **验证配置**

   ```bash
   # 检查 Drone 配置
   make check-drone

   # 检查 Redis 连接
   ping 192.168.0.105
   ```

## 📋 部署前检查清单

### 环境准备

- [ ] Drone CI 服务器已配置
- [ ] Docker 和 Docker Compose 已安装在目标服务器
- [ ] **外部 Redis 服务器 (192.168.0.105:6379) 正在运行**
- [ ] **网络连接正常，部署服务器能访问 Redis**
- [ ] 目标服务器有足够的资源 (内存 > 1GB)

### Drone 配置

- [ ] 仓库已连接到 Drone CI
- [ ] 必需的 Secrets 已配置
- [ ] `.drone.yml` 文件语法正确
- [ ] 目标服务器 Docker daemon 可访问

### Redis 配置

- [ ] Redis 服务器稳定运行
- [ ] Redis 端口 6379 开放
- [ ] 如设置密码，已在配置中包含
- [ ] 数据持久化策略已配置

## 🚀 自动部署流程

### 触发部署

1. **推送代码触发**

   ```bash
   git add .
   git commit -m "Update deployment configuration"
   git push origin main
   ```

2. **手动触发**
   ```bash
   # 使用 Drone CLI
   drone build promote your-repo/asimoGo 123 production
   ```

### 部署监控

1. **查看构建日志**

   - 访问 Drone CI Web 界面
   - 查看实时构建日志
   - 监控各个步骤的执行状态

2. **验证部署结果**
   ```bash
   # SSH 到目标服务器检查
   docker-compose -f docker-compose.prod.yml ps
   docker-compose -f docker-compose.prod.yml logs -f bot
   ```

## 🛠️ 部署配置详解

### `.drone.yml` 关键配置

```yaml
# 使用 docker/compose 镜像，包含所需工具
image: docker/compose:latest

# 外部 Redis 配置
environment:
  REDIS_URL: redis://192.168.0.105:6379

# 健康检查命令
- docker-compose exec -T bot sh -c "redis-cli -h 192.168.0.105 -p 6379 ping"
```

### Docker Compose 集成

```yaml
# 生产环境配置文件
services:
  bot:
    environment:
      - REDIS_URL=redis://192.168.0.105:6379
    network_mode: "host" # 确保能访问外部 Redis
```

## 🔧 故障排除

### 常见问题

1. **Redis 连接失败**

   ```bash
   # 检查日志
   drone logs your-repo/asimoGo 123

   # 验证 Redis 可达性
   ping 192.168.0.105
   telnet 192.168.0.105 6379
   ```

2. **Secrets 未正确配置**

   ```bash
   # 列出已配置的 Secrets
   drone secret ls your-repo/asimoGo

   # 重新添加 Secret
   drone secret rm your-repo/asimoGo BOT_TOKEN
   drone secret add your-repo/asimoGo BOT_TOKEN "new_token"
   ```

3. **Docker 构建失败**

   ```bash
   # 检查 Dockerfile 语法
   docker build . -t test

   # 检查 docker-compose 配置
   docker-compose -f docker-compose.prod.yml config
   ```

4. **容器无法启动**

   ```bash
   # SSH 到目标服务器
   ssh user@target-server

   # 查看容器状态
   docker ps -a
   docker logs container_name
   ```

### 调试步骤

1. **查看 Drone 构建日志**

   ```bash
   drone logs your-repo/asimoGo latest
   ```

2. **手动验证部署**

   ```bash
   # 在目标服务器上
   cd /path/to/project
   docker-compose -f docker-compose.prod.yml ps
   docker-compose -f docker-compose.prod.yml logs bot
   ```

3. **测试 Redis 连接**
   ```bash
   # 从容器内测试
   docker-compose exec bot redis-cli -h 192.168.0.105 -p 6379 ping
   ```

## 📊 监控和维护

### 部署后监控

1. **服务状态监控**

   ```bash
   # 定期检查服务状态
   docker-compose -f docker-compose.prod.yml ps

   # 查看资源使用
   docker stats
   ```

2. **Redis 监控**

   ```bash
   # 连接到 Redis 查看状态
   redis-cli -h 192.168.0.105 -p 6379 info
   redis-cli -h 192.168.0.105 -p 6379 monitor
   ```

3. **日志监控**
   ```bash
   # 查看应用日志
   docker-compose -f docker-compose.prod.yml logs -f --tail=100 bot
   ```

### 维护任务

1. **定期备份**

   ```bash
   # 备份 Redis 数据
   redis-cli -h 192.168.0.105 -p 6379 --rdb - > backup-$(date +%Y%m%d).rdb
   ```

2. **更新部署**

   ```bash
   # 推送代码更新触发自动部署
   git push origin main
   ```

3. **清理资源**
   ```bash
   # 定期清理未使用的 Docker 资源
   docker system prune -f
   ```

## 🔐 安全考虑

### Secrets 管理

- 定期轮换敏感信息
- 使用最小权限原则
- 避免在日志中暴露敏感信息

### 网络安全

- 确保 Redis 服务器访问控制
- 使用防火墙限制访问
- 考虑使用 VPN 或私有网络

### 容器安全

- 定期更新基础镜像
- 使用非 root 用户运行
- 扫描镜像漏洞

## 📞 支持

### 快速命令参考

```bash
# 检查 Drone 配置
make check-drone

# 手动部署
make deploy

# 查看服务状态
make health

# 连接 Redis
make shell-redis
```

### 相关文档

- [部署指南](./DEPLOYMENT.md)
- [配置验证](./CONFIG_VERIFICATION.md)
- [故障排除](./TROUBLESHOOTING.md)

如遇到问题，请检查上述文档或创建 Issue 描述具体问题。
