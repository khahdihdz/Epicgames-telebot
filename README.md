# 🎮 Epic Games Free Bot - Deploy trên Render

Bot Telegram thông báo game miễn phí hàng tuần trên Epic Games Store với dashboard quản lý và tính năng donate.

## ✨ Tính năng

- 🔔 Thông báo tự động khi có game miễn phí mới
- 📊 Dashboard web với Bootstrap để quản lý và xem thống kê
- 💝 Tích hợp donate qua QR Code VietQR (MSB)
- 🗄️ Lưu trữ dữ liệu với SQLite
- ⚡ Kiểm tra game mỗi giờ
- 🎯 Giao diện đẹp và dễ sử dụng
- ☁️ Deploy miễn phí trên Render

## 📋 Yêu cầu

- Tài khoản GitHub
- Tài khoản Render (miễn phí)
- Telegram Bot Token

## 🚀 Hướng dẫn Deploy trên Render

### Bước 1: Tạo Telegram Bot

1. Mở Telegram và tìm [@BotFather](https://t.me/botfather)
2. Gửi lệnh `/newbot`
3. Đặt tên và username cho bot (ví dụ: `EpicGamesFreeBot`)
4. Lưu lại **Bot Token** (dạng: `1234567890:ABCdefGHIjklMNOpqrsTUVwxyz`)
5. Gửi `/setcommands` cho BotFather và paste:
```
start - Bắt đầu và đăng ký nhận thông báo
stop - Hủy đăng ký
games - Xem game miễn phí hiện tại
donate - Xem thông tin ủng hộ
```

### Bước 2: Lấy Telegram ID của bạn

1. Mở [@userinfobot](https://t.me/userinfobot)
2. Bot sẽ trả về ID của bạn (ví dụ: `123456789`)
3. Lưu lại con số này

### Bước 3: Tạo Repository GitHub

1. Đăng nhập GitHub
2. Tạo repository mới (ví dụ: `epic-games-bot`)
3. Upload các file sau vào repository:
   - `bot.py`
   - `requirements.txt`
   - `runtime.txt`
   - `render.yaml`
   - `.gitignore`
   - Thư mục `templates/` chứa `dashboard.html`

Hoặc dùng Git command line:

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/epic-games-bot.git
git push -u origin main
```

### Bước 4: Deploy trên Render

#### Cách 1: Sử dụng render.yaml (Khuyên dùng)

1. Truy cập [Render Dashboard](https://dashboard.render.com/)
2. Click **New** → **Blueprint**
3. Connect GitHub repository của bạn
4. Render sẽ tự động phát hiện file `render.yaml`
5. Nhập Environment Variables:
   - `TELEGRAM_TOKEN`: Token bot từ BotFather
   - `ADMIN_ID`: ID Telegram của bạn

#### Cách 2: Tạo Web Service thủ công

1. Truy cập [Render Dashboard](https://dashboard.render.com/)
2. Click **New** → **Web Service**
3. Connect GitHub repository
4. Cấu hình:
   - **Name**: `epic-games-bot`
   - **Environment**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `python bot.py`
   - **Plan**: `Free`

5. Thêm Environment Variables:
   ```
   TELEGRAM_TOKEN = your_bot_token_here
   ADMIN_ID = your_telegram_id_here
   ```

6. Click **Create Web Service**

### Bước 5: Cấu hình Persistent Disk (Tùy chọn)

Để lưu database khi restart:

1. Vào service vừa tạo
2. Tab **Settings** → **Disks**
3. Click **Add Disk**
4. Cấu hình:
   - **Name**: `bot-data`
   - **Mount Path**: `/opt/render/project/src`
   - **Size**: `1 GB` (miễn phí)
5. Click **Save**

### Bước 6: Hoàn tất

1. Render sẽ tự động deploy (mất 2-5 phút)
2. Sau khi deploy xong, bạn sẽ có:
   - Bot Telegram hoạt động 24/7
   - Dashboard tại: `https://your-app-name.onrender.com`
3. Mở Telegram, tìm bot của bạn và gửi `/start`

## 🔧 Cấu hình nâng cao

### Thêm Webhook URL vào bot

Trong file `bot.py`, bạn có thể thêm webhook thay vì polling:

```python
# Thay vì
application.run_polling(allowed_updates=Update.ALL_TYPES)

# Dùng
application.run_webhook(
    listen="0.0.0.0",
    port=PORT,
    webhook_url=f"{RENDER_EXTERNAL_URL}/{TELEGRAM_TOKEN}"
)
```

### Tùy chỉnh thời gian check

Trong `bot.py`, thay đổi:

```python
CHECK_INTERVAL = 3600  # 3600 giây = 1 giờ
```

### Cập nhật code

Sau khi thay đổi code:

```bash
git add .
git commit -m "Update code"
git push
```

Render sẽ tự động deploy lại!

## 📱 Sử dụng Bot

### Lệnh cơ bản:

- `/start` - Đăng ký nhận thông báo
- `/stop` - Hủy đăng ký
- `/games` - Xem game miễn phí hiện tại
- `/donate` - Xem thông tin ủng hộ

### Dashboard

Truy cập: `https://your-app-name.onrender.com`

Hiển thị:
- 📊 Số người đăng ký
- 🎮 Số game đã thông báo
- 🎁 Danh sách game miễn phí
- 💝 QR code donate

## 📁 Cấu trúc Project

```
epic-games-bot/
├── bot.py                 # Code chính
├── requirements.txt       # Thư viện Python
├── runtime.txt           # Python version
├── render.yaml           # Cấu hình Render
├── .gitignore            # Loại trừ file
├── bot_data.db           # Database (tự động tạo)
├── templates/
│   └── dashboard.html    # Giao diện dashboard
└── README.md             # File này
```

## 🐛 Troubleshooting

### Bot không hoạt động?

1. Kiểm tra logs trên Render Dashboard
2. Verify Bot Token đúng chưa
3. Kiểm tra Environment Variables

### Database bị mất sau restart?

1. Thêm Persistent Disk như hướng dẫn ở Bước 5
2. Hoặc dùng PostgreSQL (xem bên dưới)

### Free tier của Render

- Web service miễn phí sẽ sleep sau 15 phút không hoạt động
- Tự động wake up khi có request
- Có thể dùng UptimeRobot để ping mỗi 5 phút

## 🔄 Nâng cấp Database sang PostgreSQL

Nếu muốn database ổn định hơn:

1. Thêm PostgreSQL service trên Render
2. Cài `psycopg2-binary` trong requirements.txt
3. Thay đổi code database connection

## 💡 Tips

1. **Giữ bot luôn chạy**: Dùng [UptimeRobot](https://uptimerobot.com/) ping dashboard mỗi 5 phút
2. **Custom domain**: Render cho phép thêm custom domain miễn phí
3. **Logs**: Xem logs realtime trên Render Dashboard
4. **Auto deploy**: Mỗi lần push code, Render tự động deploy

## 💝 Donate

**🏦 Ngân hàng MSB**
- 📱 Số TK: 13001011869246
- 👤 Chủ TK: DINH TRONG KHANH

Hoặc quét QR code trong bot!

## 🔗 Links hữu ích

- [Render Documentation](https://render.com/docs)
- [Telegram Bot API](https://core.telegram.org/bots/api)
- [Epic Games Store API](https://store-site-backend-static.ak.epicgames.com/)

## 📝 License

MIT License - Tự do sử dụng và chỉnh sửa

## 👨‍💻 Tác giả

**DINH TRONG KHANH**

---

**Chúc bạn deploy thành công! 🎮🚀**

## ❓ FAQ

**Q: Render free tier có giới hạn gì?**
A: 750 giờ/tháng miễn phí, đủ để chạy 1 bot 24/7. Service sẽ sleep sau 15 phút không hoạt động.

**Q: Làm sao để bot không bị sleep?**
A: Dùng UptimeRobot hoặc cron-job.org để ping dashboard mỗi 5-10 phút.

**Q: Database có bị mất không?**
A: Nếu dùng Persistent Disk thì không. Nếu không có disk, data sẽ mất khi restart.

**Q: Có thể dùng webhook thay polling không?**
A: Có, nhưng polling đơn giản hơn và phù hợp với free tier.

**Q: Chi phí deploy?**
A: Hoàn toàn miễn phí với Render free tier!