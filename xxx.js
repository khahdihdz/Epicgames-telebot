export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // API proxy
    if (url.pathname === '/api/deals') {
      try {
        const apiUrl = 'https://www.cheapshark.com/api/1.0/deals?upperPrice=0&onSale=1&pageSize=60&sortBy=recent';
        const response = await fetch(apiUrl);
        const data = await response.json();
        
        return new Response(JSON.stringify(data), {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
            'Cache-Control': 'public, max-age=180'
          }
        });
      } catch (error) {
        return new Response(JSON.stringify({ error: 'Failed to fetch deals' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    return new Response(HTML_CONTENT, {
      headers: { 'Content-Type': 'text/html;charset=UTF-8' }
    });
  }
};

const HTML_CONTENT = `<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="Theo dõi game giảm giá 100% từ Steam, Epic Games, GOG và nhiều cửa hàng khác">
    <title>Game Deals 100% FREE - Steam & More</title>
    <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
    <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
    <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://unpkg.com/lucide@latest/dist/umd/lucide.js"></script>
</head>
<body>
    <div id="root"></div>
    
    <script type="text/babel">
        const { useState, useEffect } = React;
        const { Gift, Clock, Calendar, ExternalLink, RefreshCw, AlertCircle, Store, Heart, X } = lucide;

        function SteamDealsTracker() {
          const [deals, setDeals] = useState([]);
          const [loading, setLoading] = useState(true);
          const [error, setError] = useState(null);
          const [lastUpdate, setLastUpdate] = useState(null);
          const [stats, setStats] = useState({ total: 0, steam: 0 });
          const [showDonate, setShowDonate] = useState(false);

          const STORES = {
            1: { name: 'Steam', color: 'bg-blue-600' },
            2: { name: 'GamersGate', color: 'bg-orange-600' },
            3: { name: 'GreenManGaming', color: 'bg-green-600' },
            7: { name: 'GOG', color: 'bg-purple-600' },
            8: { name: 'Origin', color: 'bg-orange-500' },
            11: { name: 'Humble Store', color: 'bg-red-600' },
            13: { name: 'Uplay', color: 'bg-blue-500' },
            15: { name: 'Fanatical', color: 'bg-yellow-600' },
            21: { name: 'WinGameStore', color: 'bg-indigo-600' },
            23: { name: 'GameBillet', color: 'bg-pink-600' },
            25: { name: 'Epic Games', color: 'bg-gray-700' },
            27: { name: 'Gamesplanet', color: 'bg-cyan-600' },
            28: { name: 'Gamesload', color: 'bg-teal-600' },
            29: { name: 'IndieGala', color: 'bg-rose-600' },
            30: { name: 'Blizzard', color: 'bg-blue-400' },
            31: { name: 'Voidu', color: 'bg-violet-600' },
            33: { name: 'DLGamer', color: 'bg-lime-600' },
            34: { name: 'Noctre', color: 'bg-emerald-600' },
            35: { name: 'DreamGame', color: 'bg-fuchsia-600' }
          };

          const fetchDeals = async () => {
            setLoading(true);
            setError(null);
            
            try {
              const response = await fetch('https://www.cheapshark.com/api/1.0/deals?upperPrice=0&onSale=1&pageSize=60&sortBy=recent');
              
              if (!response.ok) throw new Error('Không thể lấy dữ liệu');
              
              const data = await response.json();
              
              const freeDeals = data.filter(deal => {
                const normalPrice = parseFloat(deal.normalPrice);
                const salePrice = parseFloat(deal.salePrice);
                const savings = parseFloat(deal.savings);
                
                return normalPrice > 0 && 
                       salePrice === 0 && 
                       savings >= 99 &&
                       !deal.title.toLowerCase().includes('free to play') &&
                       !deal.title.toLowerCase().includes('f2p');
              });
              
              freeDeals.sort((a, b) => {
                if (!a.releaseDate && !b.releaseDate) return 0;
                if (!a.releaseDate) return 1;
                if (!b.releaseDate) return -1;
                return a.releaseDate - b.releaseDate;
              });

              setDeals(freeDeals);
              setStats({
                total: freeDeals.length,
                steam: freeDeals.filter(d => d.storeID === '1').length
              });
              setLastUpdate(new Date());
            } catch (err) {
              setError('Không thể tải dữ liệu. Vui lòng thử lại sau.');
              console.error('Error:', err);
            } finally {
              setLoading(false);
            }
          };

          useEffect(() => {
            fetchDeals();
            const interval = setInterval(fetchDeals, 180000);
            const donateTimer = setTimeout(() => setShowDonate(true), 30000);
            
            return () => {
              clearInterval(interval);
              clearTimeout(donateTimer);
            };
          }, []);

          const formatTimeLeft = (timestamp) => {
            if (!timestamp) return null;
            
            const now = Math.floor(Date.now() / 1000);
            const diff = timestamp - now;
            
            if (diff <= 0) return 'Đã hết hạn';
            
            const days = Math.floor(diff / 86400);
            const hours = Math.floor((diff % 86400) / 3600);
            const minutes = Math.floor((diff % 3600) / 60);
            
            if (days > 7) return days + ' ngày';
            if (days > 0) return days + ' ngày ' + hours + 'h';
            if (hours > 0) return hours + 'h ' + minutes + 'm';
            return minutes + ' phút';
          };

          const getStoreInfo = (storeID) => {
            return STORES[storeID] || { name: 'Store ' + storeID, color: 'bg-gray-600' };
          };

          const getDealUrl = (deal) => {
            return 'https://www.cheapshark.com/redirect?dealID=' + deal.dealID;
          };

          const getMetacriticColor = (score) => {
            if (!score || score === '0') return 'bg-gray-600';
            const numScore = parseInt(score);
            if (numScore >= 75) return 'bg-green-600';
            if (numScore >= 50) return 'bg-yellow-600';
            return 'bg-red-600';
          };

          return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white p-4">
              <div className="max-w-7xl mx-auto">
                <div className="text-center mb-8 pt-8">
                  <div className="flex items-center justify-center gap-3 mb-4">
                    <Gift className="w-12 h-12 text-blue-400 animate-pulse" />
                    <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                      Game Deals 100% FREE
                    </h1>
                  </div>
                  <p className="text-slate-300 text-lg mb-2">
                    Theo dõi game giảm giá 100% từ nhiều cửa hàng theo thời gian thực
                  </p>
                  <p className="text-slate-400 text-sm">Powered by CheapShark API</p>
                  
                  <button
                    onClick={() => setShowDonate(true)}
                    className="mt-4 inline-flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 rounded-full text-white font-semibold shadow-lg transition-all hover:scale-105"
                  >
                    <Heart className="w-4 h-4 fill-current" />
                    Ủng hộ dự án
                  </button>
                  
                  {stats.total > 0 && (
                    <div className="flex items-center justify-center gap-6 mt-6">
                      <div className="bg-slate-800/50 px-6 py-3 rounded-lg border border-slate-700">
                        <div className="text-2xl font-bold text-blue-400">{stats.total}</div>
                        <div className="text-xs text-slate-400">Tổng deals</div>
                      </div>
                      <div className="bg-slate-800/50 px-6 py-3 rounded-lg border border-slate-700">
                        <div className="text-2xl font-bold text-green-400">{stats.steam}</div>
                        <div className="text-xs text-slate-400">Steam deals</div>
                      </div>
                    </div>
                  )}
                  
                  {lastUpdate && (
                    <div className="flex items-center justify-center gap-2 mt-4 text-sm text-slate-400">
                      <Clock className="w-4 h-4" />
                      <span>Cập nhật: {lastUpdate.toLocaleTimeString('vi-VN')}</span>
                      <button
                        onClick={fetchDeals}
                        disabled={loading}
                        className="ml-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                      >
                        <RefreshCw className={'w-4 h-4 ' + (loading ? 'animate-spin' : '')} />
                        Làm mới
                      </button>
                    </div>
                  )}
                </div>

                {error && (
                  <div className="mb-6 p-4 bg-red-900/50 border border-red-500 rounded-lg flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-red-400" />
                    <p className="text-red-200">{error}</p>
                  </div>
                )}

                {loading && deals.length === 0 && (
                  <div className="text-center py-20">
                    <RefreshCw className="w-12 h-12 animate-spin mx-auto mb-4 text-blue-400" />
                    <p className="text-slate-300">Đang tải deals...</p>
                  </div>
                )}

                {!loading && deals.length === 0 && !error && (
                  <div className="text-center py-20">
                    <Gift className="w-16 h-16 mx-auto mb-4 text-slate-600" />
                    <p className="text-slate-400 text-lg">Hiện tại không có game giảm giá 100%</p>
                    <p className="text-slate-500 text-sm mt-2">Hãy quay lại sau!</p>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {deals.map((deal) => {
                    const store = getStoreInfo(deal.storeID);
                    const timeLeft = formatTimeLeft(deal.releaseDate);
                    
                    return (
                      <div key={deal.dealID} className="bg-slate-800/50 backdrop-blur-sm rounded-xl overflow-hidden border border-slate-700 hover:border-blue-500 transition-all hover:transform hover:scale-105 shadow-xl">
                        <div className="relative h-44 bg-slate-900 overflow-hidden">
                          <img src={deal.thumb} alt={deal.title} className="w-full h-full object-cover" onError={(e) => e.target.style.display = 'none'} />
                          <div className="absolute top-3 right-3 bg-green-500 text-white px-3 py-1 rounded-full text-sm font-bold shadow-lg animate-pulse">100% OFF</div>
                          <div className={'absolute bottom-3 left-3 ' + store.color + ' text-white px-3 py-1 rounded-lg text-xs font-semibold shadow-lg flex items-center gap-1'}>
                            <Store className="w-3 h-3" />
                            {store.name}
                          </div>
                          {deal.metacriticScore && deal.metacriticScore !== '0' && (
                            <div className={'absolute top-3 left-3 ' + getMetacriticColor(deal.metacriticScore) + ' text-white px-2 py-1 rounded text-xs font-bold shadow-lg'}>
                              {deal.metacriticScore}
                            </div>
                          )}
                        </div>

                        <div className="p-4">
                          <h3 className="text-lg font-bold mb-3 line-clamp-2 min-h-[3.5rem] leading-tight">{deal.title}</h3>

                          <div className="space-y-2 mb-4">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-slate-400">Giá gốc:</span>
                              <span className="text-slate-300 line-through">${parseFloat(deal.normalPrice).toFixed(2)}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-slate-400 text-sm">Giá hiện tại:</span>
                              <span className="text-green-400 font-bold text-xl">FREE</span>
                            </div>
                            <div className="flex items-center justify-between text-sm pt-2 border-t border-slate-700">
                              <span className="text-slate-400">Tiết kiệm:</span>
                              <span className="text-yellow-400 font-semibold">{parseFloat(deal.savings).toFixed(0)}%</span>
                            </div>
                            {timeLeft && (
                              <div className="flex items-center gap-2 text-sm pt-2">
                                <Calendar className="w-4 h-4 text-yellow-400" />
                                <span className="text-yellow-400">{timeLeft === 'Đã hết hạn' ? timeLeft : 'Còn: ' + timeLeft}</span>
                              </div>
                            )}
                            {deal.steamRatingPercent && deal.steamRatingPercent !== '0' && (
                              <div className="flex items-center justify-between text-xs text-slate-400">
                                <span>Steam Rating:</span>
                                <span className={'font-semibold ' + (parseInt(deal.steamRatingPercent) >= 80 ? 'text-green-400' : parseInt(deal.steamRatingPercent) >= 60 ? 'text-yellow-400' : 'text-red-400')}>
                                  {deal.steamRatingPercent}% {deal.steamRatingCount && '(' + deal.steamRatingCount + ')'}
                                </span>
                              </div>
                            )}
                          </div>

                          <a href={getDealUrl(deal)} target="_blank" rel="noopener noreferrer" className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all">
                            Lấy ngay
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="text-center mt-12 pb-8 space-y-2">
                  <p className="text-slate-400 text-sm">Dữ liệu cập nhật mỗi 3 phút từ CheapShark API</p>
                  <p className="text-slate-500 text-xs">Hỗ trợ Steam, Epic Games, GOG, Humble Store và nhiều cửa hàng khác</p>
                  <p className="text-yellow-400 text-sm font-semibold">⚡ Nhanh tay lấy game trước khi hết hạn!</p>
                </div>
              </div>

              {showDonate && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowDonate(false)}>
                  <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl max-w-md w-full shadow-2xl border border-slate-700" onClick={(e) => e.stopPropagation()}>
                    <div className="relative p-6 border-b border-slate-700">
                      <button onClick={() => setShowDonate(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors">
                        <X className="w-6 h-6" />
                      </button>
                      <div className="flex items-center gap-3 mb-2">
                        <Heart className="w-8 h-8 text-pink-500 fill-current animate-pulse" />
                        <h2 className="text-2xl font-bold text-white">Ủng hộ dự án</h2>
                      </div>
                      <p className="text-slate-300 text-sm">Cảm ơn bạn đã sử dụng! Hãy ủng hộ để duy trì và phát triển dự án</p>
                    </div>

                    <div className="p-6">
                      <div className="bg-white rounded-xl p-4 mb-4">
                        <img src="https://api.vietqr.io/image/970426-13001011869246-GuEo6F2.jpg?accountName=DINH%20TRONG%20KHANH&amount=0" alt="VietQR Donation" className="w-full h-auto rounded-lg" />
                      </div>

                      <div className="space-y-2 bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-400">Ngân hàng:</span>
                          <span className="text-white font-semibold">Ngân hàng Hàng Hải MSB</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-400">Số tài khoản:</span>
                          <span className="text-white font-mono">13001011869246</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-400">Chủ tài khoản:</span>
                          <span className="text-white font-semibold">DINH TRONG KHANH</span>
                        </div>
                      </div>

                      <div className="mt-4 text-center">
                        <p className="text-slate-300 text-sm">💝 Mọi đóng góp đều được trân trọng!</p>
                        <p className="text-slate-400 text-xs mt-1">Quét mã QR bằng app ngân hàng để chuyển khoản</p>
                      </div>

                      <button onClick={() => setShowDonate(false)} className="w-full mt-4 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-lg text-white font-semibold transition-all">
                        Đóng
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        }

        const root = ReactDOM.createRoot(document.getElementById('root'));
        root.render(<SteamDealsTracker />);
    </script>
</body>
</html>`;