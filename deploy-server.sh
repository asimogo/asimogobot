#!/bin/bash

# 服务器端部署脚本
# 此脚本应放在服务器上的项目目录中，由 Drone CI 调用

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 打印带颜色的消息
print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_debug() {
    echo -e "${BLUE}[DEBUG]${NC} $1"
}

# 配置变量
REGISTRY_URL="192.168.0.105:5000"
IMAGE_NAME="telegram-bot"
CONTAINER_NAME="telegram_bot"
PROJECT_DIR="/opt/telegram-bot"
BACKUP_DIR="/opt/backups/telegram-bot"
MAX_BACKUPS=5

# 检查环境
check_environment() {
    print_info "检查部署环境..."
    
    # 检查 Docker
    if ! command -v docker &> /dev/null; then
        print_error "Docker 未安装"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose 未安装"
        exit 1
    fi
    
    # 检查项目目录
    if [ ! -d "$PROJECT_DIR" ]; then
        print_info "创建项目目录: $PROJECT_DIR"
        sudo mkdir -p "$PROJECT_DIR"
        sudo chown $USER:$USER "$PROJECT_DIR"
    fi
    
    # 检查备份目录
    if [ ! -d "$BACKUP_DIR" ]; then
        print_info "创建备份目录: $BACKUP_DIR"
        sudo mkdir -p "$BACKUP_DIR"
        sudo chown $USER:$USER "$BACKUP_DIR"
    fi
    
    cd "$PROJECT_DIR"
}

# 备份当前配置
backup_current() {
    print_info "备份当前配置..."
    
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_file="$BACKUP_DIR/backup_$timestamp.tar.gz"
    
    if [ -f ".env" ] || [ -f "docker-compose.yml" ]; then
        tar -czf "$backup_file" .env docker-compose*.yml 2>/dev/null || true
        print_info "配置已备份到: $backup_file"
        
        # 清理旧备份
        local backup_count=$(ls -1 "$BACKUP_DIR"/backup_*.tar.gz 2>/dev/null | wc -l)
        if [ "$backup_count" -gt "$MAX_BACKUPS" ]; then
            print_info "清理旧备份文件..."
            ls -1t "$BACKUP_DIR"/backup_*.tar.gz | tail -n +$((MAX_BACKUPS + 1)) | xargs rm -f
        fi
    fi
}

# 下载最新配置
download_configs() {
    print_info "下载最新配置文件..."
    
    # 从 Git 仓库下载配置文件（根据您的实际情况调整）
    local git_url="http://192.168.0.105:3000/your-username/asimoGo.git"
    local temp_dir=$(mktemp -d)
    
    if git clone "$git_url" "$temp_dir" 2>/dev/null; then
        # 复制配置文件
        cp "$temp_dir/docker-compose.prod.yml" . 2>/dev/null || true
        cp "$temp_dir/docker-compose.ci.yml" . 2>/dev/null || true
        
        # 如果没有 .env 文件，从示例创建
        if [ ! -f ".env" ] && [ -f "$temp_dir/.env.example" ]; then
            cp "$temp_dir/.env.example" .env
            print_warning "请编辑 .env 文件，填入正确的配置"
        fi
        
        rm -rf "$temp_dir"
        print_info "配置文件下载完成"
    else
        print_warning "无法从 Git 下载配置，使用现有配置"
    fi
}

# 部署应用
deploy_app() {
    local environment=${1:-production}
    local image_tag=${2:-latest}
    
    print_info "开始部署应用 (环境: $environment, 标签: $image_tag)"
    
    # 设置环境变量
    export IMAGE_TAG="$image_tag"
    
    # 选择配置文件
    local compose_file="docker-compose.prod.yml"
    if [ "$environment" = "staging" ]; then
        compose_file="docker-compose.ci.yml"
        CONTAINER_NAME="telegram_bot_staging"
    fi
    
    # 停止现有容器
    print_info "停止现有容器..."
    docker-compose -f "$compose_file" down || true
    
    # 拉取最新镜像
    print_info "拉取最新镜像..."
    docker pull "$REGISTRY_URL/$IMAGE_NAME:$image_tag" || {
        print_error "拉取镜像失败"
        exit 1
    }
    
    # 启动新容器
    print_info "启动新容器..."
    docker-compose -f "$compose_file" up -d || {
        print_error "启动容器失败"
        exit 1
    }
    
    # 等待容器启动
    print_info "等待容器启动..."
    sleep 15
    
    # 健康检查
    local max_attempts=12
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if docker exec "$CONTAINER_NAME" curl -f http://localhost:3000/health >/dev/null 2>&1; then
            print_info "✅ 健康检查通过"
            break
        fi
        
        print_debug "健康检查失败，重试 $attempt/$max_attempts"
        sleep 5
        ((attempt++))
    done
    
    if [ $attempt -gt $max_attempts ]; then
        print_error "❌ 健康检查失败，部署可能存在问题"
        print_info "查看日志: docker logs $CONTAINER_NAME"
        exit 1
    fi
    
    print_info "✅ 部署成功完成！"
}

# 清理旧镜像
cleanup_images() {
    print_info "清理旧的 Docker 镜像..."
    
    # 清理悬空镜像
    docker image prune -f >/dev/null 2>&1 || true
    
    # 保留最近的 3 个版本
    local old_images=$(docker images "$REGISTRY_URL/$IMAGE_NAME" --format "table {{.Repository}}:{{.Tag}}" | tail -n +2 | tail -n +4)
    if [ -n "$old_images" ]; then
        echo "$old_images" | xargs -r docker rmi 2>/dev/null || true
    fi
    
    print_info "镜像清理完成"
}

# 显示状态
show_status() {
    print_info "当前运行状态:"
    docker ps --filter name=telegram_bot --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    
    print_info "资源使用情况:"
    docker stats --no-stream --filter name=telegram_bot --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}"
}

# 主函数
main() {
    local action=${1:-deploy}
    local environment=${2:-production}
    local image_tag=${3:-latest}
    
    case "$action" in
        "deploy")
            check_environment
            backup_current
            download_configs
            deploy_app "$environment" "$image_tag"
            cleanup_images
            show_status
            ;;
        "status")
            show_status
            ;;
        "cleanup")
            cleanup_images
            ;;
        *)
            echo "用法: $0 [deploy|status|cleanup] [production|staging] [image_tag]"
            echo "示例:"
            echo "  $0 deploy production latest"
            echo "  $0 deploy staging develop"
            echo "  $0 status"
            echo "  $0 cleanup"
            exit 1
            ;;
    esac
}

main "$@"
