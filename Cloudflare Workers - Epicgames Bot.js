// Cloudflare Workers Script cho Epic Games Telegram Bot
// Sử dụng Environment Variables và Secrets

// Google Sheets API helpers
async function getAccessToken(env) {
  const serviceAccount = JSON.parse(env.GOOGLE_SERVICE_ACCOUNT_JSON);
  
  const jwtHeader = btoa(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  
  const now = Math.floor(Date.now() / 1000);
  const jwtClaimSet = {
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/spreadsheets',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now
  };
  
  const jwtClaimSetEncoded = btoa(JSON.stringify(jwtClaimSet))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
  
  const signatureInput = `${jwtHeader}.${jwtClaimSetEncoded}`;
  
  // Sign với private key
  const privateKey = serviceAccount.private_key.replace(/\\n/g, '\n');
  const pemHeader = '-----BEGIN PRIVATE KEY-----';
  const pemFooter = '-----END PRIVATE KEY-----';
  const pemContents = privateKey.substring(
    pemHeader.length,
    privateKey.length - pemFooter.length
  ).replace(/\s/g, '');
  
  const binaryDer = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));
  
  const key = await crypto.subtle.importKey(
    'pkcs8',
    binaryDer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    key,
    new TextEncoder().encode(signatureInput)
  );
  
  const signatureBase64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
  
  const jwt = `${signatureInput}.${signatureBase64}`;
  
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`
  });
  
  const data = await response.json();
  return data.access_token;
}

// Đọc dữ liệu từ Google Sheets
async function getUsers(env) {
  const token = await getAccessToken(env);
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${env.SPREADSHEET_ID}/values/Users!A:B`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  
  const data = await response.json();
  return data.values?.slice(1) || []; // Bỏ header
}

// Thêm user vào Google Sheets
async function addUser(env, chatId, username) {
  const token = await getAccessToken(env);
  
  // Kiểm tra user đã tồn tại chưa
  const users = await getUsers(env);
  const exists = users.some(user => user[0] === chatId.toString());
  
  if (exists) {
    return false; // User đã tồn tại
  }
  
  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${env.SPREADSHEET_ID}/values/Users!A:B:append?valueInputOption=RAW`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        values: [[chatId, username || 'Unknown', new Date().toISOString()]]
      })
    }
  );
  
  return true; // User mới được thêm
}

// Xóa user khỏi Google Sheets
async function removeUser(env, chatId) {
  const token = await getAccessToken(env);
  const users = await getUsers(env);
  const rowIndex = users.findIndex(user => user[0] === chatId.toString());
  
  if (rowIndex !== -1) {
    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${env.SPREADSHEET_ID}:batchUpdate`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          requests: [{
            deleteDimension: {
              range: {
                sheetId: 0,
                dimension: 'ROWS',
                startIndex: rowIndex + 1,
                endIndex: rowIndex + 2
              }
            }
          }]
        })
      }
    );
    return true;
  }
  
  return false;
}

// Lấy game miễn phí từ Epic Games
async function getFreeGames() {
  try {
    const response = await fetch(
      'https://store-site-backend-static.ak.epicgames.com/freeGamesPromotions?locale=vi&country=VN&allowCountries=VN'
    );
    
    const data = await response.json();
    const games = [];
    
    for (const element of data.data.Catalog.searchStore.elements) {
      if (element.promotions?.promotionalOffers?.length > 0) {
        const promo = element.promotions.promotionalOffers[0].promotionalOffers[0];
        games.push({
          title: element.title,
          description: element.description,
          imageUrl: element.keyImages?.find(img => img.type === 'DieselStoreFrontWide')?.url || 
                    element.keyImages?.[0]?.url || '',
          startDate: promo.startDate,
          endDate: promo.endDate,
          url: `https://store.epicgames.com/vi/p/${element.catalogNs.mappings[0]?.pageSlug || element.productSlug || element.urlSlug}`
        });
      }
    }
    
    return games;
  } catch (error) {
    console.error('Error fetching Epic Games:', error);
    return [];
  }
}

// Gửi tin nhắn qua Telegram
async function sendTelegramMessage(env, chatId, text, options = {}) {
  try {
    const response = await fetch(
      `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: text,
          parse_mode: 'HTML',
          disable_web_page_preview: false,
          ...options
        })
      }
    );
    
    return response.json();
  } catch (error) {
    console.error('Error sending Telegram message:', error);
    return null;
  }
}

// Gửi ảnh qua Telegram
async function sendTelegramPhoto(env, chatId, photoUrl, caption) {
  try {
    const response = await fetch(
      `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendPhoto`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          photo: photoUrl,
          caption: caption,
          parse_mode: 'HTML'
        })
      }
    );
    
    return response.json();
  } catch (error) {
    console.error('Error sending Telegram photo:', error);
    // Fallback to text message if photo fails
    await sendTelegramMessage(env, chatId, caption);
    return null;
  }
}

// Format thông tin game
function formatGameMessage(game, isNotification = false) {
  const endDate = new Date(game.endDate);
  const now = new Date();
  const hoursLeft = Math.floor((endDate - now) / (1000 * 60 * 60));
  const daysLeft = Math.floor(hoursLeft / 24);
  
  let timeLeft = '';
  if (daysLeft > 0) {
    timeLeft = `${daysLeft} ngày ${hoursLeft % 24} giờ`;
  } else {
    timeLeft = `${hoursLeft} giờ`;
  }
  
  const prefix = isNotification ? '🆓 <b>Game miễn phí mới!</b>\n\n' : '';
  
  return (
    `${prefix}🎮 <b>${game.title}</b>\n\n` +
    `📝 ${game.description?.substring(0, 300) || 'Không có mô tả'}${game.description?.length > 300 ? '...' : ''}\n\n` +
    `⏰ Còn lại: <b>${timeLeft}</b>\n` +
    `📅 Hết hạn: ${endDate.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}\n\n` +
    `🔗 <a href="${game.url}">Nhận ngay tại đây</a>`
  );
}

// Xử lý webhook từ Telegram
async function handleTelegramUpdate(env, update) {
  const message = update.message;
  if (!message) return;
  
  const chatId = message.chat.id;
  const text = message.text;
  const username = message.from.username;
  const firstName = message.from.first_name || '';
  
  if (text === '/start') {
    const isNew = await addUser(env, chatId, username);
    
    if (isNew) {
      await sendTelegramMessage(
        env,
        chatId,
        `🎮 <b>Chào mừng ${firstName} đến với Epic Games Free Bot!</b>\n\n` +
        '✅ Bạn đã đăng ký nhận thông báo game miễn phí từ Epic Games Store.\n\n' +
        '📢 Bot sẽ tự động thông báo mỗi khi có game mới miễn phí.\n\n' +
        '<b>Các lệnh có sẵn:</b>\n' +
        '🎯 /games - Xem game miễn phí hiện tại\n' +
        '📊 /stats - Thống kê bot\n' +
        '❌ /stop - Hủy đăng ký thông báo\n\n' +
        '💡 <i>Tip: Nhấn vào nút Menu để xem tất cả lệnh!</i>'
      );
    } else {
      await sendTelegramMessage(
        env,
        chatId,
        `👋 Chào lại ${firstName}!\n\n` +
        '✅ Bạn đã đăng ký nhận thông báo từ trước rồi.\n\n' +
        'Sử dụng /games để xem game miễn phí hiện tại!'
      );
    }
    
  } else if (text === '/stop') {
    const removed = await removeUser(env, chatId);
    
    if (removed) {
      await sendTelegramMessage(
        env,
        chatId,
        '👋 Bạn đã hủy đăng ký thông báo thành công.\n\n' +
        'Sử dụng /start để đăng ký lại bất cứ lúc nào!'
      );
    } else {
      await sendTelegramMessage(
        env,
        chatId,
        '❓ Bạn chưa đăng ký thông báo.\n\n' +
        'Sử dụng /start để bắt đầu nhận thông báo!'
      );
    }
    
  } else if (text === '/games') {
    await sendTelegramMessage(env, chatId, '🔍 Đang tìm kiếm game miễn phí...');
    
    const games = await getFreeGames();
    
    if (games.length === 0) {
      await sendTelegramMessage(
        env,
        chatId,
        '😔 Hiện tại không có game miễn phí nào.\n\n' +
        'Bot sẽ thông báo khi có game mới! 🔔'
      );
      return;
    }
    
    await sendTelegramMessage(
      env,
      chatId,
      `🎉 Tìm thấy <b>${games.length}</b> game đang miễn phí:`
    );
    
    for (const game of games) {
      const caption = formatGameMessage(game);
      
      if (game.imageUrl) {
        await sendTelegramPhoto(env, chatId, game.imageUrl, caption);
      } else {
        await sendTelegramMessage(env, chatId, caption);
      }
      
      // Delay nhỏ giữa các tin nhắn
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
  } else if (text === '/stats') {
    const users = await getUsers(env);
    await sendTelegramMessage(
      env,
      chatId,
      `📊 <b>Thống kê Bot</b>\n\n` +
      `👥 Tổng số người dùng: <b>${users.length}</b>\n` +
      `🤖 Bot version: 1.0\n` +
      `⚡ Status: <b>Đang hoạt động</b>`
    );
    
  } else if (text?.startsWith('/')) {
    await sendTelegramMessage(
      env,
      chatId,
      '❓ Lệnh không hợp lệ.\n\n' +
      '<b>Các lệnh có sẵn:</b>\n' +
      '/start - Đăng ký nhận thông báo\n' +
      '/games - Xem game miễn phí\n' +
      '/stats - Thống kê bot\n' +
      '/stop - Hủy đăng ký'
    );
  }
}

// Gửi thông báo cho tất cả users
async function notifyAllUsers(env) {
  const users = await getUsers(env);
  const games = await getFreeGames();
  
  console.log(`Found ${games.length} free games, notifying ${users.length} users`);
  
  if (games.length === 0) {
    console.log('No free games available');
    return { success: true, message: 'No games to notify', games: 0, users: 0 };
  }
  
  let successCount = 0;
  let errorCount = 0;
  
  for (const user of users) {
    const chatId = user[0];
    
    try {
      await sendTelegramMessage(
        env,
        chatId,
        `🔔 <b>Thông báo game miễn phí!</b>\n\n` +
        `Hiện có <b>${games.length}</b> game đang miễn phí trên Epic Games:`
      );
      
      for (const game of games) {
        const caption = formatGameMessage(game, true);
        
        if (game.imageUrl) {
          await sendTelegramPhoto(env, chatId, game.imageUrl, caption);
        } else {
          await sendTelegramMessage(env, chatId, caption);
        }
        
        // Delay để tránh rate limit
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      successCount++;
      
    } catch (error) {
      console.error(`Error notifying user ${chatId}:`, error);
      errorCount++;
    }
    
    // Delay giữa các user
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  return {
    success: true,
    message: 'Notifications sent',
    games: games.length,
    users: users.length,
    successful: successCount,
    failed: errorCount
  };
}

// Main handler
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // Webhook endpoint từ Telegram
    if (request.method === 'POST' && url.pathname === '/webhook') {
      try {
        const update = await request.json();
        await handleTelegramUpdate(env, update);
        return new Response('OK', { status: 200 });
      } catch (error) {
        console.error('Webhook error:', error);
        return new Response('Error', { status: 500 });
      }
    }
    
    // Manual trigger để test thông báo
    if (url.pathname === '/notify') {
      const result = await notifyAllUsers(env);
      return new Response(JSON.stringify(result, null, 2), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Health check endpoint
    if (url.pathname === '/health') {
      return new Response(JSON.stringify({
        status: 'ok',
        timestamp: new Date().toISOString()
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Test endpoint để xem game hiện tại
    if (url.pathname === '/test-games') {
      const games = await getFreeGames();
      return new Response(JSON.stringify(games, null, 2), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    return new Response(
      '🎮 Epic Games Free Bot is running!\n\n' +
      'Endpoints:\n' +
      '- POST /webhook - Telegram webhook\n' +
      '- GET /notify - Manual notification trigger\n' +
      '- GET /health - Health check\n' +
      '- GET /test-games - View current free games',
      { 
        status: 200,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' }
      }
    );
  },
  
  // Cron job chạy mỗi ngày lúc 9h sáng UTC (16h Việt Nam)
  async scheduled(event, env, ctx) {
    console.log('Cron job triggered at:', new Date().toISOString());
    
    try {
      const result = await notifyAllUsers(env);
      console.log('Cron job result:', result);
    } catch (error) {
      console.error('Cron job error:', error);
    }
  }
};