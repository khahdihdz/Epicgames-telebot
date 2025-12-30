# 🚀 Hướng dẫn Deploy Bot lên Render - Chi tiết từng bước

## 📌 Chuẩn bị

### 1. Tạo Bot Telegram

**Bước 1:** Mở Telegram, tìm kiếm `@BotFather`

**Bước 2:** Gửi lệnh `/newbot`

**Bước 3:** BotFather sẽ hỏi tên bot:
```
Alright, a new bot. How are we going to call it?
Please choose a name for your bot.
```
Nhập: `Epic Games Free Notifier` (hoặc tên bất kỳ)

**Bước 4:** BotFather hỏi username (phải kết thúc bằng `bot`):
```
Good. Now let's choose a username for your bot.
It must end in `bot`. Like this, for example: TetrisBot or tetris_bot.
```
Nhập: `epicgamesfree_bot` (hoặc username khác)

**Bước 5:** Lưu Token:
```
Done! Congratulations on your new bot.
You will find it at t.me/epicgamesfree_bot
...
Use this token to access the HTTP API:
1234567890:ABCdefGHIjklMNOpqrsTUVwxyz
```
✅ Copy và lưu token này!

**Bước 6:** Set commands cho bot, gửi `/setcommands`:
```
start - Bắt đầu và đăng ký nhận thông báo
stop - Hủy đăng ký
games - Xem game miễn phí hiện tại
donate - Xem thông tin ủng hộ
```

### 2. Lấy Telegram ID

**Bước 1:** Tìm kiếm `@userinfobot` trên Telegram

**Bước 2:** Start bot, nó sẽ trả về:
```
Id: 123456789
First name: Your Name
...
```
✅ Lưu lại số `Id`

## 🌐 Deploy trên Render

### Phương án 1: Deploy trực tiếp từ GitHub (Khuyên dùng)

#### A. Upload code lên GitHub

**Bước 1:** Tạo repository mới trên GitHub
- Đăng nhập GitHub
- Click nút `+` → `New repository`
- Đặt tên: `epic-games-bot`
- Chọn `Public` hoặc `Private`
- Click `Create repository`

**Bước 2:** Upload files
- Click `uploading an existing file`
- Kéo thả hoặc chọn các file:
  - `bot.py`
  - `requirements.txt`
  - `runtime.txt`
  - `render.yaml`
  - `.gitignore`
- Tạo folder `templates` và upload `dashboard.html`
- Click `Commit changes`

#### B. Deploy trên Render

**Bước 1:** Truy cập [render.com](https://render.com)
- Click `Get Started for Free`
- Đăng ký bằng GitHub account

**Bước 2:** Tạo Web Service
- Vào Dashboard
- Click `New +` → `Blueprint`
- Cho phép Render truy cập GitHub
- Chọn repository `epic-games-bot`
- Render sẽ phát hiện file `render.yaml`

**Bước 3:** Cấu hình Environment Variables
- Render sẽ hiện form nhập biến môi trường
- Nhập:
  ```
  TELEGRAM_TOKEN = paste_token_của_bạn
  ADMIN_ID = paste_id_của_bạn
  ```
- Click `Apply`

**Bước 4:** Deploy
- Render bắt đầu build (2-5 phút)
- Theo dõi logs để xem tiến trình
- Khi thấy `Bot started successfully!` → Hoàn tất!

**Bước 5:** Lấy URL
- Sau khi deploy xong, copy URL (dạng: `https://epic-games-bot-xxxx.onrender.com`)
- Mở Telegram, tìm bot và gửi `/start`

### Phương án 2: Deploy Manual (Không dùng render.yaml)

**Bước 1:** Tạo Web Service
- Dashboard → `New +` → `Web Service`
- Connect GitHub repository

**Bước 2:** Cấu hình
```
Name: epic-games-bot
Environment: Python 3
Region: Singapore (hoặc gần nhất)
Branch: main
Build Command: pip install -r requirements.txt
Start Command: python bot.py
```

**Bước 3:** Chọn Plan
- Chọn `Free` (0$/tháng)

**Bước 4:** Advanced Settings
- Add Environment Variables:
  - Key: `TELEGRAM_TOKEN`, Value: `your_token`
  - Key: `ADMIN_ID`, Value: `your_id`

**Bước 5:** Create Web Service

## 💾 Thêm Persistent Storage (Quan trọng!)

Render free tier sẽ restart service, làm mất database. Để giữ data:

**Bước 1:** Vào service đã tạo

**Bước 2:** Tab `Settings` → Scroll xuống `Disks`

**Bước 3:** Click `Add Disk`
```
Name: bot-data
Mount Path: /opt/render/project/src
Size: 1 GB
```

**Bước 4:** Click `Save Changes`

**Bước 5:** Render sẽ restart service, chờ 1-2 phút

✅ Database giờ sẽ không bị mất khi restart!

## 🔄 Giữ Bot luôn chạy (Không bị Sleep)

Render free tier sleep sau 15 phút không hoạt động. Giải pháp:

### Sử dụng UptimeRobot

**Bước 1:** Đăng ký [uptimerobot.com](https://uptimerobot.com) (miễn phí)

**Bước 2:** Add New Monitor
```
Monitor Type: HTTP(s)
Friendly Name: Epic Games Bot
URL: https://your-app.onrender.com/health
Monitoring Interval: 5 minutes
```

**Bước 3:** Save

✅ UptimeRobot sẽ ping bot mỗi 5 phút, giữ nó luôn awake!

### Sử dụng Cron-Job.org (Thay thế)

**Bước 1:** Đăng ký [cron-job.org](https://cron-job.org)

**Bước 2:** Create Cronjob
```
Title: Keep Bot Alive
URL: https://your-app.onrender.com/health
Execution: Every 5 minutes
```

## 📊 Kiểm tra Bot hoạt động

### 1. Check Logs

- Vào service trên Render
- Tab `Logs`
- Xem logs realtime, tìm:
  ```
  Bot started successfully!
  Dashboard starting on port 10000
  ```

### 2. Test Bot

- Mở Telegram
- Tìm bot của bạn
- Gửi `/start`
- Bot trả lời → ✅ Thành công!

### 3. Test Dashboard

- Mở browser
- Truy cập: `https://your-app.onrender.com`
- Thấy dashboard → ✅ Thành công!

### 4. Test Thông báo

Chờ 1 giờ hoặc restart service để trigger check game:
- Service → Settings → Manual Deploy → Deploy
- Bot sẽ check game và gửi thông báo nếu có game mới

## 🔧 Cập nhật Code

**Bước 1:** Sửa code trên máy local

**Bước 2:** Push lên GitHub
```bash
git add .
git commit -m "Update features"
git push
```

**Bước 3:** Render tự động deploy lại!

## 🐛 Xử lý lỗi thường gặp

### Lỗi: "Application failed to start"

**Nguyên nhân:** Token hoặc requirements sai

**Giải pháp:**
1. Check Environment Variables
2. Xem logs để biết lỗi cụ thể
3. Verify requirements.txt có đầy đủ thư viện

### Lỗi: "Unauthorized" từ Telegram

**Nguyên nhân:** Bot Token sai

**Giải pháp:**
1. Verify token từ BotFather
2. Update Environment Variable `TELEGRAM_TOKEN`
3. Redeploy service

### Lỗi: Database không lưu

**Nguyên nhân:** Chưa có Persistent Disk

**Giải pháp:**
1. Add Disk như hướng dẫn ở trên
2. Restart service

### Bot bị sleep liên tục

**Nguyên nhân:** Không có traffic

**Giải pháp:**
1. Setup UptimeRobot hoặc Cron-Job
2. Hoặc upgrade lên Render paid plan

## 📈 Monitoring

### Check số người dùng

Truy cập: `https://your-app.onrender.com/api/stats`

Response:
```json
{
  "subscribers": 10,
  "total_games": 5,
  "recent_games": [...]
}
```

### Check health

Truy cập: `https://your-app.onrender.com/health`

Response:
```json
{
  "status": "ok",
  "subscribers": 10
}
```

## 🎉 Hoàn tất!

Bot của bạn giờ đang chạy 24/7 trên Render!

**Kiểm tra:**
- ✅ Bot trả lời trên Telegram
- ✅ Dashboard hiển thị đúng
- ✅ Database lưu trữ
- ✅ Thông báo tự động mỗi giờ

**Tiếp theo:**
1. Share bot với bạn bè
2. Monitor logs thường xuyên
3. Nhận donate qua QR code 💝

---

Có vấn đề gì cứ hỏi nhé! 🚀