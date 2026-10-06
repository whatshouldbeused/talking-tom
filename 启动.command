#!/bin/bash
# 双击这个文件即可启动「会说话的汤姆猫」课堂互动版
cd "$(dirname "$0")" || exit 1

PORT=8000
while lsof -i :$PORT >/dev/null 2>&1; do PORT=$((PORT+1)); done

echo "==================================================="
echo "  🐱 会说话的汤姆猫 · 课堂互动版"
echo ""
echo "  启动中… 浏览器会自动打开："
echo "  http://localhost:$PORT"
echo ""
echo "  ⚠️  演示结束后：关掉这个终端窗口即可停止服务"
echo "==================================================="

(sleep 1.2; open "http://localhost:$PORT" 2>/dev/null || true) &
python3 -m http.server "$PORT"
