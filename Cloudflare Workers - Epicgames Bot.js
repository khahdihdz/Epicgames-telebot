import os
import asyncio
import logging
from datetime import datetime, timedelta
import json
import aiohttp
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import Application, CommandHandler, ContextTypes, CallbackQueryHandler
from flask import Flask, render_template, jsonify, request, send_from_directory
from threading import Thread
import sqlite3
from pathlib import Path

# Logging
logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO
)
logger = logging.getLogger(__name__)

# Configuration
TELEGRAM_TOKEN = os.getenv('TELEGRAM_TOKEN', 'YOUR_TELEGRAM_BOT_TOKEN')
ADMIN_ID = int(os.getenv('ADMIN_ID', '0'))
CHECK_INTERVAL = 3600
PORT = int(os.getenv('PORT', 10000))  # Render uses port 10000
RENDER_EXTERNAL_URL = os.getenv('RENDER_EXTERNAL_URL', f'http://localhost:{PORT}')

# Database path
DB_PATH = Path('bot_data.db')

# Database
def init_db():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('''CREATE TABLE IF NOT EXISTS subscribers
                 (user_id INTEGER PRIMARY KEY, username TEXT, subscribed_at TEXT)''')
    c.execute('''CREATE TABLE IF NOT EXISTS games
                 (id TEXT PRIMARY KEY, title TEXT, description TEXT, 
                  image_url TEXT, start_date TEXT, end_date TEXT, notified INTEGER)''')
    c.execute('''CREATE TABLE IF NOT EXISTS stats
                 (key TEXT PRIMARY KEY, value INTEGER)''')
    conn.commit()
    conn.close()

init_db()

class Database:
    @staticmethod
    def get_connection():
        return sqlite3.connect(DB_PATH, check_same_thread=False)

    @staticmethod
    def add_subscriber(user_id, username):
        conn = Database.get_connection()
        c = conn.cursor()
        try:
            c.execute('INSERT OR IGNORE INTO subscribers VALUES (?, ?, ?)',
                      (user_id, username, datetime.now().isoformat()))
            conn.commit()
        finally:
            conn.close()

    @staticmethod
    def remove_subscriber(user_id):
        conn = Database.get_connection()
        c = conn.cursor()
        try:
            c.execute('DELETE FROM subscribers WHERE user_id = ?', (user_id,))
            conn.commit()
        finally:
            conn.close()

    @staticmethod
    def get_subscribers():
        conn = Database.get_connection()
        c = conn.cursor()
        try:
            c.execute('SELECT user_id FROM subscribers')
            subs = [row[0] for row in c.fetchall()]
            return subs
        finally:
            conn.close()

    @staticmethod
    def get_subscriber_count():
        conn = Database.get_connection()
        c = conn.cursor()
        try:
            c.execute('SELECT COUNT(*) FROM subscribers')
            count = c.fetchone()[0]
            return count
        finally:
            conn.close()

    @staticmethod
    def add_game(game_data):
        conn = Database.get_connection()
        c = conn.cursor()
        try:
            c.execute('''INSERT OR REPLACE INTO games VALUES (?, ?, ?, ?, ?, ?, ?)''',
                      (game_data['id'], game_data['title'], game_data['description'],
                       game_data['image_url'], game_data['start_date'], 
                       game_data['end_date'], game_data.get('notified', 0)))
            conn.commit()
        finally:
            conn.close()

    @staticmethod
    def get_unnotified_games():
        conn = Database.get_connection()
        c = conn.cursor()
        try:
            c.execute('SELECT * FROM games WHERE notified = 0')
            games = c.fetchall()
            return games
        finally:
            conn.close()

    @staticmethod
    def mark_game_notified(game_id):
        conn = Database.get_connection()
        c = conn.cursor()
        try:
            c.execute('UPDATE games SET notified = 1 WHERE id = ?', (game_id,))
            conn.commit()
        finally:
            conn.close()

    @staticmethod
    def get_recent_games(limit=5):
        conn = Database.get_connection()
        c = conn.cursor()
        try:
            c.execute('SELECT * FROM games ORDER BY start_date DESC LIMIT ?', (limit,))
            games = c.fetchall()
            return games
        finally:
            conn.close()

class EpicGamesAPI:
    @staticmethod
    async def get_free_games():
        url = "https://store-site-backend-static.ak.epicgames.com/freeGamesPromotions"
        params = {
            'locale': 'en-US',
            'country': 'US',
            'allowCountries': 'US'
        }
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(url, params=params, timeout=30) as response:
                    data = await response.json()
                    
            games = []
            elements = data.get('data', {}).get('Catalog', {}).get('searchStore', {}).get('elements', [])
            
            for game in elements:
                promotions = game.get('promotions')
                if not promotions:
                    continue
                    
                promotional_offers = promotions.get('promotionalOffers', [])
                if not promotional_offers or not promotional_offers[0].get('promotionalOffers'):
                    continue
                
                offer = promotional_offers[0]['promotionalOffers'][0]
                
                image_url = None
                for image in game.get('keyImages', []):
                    if image.get('type') in ['Carousel', 'DieselStoreFrontWide', 'OfferImageWide']:
                        image_url = image.get('url')
                        break
                
                game_data = {
                    'id': game.get('id'),
                    'title': game.get('title'),
                    'description': game.get('description', 'Không có mô tả'),
                    'image_url': image_url,
                    'start_date': offer.get('startDate'),
                    'end_date': offer.get('endDate'),
                    'notified': 0
                }
                games.append(game_data)
            
            return games
        except Exception as e:
            logger.error(f"Error fetching games: {e}")
            return []

# Bot Commands
async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user = update.effective_user
    Database.add_subscriber(user.id, user.username)
    
    keyboard = [
        [InlineKeyboardButton("🎮 Game miễn phí hiện tại", callback_data='current_games')],
        [InlineKeyboardButton("💝 Ủng hộ", callback_data='donate')],
        [InlineKeyboardButton("ℹ️ Thông tin", callback_data='info')]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)
    
    welcome_text = f"""
🎮 <b>Chào mừng {user.first_name}!</b>

Bot sẽ tự động thông báo khi có game miễn phí mới trên Epic Games Store!

✅ Bạn đã đăng ký nhận thông báo
📢 Nhận thông báo tự động mỗi tuần
🆓 Hoàn toàn miễn phí

<b>Lệnh có sẵn:</b>
/start - Bắt đầu và đăng ký
/stop - Hủy đăng ký
/games - Xem game miễn phí hiện tại
/donate - Ủng hộ phát triển bot
"""
    
    await update.message.reply_text(
        welcome_text,
        parse_mode='HTML',
        reply_markup=reply_markup
    )

async def stop(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user = update.effective_user
    Database.remove_subscriber(user.id)
    await update.message.reply_text(
        "😢 Bạn đã hủy đăng ký nhận thông báo.\n"
        "Gửi /start bất cứ lúc nào để đăng ký lại!"
    )

async def games_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text("🔍 Đang tìm kiếm game miễn phí...")
    games = await EpicGamesAPI.get_free_games()
    
    if not games:
        await update.message.reply_text("❌ Hiện tại không có game miễn phí nào.")
        return
    
    for game in games:
        await send_game_notification(context.bot, update.effective_chat.id, game)

async def donate_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    donate_text = """
💝 <b>Ủng hộ phát triển Bot</b>

Nếu bot hữu ích với bạn, hãy ủng hộ để duy trì server và phát triển thêm tính năng mới!

🏦 <b>Ngân hàng MSB</b>
📱 Số TK: 13001011869246
👤 Chủ TK: DINH TRONG KHANH

Hoặc quét mã QR bên dưới ⬇️
"""
    
    keyboard = [[InlineKeyboardButton("🏠 Về Menu", callback_data='back_to_menu')]]
    reply_markup = InlineKeyboardMarkup(keyboard)
    
    await update.message.reply_photo(
        photo="https://api.vietqr.io/image/970426-13001011869246-GuEo6F2.jpg?accountName=DINH%20TRONG%20KHANH&amount=0",
        caption=donate_text,
        parse_mode='HTML',
        reply_markup=reply_markup
    )

async def button_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()
    
    if query.data == 'current_games':
        await query.message.reply_text("🔍 Đang tìm kiếm game miễn phí...")
        games = await EpicGamesAPI.get_free_games()
        
        if not games:
            await query.message.reply_text("❌ Hiện tại không có game miễn phí nào.")
            return
        
        for game in games:
            await send_game_notification(context.bot, query.message.chat_id, game)
    
    elif query.data == 'donate':
        donate_text = """
💝 <b>Ủng hộ phát triển Bot</b>

Nếu bot hữu ích với bạn, hãy ủng hộ để duy trì server và phát triển thêm tính năng mới!

🏦 <b>Ngân hàng MSB</b>
📱 Số TK: 13001011869246
👤 Chủ TK: DINH TRONG KHANH

Hoặc quét mã QR bên dưới ⬇️
"""
        keyboard = [[InlineKeyboardButton("🏠 Về Menu", callback_data='back_to_menu')]]
        reply_markup = InlineKeyboardMarkup(keyboard)
        
        await query.message.reply_photo(
            photo="https://api.vietqr.io/image/970426-13001011869246-GuEo6F2.jpg?accountName=DINH%20TRONG%20KHANH&amount=0",
            caption=donate_text,
            parse_mode='HTML',
            reply_markup=reply_markup
        )
    
    elif query.data == 'info':
        info_text = f"""
ℹ️ <b>Thông tin Bot</b>

📊 <b>Thống kê:</b>
👥 Người đăng ký: {Database.get_subscriber_count()}
🎮 Game đã thông báo: {len(Database.get_recent_games(100))}

🔧 <b>Tính năng:</b>
✅ Thông báo tự động hàng tuần
✅ Dashboard quản lý web
✅ Hỗ trợ donate QR code

💻 <b>Phát triển bởi:</b>
DINH TRONG KHANH

🌐 Dashboard: {RENDER_EXTERNAL_URL}
"""
        keyboard = [[InlineKeyboardButton("🏠 Về Menu", callback_data='back_to_menu')]]
        reply_markup = InlineKeyboardMarkup(keyboard)
        
        await query.message.reply_text(
            info_text,
            parse_mode='HTML',
            reply_markup=reply_markup
        )
    
    elif query.data == 'back_to_menu':
        keyboard = [
            [InlineKeyboardButton("🎮 Game miễn phí hiện tại", callback_data='current_games')],
            [InlineKeyboardButton("💝 Ủng hộ", callback_data='donate')],
            [InlineKeyboardButton("ℹ️ Thông tin", callback_data='info')]
        ]
        reply_markup = InlineKeyboardMarkup(keyboard)
        
        await query.message.reply_text(
            "🏠 <b>Menu Chính</b>\n\nChọn một tùy chọn bên dưới:",
            parse_mode='HTML',
            reply_markup=reply_markup
        )

async def send_game_notification(bot, chat_id, game):
    try:
        end_date = datetime.fromisoformat(game['end_date'].replace('Z', '+00:00'))
    except:
        end_date = datetime.now() + timedelta(days=7)
    
    message = f"""
🎮 <b>{game['title']}</b>

📝 {game['description'][:200]}{'...' if len(game['description']) > 200 else ''}

⏰ <b>Miễn phí đến:</b> {end_date.strftime('%d/%m/%Y %H:%M')}

🔗 <b>Link:</b> https://store.epicgames.com/

⚡️ Nhanh tay nhận ngay trước khi hết hạn!
"""
    
    keyboard = [
        [InlineKeyboardButton("🎁 Nhận ngay", url="https://store.epicgames.com/")],
        [InlineKeyboardButton("💝 Ủng hộ Bot", callback_data='donate')]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)
    
    try:
        if game['image_url']:
            await bot.send_photo(
                chat_id=chat_id,
                photo=game['image_url'],
                caption=message,
                parse_mode='HTML',
                reply_markup=reply_markup
            )
        else:
            await bot.send_message(
                chat_id=chat_id,
                text=message,
                parse_mode='HTML',
                reply_markup=reply_markup
            )
    except Exception as e:
        logger.error(f"Error sending notification: {e}")

async def check_free_games(context: ContextTypes.DEFAULT_TYPE):
    logger.info("Checking for free games...")
    games = await EpicGamesAPI.get_free_games()
    
    for game in games:
        Database.add_game(game)
    
    unnotified = Database.get_unnotified_games()
    
    if unnotified:
        subscribers = Database.get_subscribers()
        logger.info(f"Notifying {len(subscribers)} subscribers about {len(unnotified)} new games")
        
        for game_row in unnotified:
            game = {
                'id': game_row[0],
                'title': game_row[1],
                'description': game_row[2],
                'image_url': game_row[3],
                'start_date': game_row[4],
                'end_date': game_row[5]
            }
            
            for user_id in subscribers:
                try:
                    await send_game_notification(context.bot, user_id, game)
                    await asyncio.sleep(0.1)
                except Exception as e:
                    logger.error(f"Error notifying user {user_id}: {e}")
            
            Database.mark_game_notified(game['id'])

# Flask Dashboard
app = Flask(__name__)

@app.route('/')
def dashboard():
    return render_template('dashboard.html', render_url=RENDER_EXTERNAL_URL)

@app.route('/api/stats')
def api_stats():
    stats = {
        'subscribers': Database.get_subscriber_count(),
        'total_games': len(Database.get_recent_games(1000)),
        'recent_games': []
    }
    
    for game in Database.get_recent_games(5):
        stats['recent_games'].append({
            'title': game[1],
            'image': game[3],
            'end_date': game[5]
        })
    
    return jsonify(stats)

@app.route('/health')
def health():
    return jsonify({'status': 'ok', 'subscribers': Database.get_subscriber_count()})

def run_flask():
    app.run(host='0.0.0.0', port=PORT, debug=False)

# Main
def main():
    # Start Flask in background
    flask_thread = Thread(target=run_flask, daemon=True)
    flask_thread.start()
    
    logger.info(f"Dashboard starting on port {PORT}")
    logger.info(f"External URL: {RENDER_EXTERNAL_URL}")
    
    # Start Telegram Bot
    application = Application.builder().token(TELEGRAM_TOKEN).build()
    
    application.add_handler(CommandHandler("start", start))
    application.add_handler(CommandHandler("stop", stop))
    application.add_handler(CommandHandler("games", games_command))
    application.add_handler(CommandHandler("donate", donate_command))
    application.add_handler(CallbackQueryHandler(button_callback))
    
    # Schedule game check
    job_queue = application.job_queue
    job_queue.run_repeating(check_free_games, interval=CHECK_INTERVAL, first=10)
    
    logger.info("Bot started successfully!")
    
    application.run_polling(allowed_updates=Update.ALL_TYPES)

if __name__ == '__main__':
    main()