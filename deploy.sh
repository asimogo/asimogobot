#!/bin/bash

# Telegram Bot 部署脚本
# 使用方法: ./deploy.sh [dev|prod]

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
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

# 检查 Docker 是否安装
check_docker() {
    if ! command -v docker &> /dev/null; then
        print_error "Docker 未安装，请先安装 Docker"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose 未安装，请先安装 Docker Compose"
        exit 1
    fi
}

# 检查环境变量文件
check_env_file() {
    if [ ! -f ".env" ]; then
        print_warning ".env 文件不存在"
        if [ -f ".env.example" ]; then
            print_info "复制 .env.example 到 .env"
            cp .env.example .env
            print_warning "请编辑 .env 文件，填入正确的配置信息"
            exit 1
        else
            print_error ".env.example 文件也不存在，请创建环境配置文件"
            exit 1
        fi
    fi
}

# 部署函数
deploy() {
    local env=${1:-dev}
    
    print_info "开始部署 Telegram Bot (环境: $env)"
    
    # 检查依赖
    check_docker
    check_env_file
    
    # 停止现有容器
    print_info "停止现有容器..."
    if [ "$env" = "prod" ]; then
        docker-compose -f docker-compose.prod.yml down || true
    else
        docker-compose down || true
    fi
    
    # 清理旧镜像（可选）
    read -p "是否清理旧的 Docker 镜像? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_info "清理旧镜像..."
        docker system prune -f
    fi
    
    # 构建和启动
    print_info "构建并启动容器..."
    if [ "$env" = "prod" ]; then
        docker-compose -f docker-compose.prod.yml up -d --build
    else
        docker-compose up -d --build
    fi
    
    # 检查健康状态
    print_info "等待容器启动..."
    sleep 10
    
    if [ "$env" = "prod" ]; then
        container_name="telegram_bot_prod"
    else
        container_name="telegram_bot"
    fi
    
    if docker ps | grep -q "$container_name"; then
        print_info "✅ 部署成功！容器正在运行"
        print_info "查看日志: docker logs -f $container_name"
        print_info "检查健康状态: docker exec $container_name curl -f http://localhost:3000/health"
    else
        print_error "❌ 部署失败，容器未运行"
        print_info "查看错误日志: docker logs $container_name"
        exit 1
    fi
}

# 显示帮助信息
show_help() {
    echo "Telegram Bot 部署脚本"
    echo ""
    echo "使用方法:"
    echo "  $0 [dev|prod]"
    echo ""
    echo "选项:"
    echo "  dev   开发环境部署 (默认)"
    echo "  prod  生产环境部署"
    echo "  help  显示帮助信息"
    echo ""
    echo "示例:"
    echo "  $0 dev   # 开发环境部署"
    echo "  $0 prod  # 生产环境部署"
}

# 主函数
main() {
    case ${1:-dev} in
        dev)
            deploy dev
            ;;
        prod)
            deploy prod
            ;;
        help|--help|-h)
            show_help
            ;;
        *)
            print_error "未知参数: $1"
            show_help
            exit 1
            ;;
    esac
}

main "$@"
