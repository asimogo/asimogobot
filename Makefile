# Telegram Bot 项目 Makefile
# 提供常用的开发和部署命令

.PHONY: help dev build start stop restart logs clean setup test health

# 默认目标
help:
	@echo "可用命令:"
	@echo "  setup       - 初始化项目环境"
	@echo "  dev         - 启动开发环境"
	@echo "  build       - 构建生产镜像"
	@echo "  start       - 启动生产环境"
	@echo "  stop        - 停止所有服务"
	@echo "  restart     - 重启服务"
	@echo "  logs        - 查看日志"
	@echo "  health      - 检查服务健康状态"
	@echo "  test        - 运行测试"
	@echo "  clean       - 清理Docker资源"
	@echo "  deploy      - 生产部署"
	@echo "  deploy-drone - Drone CI部署指导"
	@echo "  check-drone - 检查Drone配置"

# 项目初始化
setup:
	@echo "🔧 初始化项目环境..."
	@if [ ! -f .env ]; then \
		echo "📋 创建环境变量文件..."; \
		cp .env.example .env; \
		echo "⚠️  请编辑 .env 文件并填入正确的配置值"; \
	else \
		echo "✅ .env 文件已存在"; \
	fi
	@echo "📦 安装依赖..."
	npm install
	@echo "🏗️  构建项目..."
	npm run build
	@echo "✅ 项目初始化完成！"

# 开发环境
dev:
	@echo "🚀 启动开发环境..."
	docker-compose -f docker-compose.dev.yml up --build

dev-bg:
	@echo "🚀 后台启动开发环境..."
	docker-compose -f docker-compose.dev.yml up -d --build

# 构建生产镜像
build:
	@echo "🏗️  构建生产镜像..."
	docker-compose -f docker-compose.prod.yml build

# 生产环境
start:
	@echo "🚀 启动生产环境..."
	docker-compose -f docker-compose.prod.yml up -d

# 停止服务
stop:
	@echo "🛑 停止开发环境..."
	docker-compose -f docker-compose.dev.yml down
	@echo "🛑 停止生产环境..."
	docker-compose -f docker-compose.prod.yml down

# 重启服务
restart: stop start

# 查看日志
logs:
	@echo "📋 查看服务日志..."
	docker-compose logs -f

logs-bot:
	@echo "📋 查看Bot日志..."
	docker-compose logs -f bot

logs-redis:
	@echo "📋 查看Redis日志..."
	docker-compose logs -f redis

# 健康检查
health:
	@echo "🏥 检查服务健康状态..."
	@docker-compose ps
	@echo "\n📊 外部Redis状态 (192.168.0.105:6379):"
	@docker-compose exec bot sh -c "redis-cli -h 192.168.0.105 -p 6379 ping" || echo "❌ 外部Redis未响应"
	@echo "\n📊 Bot容器状态:"
	@docker-compose exec bot node -e "console.log('✅ Bot容器正常')" || echo "❌ Bot容器异常"

# 进入容器
shell-bot:
	@echo "🐚 进入Bot容器..."
	docker-compose exec bot sh

shell-redis:
	@echo "🐚 连接外部Redis服务器 (192.168.0.105:6379)..."
	docker-compose exec bot redis-cli -h 192.168.0.105 -p 6379

# 测试
test:
	@echo "🧪 运行测试..."
	npm test

test-ocr:
	@echo "🧪 测试OCR配置..."
	node -e "import('./test-ocr.js').catch(console.error)"

# 清理
clean:
	@echo "🧹 清理Docker资源..."
	docker-compose -f docker-compose.dev.yml down -v
	docker-compose -f docker-compose.prod.yml down -v
	docker system prune -f
	docker volume prune -f

clean-all: clean
	@echo "🧹 清理所有Docker资源..."
	docker rmi -f $$(docker images -q --filter reference="*bot*") 2>/dev/null || true
	docker rmi -f $$(docker images -q --filter reference="asimogobot*") 2>/dev/null || true

# 数据备份
backup:
	@echo "💾 备份外部Redis数据 (192.168.0.105:6379)..."
	@mkdir -p backups
	@docker-compose exec bot sh -c "redis-cli -h 192.168.0.105 -p 6379 --rdb -" > backups/redis-backup-$$(date +%Y%m%d-%H%M%S).rdb
	@echo "✅ 备份完成: backups/redis-backup-$$(date +%Y%m%d-%H%M%S).rdb"

# 监控
monitor:
	@echo "📊 启动监控面板..."
	@echo "Redis Commander: http://localhost:8081 (admin/admin)"
	docker-compose -f docker-compose.dev.yml up -d redis-commander

# 生产部署
deploy: build
	@echo "🚀 部署到生产环境..."
	@echo "⚠️  确保已正确配置 .env 文件"
	docker-compose -f docker-compose.prod.yml up -d
	@echo "✅ 部署完成！"
	@make health

# Drone CI部署
deploy-drone:
	@echo "🚀 使用Drone CI部署..."
	@echo "📋 检查Redis服务器连接..."
	@ping -c 3 192.168.0.105 || (echo "❌ 无法连接Redis服务器" && exit 1)
	@echo "✅ Redis服务器连接正常"
	@echo "🔧 请确保Drone CI中已配置以下Secrets:"
	@echo "  - BOT_TOKEN"
	@echo "  - DEEPSEEK_API_KEY" 
	@echo "  - BAIDU_APPID (可选)"
	@echo "  - BAIDU_SECRET (可选)"
	@echo "  - BAIDU_OCR_TOKEN (可选)"
	@echo "  - FLOMO_WEBHOOK (可选)"
	@echo "  - NOTION_API_KEY (可选)"
	@echo "  - NOTION_PAGE_ID (可选)"
	@echo "💡 然后推送代码到仓库触发自动部署"

# 检查Drone配置
check-drone:
	@echo "🔍 检查Drone配置..."
	@echo "📋 当前.drone.yml配置:"
	@echo "  - Redis服务器: 192.168.0.105:6379"
	@echo "  - 部署文件: docker-compose.prod.yml"
	@echo "  - 镜像: docker/compose:latest"
	@drone jsonnet --format .drone.yml 2>/dev/null || echo "⚠️  需要安装drone CLI工具来验证配置"
