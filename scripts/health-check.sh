#!/bin/bash

# =============================================================================
# 健康检查脚本
# 用于验证服务运行状态和配置
# =============================================================================

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# 检查Docker是否运行
check_docker() {
    print_status "INFO" "检查Docker状态..."
    
    if ! docker version >/dev/null 2>&1; then
        print_status "ERROR" "Docker未运行或未安装"
        exit 1
    fi
    
    print_status "OK" "Docker运行正常"
}

# 检查环境变量文件
check_env_file() {
    print_status "INFO" "检查环境变量配置..."
    
    if [ ! -f ".env" ]; then
        print_status "WARN" ".env 文件不存在，请从 .env.example 复制并配置"
        return 1
    fi
    
    # 检查必需的环境变量
    local required_vars=("BOT_TOKEN" "DEEPSEEK_API_KEY")
    local missing_vars=()
    
    for var in "${required_vars[@]}"; do
        if ! grep -q "^${var}=" .env || grep -q "^${var}=$" .env || grep -q "^${var}=your_" .env; then
            missing_vars+=("$var")
        fi
    done
    
    if [ ${#missing_vars[@]} -eq 0 ]; then
        print_status "OK" "必需环境变量已配置"
    else
        print_status "ERROR" "缺少或未正确配置的环境变量: ${missing_vars[*]}"
        return 1
    fi
}

# 检查服务状态
check_services() {
    print_status "INFO" "检查服务状态..."
    
    # 检查容器是否运行
    local containers=("redis" "bot")
    local running_containers=()
    local stopped_containers=()
    
    for container in "${containers[@]}"; do
        if docker-compose ps -q $container >/dev/null 2>&1; then
            if docker-compose ps $container | grep -q "Up"; then
                running_containers+=("$container")
            else
                stopped_containers+=("$container")
            fi
        else
            stopped_containers+=("$container")
        fi
    done
    
    if [ ${#running_containers[@]} -gt 0 ]; then
        print_status "OK" "运行中的服务: ${running_containers[*]}"
    fi
    
    if [ ${#stopped_containers[@]} -gt 0 ]; then
        print_status "WARN" "未运行的服务: ${stopped_containers[*]}"
    fi
}

# 检查Redis连接
check_redis() {
    print_status "INFO" "检查外部Redis连接 (192.168.0.105:6379)..."
    
    # 尝试通过Bot容器连接Redis
    if docker-compose exec -T bot sh -c "redis-cli -h 192.168.0.105 -p 6379 ping" >/dev/null 2>&1; then
        print_status "OK" "Redis连接正常"
        
        # 检查Redis数据
        local key_count=$(docker-compose exec -T bot sh -c "redis-cli -h 192.168.0.105 -p 6379 dbsize" 2>/dev/null | tr -d '\r' || echo "0")
        print_status "INFO" "Redis中的键数量: $key_count"
    else
        print_status "ERROR" "无法连接到外部Redis服务器 (192.168.0.105:6379)"
        print_status "WARN" "请确保:"
        print_status "WARN" "  1. Redis服务器正在运行"
        print_status "WARN" "  2. 网络连接正常"
        print_status "WARN" "  3. Redis未设置密码或已正确配置"
        return 1
    fi
}

# 检查Bot容器
check_bot() {
    print_status "INFO" "检查Bot容器..."
    
    if docker-compose exec -T bot node -e "console.log('Bot容器正常')" >/dev/null 2>&1; then
        print_status "OK" "Bot容器运行正常"
    else
        print_status "ERROR" "Bot容器异常"
        return 1
    fi
}

# 检查网络连接
check_network() {
    print_status "INFO" "检查网络连接..."
    
    # 检查Bot到外部Redis的连接
    if docker-compose exec -T bot ping -c 1 192.168.0.105 >/dev/null 2>&1; then
        print_status "OK" "Bot到外部Redis服务器网络连接正常"
    else
        print_status "ERROR" "Bot无法连接到Redis服务器 (192.168.0.105)"
        return 1
    fi
}

# 检查日志
check_logs() {
    print_status "INFO" "检查最近的日志..."
    
    # 检查是否有错误日志
    local error_count=$(docker-compose logs --tail=100 bot 2>/dev/null | grep -i error | wc -l || echo "0")
    
    if [ "$error_count" -eq 0 ]; then
        print_status "OK" "最近无错误日志"
    else
        print_status "WARN" "发现 $error_count 条错误日志，请检查"
    fi
}

# 显示资源使用情况
show_resource_usage() {
    print_status "INFO" "显示资源使用情况..."
    
    echo "容器资源使用情况:"
    docker-compose exec -T bot sh -c "free -h && echo '---' && df -h" 2>/dev/null || print_status "WARN" "无法获取资源信息"
}

# 主函数
main() {
    echo "==========================================="
    echo "🏥 服务健康检查开始"
    echo "==========================================="
    
    local exit_code=0
    
    # 执行各项检查
    check_docker || exit_code=1
    echo
    
    check_env_file || exit_code=1
    echo
    
    check_services
    echo
    
    check_redis || exit_code=1
    echo
    
    check_bot || exit_code=1
    echo
    
    check_network || exit_code=1
    echo
    
    check_logs
    echo
    
    show_resource_usage
    echo
    
    echo "==========================================="
    if [ $exit_code -eq 0 ]; then
        print_status "OK" "所有检查通过，服务运行正常！"
    else
        print_status "ERROR" "部分检查失败，请查看上述错误信息"
    fi
    echo "==========================================="
    
    exit $exit_code
}

# 运行主函数
main "$@"
