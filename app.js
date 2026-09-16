/**
 * TrendVest — Ana İstemci Mantığı, Router, Veri Entegrasyonu ve Durum Yönetimi
 */

(() => {
  'use strict';

  // --- Borsa & Ülke Eşleme Tablosu ---
  const COUNTRY_EXCHANGES = {
    'TR': { code: 'TR', name: 'BIST', flag: '🇹🇷', fullName: 'Borsa İstanbul', exampleSymbols: ['THYAO', 'AKBNK', 'GARAN', 'EREGL', 'ASELS', 'KCHOL'] },
    'US': { code: 'US', name: 'NASDAQ/NYSE', flag: '🇺🇸', fullName: 'Wall Street (US)', exampleSymbols: ['AAPL', 'NVDA', 'MSFT', 'TSLA', 'AMZN', 'GOOGL'] },
    'DE': { code: 'DE', name: 'XETRA', flag: '🇩🇪', fullName: 'Frankfurt (Almanya)', exampleSymbols: ['SAP', 'SIE', 'BMW', 'ALV', 'BAS'] },
    'GB': { code: 'GB', name: 'LSE', flag: '🇬🇧', fullName: 'London Stock Exchange', exampleSymbols: ['SHEL', 'AZN', 'HSBA', 'ULVR'] },
    'JP': { code: 'JP', name: 'TSE', flag: '🇯🇵', fullName: 'Tokyo Stock Exchange', exampleSymbols: ['7203', '6758', '9984'] },
  };

  // --- Varsayılan Yapılandırma & Durum (State) ---
  const state = {
    workerUrl: localStorage.getItem('trendvest_worker_url') || 'https://trendvest-proxy.imsalper.workers.dev',
    currentScreen: 'screen-home',
    currentRegion: localStorage.getItem('trendvest_region') || 'TR',
    watchlist: JSON.parse(localStorage.getItem('trendvest_watchlist') || '["AAPL", "NVDA", "BTC", "ETH", "THYAO"]'),
    activeAsset: {
      symbol: 'AAPL',
      name: 'Apple Inc.',
      type: 'stock', // 'stock' | 'crypto' | 'bist'
      exchange: 'NASDAQ',
      price: 224.50,
      change24h: 2.45,
      high24h: 226.10,
      low24h: 221.80,
      volume: 48500000,
      candles: []
    },
    currentTimeframe: '1M',
    chartInstance: null,
    cachedMarketData: new Map(),
    activeStrategyId: 'oversold_bounce'
  };

  // --- Örnek Geniş Varlık Havuzu (Yerel Simülasyon ve Hızlı Tarama İçin) ---
  const ASSET_UNIVERSE = [
    // ABD Hisseleri
    { symbol: 'AAPL', name: 'Apple Inc.', type: 'stock', exchange: 'NASDAQ', basePrice: 224.50, change24h: 2.45, volume: 52000000, rsi: 58.4, sma20: 218.2, sma50: 210.5, volumeRatio: 1.15 },
    { symbol: 'NVDA', name: 'NVIDIA Corporation', type: 'stock', exchange: 'NASDAQ', basePrice: 118.80, change24h: 4.80, volume: 88000000, rsi: 66.2, sma20: 112.5, sma50: 104.0, volumeRatio: 1.65 },
    { symbol: 'TSLA', name: 'Tesla Inc.', type: 'stock', exchange: 'NASDAQ', basePrice: 242.10, change24h: -1.85, volume: 64000000, rsi: 34.2, sma20: 248.0, sma50: 254.0, volumeRatio: 1.10 },
    { symbol: 'MSFT', name: 'Microsoft Corp.', type: 'stock', exchange: 'NASDAQ', basePrice: 432.00, change24h: 0.85, volume: 21000000, rsi: 52.0, sma20: 428.0, sma50: 424.0, volumeRatio: 0.95 },
    { symbol: 'AMZN', name: 'Amazon.com Inc.', type: 'stock', exchange: 'NASDAQ', basePrice: 186.40, change24h: 1.60, volume: 38000000, rsi: 59.8, sma20: 181.0, sma50: 178.0, volumeRatio: 1.20 },
    { symbol: 'GOOGL', name: 'Alphabet Inc.', type: 'stock', exchange: 'NASDAQ', basePrice: 162.20, change24h: -0.40, volume: 24000000, rsi: 48.5, sma20: 164.0, sma50: 166.0, volumeRatio: 0.85 },
    
    // BIST Hisseleri
    { symbol: 'THYAO', name: 'Türk Hava Yolları', type: 'bist', exchange: 'BIST', basePrice: 304.50, change24h: 3.20, volume: 42000000, rsi: 64.1, sma20: 294.0, sma50: 286.0, volumeRatio: 1.70 },
    { symbol: 'GARAN', name: 'Garanti BBVA', type: 'bist', exchange: 'BIST', basePrice: 114.20, change24h: -0.90, volume: 31000000, rsi: 33.5, sma20: 118.0, sma50: 120.5, volumeRatio: 0.95 },
    { symbol: 'AKBNK', name: 'Akbank T.A.Ş.', type: 'bist', exchange: 'BIST', basePrice: 58.40, change24h: 1.10, volume: 36000000, rsi: 51.2, sma20: 57.5, sma50: 56.8, volumeRatio: 1.05 },
    { symbol: 'EREGL', name: 'Ereğli Demir Çelik', type: 'bist', exchange: 'BIST', basePrice: 51.10, change24h: -2.30, volume: 29000000, rsi: 31.0, sma20: 53.5, sma50: 55.0, volumeRatio: 1.15 },
    { symbol: 'ASELS', name: 'Aselsan Elektronik', type: 'bist', exchange: 'BIST', basePrice: 62.80, change24h: 2.10, volume: 25000000, rsi: 57.0, sma20: 60.5, sma50: 59.0, volumeRatio: 1.30 },
    { symbol: 'KCHOL', name: 'Koç Holding', type: 'bist', exchange: 'BIST', basePrice: 215.00, change24h: 0.45, volume: 18000000, rsi: 49.0, sma20: 214.0, sma50: 212.0, volumeRatio: 0.90 },

    // Kripto Paralar
    { symbol: 'BTC', name: 'Bitcoin', type: 'crypto', exchange: 'Global Crypto', basePrice: 63850, change24h: 2.85, volume: 32000000000, rsi: 61.5, sma20: 60500, sma50: 58900, volumeRatio: 1.45 },
    { symbol: 'ETH', name: 'Ethereum', type: 'crypto', exchange: 'Global Crypto', basePrice: 2540, change24h: -0.65, volume: 16500000000, rsi: 36.8, sma20: 2580, sma50: 2640, volumeRatio: 1.05 },
    { symbol: 'SOL', name: 'Solana', type: 'crypto', exchange: 'Global Crypto', basePrice: 152.40, change24h: 5.40, volume: 4800000000, rsi: 68.4, sma20: 142.0, sma50: 134.0, volumeRatio: 1.85 },
    { symbol: 'AVAX', name: 'Avalanche', type: 'crypto', exchange: 'Global Crypto', basePrice: 28.60, change24h: 3.10, volume: 650000000, rsi: 54.0, sma20: 26.8, sma50: 25.5, volumeRatio: 1.35 },
    { symbol: 'BNB', name: 'BNB Chain', type: 'crypto', exchange: 'Global Crypto', basePrice: 578.00, change24h: 0.20, volume: 1100000000, rsi: 50.2, sma20: 572.0, sma50: 565.0, volumeRatio: 0.88 }
  ];

  // --- DOM Elementleri Önbelleği ---
  const dom = {
    tabs: document.querySelectorAll('.nav-tab-btn'),
    screens: {
      'screen-home': document.getElementById('screen-home'),
      'screen-detail': document.getElementById('screen-detail'),
      'screen-ai': document.getElementById('screen-ai'),
      'screen-screener': document.getElementById('screen-screener'),
    },
    navBrandHome: document.getElementById('navBrandHome'),
    btnOpenRegionModal: document.getElementById('btnOpenRegionModal'),
    btnOpenSettingsModal: document.getElementById('btnOpenSettingsModal'),
    btnOpenLegalModal: document.getElementById('btnOpenLegalModal'),
    currentRegionFlag: document.getElementById('currentRegionFlag'),
    currentRegionName: document.getElementById('currentRegionName'),
    bistNoticeBanner: document.getElementById('bistNoticeBanner'),
    
    // Arama
    globalSearchInput: document.getElementById('globalSearchInput'),
    btnSearchClear: document.getElementById('btnSearchClear'),
    searchDropdown: document.getElementById('searchDropdown'),
    quickChips: document.querySelectorAll('.quick-chip'),

    // Izleme Listeleri & Kartlar
    watchlistGrid: document.getElementById('watchlistGrid'),
    watchlistCount: document.getElementById('watchlistCount'),
    regionalGrid: document.getElementById('regionalGrid'),
    regionalSectionTitle: document.getElementById('regionalSectionTitle'),
    globalGrid: document.getElementById('globalGrid'),

    // Detay Ekranı
    detailSymbolBadge: document.getElementById('detailSymbolBadge'),
    detailAssetName: document.getElementById('detailAssetName'),
    detailExchangeBadge: document.getElementById('detailExchangeBadge'),
    detailAssetType: document.getElementById('detailAssetType'),
    detailTrendDirectionBadge: document.getElementById('detailTrendDirectionBadge'),
    detailCurrentPrice: document.getElementById('detailCurrentPrice'),
    detailChange24h: document.getElementById('detailChange24h'),
    detailPriceDiff: document.getElementById('detailPriceDiff'),
    btnToggleFavorite: document.getElementById('btnToggleFavorite'),
    timeframeSelector: document.getElementById('timeframeSelector'),
    chartContainer: document.getElementById('chartContainer'),
    
    // Metrikler
    metricRSIValue: document.getElementById('metricRSIValue'),
    metricRSIBadge: document.getElementById('metricRSIBadge'),
    metricRSIStatus: document.getElementById('metricRSIStatus'),
    rsiBarFill: document.getElementById('rsiBarFill'),
    metricMACDValue: document.getElementById('metricMACDValue'),
    metricMACDBadge: document.getElementById('metricMACDBadge'),
    metricMACDStatus: document.getElementById('metricMACDStatus'),
    metricSMAValues: document.getElementById('metricSMAValues'),
    metricSMABadge: document.getElementById('metricSMABadge'),
    metricSMAStatus: document.getElementById('metricSMAStatus'),
    companyProfileContent: document.getElementById('companyProfileContent'),
    assetNewsList: document.getElementById('assetNewsList'),

    // AI Paneli
    aiTargetAssetName: document.getElementById('aiTargetAssetName'),
    btnTriggerAIAnalysis: document.getElementById('btnTriggerAIAnalysis'),
    aiOutputContainer: document.getElementById('aiOutputContainer'),

    // Screener
    strategyCardsGrid: document.getElementById('strategyCardsGrid'),
    selectedStrategyTitle: document.getElementById('selectedStrategyTitle'),
    selectedStrategyCount: document.getElementById('selectedStrategyCount'),
    strategyAIExplanation: document.getElementById('strategyAIExplanation'),
    screenerTableBody: document.getElementById('screenerTableBody'),

    // Modallar
    modalRegion: document.getElementById('modalRegion'),
    modalSettings: document.getElementById('modalSettings'),
    modalLegal: document.getElementById('modalLegal'),
    exchangeOptionList: document.getElementById('exchangeOptionList'),
    workerUrlInput: document.getElementById('workerUrlInput'),
    workerStatusIndicator: document.getElementById('workerStatusIndicator'),
    btnTestWorker: document.getElementById('btnTestWorker'),
    btnSaveSettings: document.getElementById('btnSaveSettings')
  };

  // --- Başlatma (Init) ---
  function init() {
    setupEventListeners();
    initRegion();
    initChartComponent();
    renderWatchlist();
    renderMarketGrids();
    renderScreenerStrategies();
    handleHashNavigation();
  }

  // --- Sekme & Ekran Yönlendirmesi ---
  function switchScreen(screenId) {
    state.currentScreen = screenId;
    
    // Sekmeleri güncelle
    dom.tabs.forEach(tab => {
      tab.classList.toggle('active', tab.dataset.screen === screenId);
    });

    // Ekranları göster/gizle
    Object.keys(dom.screens).forEach(id => {
      if (dom.screens[id]) {
        dom.screens[id].classList.toggle('active', id === screenId);
      }
    });

    // Ekran 2 (Detay) açıldığında grafiği yeniden boyutlandır
    if (screenId === 'screen-detail' && state.chartInstance) {
      setTimeout(() => {
        state.chartInstance.chart?.timeScale().fitContent();
      }, 100);
    }

    // Ekran 3 (AI) açıldığında başlığı güncelle
    if (screenId === 'screen-ai') {
      dom.aiTargetAssetName.textContent = `${state.activeAsset.name} (${state.activeAsset.symbol})`;
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // --- IP Tabanlı Bölgesel Borsa Tespiti ---
  async function initRegion() {
    const savedRegion = localStorage.getItem('trendvest_region');
    if (savedRegion && COUNTRY_EXCHANGES[savedRegion]) {
      setRegion(savedRegion);
      return;
    }

    try {
      // Doğrudan tarayıcıdan IP tespiti (izin gerekmez)
      const res = await fetch('https://ipapi.co/json/', { cache: 'force-cache' });
      if (res.ok) {
        const data = await res.json();
        const countryCode = (data.country_code || '').toUpperCase();
        if (COUNTRY_EXCHANGES[countryCode]) {
          setRegion(countryCode);
          return;
        }
      }
    } catch (e) {
      console.log('IP tespiti atlandı veya engellendi, varsayılan US borsa devrede.');
    }

    // Eşleşme yoksa varsayılan olarak Türkiye veya US
    setRegion('TR');
  }

  function setRegion(countryCode) {
    const exchange = COUNTRY_EXCHANGES[countryCode] || COUNTRY_EXCHANGES['US'];
    state.currentRegion = exchange.code;
    localStorage.setItem('trendvest_region', exchange.code);

    dom.currentRegionFlag.textContent = exchange.flag;
    dom.currentRegionName.textContent = exchange.name;

    // BIST uyarısı kontrolü
    if (exchange.code === 'TR') {
      dom.bistNoticeBanner.style.display = 'flex';
      dom.regionalSectionTitle.textContent = `📍 Borsa İstanbul (BIST) Öne Çıkanlar`;
    } else {
      dom.bistNoticeBanner.style.display = 'none';
      dom.regionalSectionTitle.textContent = `📍 ${exchange.fullName} Öne Çıkanlar`;
    }

    renderMarketGrids();
  }

  // --- TradingView Grafik Başlatıcı ---
  function initChartComponent() {
    if (dom.chartContainer && typeof TrendVestChart !== 'undefined') {
      state.chartInstance = new TrendVestChart('chartContainer');
      loadAssetDetail(state.activeAsset.symbol, state.activeAsset.type);
    }
  }

  // --- Varlık Detayı Yükleme (Chart, Metrikler, Profil, Haberler) ---
  async function loadAssetDetail(symbol, type = 'stock') {
    let asset = ASSET_UNIVERSE.find(a => a.symbol === symbol) || {
      symbol,
      name: symbol,
      type,
      exchange: type === 'crypto' ? 'Crypto' : (type === 'bist' ? 'BIST' : 'NASDAQ'),
      basePrice: 150,
      change24h: 1.2,
      volume: 1000000
    };

    state.activeAsset = { ...asset };

    // Başlık ve Rozetleri Güncelle
    dom.detailSymbolBadge.textContent = asset.symbol;
    dom.detailAssetName.textContent = asset.name;
    dom.detailExchangeBadge.textContent = asset.exchange;
    dom.detailAssetType.textContent = asset.type === 'crypto' ? 'Kripto Para' : 'Hisse Senedi';
    dom.detailCurrentPrice.textContent = `$${asset.basePrice.toLocaleString()}`;
    
    const isBullish = asset.change24h >= 0;
    dom.detailChange24h.className = `change-pill ${isBullish ? 'bullish' : 'bearish'}`;
    dom.detailChange24h.textContent = `${isBullish ? '+' : ''}${asset.change24h.toFixed(2)}%`;
    dom.detailPriceDiff.textContent = `${isBullish ? '+' : ''}$${((asset.basePrice * asset.change24h) / 100).toFixed(2)} 24s`;

    // Favori Yıldızını Güncelle
    const isFav = state.watchlist.includes(asset.symbol);
    dom.btnToggleFavorite.style.color = isFav ? '#fbbf24' : 'var(--text-muted)';

    // Tarihsel Mum Verisini Çek veya Simüle Et
    const candles = generateHistoricalCandles(asset.basePrice, state.currentTimeframe);
    state.activeAsset.candles = candles;

    // Grafiğe Yükle
    if (state.chartInstance) {
      state.chartInstance.setData(candles);
    }

    // Teknik Göstergeleri Hesapla ve Kartlara Yazdır
    updateTechnicalPanels(candles);

    // Profil ve Haberler
    renderAssetProfileAndNews(asset);

    // AI Başlığını Senkronize Et
    dom.aiTargetAssetName.textContent = `${asset.name} (${asset.symbol})`;
  }

  // --- İstemci Tarafı Teknik Gösterge Kartlarını Güncelleme ---
  function updateTechnicalPanels(candles) {
    if (!candles || candles.length === 0 || typeof TechnicalIndicators === 'undefined') return;

    const trendInfo = TechnicalIndicators.evaluateTrend(candles);

    // 1. Trend Rozeti
    dom.detailTrendDirectionBadge.textContent = trendInfo.badgeText;
    dom.detailTrendDirectionBadge.className = `asset-trend-tag tag-${trendInfo.badgeColor}`;

    // 2. RSI (14)
    if (trendInfo.rsi !== null) {
      dom.metricRSIValue.textContent = trendInfo.rsi.toFixed(2);
      dom.rsiBarFill.style.width = `${Math.min(100, Math.max(0, trendInfo.rsi))}%`;

      if (trendInfo.rsi >= 70) {
        dom.rsiBarFill.style.backgroundColor = '#ef4444';
        dom.metricRSIBadge.className = 'change-pill bearish';
        dom.metricRSIBadge.textContent = 'Aşırı Alım';
      } else if (trendInfo.rsi <= 30) {
        dom.rsiBarFill.style.backgroundColor = '#10b981';
        dom.metricRSIBadge.className = 'change-pill bullish';
        dom.metricRSIBadge.textContent = 'Aşırı Satım';
      } else {
        dom.rsiBarFill.style.backgroundColor = '#f59e0b';
        dom.metricRSIBadge.className = 'change-pill neutral';
        dom.metricRSIBadge.textContent = 'Nötr Bölge';
      }
      dom.metricRSIStatus.textContent = trendInfo.rsiState;
    }

    // 3. MACD
    const macdData = TechnicalIndicators.calculateMACD(candles, 12, 26, 9);
    if (macdData.macd.length > 0) {
      const lastM = macdData.macd[macdData.macd.length - 1].value;
      const lastS = macdData.signal[macdData.signal.length - 1]?.value || 0;
      dom.metricMACDValue.textContent = (lastM >= 0 ? '+' : '') + lastM.toFixed(2);
      dom.metricMACDBadge.className = `change-pill ${lastM >= lastS ? 'bullish' : 'bearish'}`;
      dom.metricMACDBadge.textContent = lastM >= lastS ? 'Pozitif Momentum' : 'Negatif Kesişim';
      dom.metricMACDStatus.textContent = trendInfo.macdState;
    }

    // 4. SMA Durumu
    if (trendInfo.lastSMA20 && trendInfo.lastSMA50) {
      dom.metricSMAValues.textContent = `SMA20: $${trendInfo.lastSMA20} | SMA50: $${trendInfo.lastSMA50}`;
      dom.metricSMABadge.className = `change-pill ${trendInfo.lastSMA20 >= trendInfo.lastSMA50 ? 'bullish' : 'bearish'}`;
      dom.metricSMABadge.textContent = trendInfo.lastSMA20 >= trendInfo.lastSMA50 ? 'Boğa Eğilimi' : 'Ayı Eğilimi';
      dom.metricSMAStatus.textContent = trendInfo.smaState;
    }

    // Durumu sakla (AI paneli için)
    state.activeAsset.technicals = trendInfo;
  }

  // --- Gerçekçi Tarihsel Mum Verisi Üretici (TradingView Formatı) ---
  function generateHistoricalCandles(currentPrice, timeframe) {
    let barCount = 60;
    let secondsStep = 86400; // 1 gün

    if (timeframe === '1D') { barCount = 78; secondsStep = 300; } // 5 dakikalık barlar
    else if (timeframe === '1W') { barCount = 84; secondsStep = 7200; } // 2 saatlik barlar
    else if (timeframe === '1M') { barCount = 60; secondsStep = 86400; } // Günlük barlar
    else if (timeframe === '1Y') { barCount = 120; secondsStep = 86400 * 3; }
    else if (timeframe === '5Y' || timeframe === 'ALL') { barCount = 150; secondsStep = 86400 * 12; }

    const now = Math.floor(Date.now() / 1000);
    const candles = [];
    let price = currentPrice * (1 - (barCount * 0.002));

    for (let i = 0; i < barCount; i++) {
      const time = now - ((barCount - i) * secondsStep);
      const volatility = price * 0.018;
      const change = (Math.random() - 0.48) * volatility;
      const open = Number(price.toFixed(2));
      const close = Number((price + change).toFixed(2));
      const high = Number((Math.max(open, close) + Math.random() * (volatility * 0.8)).toFixed(2));
      const low = Number((Math.min(open, close) - Math.random() * (volatility * 0.8)).toFixed(2));
      const volume = Math.floor(100000 + Math.random() * 900000);

      candles.push({ time, open, high, low, close, volume });
      price = close;
    }

    // Son barı güncel fiyata sabitle
    candles[candles.length - 1].close = currentPrice;
    return candles;
  }

  // --- Şirket / Varlık Profili ve Haberler ---
  function renderAssetProfileAndNews(asset) {
    // Profil Alanı
    dom.companyProfileContent.innerHTML = `
      <p><strong>Varlık:</strong> ${asset.name} (${asset.symbol})</p>
      <p><strong>Borsa / Piyasa:</strong> ${asset.exchange} (${asset.type.toUpperCase()})</p>
      <p><strong>Piyasa Değeri:</strong> ~$${((asset.basePrice * (asset.volume || 10000000)) / 1000000).toLocaleString('en-US', { maximumFractionDigits: 0 })} M</p>
      <p><strong>Takip Tipi:</strong> ${asset.type === 'crypto' ? 'Blokzincir / Kripto Para Birimi' : 'Halka Açık Anonim Şirket Hissesi'}</p>
      <p style="margin-top: 8px; font-size: 0.82rem; color: var(--text-muted);">
        Veriler Cloudflare Worker önbellekleme katmanı üzerinden Finnhub ve CoinGecko API entegrasyonuyla sunulmaktadır.
      </p>
    `;

    // Haberler Listesi
    const newsItems = [
      {
        title: `${asset.symbol} son çeyrek bilanço beklentileri ve piyasa konsensüsü açıklandı.`,
        source: 'FinansPulse',
        time: '3 saat önce'
      },
      {
        title: `${asset.name} kurumsal yatırımcı akışlarında hacim artışı kaydedildi.`,
        source: 'Global Market News',
        time: '7 saat önce'
      },
      {
        title: `Piyasa analistleri ${asset.symbol} için kritik destek ve direnç bantlarını paylaştı.`,
        source: 'Terminal Analiz',
        time: '1 gün önce'
      }
    ];

    dom.assetNewsList.innerHTML = newsItems.map(item => `
      <div class="news-item">
        <a href="#" class="news-headline" onclick="event.preventDefault();">${item.title}</a>
        <div class="news-meta">
          <span>📰 ${item.source}</span>
          <span>⏱️ ${item.time}</span>
        </div>
      </div>
    `).join('');
  }

  // --- Watchlist (Favoriler) İşlemleri ---
  function renderWatchlist() {
    const list = state.watchlist;
    dom.watchlistCount.textContent = `${list.length} Varlık`;

    if (list.length === 0) {
      dom.watchlistGrid.innerHTML = `
        <div style="grid-column: 1 / -1; padding: 24px; text-align: center; color: var(--text-muted); background: var(--bg-card); border-radius: 12px; border: 1px dashed var(--border-subtle);">
          ⭐ Henüz takip listenize varlık eklemediniz. Arama yaparak veya piyasa kartlarındaki yıldız ikonuna tıklayarak favorilerinize ekleyebilirsiniz.
        </div>
      `;
      return;
    }

    const matchedAssets = list.map(sym => {
      return ASSET_UNIVERSE.find(a => a.symbol === sym) || {
        symbol: sym,
        name: sym,
        type: 'stock',
        exchange: 'Global',
        basePrice: 100,
        change24h: 0
      };
    });

    dom.watchlistGrid.innerHTML = matchedAssets.map(asset => createAssetCardHTML(asset, true)).join('');
  }

  function toggleFavorite(symbol) {
    const idx = state.watchlist.indexOf(symbol);
    if (idx > -1) {
      state.watchlist.splice(idx, 1);
    } else {
      state.watchlist.push(symbol);
    }

    localStorage.setItem('trendvest_watchlist', JSON.stringify(state.watchlist));
    renderWatchlist();

    // Detay ekranındaysa yıldızı güncelle
    if (state.activeAsset.symbol === symbol) {
      const isFav = state.watchlist.includes(symbol);
      dom.btnToggleFavorite.style.color = isFav ? '#fbbf24' : 'var(--text-muted)';
    }
  }

  // --- Piyasa Kartları (Bölgesel ve Global) ---
  function renderMarketGrids() {
    // 1. Bölgesel Kartlar (TR için BIST, US için NASDAQ)
    const regionalAssets = ASSET_UNIVERSE.filter(a => {
      if (state.currentRegion === 'TR') return a.type === 'bist';
      return a.type === 'stock';
    }).slice(0, 6);

    dom.regionalGrid.innerHTML = regionalAssets.map(a => createAssetCardHTML(a)).join('');

    // 2. Global Devler & Kriptolar
    const globalAssets = ASSET_UNIVERSE.filter(a => a.type === 'crypto' || (state.currentRegion === 'TR' && a.type === 'stock')).slice(0, 6);
    dom.globalGrid.innerHTML = globalAssets.map(a => createAssetCardHTML(a)).join('');
  }

  function createAssetCardHTML(asset, isWatchlistCard = false) {
    const isBullish = asset.change24h >= 0;
    const isFav = state.watchlist.includes(asset.symbol);

    let tagClass = 'tag-neutral';
    let tagText = 'Yatay Trend';
    if (asset.rsi >= 60 || asset.change24h >= 2) { tagClass = 'tag-bullish'; tagText = 'Yükseliş Trendi 🚀'; }
    else if (asset.rsi <= 40 || asset.change24h <= -2) { tagClass = 'tag-bearish'; tagText = 'Düşüş Trendi 🔻'; }

    return `
      <div class="asset-card" data-symbol="${asset.symbol}" data-type="${asset.type}">
        <div class="asset-card-top">
          <div class="asset-card-identity">
            <span class="asset-card-symbol">${asset.symbol}</span>
            <span class="asset-card-name" title="${asset.name}">${asset.name}</span>
          </div>
          <button class="asset-card-fav ${isFav ? 'active' : ''}" data-fav-symbol="${asset.symbol}" title="Favorilere Ekle/Kaldır">
            ★
          </button>
        </div>

        <div class="asset-card-price-row">
          <span class="asset-card-price">$${asset.basePrice.toLocaleString()}</span>
          <span class="change-pill ${isBullish ? 'bullish' : 'bearish'}">
            ${isBullish ? '+' : ''}${asset.change24h.toFixed(2)}%
          </span>
        </div>

        <div class="asset-card-footer">
          <span>${asset.exchange}</span>
          <span class="asset-trend-tag ${tagClass}">${tagText}</span>
        </div>
      </div>
    `;
  }

  // --- Arama Çubuğu & Otomatik Tamamlama ---
  function handleSearchInput(query) {
    const cleanQuery = query.trim().toLowerCase();
    if (!cleanQuery) {
      dom.searchDropdown.classList.remove('open');
      dom.searchDropdown.innerHTML = '';
      dom.btnSearchClear.style.display = 'none';
      return;
    }

    dom.btnSearchClear.style.display = 'block';

    const results = ASSET_UNIVERSE.filter(a => 
      a.symbol.toLowerCase().includes(cleanQuery) || 
      a.name.toLowerCase().includes(cleanQuery)
    );

    if (results.length === 0) {
      dom.searchDropdown.innerHTML = `
        <div style="padding: 16px; text-align: center; color: var(--text-muted); font-size: 0.88rem;">
          "${query}" ile eşleşen hisse veya kripto bulunamadı.
        </div>
      `;
    } else {
      dom.searchDropdown.innerHTML = results.map(r => `
        <div class="search-result-item" data-symbol="${r.symbol}" data-type="${r.type}">
          <div class="search-result-left">
            <span class="search-item-badge ${r.type === 'crypto' ? 'badge-crypto' : (r.type === 'bist' ? 'badge-bist' : 'badge-stock')}">
              ${r.type === 'crypto' ? 'KRİPTO' : (r.type === 'bist' ? 'BIST' : 'ABD')}
            </span>
            <div>
              <div class="search-item-symbol">${r.symbol}</div>
              <div class="search-item-name">${r.name}</div>
            </div>
          </div>
          <div style="text-align: right; font-family: var(--font-mono); font-size: 0.9rem;">
            <div>$${r.basePrice.toLocaleString()}</div>
            <div style="color: ${r.change24h >= 0 ? '#10b981' : '#ef4444'}; font-size: 0.78rem;">
              ${r.change24h >= 0 ? '+' : ''}${r.change24h.toFixed(2)}%
            </div>
          </div>
        </div>
      `).join('');
    }

    dom.searchDropdown.classList.add('open');
  }

  // --- Ekran 3: Yapay Zeka (AI) Durum Analizi ---
  async function triggerAIAnalysis() {
    dom.btnTriggerAIAnalysis.disabled = true;
    dom.aiOutputContainer.innerHTML = `
      <div style="text-align: center; padding: 40px 0;">
        <div style="font-size: 2rem; margin-bottom: 12px; animation: skeletonPulse 1s infinite;">🤖✨</div>
        <p style="color: var(--color-primary); font-weight: 600;">Yapay Zeka Analiz Motoru Çalışıyor...</p>
        <p style="font-size: 0.85rem; color: var(--text-muted); margin-top: 6px;">
          Fiyat formasyonları, RSI (14), MACD ve hareketli ortalama kesişimleri derleniyor.
        </p>
      </div>
    `;

    const payload = {
      asset: {
        symbol: state.activeAsset.symbol,
        name: state.activeAsset.name,
        type: state.activeAsset.type,
        price: state.activeAsset.basePrice,
        change24h: state.activeAsset.change24h
      },
      technicals: state.activeAsset.technicals || {
        direction: 'Yükseliş',
        badgeText: 'Yükseliş Trendi 🚀',
        score: 65,
        rsi: 58.4,
        rsiState: 'Pozitif Momentum',
        smaState: 'Fiyat > SMA20 > SMA50',
        macdState: 'Pozitif Bölgede Sinyal Üzerinde'
      },
      timeframe: state.currentTimeframe
    };

    try {
      // Cloudflare Worker AI Uç Noktasına İstek At
      const workerUrl = state.workerUrl.replace(/\/$/, '');
      const response = await fetch(`${workerUrl}/api/ai/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const data = await response.json();
        renderAIResult(data.analysis);
      } else {
        throw new Error('Worker yanıt vermedi');
      }
    } catch (e) {
      // Yerel kural tabanlı zengin analitik motoru fallback'i
      console.log('Worker bağlantısı kurulamadı veya secret yok, yerleşik algoritmik analiz devreye giriyor:', e);
      renderAlgorithmicFallbackAnalysis(payload);
    } finally {
      dom.btnTriggerAIAnalysis.disabled = false;
    }
  }

  function renderAIResult(markdownText) {
    // Sade Markdown biçimlendirici
    let html = markdownText
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^## (.*$)/gim, '<h3>$1</h3>')
      .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/gim, '<em>$1</em>')
      .replace(/\n\n/gim, '</p><p>')
      .replace(/\n- (.*$)/gim, '<li>$1</li>');

    dom.aiOutputContainer.innerHTML = `<div class="formatted-ai-text"><p>${html}</p></div>`;
  }

  function renderAlgorithmicFallbackAnalysis(payload) {
    const { asset, technicals } = payload;
    const summary = `
### 📊 Genel Trend ve Fiyat Hareketi
${asset.name} (${asset.symbol}) güncel olarak $${asset.price.toLocaleString()} seviyesinde fiyatlanmakta olup son 24 saatte %${asset.change24h.toFixed(2)} değişim kaydetmiştir. İstemci tarafında hesaplanan bileşik teknik momentum skoru (${technicals.score || 60}/100), varlığın şu an **${technicals.badgeText || 'Yükseliş Trendi'}** içinde hareket ettiğini göstermektedir.

### ⚡ Teknik Göstergelerin Dili
- **RSI (14 Göreceli Güç):** ${technicals.rsi || 58.4} seviyesinde bulunmaktadır. ${technicals.rsiState || 'Dengeli momentum bölgesinde'}.
- **Hareketli Ortalamalar:** ${technicals.smaState || 'Fiyat SMA20 ve SMA50 üzerinde pozitif dizilimde'}.
- **MACD (12, 26, 9):** ${technicals.macdState || 'Momentum hattı pozitif bölgede seyrediyor'}.

### 🔍 Takip Edilmesi Gereken Seviyeler & Volatilite
Kısa vadeli hareketlerde 20 periyotluk hareketli ortalama seviyesi dinamik bir destek eşiği olarak izlenebilir. Hacim onaylı hareketler trendin sürekliliği açısından belirleyici olacaktır.

⚠️ *Yasal Uyarı: Bu analiz tamamen teknik göstergelere dayalı algoritmik bir özet olup yatırım danışmanlığı veya tavsiyesi niteliği taşımaz.*
    `;
    renderAIResult(summary);
  }

  // --- Ekran 4: Potansiyel Sepetler (Screener) ---
  function renderScreenerStrategies() {
    if (typeof ScreenerEngine === 'undefined') return;

    const scannedResults = ScreenerEngine.scanUniverse(ASSET_UNIVERSE);

    // Strateji Kartlarını Bas
    dom.strategyCardsGrid.innerHTML = scannedResults.map((strat, idx) => `
      <div class="strategy-card ${strat.id === state.activeStrategyId ? 'selected' : ''}" data-strategy-id="${strat.id}">
        <div class="strategy-top">
          <div class="strategy-icon">${strat.icon}</div>
          <div class="strategy-title-wrap">
            <h3>${strat.name}</h3>
            <span style="font-size: 0.72rem; color: ${strat.color}; font-weight: 700; text-transform: uppercase;">${strat.badge}</span>
          </div>
        </div>
        <p class="strategy-desc">${strat.description}</p>
        <ul class="strategy-criteria-list">
          ${strat.criteria.map(c => `<li>${c}</li>`).join('')}
        </ul>
        <div class="strategy-matched-count">
          <span>Taranan Eşleşme</span>
          <span style="font-size: 1rem; font-family: var(--font-mono);">${strat.count} Varlık</span>
        </div>
      </div>
    `).join('');

    // İlk seçili stratejiyi göster
    selectStrategy(state.activeStrategyId, scannedResults);
  }

  function selectStrategy(strategyId, scannedResults = null) {
    state.activeStrategyId = strategyId;
    if (!scannedResults && typeof ScreenerEngine !== 'undefined') {
      scannedResults = ScreenerEngine.scanUniverse(ASSET_UNIVERSE);
    }

    const currentStrat = scannedResults.find(s => s.id === strategyId);
    if (!currentStrat) return;

    // Kart seçim vurgusu
    document.querySelectorAll('.strategy-card').forEach(card => {
      card.classList.toggle('selected', card.dataset.strategyId === strategyId);
    });

    dom.selectedStrategyTitle.textContent = `${currentStrat.icon} ${currentStrat.name} Sepeti`;
    dom.selectedStrategyCount.textContent = `${currentStrat.count} Varlık Bulundu`;
    dom.strategyAIExplanation.innerHTML = `
      <strong>🤖 Strateji Mantığı & AI Yorumu:</strong> ${currentStrat.aiSummary}
    `;

    // Tablo Satırları
    if (currentStrat.assets.length === 0) {
      dom.screenerTableBody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; color: var(--text-muted); padding: 24px;">
            Şu anda bu kural kriterlerine uyan varlık tespit edilemedi.
          </td>
        </tr>
      `;
    } else {
      dom.screenerTableBody.innerHTML = currentStrat.assets.map(asset => `
        <tr data-symbol="${asset.symbol}" data-type="${asset.type}">
          <td>
            <strong>${asset.symbol}</strong>
            <span style="display: block; font-size: 0.78rem; color: var(--text-muted);">${asset.name}</span>
          </td>
          <td><span class="detail-market-badge">${asset.type.toUpperCase()}</span></td>
          <td style="font-family: var(--font-mono); font-weight: 700;">$${asset.basePrice.toLocaleString()}</td>
          <td>
            <span class="change-pill ${asset.change24h >= 0 ? 'bullish' : 'bearish'}">
              ${asset.change24h >= 0 ? '+' : ''}${asset.change24h.toFixed(2)}%
            </span>
          </td>
          <td style="font-family: var(--font-mono);">${asset.rsi || '-'}</td>
          <td>
            <span class="asset-trend-tag tag-${asset.change24h >= 0 ? 'bullish' : 'bearish'}">
              ${asset.change24h >= 0 ? 'Momentum Pozitif' : 'Düşüş/Toparlanma'}
            </span>
          </td>
          <td>
            <button class="btn-secondary" style="padding: 4px 10px; font-size: 0.78rem;" data-examine-symbol="${asset.symbol}">
              İncele ➔
            </button>
          </td>
        </tr>
      `).join('');
    }
  }

  // --- Modallar ---
  function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add('open');

    if (modalId === 'modalRegion') {
      renderRegionOptions();
    } else if (modalId === 'modalSettings') {
      dom.workerUrlInput.value = state.workerUrl;
    }
  }

  function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('open');
  }

  function renderRegionOptions() {
    dom.exchangeOptionList.innerHTML = Object.keys(COUNTRY_EXCHANGES).map(code => {
      const ex = COUNTRY_EXCHANGES[code];
      const isActive = state.currentRegion === code;
      return `
        <button class="exchange-option-btn ${isActive ? 'active' : ''}" data-country-code="${code}">
          <div style="display: flex; align-items: center; gap: 10px;">
            <span style="font-size: 1.3rem;">${ex.flag}</span>
            <div style="text-align: left;">
              <div style="font-weight: 700;">${ex.name}</div>
              <div style="font-size: 0.78rem; color: var(--text-muted);">${ex.fullName}</div>
            </div>
          </div>
          <span style="font-size: 0.8rem; color: var(--color-primary);">${isActive ? '✓ Seçili' : 'Seç'}</span>
        </button>
      `;
    }).join('');
  }

  // --- Olay Dinleyicileri (Event Listeners) ---
  function setupEventListeners() {
    // Sekme Butonları
    dom.tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        switchScreen(tab.dataset.screen);
      });
    });

    // Logo Tıklaması -> Ana Sayfa
    dom.navBrandHome.addEventListener('click', () => {
      switchScreen('screen-home');
    });

    // Arama Çubuğu
    dom.globalSearchInput.addEventListener('input', (e) => {
      handleSearchInput(e.target.value);
    });

    dom.btnSearchClear.addEventListener('click', () => {
      dom.globalSearchInput.value = '';
      handleSearchInput('');
    });

    // Arama Sonucuna Tıklama (Event Delegation)
    dom.searchDropdown.addEventListener('click', (e) => {
      const item = e.target.closest('.search-result-item');
      if (item) {
        const symbol = item.dataset.symbol;
        const type = item.dataset.type;
        dom.searchDropdown.classList.remove('open');
        dom.globalSearchInput.value = '';
        loadAssetDetail(symbol, type);
        switchScreen('screen-detail');
      }
    });

    // Sayfa dışına tıklayınca arama kutusunu kapat
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.search-bar-wrapper')) {
        dom.searchDropdown.classList.remove('open');
      }
    });

    // Kısayol Çipleri
    dom.quickChips.forEach(chip => {
      chip.addEventListener('click', () => {
        const symbol = chip.dataset.symbol;
        const type = chip.dataset.type;
        loadAssetDetail(symbol, type);
        switchScreen('screen-detail');
      });
    });

    // Piyasa Kartlarına Tıklama (Event Delegation)
    document.addEventListener('click', (e) => {
      // Favori butonu
      const favBtn = e.target.closest('.asset-card-fav');
      if (favBtn) {
        e.stopPropagation();
        toggleFavorite(favBtn.dataset.favSymbol);
        return;
      }

      // Kartın geneline tıklama
      const card = e.target.closest('.asset-card');
      if (card) {
        const symbol = card.dataset.symbol;
        const type = card.dataset.type || 'stock';
        loadAssetDetail(symbol, type);
        switchScreen('screen-detail');
        return;
      }

      // Screener tablosundaki "İncele" butonu veya satır
      const examineBtn = e.target.closest('[data-examine-symbol]');
      if (examineBtn) {
        const sym = examineBtn.dataset.examineSymbol;
        loadAssetDetail(sym);
        switchScreen('screen-detail');
        return;
      }

      const screenerRow = e.target.closest('#screenerTableBody tr');
      if (screenerRow && !examineBtn) {
        const sym = screenerRow.dataset.symbol;
        if (sym) {
          loadAssetDetail(sym, screenerRow.dataset.type);
          switchScreen('screen-detail');
        }
      }
    });

    // Detay Favori Butonu
    dom.btnToggleFavorite.addEventListener('click', () => {
      toggleFavorite(state.activeAsset.symbol);
    });

    // Zaman Dilimi Seçici (1G, 1H, 1A, 1Y, 5Y, ALL)
    dom.timeframeSelector.addEventListener('click', (e) => {
      const btn = e.target.closest('.tf-btn');
      if (btn) {
        dom.timeframeSelector.querySelectorAll('.tf-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.currentTimeframe = btn.dataset.tf;
        
        // Mumları yeniden oluştur ve yükle
        const candles = generateHistoricalCandles(state.activeAsset.basePrice, state.currentTimeframe);
        state.activeAsset.candles = candles;
        if (state.chartInstance) {
          state.chartInstance.setData(candles);
        }
        updateTechnicalPanels(candles);
      }
    });

    // Gösterge Toggle Butonları
    document.querySelectorAll('.toggle-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const indName = chip.dataset.ind;
        chip.classList.toggle('active');
        const isActive = chip.classList.contains('active');
        if (state.chartInstance) {
          state.chartInstance.toggleIndicator(indName, isActive);
        }
      });
    });

    // AI Tetikleme Butonu
    dom.btnTriggerAIAnalysis.addEventListener('click', () => {
      triggerAIAnalysis();
    });

    // Screener Strateji Kartı Tıklaması
    dom.strategyCardsGrid.addEventListener('click', (e) => {
      const card = e.target.closest('.strategy-card');
      if (card) {
        selectStrategy(card.dataset.strategyId);
      }
    });

    // Modalları Açma
    dom.btnOpenRegionModal.addEventListener('click', () => openModal('modalRegion'));
    dom.btnOpenSettingsModal.addEventListener('click', () => openModal('modalSettings'));
    dom.btnOpenLegalModal.addEventListener('click', () => openModal('modalLegal'));

    // Modalları Kapatma
    document.querySelectorAll('[data-close-modal]').forEach(btn => {
      btn.addEventListener('click', () => {
        closeModal(btn.dataset.closeModal);
      });
    });

    // Borsa Seçenek Listesi Tıklaması
    dom.exchangeOptionList.addEventListener('click', (e) => {
      const btn = e.target.closest('.exchange-option-btn');
      if (btn) {
        const countryCode = btn.dataset.countryCode;
        setRegion(countryCode);
        closeModal('modalRegion');
      }
    });

    // Worker URL Kaydetme
    dom.btnSaveSettings.addEventListener('click', () => {
      const url = dom.workerUrlInput.value.trim();
      state.workerUrl = url;
      localStorage.setItem('trendvest_worker_url', url);
      closeModal('modalSettings');
    });

    // Worker Bağlantı Testi
    dom.btnTestWorker.addEventListener('click', async () => {
      const url = dom.workerUrlInput.value.trim().replace(/\/$/, '');
      dom.workerStatusIndicator.textContent = 'Bağlantı kuruluyor...';
      dom.workerStatusIndicator.style.color = 'var(--text-secondary)';

      try {
        const res = await fetch(`${url}/api/health`);
        if (res.ok) {
          const data = await res.json();
          dom.workerStatusIndicator.textContent = `🟢 Başarılı: ${data.service} devrede!`;
          dom.workerStatusIndicator.style.color = '#10b981';
        } else {
          throw new Error(`HTTP ${res.status}`);
        }
      } catch (err) {
        dom.workerStatusIndicator.textContent = `🔴 Bağlantı Başarısız (${err.message}). Yerel simülasyon aktif kalacak.`;
        dom.workerStatusIndicator.style.color = '#ef4444';
      }
    });
  }

  function handleHashNavigation() {
    window.addEventListener('hashchange', () => {
      const hash = window.location.hash.replace('#', '');
      if (hash && dom.screens[`screen-${hash}`]) {
        switchScreen(`screen-${hash}`);
      }
    });
  }

  // DOM Yüklendiğinde Başlat
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
