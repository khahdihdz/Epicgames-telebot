# Hướng dẫn Setup Bot với Secrets

## 📋 Mục lục
1. [Chuẩn bị](#1-chuẩn-bị)
2. [Tạo Telegram Bot](#2-tạo-telegram-bot)
3. [Tạo Google Service Account](#3-tạo-google-service-account)
4. [Tạo và Cấu hình Google Sheets](#4-tạo-và-cấu-hình-google-sheets)
5. [Setup Cloudflare Workers](#5-setup-cloudflare-workers)
6. [Cài đặt Secrets](#6-cài-đặt-secrets)
7. [Deploy và Test](#7-deploy-và-test)

---

## 1. Chuẩn bị

### Cài đặt công cụ cần thiết:

```bash
# Cài đặt Node.js (nếu chưa có)
# Download từ: https://nodejs.org/

# Cài đặt Wrangler CLI
npm install -g wrangler

# Đăng nhập Cloudflare
wrangler login
```

---

## 2. Tạo Telegram Bot

1. Mở Telegram, tìm **@BotFather**
2. Gửi lệnh: `/newbot`
3. Đặt tên bot: `Epic Games Free Bot`
4. Đặt username (phải kết thúc bằng `bot`): `epicgamesfree_bot`
5. **Lưu lại Bot Token** (dạng: `1234567890:ABCdefGHIjklMNOpqrs`)

### Tùy chọn: Cấu hình bot commands

Gửi cho @BotFather:
```
/setcommands
```

Sau đó paste:
```
start - Bắt đầu nhận thông báo
games - Xem game miễn phí hiện tại
stats - Thống kê bot
stop - Dừng nhận thông báo
```

---

## 3. Tạo Google Service Account

### Bước 1: Tạo Project
1. Truy cập [Google Cloud Console](https://console.cloud.google.com)
2. Click "Select a project" → "New Project"
3. Đặt tên: `epic-games-bot`
4. Click "Create"

### Bước 2: Enable API
1. Menu ≡ → "APIs & Services" → "Library"
2. Tìm "Google Sheets API"
3. Click "Enable"

### Bước 3: Tạo Service Account
1. Menu ≡ → "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "Service Account"
3. Điền:
   - Name: `epic-games-bot`
   - ID: auto-generate
4. Click "Create and Continue"
5. Skip phần Grant access
6. Click "Done"

### Bước 4: Download Key
1. Click vào Service Account vừa tạo
2. Tab "Keys" → "Add Key" → "Create new key"
3. Chọn "JSON"
4. Click "Create"
5. **Lưu file JSON này - sẽ dùng ở bước 6**

File JSON có dạng:
```json
{
  "type": "service_account",
  "project_id": "epic-games-bot-xxxxx",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "epic-games-bot@epic-games-bot-xxxxx.iam.gserviceaccount.com",
  ...
}
```

---

## 4. Tạo và Cấu hình Google Sheets

### Bước 1: Tạo Spreadsheet
1. Truy cập [Google Sheets](https://sheets.google.com)
2. Tạo spreadsheet mới
3. Đặt tên: "Epic Games Bot Users"

### Bước 2: Cấu trúc Sheet
1. Đổi tên Sheet1 thành **"Users"**
2. Thêm header vào hàng 1:
   - Cell A1: `Chat ID`
   - Cell B1: `Username`
   - Cell C1: `Registered At`

### Bước 3: Share với Service Account
1. Click nút "Share" (góc phải trên)
2. Paste **client_email** từ file JSON (bước 3)
   - Dạng: `epic-games-bot@xxxxx.iam.gserviceaccount.com`
3. Chọn quyền: **Editor**
4. Bỏ tick "Notify people"
5. Click "Share"

### Bước 4: Lấy Spreadsheet ID
Từ URL của Google Sheet:
```
https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit
                                       ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
                                       ← Đây là SPREADSHEET_ID
```
**Lưu lại ID này - sẽ dùng ở bước 6**

---

## 5. Setup Cloudflare Workers

### Bước 1: Tạo project
```bash
# Tạo project mới
npm create cloudflare@latest epic-games-bot

# Chọn các option:
# - Type: "Hello World" Worker
# - TypeScript: No
# - Git: Yes (recommended)
# - Deploy: No (sẽ deploy sau)

cd epic-games-bot
```

### Bước 2: Thêm code
1. Mở file `src/index.js`
2. **Xóa toàn bộ nội dung cũ**
3. **Copy code từ artifact "Cloudflare Workers - Epic Games Bot"** vào

### Bước 3: Cập nhật wrangler.toml
Chỉnh sửa file `wrangler.toml`:

```toml
name = "epic-games-bot"
main = "src/index.js"
compatibility_date = "2024-01-01"

# Cron job - chạy mỗi ngày lúc 9:00 UTC (16:00 giờ Việt Nam)
[triggers]
crons = ["0 9 * * *"]

# Không cần vars vì dùng secrets
```

---

## 6. Cài đặt Secrets

### Phương pháp 1: Sử dụng Script tự động (Khuyến nghị)

#### Trên Linux/macOS:

```bash
# Tải script
curl -o setup-secrets.sh https://raw.githubusercontent.com/khahdihdz/Epicgames-telebot/refs/heads/main/setup-secrets.sh

# Hoặc tạo file thủ công từ artifact "setup-secrets.sh"

# Cấp quyền thực thi
chmod +x setup-secrets.sh

# Chạy script
./setup-secrets.sh
```

Script sẽ yêu cầu bạn nhập:
1. **Bot Token** từ @BotFather
2. **Spreadsheet ID** từ URL Google Sheet
3. **Đường dẫn file JSON** của Service Account

#### Trên Windows:

```powershell
# Tạo file setup-secrets.ps1 với nội dung:

# 1. TELEGRAM_BOT_TOKEN
$botToken = Read-Host "Nhập Bot Token"
$botToken | wrangler secret put TELEGRAM_BOT_TOKEN

# 2. SPREADSHEET_ID  
$spreadsheetId = Read-Host "Nhập Spreadsheet ID"
$spreadsheetId | wrangler secret put SPREADSHEET_ID

# 3. GOOGLE_SERVICE_ACCOUNT_JSON
$jsonPath = Read-Host "Nhập đường dẫn file JSON"
Get-Content $jsonPath | wrangler secret put GOOGLE_SERVICE_ACCOUNT_JSON

Write-Host "✅ Đã cài đặt xong tất cả secrets!"
```

Chạy:
```powershell
.\setup-secrets.ps1
```

### Phương pháp 2: Setup thủ công

```bash
# 1. Set Bot Token
echo "YOUR_BOT_TOKEN" | wrangler secret put TELEGRAM_BOT_TOKEN

# 2. Set Spreadsheet ID
echo "YOUR_SPREADSHEET_ID" | wrangler secret put SPREADSHEET_ID

# 3. Set Service Account JSON (toàn bộ nội dung file)
cat path/to/service-account.json | wrangler secret put GOOGLE_SERVICE_ACCOUNT_JSON
```

### Kiểm tra secrets đã được lưu:
```bash
wrangler secret list
```

Bạn sẽ thấy:
```
Name                          Created At
TELEGRAM_BOT_TOKEN            2024-01-01T00:00:00.000Z
SPREADSHEET_ID                2024-01-01T00:00:00.000Z
GOOGLE_SERVICE_ACCOUNT_JSON   2024-01-01T00:00:00.000Z
```

---

## 7. Deploy và Test

### Bước 1: Deploy Worker
```bash
npx wrangler deploy
```

Sau khi deploy thành công, bạn sẽ nhận được URL:
```
Published epic-games-bot (1.23 sec)
  https://epic-games-bot.your-username.workers.dev
```

**Lưu lại URL này!**

### Bước 2: Thiết lập Telegram Webhook

#### Cách 1: Sử dụng script (Linux/macOS)

```bash
# Tải script
curl -o set-webhook.sh https://raw.githubusercontent.com/khahdihdz/Epicgames-telebot/refs/heads/main/set-webhook.sh

# Hoặc tạo từ artifact "set-webhook.sh"

# Cấp quyền
chmod +x set-webhook.sh

# Chạy
./set-webhook.sh
```

#### Cách 2: Thủ công với curl

```bash
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://epic-games-bot.your-username.workers.dev/webhook"}'
```

#### Cách 3: Qua trình duyệt

Truy cập URL:
```
https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook?url=https://epic-games-bot.your-username.workers.dev/webhook
```

### Bước 3: Kiểm tra Webhook
```bash
curl "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getWebhookInfo"
```

Kết quả mong muốn:
```json
{
  "ok": true,
  "result": {
    "url": "https://epic-games-bot.your-username.workers.dev/webhook",
    "has_custom_certificate": false,
    "pending_update_count": 0
  }
}
```

### Bước 4: Test Bot

1. **Mở Telegram**, tìm bot bằng username (ví dụ: `@epicgamesfree_bot`)
2. **Gửi lệnh `/start`**
   - Bot sẽ chào bạn và lưu Chat ID vào Google Sheet
3. **Gửi lệnh `/games`**
   - Bot sẽ hiển thị game miễn phí hiện tại
4. **Kiểm tra Google Sheet**
   - Chat ID của bạn đã được thêm vào

### Bước 5: Test Manual Notification

Truy cập URL để test gửi thông báo thủ công:
```
https://epic-games-bot.your-username.workers.dev/notify
```

Bot sẽ gửi thông báo cho tất cả users trong Google Sheet.

### Bước 6: Test các endpoint khác

```bash
# Health check
curl https://epic-games-bot.your-username.workers.dev/health

# Xem game hiện tại (JSON)
curl https://epic-games-bot.your-username.workers.dev/test-games
```

---

## 🎯 Các lệnh Bot

| Lệnh | Mô tả |
|------|-------|
| `/start` | Đăng ký nhận thông báo game miễn phí |
| `/games` | Xem danh sách game miễn phí hiện tại |
| `/stats` | Xem thống kê bot |
| `/stop` | Hủy đăng ký thông báo |

---

## 🔧 Troubleshooting

### Lỗi: "Unauthorized" khi truy cập Google Sheets

**Nguyên nhân:** Service Account chưa được share quyền truy cập Sheet

**Giải pháp:**
1. Mở Google Sheet
2. Click "Share"
3. Thêm email của Service Account
4. Chọn quyền "Editor"

### Lỗi: Bot không phản hồi

**Kiểm tra:**
```bash
# 1. Kiểm tra webhook
curl "https://api.telegram.org/bot<BOT_TOKEN>/getWebhookInfo"

# 2. Xem logs trên Cloudflare
wrangler tail

# 3. Test worker trực tiếp
curl https://epic-games-bot.your-username.workers.dev/health
```

**Giải pháp:**
- Đảm bảo webhook đã được set đúng
- Kiểm tra Bot Token chính xác
- Xem logs để tìm lỗi cụ thể

### Lỗi: "Invalid private key"

**Nguyên nhân:** Private key trong Service Account JSON không đúng format

**Giải pháp:**
1. Download lại file JSON từ Google Cloud
2. Đảm bảo copy toàn bộ nội dung file (bao gồm cả `{` và `}`)
3. Set lại secret:
```bash
cat service-account.json | wrangler secret put GOOGLE_SERVICE_ACCOUNT_JSON
```

### Cron job không chạy

**Kiểm tra:**
1. Đảm bảo `wrangler.toml` có cấu hình cron:
```toml
[triggers]
crons = ["0 9 * * *"]
```
2. Đợi đến giờ chạy (9:00 UTC = 16:00 VN)
3. Test manual: truy cập `/notify`
4. Xem logs:
```bash
wrangler tail
```

### Rate limit từ Telegram

**Triệu chứng:** Bot gửi tin nhắn bị chậm hoặc lỗi

**Giải pháp:** 
- Code đã có delay tự động (500ms giữa tin nhắn, 2s giữa users)
- Nếu vẫn bị, tăng delay trong code:
```javascript
// Tăng từ 1000 lên 2000
await new Promise(resolve => setTimeout(resolve, 2000));
```

---

## 📊 Giới hạn Free Tier

### Cloudflare Workers (Free Plan)
- ✅ 100,000 requests/ngày
- ✅ 10ms CPU time/request  
- ✅ 128MB memory
- ✅ Đủ cho vài nghìn users

### Google Sheets API (Free)
- ✅ 60 requests/phút/user
- ✅ 500 requests/100 giây
- ✅ Đủ cho bot nhỏ và vừa

### Telegram Bot API (Free)
- ✅ 30 tin nhắn/giây
- ✅ Không giới hạn users
- ✅ Miễn phí hoàn toàn

---

## 🔒 Bảo mật

### ✅ Đã làm đúng:
- Sử dụng Cloudflare Secrets thay vì hard-code
- Không commit credentials lên Git
- Service Account chỉ có quyền truy cập Sheet cần thiết

### ⚠️ Khuyến nghị thêm:
1. **Thêm .gitignore:**
```gitignore
node_modules/
.wrangler/
*.log
service-account.json
.env
```

2. **Giới hạn quyền Service Account:**
   - Chỉ share Sheet cần thiết
   - Không dùng Editor role cho toàn project

3. **Backup Google Sheet:**
   - File → Make a copy
   - Hoặc download định kỳ

---

## 🚀 Nâng cấp (Tùy chọn)

### 1. Thêm database thật (KV/D1)
Thay Google Sheets bằng Cloudflare KV hoặc D1:

```javascript
// Thêm vào wrangler.toml
[[kv_namespaces]]
binding = "USERS_KV"
id = "your-kv-id"
```

### 2. Thêm tính năng lọc
```javascript
// Lọc theo thể loại game
if (text.startsWith('/filter')) {
  const genre = text.split(' ')[1];
  // Lọc game theo thể loại
}
```

### 3. Multi-language
```javascript
const messages = {
  en: { welcome: "Welcome!" },
  vi: { welcome: "Chào mừng!" }
};
```

### 4. Analytics
Tích hợp Google Analytics hoặc Cloudflare Analytics để theo dõi:
- Số lượng users
- Lượt sử dụng lệnh
- Hiệu suất bot

---

## 📝 Checklist hoàn thành

- [ ] Tạo Telegram Bot và lưu Bot Token
- [ ] Tạo Google Service Account và download JSON
- [ ] Tạo Google Sheet và share với Service Account
- [ ] Cài đặt Wrangler CLI và login Cloudflare
- [ ] Tạo project Cloudflare Workers
- [ ] Copy code vào `src/index.js`
- [ ] Cấu hình `wrangler.toml`
- [ ] Set 3 secrets (BOT_TOKEN, SPREADSHEET_ID, SERVICE_ACCOUNT_JSON)
- [ ] Deploy worker
- [ ] Set webhook Telegram
- [ ] Test bot với `/start` và `/games`
- [ ] Kiểm tra Google Sheet có data
- [ ] Test manual notification qua `/notify`

---

## 🆘 Liên hệ & Support

- **Epic Games API:** [store.epicgames.com](https://store.epicgames.com)
- **Telegram Bot API:** [core.telegram.org/bots](https://core.telegram.org/bots)
- **Cloudflare Docs:** [developers.cloudflare.com](https://developers.cloudflare.com)
- **Google Sheets API:** [developers.google.com/sheets](https://developers.google.com/sheets)

**Chúc bạn thành công! 🎮🚀**