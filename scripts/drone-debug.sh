#!/bin/bash

# =============================================================================
# Drone CI 调试脚本
# 用于诊断和解决 Drone CI 部署问题
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

echo "==========================================="
echo "🔍 Drone CI 调试工具"
echo "==========================================="

# 1. 检查 .drone.yml 语法
print_status "INFO" "检查 .drone.yml 语法..."
if python3 -c "
import sys
try:
    import yaml
    with open('.drone.yml', 'r') as f:
        yaml.safe_load(f)
    print('OK')
except ImportError:
    # 简单的基础检查
    with open('.drone.yml', 'r') as f:
        content = f.read()
        if 'kind: pipeline' in content and 'steps:' in content and 'commands:' in content:
            print('OK')
        else:
            print('ERROR')
except Exception as e:
    print('ERROR')
    print(f'Error: {e}', file=sys.stderr)
" 2>/dev/null | grep -q "OK"; then
    print_status "OK" ".drone.yml 语法正确"
else
    print_status "WARN" ".drone.yml 语法检查受限 (需要 PyYAML 进行完整验证)"
fi

# 2. 检查 Docker Compose 配置
print_status "INFO" "检查 Docker Compose 配置..."
if docker-compose -f docker-compose.prod.yml config >/dev/null 2>&1; then
    print_status "OK" "Docker Compose 配置正确"
else
    print_status "ERROR" "Docker Compose 配置错误"
    echo "运行 'docker-compose -f docker-compose.prod.yml config' 查看详细错误"
fi

# 3. 检查 Redis 连接
print_status "INFO" "检查 Redis 服务器连接..."
if ping -c 1 192.168.0.105 >/dev/null 2>&1; then
    print_status "OK" "Redis 服务器网络可达"
    
    # 检查 Redis 端口
    if timeout 5 bash -c 'cat < /dev/null > /dev/tcp/192.168.0.105/6379' 2>/dev/null; then
        print_status "OK" "Redis 端口 6379 开放"
    else
        print_status "ERROR" "Redis 端口 6379 无法连接"
    fi
else
    print_status "ERROR" "无法 ping 通 Redis 服务器 192.168.0.105"
fi

# 4. 检查必需的环境变量
print_status "INFO" "检查环境变量配置..."
if [ -f ".env" ]; then
    print_status "OK" ".env 文件存在"
    
    required_vars=("BOT_TOKEN" "DEEPSEEK_API_KEY")
    for var in "${required_vars[@]}"; do
        if grep -q "^${var}=" .env && ! grep -q "^${var}=$" .env; then
            print_status "OK" "$var 已配置"
        else
            print_status "WARN" "$var 未配置或为空"
        fi
    done
else
    print_status "WARN" ".env 文件不存在，部署时会从 Drone Secrets 创建"
fi

# 5. 检查 Dockerfile
print_status "INFO" "检查 Dockerfile..."
if [ -f "Dockerfile" ]; then
    print_status "OK" "Dockerfile 存在"
    
    # 简单语法检查
    if docker build . -t test-build --dry-run 2>/dev/null || docker build . -t test-build -f Dockerfile --target production 2>/dev/null; then
        print_status "OK" "Dockerfile 语法正确"
    else
        print_status "WARN" "无法验证 Dockerfile（需要 Docker BuildKit 或构建测试）"
    fi
else
    print_status "ERROR" "Dockerfile 不存在"
fi

# 6. 检查项目文件结构
print_status "INFO" "检查项目文件结构..."
required_files=(
    "package.json"
    "tsconfig.json"
    "src/bot/bot.ts"
    "docker-compose.prod.yml"
    ".drone.yml"
)

for file in "${required_files[@]}"; do
    if [ -f "$file" ]; then
        print_status "OK" "$file 存在"
    else
        print_status "ERROR" "$file 缺失"
    fi
done

# 7. 模拟 Drone 环境变量创建
print_status "INFO" "模拟 Drone 环境变量处理..."
cat > .env.test << 'EOF'
BOT_TOKEN=test_token
DEEPSEEK_API_KEY=test_key
REDIS_URL=redis://192.168.0.105:6379
NODE_ENV=production
TZ=Asia/Phnom_Penh
BAIDU_APPID=test_appid
BAIDU_SECRET=test_secret
FLOMO_WEBHOOK=https://example.com/webhook
NOTION_API_KEY=test_notion_key
NOTION_PAGE_ID=test_page_id
EOF

if [ -f ".env.test" ]; then
    print_status "OK" "环境变量文件创建测试成功"
    rm .env.test
else
    print_status "ERROR" "环境变量文件创建失败"
fi

# 8. 检查网络配置
print_status "INFO" "检查网络配置..."
if grep -q "network_mode.*host" docker-compose.prod.yml; then
    print_status "OK" "使用 host 网络模式"
else
    print_status "WARN" "未使用 host 网络模式，可能影响外部 Redis 连接"
fi

# 9. 提供诊断建议
echo
echo "==========================================="
print_status "INFO" "诊断建议"
echo "==========================================="

print_status "INFO" "常见问题解决："
echo "1. 如果 Git 克隆正常但后续步骤失败，检查 Drone Runner 的 Docker 权限"
echo "2. 如果 Redis 连接失败，确保 192.168.0.105:6379 在部署环境中可访问"
echo "3. 如果环境变量问题，检查 Drone Secrets 配置"
echo "4. 如果构建失败，检查 Dockerfile 和依赖配置"

print_status "INFO" "调试命令："
echo "# 手动测试 Docker Compose 配置"
echo "docker-compose -f docker-compose.prod.yml config"
echo ""
echo "# 手动测试构建"
echo "docker-compose -f docker-compose.prod.yml build"
echo ""
echo "# 测试 Redis 连接"
echo "docker run --rm redis:7-alpine redis-cli -h 192.168.0.105 -p 6379 ping"
echo ""
echo "# 检查 Drone 日志"
echo "drone logs your-repo/asimoGo latest"

echo
print_status "OK" "诊断完成！"
