#!/bin/bash

# =============================================================================
# 外部Redis服务器部署脚本
# 用于简化使用外部Redis (192.168.0.105:6379) 的部署流程
# =============================================================================

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Redis服务器配置
REDIS_HOST="192.168.0.105"
REDIS_PORT="6379"
REDIS_URL="redis://${REDIS_HOST}:${REDIS_PORT}"

# 打印带颜色的消息
print_status() {
    local status=$1
    local message=$2
    case $status in
        "OK")
            echo -e "${GREEN}✅ $message${NC}"
            ;;
        "WARN")
            echo -e "${YELLOW}⚠️  $message${NC}"
            ;;
        "ERROR")
            echo -e "${RED}❌ $message${NC}"
            ;;
        "INFO")
            echo -e "${BLUE}ℹ️  $message${NC}"
            ;;
    esac
}

# 显示标题
show_header() {
    echo "==========================================="
    echo "🚀 Telegram Bot 外部Redis部署"
    echo "==========================================="
    echo "Redis服务器: ${REDIS_HOST}:${REDIS_PORT}"
    echo "==========================================="
    echo
}

# 检查必要工具
check_prerequisites() {
    print_status "INFO" "检查必要工具..."
    
    # 检查Docker
    if ! command -v docker &> /dev/null; then
        print_status "ERROR" "Docker未安装或不在PATH中"
        exit 1
    fi
    
    # 检查docker-compose
    if ! command -v docker-compose &> /dev/null; then
        print_status "ERROR" "docker-compose未安装或不在PATH中"
        exit 1
    fi
    
    print_status "OK" "必要工具检查通过"
}

# 检查Redis服务器连接
check_redis_connection() {
    print_status "INFO" "检查Redis服务器连接..."
    
    # 尝试ping Redis服务器
    if ! ping -c 1 "${REDIS_HOST}" &> /dev/null; then
        print_status "ERROR" "无法ping通Redis服务器 ${REDIS_HOST}"
        print_status "WARN" "请检查:"
        print_status "WARN" "  1. Redis服务器是否启动"
        print_status "WARN" "  2. 网络连接是否正常"
        print_status "WARN" "  3. 防火墙设置"
        exit 1
    fi
    
    # 尝试连接Redis端口
    if ! timeout 5 bash -c "cat < /dev/null > /dev/tcp/${REDIS_HOST}/${REDIS_PORT}" 2>/dev/null; then
        print_status "ERROR" "无法连接到Redis端口 ${REDIS_HOST}:${REDIS_PORT}"
        print_status "WARN" "请检查:"
        print_status "WARN" "  1. Redis服务是否在运行"
        print_status "WARN" "  2. Redis是否监听正确的端口"
        print_status "WARN" "  3. 防火墙是否允许访问6379端口"
        exit 1
    fi
    
    print_status "OK" "Redis服务器连接正常"
}

# 检查环境变量文件
check_env_file() {
    print_status "INFO" "检查环境变量配置..."
    
    if [ ! -f ".env" ]; then
        print_status "WARN" ".env文件不存在，从模板创建..."
        cp .env.example .env
        print_status "INFO" "已创建.env文件，请编辑并配置必要的环境变量"
        print_status "WARN" "请至少配置以下变量:"
        print_status "WARN" "  - BOT_TOKEN"
        print_status "WARN" "  - DEEPSEEK_API_KEY"
        echo
        read -p "是否现在编辑.env文件? (y/N): " edit_env
        if [[ $edit_env =~ ^[Yy]$ ]]; then
            ${EDITOR:-nano} .env
        fi
    fi
    
    # 检查Redis URL配置
    if grep -q "REDIS_URL.*192\.168\.0\.105" .env; then
        print_status "OK" "Redis URL已正确配置"
    else
        print_status "WARN" "更新.env文件中的Redis URL..."
        # 备份原文件
        cp .env .env.backup
        # 更新Redis URL
        if grep -q "^REDIS_URL=" .env; then
            sed -i.bak "s|^REDIS_URL=.*|REDIS_URL=${REDIS_URL}|" .env
        else
            echo "REDIS_URL=${REDIS_URL}" >> .env
        fi
        print_status "OK" "Redis URL已更新为: ${REDIS_URL}"
    fi
}

# 选择部署模式
select_deployment_mode() {
    echo
    print_status "INFO" "选择部署模式:"
    echo "1) 开发环境 (包含本地Redis管理界面)"
    echo "2) 生产环境 (推荐)"
    echo
    read -p "请选择 (1-2): " mode
    
    case $mode in
        1)
            DEPLOYMENT_MODE="dev"
            COMPOSE_FILE="docker-compose.dev.yml"
            print_status "INFO" "选择了开发环境"
            ;;
        2)
            DEPLOYMENT_MODE="prod"
            COMPOSE_FILE="docker-compose.prod.yml"
            print_status "INFO" "选择了生产环境"
            ;;
        *)
            print_status "ERROR" "无效选择"
            exit 1
            ;;
    esac
}

# 停止旧服务
stop_old_services() {
    print_status "INFO" "停止旧服务..."
    
    # 停止所有可能的compose文件
    docker-compose -f docker-compose.yml down 2>/dev/null || true
    docker-compose -f docker-compose.dev.yml down 2>/dev/null || true
    docker-compose -f docker-compose.prod.yml down 2>/dev/null || true
    
    # 清理孤立容器
    docker-compose down --remove-orphans 2>/dev/null || true
    
    print_status "OK" "旧服务已停止"
}

# 构建和启动服务
deploy_services() {
    print_status "INFO" "构建和启动服务..."
    
    # 构建镜像
    print_status "INFO" "构建Docker镜像..."
    docker-compose -f "${COMPOSE_FILE}" build
    
    # 启动服务
    print_status "INFO" "启动服务..."
    docker-compose -f "${COMPOSE_FILE}" up -d
    
    print_status "OK" "服务启动完成"
}

# 等待服务就绪
wait_for_services() {
    print_status "INFO" "等待服务就绪..."
    
    local max_wait=60
    local count=0
    
    while [ $count -lt $max_wait ]; do
        if docker-compose -f "${COMPOSE_FILE}" exec -T bot node -e "console.log('ready')" >/dev/null 2>&1; then
            print_status "OK" "Bot服务就绪"
            break
        fi
        
        sleep 2
        count=$((count + 2))
        printf "."
    done
    
    if [ $count -ge $max_wait ]; then
        print_status "WARN" "服务启动超时，请检查日志"
    fi
    
    echo
}

# 验证部署
verify_deployment() {
    print_status "INFO" "验证部署状态..."
    
    # 检查容器状态
    if ! docker-compose -f "${COMPOSE_FILE}" ps | grep -q "Up"; then
        print_status "ERROR" "容器未正常运行"
        return 1
    fi
    
    # 检查Redis连接
    if docker-compose -f "${COMPOSE_FILE}" exec -T bot sh -c "redis-cli -h ${REDIS_HOST} -p ${REDIS_PORT} ping" >/dev/null 2>&1; then
        print_status "OK" "Redis连接正常"
    else
        print_status "ERROR" "Redis连接失败"
        return 1
    fi
    
    # 检查Bot容器
    if docker-compose -f "${COMPOSE_FILE}" exec -T bot node -e "console.log('Bot OK')" >/dev/null 2>&1; then
        print_status "OK" "Bot容器正常"
    else
        print_status "ERROR" "Bot容器异常"
        return 1
    fi
    
    print_status "OK" "部署验证通过"
}

# 显示部署信息
show_deployment_info() {
    echo
    echo "==========================================="
    print_status "OK" "部署完成！"
    echo "==========================================="
    echo
    echo "📊 服务信息:"
    echo "  - 部署模式: ${DEPLOYMENT_MODE}"
    echo "  - Redis服务器: ${REDIS_HOST}:${REDIS_PORT}"
    echo "  - Compose文件: ${COMPOSE_FILE}"
    echo
    echo "🛠️ 常用命令:"
    echo "  - 查看日志: docker-compose -f ${COMPOSE_FILE} logs -f"
    echo "  - 查看状态: docker-compose -f ${COMPOSE_FILE} ps"
    echo "  - 停止服务: docker-compose -f ${COMPOSE_FILE} down"
    echo "  - 健康检查: make health"
    echo
    
    if [ "$DEPLOYMENT_MODE" = "dev" ]; then
        echo "🌐 开发环境服务:"
        echo "  - Redis管理界面: http://localhost:8081 (admin/admin)"
        echo
    fi
    
    echo "📋 下一步:"
    echo "  1. 检查日志确保服务正常运行"
    echo "  2. 发送测试消息到Telegram Bot"
    echo "  3. 查看Redis中的队列数据"
    echo
}

# 主函数
main() {
    show_header
    
    # 检查先决条件
    check_prerequisites
    check_redis_connection
    check_env_file
    
    # 选择部署模式
    select_deployment_mode
    
    # 部署服务
    stop_old_services
    deploy_services
    wait_for_services
    
    # 验证部署
    if verify_deployment; then
        show_deployment_info
    else
        print_status "ERROR" "部署验证失败，请检查日志"
        echo
        echo "📋 故障排除:"
        echo "  - 查看日志: docker-compose -f ${COMPOSE_FILE} logs"
        echo "  - 检查Redis: ping ${REDIS_HOST}"
        echo "  - 检查端口: telnet ${REDIS_HOST} ${REDIS_PORT}"
        exit 1
    fi
}

# 脚本选项处理
case "${1:-}" in
    "--help"|"-h")
        echo "用法: $0 [选项]"
        echo
        echo "选项:"
        echo "  -h, --help     显示此帮助信息"
        echo "  --check-only   仅检查Redis连接，不进行部署"
        echo
        echo "此脚本将部署Telegram Bot到外部Redis服务器 (${REDIS_HOST}:${REDIS_PORT})"
        exit 0
        ;;
    "--check-only")
        show_header
        check_prerequisites
        check_redis_connection
        print_status "OK" "Redis连接检查完成"
        exit 0
        ;;
    "")
        # 正常执行
        main
        ;;
    *)
        print_status "ERROR" "未知选项: $1"
        print_status "INFO" "使用 $0 --help 查看帮助"
        exit 1
        ;;
esac
