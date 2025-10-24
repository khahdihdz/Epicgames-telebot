#!/bin/bash

# Script thiết lập Telegram Webhook
# Chạy script này sau khi deploy worker

echo "🔗 Thiết lập Telegram Webhook"
echo "=============================="
echo ""

# Nhập thông tin
read -p "Nhập Bot Token: " BOT_TOKEN
read -p "Nhập Worker URL (ví dụ: https://epic-games-bot.your-name.workers.dev): " WORKER_URL

if [ -z "$BOT_TOKEN" ] || [ -z "$WORKER_URL" ]; then
    echo "❌ Thiếu thông tin!"
    exit 1
fi

# Thêm /webhook vào URL nếu chưa có
if [[ "$WORKER_URL" != *"/webhook" ]]; then
    WORKER_URL="${WORKER_URL}/webhook"
fi

echo ""
echo "🔄 Đang thiết lập webhook..."
echo "URL: $WORKER_URL"
echo ""

# Set webhook
RESPONSE=$(curl -s -X POST "https://api.telegram.org/bot${BOT_TOKEN}/setWebhook" \
  -H "Content-Type: application/json" \
  -d "{\"url\":\"${WORKER_URL}\"}")

# Kiểm tra kết quả
if echo "$RESPONSE" | grep -q '"ok":true'; then
    echo "✅ Đã thiết lập webhook thành công!"
    echo ""
    echo "📋 Thông tin webhook:"
    curl -s "https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo" | jq .
else
    echo "❌ Lỗi khi thiết lập webhook!"
    echo "$RESPONSE" | jq .
    exit 1
fi

echo ""
echo "✅ Hoàn tất! Bạn có thể test bot bằng cách:"
echo "1. Mở Telegram và tìm bot của bạn"
echo "2. Gửi lệnh /start"
echo ""