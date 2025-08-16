#!/bin/bash

# =============================================================================
# Docker Compose 兼容性测试脚本
# 验证不同版本的 Docker Compose 与配置文件的兼容性
# =============================================================================

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() {
    local status=$1
    local message=$2
    case $status in
        "OK") echo -e "${GREEN}✅ $message${NC}" ;;
        "WARN") echo -e "${YELLOW}⚠️  $message${NC}" ;;
        "ERROR") echo -e "${RED}❌ $message${NC}" ;;
        "INFO") echo -e "${BLUE}ℹ️  $message${NC}" ;;
    esac
}

echo "==========================================="
echo "🧪 Docker Compose 兼容性测试"
echo "==========================================="

# 1. 测试本地 Docker Compose 版本
print_status "INFO" "检查本地 Docker Compose 版本..."
local_version=$(docker-compose --version)
print_status "INFO" "本地版本: $local_version"

# 2. 测试配置文件语法
print_status "INFO" "测试 docker-compose.prod.yml 配置..."
if docker-compose -f docker-compose.prod.yml config --quiet; then
    print_status "OK" "生产环境配置语法正确"
else
    print_status "ERROR" "生产环境配置语法错误"
    exit 1
fi

# 3. 测试不同版本的 Docker Compose 镜像
test_versions=(
    "docker/compose:latest"
    "docker/compose:2.24.1"
    "docker/compose:2.20.0"
)

for version in "${test_versions[@]}"; do
    print_status "INFO" "测试 $version..."
    
    if docker run --rm -v "$(pwd):/workdir" -w /workdir "$version" \
        -f docker-compose.prod.yml config --quiet >/dev/null 2>&1; then
        print_status "OK" "$version 兼容"
    else
        print_status "ERROR" "$version 不兼容"
    fi
done

# 4. 显示配置概要
print_status "INFO" "配置文件概要:"
echo "生产环境服务数量: $(docker-compose -f docker-compose.prod.yml config --services | wc -l)"
echo "使用的网络模式: $(docker-compose -f docker-compose.prod.yml config | grep -o 'network_mode.*' | head -1)"
echo "Redis URL: $(docker-compose -f docker-compose.prod.yml config | grep 'REDIS_URL' | head -1 | cut -d: -f2-)"

# 5. 验证 Drone CI 配置兼容性
print_status "INFO" "验证 Drone CI 配置兼容性..."
drone_image="docker/compose:2.24.1"

if docker run --rm -v "$(pwd):/workdir" -w /workdir "$drone_image" \
    -f docker-compose.prod.yml config --quiet >/dev/null 2>&1; then
    print_status "OK" "Drone CI 使用的镜像 ($drone_image) 兼容"
else
    print_status "ERROR" "Drone CI 使用的镜像 ($drone_image) 不兼容"
fi

echo
print_status "OK" "兼容性测试完成！"
