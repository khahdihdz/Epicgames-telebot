#!/bin/bash

# Script setup Cloudflare Workers Secrets
# Chạy script này để cài đặt tất cả secrets cần thiết

echo "🚀 Epic Games Bot - Setup Secrets"
echo "=================================="
echo ""

# Kiểm tra wrangler đã được cài đặt chưa
if ! command -v wrangler &> /dev/null; then
    echo "❌ Wrangler CLI chưa được cài đặt!"
    echo "Cài đặt bằng: npm install -g wrangler"
    exit 1
fi

echo "✅ Wrangler CLI đã được cài đặt"
echo ""

# Kiểm tra đã login chưa
echo "🔐 Kiểm tra đăng nhập Cloudflare..."
if ! wrangler whoami &> /dev/null; then
    echo "❌ Chưa đăng nhập Cloudflare!"
    echo "Chạy: wrangler login"
    exit 1
fi

echo "✅ Đã đăng nhập Cloudflare"
echo ""

# 1. TELEGRAM_BOT_TOKEN
echo "📱 [1/3] Cài đặt TELEGRAM_BOT_TOKEN"
echo "Lấy token từ @BotFather trên Telegram"
echo "Token có dạng: 1234567890:ABCdefGHIjklMNOpqrsTUVwxyz"
echo ""
read -p "Nhập Bot Token: " TELEGRAM_BOT_TOKEN

if [ -z "$TELEGRAM_BOT_TOKEN" ]; then
    echo "❌ Bot Token không được để trống!"
    exit 1
fi

echo "$TELEGRAM_BOT_TOKEN" | wrangler secret put TELEGRAM_BOT_TOKEN
echo "✅ Đã lưu TELEGRAM_BOT_TOKEN"
echo ""

# 2. SPREADSHEET_ID
echo "📊 [2/3] Cài đặt SPREADSHEET_ID"
echo "Lấy ID từ URL Google Sheet:"
echo "https://docs.google.com/spreadsheets/d/[SPREADSHEET_ID]/edit"
echo ""
read -p "Nhập Spreadsheet ID: " SPREADSHEET_ID

if [ -z "$SPREADSHEET_ID" ]; then
    echo "❌ Spreadsheet ID không được để trống!"
    exit 1
fi

echo "$SPREADSHEET_ID" | wrangler secret put SPREADSHEET_ID
echo "✅ Đã lưu SPREADSHEET_ID"
echo ""

# 3. GOOGLE_SERVICE_ACCOUNT_JSON
echo "🔑 [3/3] Cài đặt GOOGLE_SERVICE_ACCOUNT_JSON"
echo "Nhập đường dẫn đến file JSON của Service Account"
echo "File này được tải từ Google Cloud Console"
echo ""
read -p "Nhập đường dẫn file JSON: " JSON_PATH

if [ ! -f "$JSON_PATH" ]; then
    echo "❌ File không tồn tại: $JSON_PATH"
    exit 1
fi

# Kiểm tra file JSON hợp lệ
if ! jq empty "$JSON_PATH" 2>/dev/null; then
    echo "⚠️  jq chưa được cài đặt, bỏ qua kiểm tra JSON"
    echo "Cài đặt jq để kiểm tra: brew install jq (macOS) hoặc apt install jq (Linux)"
fi

cat "$JSON_PATH" | wrangler secret put GOOGLE_SERVICE_ACCOUNT_JSON
echo "✅ Đã lưu GOOGLE_SERVICE_ACCOUNT_JSON"
echo ""

# Hoàn thành
echo "✅ =================================="
echo "✅ Đã cài đặt xong tất cả secrets!"
echo "✅ =================================="
echo ""
echo "🚀 Các bước tiếp theo:"
echo "1. Deploy worker: npx wrangler deploy"
echo "2. Set webhook: ./set-webhook.sh"
echo "3. Test bot: Gửi /start cho bot trên Telegram"
echo ""