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

  // --- Yönetici E-postası (Admin Paneline erişim tek bu hesapla) ---
  const ADMIN_EMAIL = 'imsalper@gmail.com';

  // --- 10 Lokomotif BIST Şirketi (BIST 10) ve Örnek Varlık Havuzu ---
  const BIST_10_SYMBOLS = ['THYAO', 'AKBNK', 'GARAN', 'EREGL', 'ASELS', 'KCHOL', 'ISCTR', 'TUPRS', 'SAHOL', 'BIMAS'];

  const ASSET_UNIVERSE = [
    // 🇹🇷 BIST 10 Lokomotif Hisseleri
    { symbol: 'THYAO', name: 'Türk Hava Yolları', type: 'bist', exchange: 'BIST', basePrice: 304.50, change24h: 3.20, volume: 42000000, rsi: 64.1, sma20: 294.0, sma50: 286.0, volumeRatio: 1.70 },
    { symbol: 'AKBNK', name: 'Akbank T.A.Ş.', type: 'bist', exchange: 'BIST', basePrice: 58.40, change24h: 1.10, volume: 36000000, rsi: 51.2, sma20: 57.5, sma50: 56.8, volumeRatio: 1.05 },
    { symbol: 'GARAN', name: 'Garanti BBVA', type: 'bist', exchange: 'BIST', basePrice: 114.20, change24h: -0.90, volume: 31000000, rsi: 33.5, sma20: 118.0, sma50: 120.5, volumeRatio: 0.95 },
    { symbol: 'EREGL', name: 'Ereğli Demir Çelik', type: 'bist', exchange: 'BIST', basePrice: 51.10, change24h: -2.30, volume: 29000000, rsi: 31.0, sma20: 53.5, sma50: 55.0, volumeRatio: 1.15 },
    { symbol: 'ASELS', name: 'Aselsan Elektronik', type: 'bist', exchange: 'BIST', basePrice: 62.80, change24h: 2.10, volume: 25000000, rsi: 57.0, sma20: 60.5, sma50: 59.0, volumeRatio: 1.30 },
    { symbol: 'KCHOL', name: 'Koç Holding', type: 'bist', exchange: 'BIST', basePrice: 215.00, change24h: 0.45, volume: 18000000, rsi: 49.0, sma20: 214.0, sma50: 212.0, volumeRatio: 0.90 },
    { symbol: 'ISCTR', name: 'Türkiye İş Bankası (C)', type: 'bist', exchange: 'BIST', basePrice: 13.85, change24h: 1.45, volume: 55000000, rsi: 54.2, sma20: 13.4, sma50: 13.1, volumeRatio: 1.25 },
    { symbol: 'TUPRS', name: 'Tüpraş', type: 'bist', exchange: 'BIST', basePrice: 168.20, change24h: 2.80, volume: 22000000, rsi: 62.8, sma20: 162.0, sma50: 158.0, volumeRatio: 1.40 },
    { symbol: 'SAHOL', name: 'Sabancı Holding', type: 'bist', exchange: 'BIST', basePrice: 94.50, change24h: 0.75, volume: 20000000, rsi: 48.6, sma20: 93.0, sma50: 91.5, volumeRatio: 0.88 },
    { symbol: 'BIMAS', name: 'BİM Birleşik Mağazalar', type: 'bist', exchange: 'BIST', basePrice: 485.00, change24h: -0.60, volume: 15000000, rsi: 43.1, sma20: 492.0, sma50: 498.0, volumeRatio: 0.92 },

    // ABD Hisseleri (İkincil arama / referans)
    { symbol: 'AAPL', name: 'Apple Inc.', type: 'stock', exchange: 'NASDAQ', basePrice: 224.50, change24h: 2.45, volume: 52000000, rsi: 58.4, sma20: 218.2, sma50: 210.5, volumeRatio: 1.15 },
    { symbol: 'NVDA', name: 'NVIDIA Corporation', type: 'stock', exchange: 'NASDAQ', basePrice: 118.80, change24h: 4.80, volume: 88000000, rsi: 66.2, sma20: 112.5, sma50: 104.0, volumeRatio: 1.65 },
    { symbol: 'TSLA', name: 'Tesla Inc.', type: 'stock', exchange: 'NASDAQ', basePrice: 242.10, change24h: -1.85, volume: 64000000, rsi: 34.2, sma20: 248.0, sma50: 254.0, volumeRatio: 1.10 },
    { symbol: 'MSFT', name: 'Microsoft Corp.', type: 'stock', exchange: 'NASDAQ', basePrice: 432.00, change24h: 0.85, volume: 21000000, rsi: 52.0, sma20: 428.0, sma50: 424.0, volumeRatio: 0.95 },
    { symbol: 'AMZN', name: 'Amazon.com Inc.', type: 'stock', exchange: 'NASDAQ', basePrice: 186.40, change24h: 1.60, volume: 38000000, rsi: 59.8, sma20: 181.0, sma50: 178.0, volumeRatio: 1.20 },
    { symbol: 'GOOGL', name: 'Alphabet Inc.', type: 'stock', exchange: 'NASDAQ', basePrice: 162.20, change24h: -0.40, volume: 24000000, rsi: 48.5, sma20: 164.0, sma50: 166.0, volumeRatio: 0.85 },

    // Kripto Paralar (İkincil arama / referans)
    { symbol: 'BTC', name: 'Bitcoin', type: 'crypto', exchange: 'Global Crypto', basePrice: 63850, change24h: 2.85, volume: 32000000000, rsi: 61.5, sma20: 60500, sma50: 58900, volumeRatio: 1.45 },
    { symbol: 'ETH', name: 'Ethereum', type: 'crypto', exchange: 'Global Crypto', basePrice: 2540, change24h: -0.65, volume: 16500000000, rsi: 36.8, sma20: 2580, sma50: 2640, volumeRatio: 1.05 },
    { symbol: 'SOL', name: 'Solana', type: 'crypto', exchange: 'Global Crypto', basePrice: 152.40, change24h: 5.40, volume: 4800000000, rsi: 68.4, sma20: 142.0, sma50: 134.0, volumeRatio: 1.85 },
    { symbol: 'AVAX', name: 'Avalanche', type: 'crypto', exchange: 'Global Crypto', basePrice: 28.60, change24h: 3.10, volume: 650000000, rsi: 54.0, sma20: 26.8, sma50: 25.5, volumeRatio: 1.35 },
    { symbol: 'BNB', name: 'BNB Chain', type: 'crypto', exchange: 'Global Crypto', basePrice: 578.00, change24h: 0.20, volume: 1100000000, rsi: 50.2, sma20: 572.0, sma50: 565.0, volumeRatio: 0.88 },

    // 💰 TEFAS Yatırım Fonları (Simülasyon Amaçlı Örnek Veri)
    { symbol: 'TTE', name: 'İş Portföy Teknoloji Fonu', type: 'fund', exchange: 'TEFAS', basePrice: 2.845, change24h: 1.35, volume: 8500000, rsi: 58.0, sma20: 2.78, sma50: 2.70, volumeRatio: 1.10 },
    { symbol: 'AFA', name: 'Ak Portföy Alternatif Enerji Fonu', type: 'fund', exchange: 'TEFAS', basePrice: 1.962, change24h: -0.45, volume: 4200000, rsi: 46.5, sma20: 2.00, sma50: 2.03, volumeRatio: 0.92 },
    { symbol: 'YAS', name: 'Yapı Kredi Portföy Altın Fonu', type: 'fund', exchange: 'TEFAS', basePrice: 5.128, change24h: 0.80, volume: 3100000, rsi: 55.2, sma20: 5.05, sma50: 4.95, volumeRatio: 1.05 },
    { symbol: 'GPB', name: 'Garanti Portföy Borçlanma Araçları Fonu', type: 'fund', exchange: 'TEFAS', basePrice: 3.410, change24h: 0.12, volume: 2600000, rsi: 50.8, sma20: 3.38, sma50: 3.36, volumeRatio: 0.98 }
  ];

  // --- Tür Bazlı Yardımcılar (Para Birimi & Etiketler) ---
  function currencySymbolFor(type) {
    return (type === 'bist' || type === 'fund') ? '₺' : '$';
  }

  function assetTypeLabel(type) {
    if (type === 'bist') return 'BIST Hissesi';
    if (type === 'crypto') return 'Kripto Para';
    if (type === 'fund') return 'Yatırım Fonu';
    return 'Hisse Senedi';
  }

  // --- Sanal Hesap Sabitleri (TL tabanlı) ---
  const STARTING_BALANCE_TRY = 250000;
  const FALLBACK_USD_TRY = 48.70; // Kur servisine ulaşılamazsa kullanılır
  const ACCOUNT_CURRENCY_VERSION = 2; // 2 = TL tabanlı hesap (eski USD hesapları bu sürüme sıfırlanır)

  // --- Varsayılan Yapılandırma & Durum (State) ---
  const state = {
    currentUser: null,
    userProfile: null,
    liveRates: {},
    usdTryRate: FALLBACK_USD_TRY,
    authMode: 'login', // 'login' | 'signup'
    workerUrl: localStorage.getItem('trendvest_worker_url') || 'https://trendvest-proxy.imsalper.workers.dev',
    currentScreen: 'screen-home',
    currentRegion: 'TR',
    watchlist: (() => {
      try {
        const raw = localStorage.getItem('trendvest_watchlist');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const bistOnly = parsed.filter(s => BIST_10_SYMBOLS.includes(s));
            if (bistOnly.length > 0) return bistOnly;
          }
        }
      } catch (e) {}
      return ['THYAO', 'AKBNK', 'GARAN', 'EREGL', 'ASELS'];
    })(),
    activeAsset: {
      symbol: 'THYAO',
      name: 'Türk Hava Yolları',
      type: 'bist',
      exchange: 'BIST',
      price: 304.50,
      basePrice: 304.50,
      change24h: 3.20,
      high24h: 308.20,
      low24h: 298.50,
      volume: 42000000,
      candles: []
    },
    currentTimeframe: '1M',
    chartInstance: null,
    cachedMarketData: new Map(),
    activeStrategyId: 'oversold_bounce'
  };

  // --- DOM Elementleri Önbelleği ---
  const dom = {
    tabs: document.querySelectorAll('.nav-tab-btn'),
    screens: {
      'screen-home': document.getElementById('screen-home'),
      'screen-crypto': document.getElementById('screen-crypto'),
      'screen-detail': document.getElementById('screen-detail'),
      'screen-ai': document.getElementById('screen-ai'),
      'screen-screener': document.getElementById('screen-screener'),
      'screen-portfolio': document.getElementById('screen-portfolio'),
      'screen-store': document.getElementById('screen-store'),
      'screen-leaderboard': document.getElementById('screen-leaderboard'),
      'screen-admin': document.getElementById('screen-admin'),
    },
    navBrandHome: document.getElementById('navBrandHome'),
    tabAdmin: document.getElementById('tabAdmin'),
    tabPortfolio: document.getElementById('tabPortfolio'),
    btnOpenRegionModal: document.getElementById('btnOpenRegionModal'),
    btnOpenSettingsModal: document.getElementById('btnOpenSettingsModal'),
    btnOpenLegalModal: document.getElementById('btnOpenLegalModal'),

    // Kimlik Doğrulama
    btnOpenAuthModal: document.getElementById('btnOpenAuthModal'),
    authNavLabel: document.getElementById('authNavLabel'),
    modalAuth: document.getElementById('modalAuth'),
    authModalTitle: document.getElementById('authModalTitle'),
    authLoggedOutView: document.getElementById('authLoggedOutView'),
    authLoggedInView: document.getElementById('authLoggedInView'),
    authEmailInput: document.getElementById('authEmailInput'),
    authPasswordInput: document.getElementById('authPasswordInput'),
    authErrorMsg: document.getElementById('authErrorMsg'),
    btnToggleAuthMode: document.getElementById('btnToggleAuthMode'),
    btnSubmitAuth: document.getElementById('btnSubmitAuth'),
    authCurrentEmail: document.getElementById('authCurrentEmail'),
    btnSignOut: document.getElementById('btnSignOut'),

    // Portföy & Sepetim Ekranı
    btnPortfolioExploreMarkets: document.getElementById('btnPortfolioExploreMarkets'),
    btnPortfolioLoginPrompt: document.getElementById('btnPortfolioLoginPrompt'),
    btnPortfolioEmptyExplore: document.getElementById('btnPortfolioEmptyExplore'),
    portfolioGuestState: document.getElementById('portfolioGuestState'),
    portfolioUserState: document.getElementById('portfolioUserState'),
    portfolioEmptyState: document.getElementById('portfolioEmptyState'),
    portfolioTotalValueTRY: document.getElementById('portfolioTotalValueTRY'),
    portfolioTotalValueLocal: document.getElementById('portfolioTotalValueLocal'),
    portfolioCashTRY: document.getElementById('portfolioCashTRY'),
    portfolioProfitLossTRY: document.getElementById('portfolioProfitLossTRY'),
    portfolioProfitLossPct: document.getElementById('portfolioProfitLossPct'),
    portfolioAssetCount: document.getElementById('portfolioAssetCount'),
    btnSharePortfolio: document.getElementById('btnSharePortfolio'),
    millionaireBanner: document.getElementById('millionaireBanner'),
    modalSharePortfolio: document.getElementById('modalSharePortfolio'),
    shareCardCanvas: document.getElementById('shareCardCanvas'),
    btnDownloadShareCard: document.getElementById('btnDownloadShareCard'),
    portfolioTableContainer: document.getElementById('portfolioTableContainer'),
    portfolioGroupStock: document.getElementById('portfolioGroupStock'),
    portfolioGroupCrypto: document.getElementById('portfolioGroupCrypto'),
    portfolioGroupFund: document.getElementById('portfolioGroupFund'),
    portfolioStockTableBody: document.getElementById('portfolioStockTableBody'),
    portfolioCryptoTableBody: document.getElementById('portfolioCryptoTableBody'),
    portfolioFundTableBody: document.getElementById('portfolioFundTableBody'),
    portfolioStockCount: document.getElementById('portfolioStockCount'),
    portfolioCryptoCount: document.getElementById('portfolioCryptoCount'),
    portfolioFundCount: document.getElementById('portfolioFundCount'),
    portfolioGroupForex: document.getElementById('portfolioGroupForex'),
    portfolioForexTableBody: document.getElementById('portfolioForexTableBody'),
    portfolioForexCount: document.getElementById('portfolioForexCount'),
    forexPairSelect: document.getElementById('forexPairSelect'),
    forexDirectionSelect: document.getElementById('forexDirectionSelect'),
    forexLeverageSelect: document.getElementById('forexLeverageSelect'),
    forexMarginInput: document.getElementById('forexMarginInput'),
    btnOpenForexPosition: document.getElementById('btnOpenForexPosition'),
    forexOpenPreview: document.getElementById('forexOpenPreview'),

    // 🎁 Kozmetik Mağaza & Hediyeleşme
    storeGuestState: document.getElementById('storeGuestState'),
    storeUserState: document.getElementById('storeUserState'),
    btnStoreLoginPrompt: document.getElementById('btnStoreLoginPrompt'),
    storeGemBalance: document.getElementById('storeGemBalance'),
    storeItemsGrid: document.getElementById('storeItemsGrid'),
    gemPacksGrid: document.getElementById('gemPacksGrid'),
    gemPaymentNotice: document.getElementById('gemPaymentNotice'),
    storeOwnedGrid: document.getElementById('storeOwnedGrid'),
    storeOwnedEmptyState: document.getElementById('storeOwnedEmptyState'),
    btnRefreshGifts: document.getElementById('btnRefreshGifts'),
    storeGiftsList: document.getElementById('storeGiftsList'),
    storeGiftsEmptyState: document.getElementById('storeGiftsEmptyState'),
    modalSendGift: document.getElementById('modalSendGift'),
    btnRefreshLeaderboard: document.getElementById('btnRefreshLeaderboard'),
    leaderboardOptInBox: document.getElementById('leaderboardOptInBox'),
    leaderboardOptInCheckbox: document.getElementById('leaderboardOptInCheckbox'),
    autoTradingCheckbox: document.getElementById('autoTradingCheckbox'),
    autoTradingCryptoCheckbox: document.getElementById('autoTradingCryptoCheckbox'),
    autoTradingForexCheckbox: document.getElementById('autoTradingForexCheckbox'),
    leaderboardTableBody: document.getElementById('leaderboardTableBody'),
    leaderboardEmptyState: document.getElementById('leaderboardEmptyState'),
    giftItemPreview: document.getElementById('giftItemPreview'),
    giftRecipientEmail: document.getElementById('giftRecipientEmail'),
    giftErrorMsg: document.getElementById('giftErrorMsg'),
    btnConfirmSendGift: document.getElementById('btnConfirmSendGift'),

    // Sepete Ekle Butonu (Detay Ekranı)
    btnOpenAddToBasketModal: document.getElementById('btnOpenAddToBasketModal'),

    // Admin Paneli
    btnRefreshUsers: document.getElementById('btnRefreshUsers'),
    adminUsersTableBody: document.getElementById('adminUsersTableBody'),
    adminUsersEmptyState: document.getElementById('adminUsersEmptyState'),
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
    fundGrid: document.getElementById('fundGrid'),
    cryptoScreenGrid: document.getElementById('cryptoScreenGrid'),
    regionalSectionTitle: document.getElementById('regionalSectionTitle'),
    globalGrid: document.getElementById('globalGrid'),
    aiPicksGrid: document.getElementById('aiPicksGrid'),
    btnRefreshAIPicks: document.getElementById('btnRefreshAIPicks'),

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

    // Modallar (Bölge, Ayarlar, Yasal, Sepet, Satış, Admin Portföy)
    modalRegion: document.getElementById('modalRegion'),
    modalSettings: document.getElementById('modalSettings'),
    modalLegal: document.getElementById('modalLegal'),
    exchangeOptionList: document.getElementById('exchangeOptionList'),
    workerUrlInput: document.getElementById('workerUrlInput'),
    workerStatusIndicator: document.getElementById('workerStatusIndicator'),
    btnTestWorker: document.getElementById('btnTestWorker'),
    btnSaveSettings: document.getElementById('btnSaveSettings'),

    modalAddToBasket: document.getElementById('modalAddToBasket'),
    basketModalSymbolBadge: document.getElementById('basketModalSymbolBadge'),
    basketModalAssetName: document.getElementById('basketModalAssetName'),
    basketModalAssetType: document.getElementById('basketModalAssetType'),
    basketModalMarketPrice: document.getElementById('basketModalMarketPrice'),
    basketInputShares: document.getElementById('basketInputShares'),
    basketInputPrice: document.getElementById('basketInputPrice'),
    basketCalcTotalCost: document.getElementById('basketCalcTotalCost'),
    basketAvailableCash: document.getElementById('basketAvailableCash'),
    basketRemainingCash: document.getElementById('basketRemainingCash'),
    basketErrorMsg: document.getElementById('basketErrorMsg'),
    btnConfirmAddToBasket: document.getElementById('btnConfirmAddToBasket'),

    modalSellFromBasket: document.getElementById('modalSellFromBasket'),
    sellModalSymbolBadge: document.getElementById('sellModalSymbolBadge'),
    sellModalAssetName: document.getElementById('sellModalAssetName'),
    sellModalCurrentShares: document.getElementById('sellModalCurrentShares'),
    sellModalMarketPrice: document.getElementById('sellModalMarketPrice'),
    sellInputShares: document.getElementById('sellInputShares'),
    sellCalcReturnTRY: document.getElementById('sellCalcReturnTRY'),
    sellModalAvgCostDisplay: document.getElementById('sellModalAvgCostDisplay'),
    sellCalcProfitLossDisplay: document.getElementById('sellCalcProfitLossDisplay'),
    sellErrorMsg: document.getElementById('sellErrorMsg'),
    btnConfirmSell: document.getElementById('btnConfirmSell'),

    modalAdminPortfolio: document.getElementById('modalAdminPortfolio'),
    adminPortfolioModalTitle: document.getElementById('adminPortfolioModalTitle'),
    adminPortfolioUserEmail: document.getElementById('adminPortfolioUserEmail'),
    adminPortfolioUserCash: document.getElementById('adminPortfolioUserCash'),
    adminPortfolioUserTotal: document.getElementById('adminPortfolioUserTotal'),
    adminPortfolioEmptyState: document.getElementById('adminPortfolioEmptyState'),
    adminPortfolioTableContainer: document.getElementById('adminPortfolioTableContainer'),
    adminPortfolioTableBody: document.getElementById('adminPortfolioTableBody')
  };

  // --- Başlatma (Init) ---
  function init() {
    setupEventListeners();
    initAuth();
    initRegion();
    initChartComponent();
    renderWatchlist();
    renderMarketGrids();
    renderScreenerStrategies();
    loadAIRecommendations();
    handleHashNavigation();
    fetchLiveExchangeRate('TRY'); // USD/TRY kurunu erkenden ısıt (sepet muhasebesi için)
  }

  // --- Kimlik Doğrulama (Firebase Auth) ---
  function initAuth() {
    const attach = () => {
      window.fb.onAuthChanged((user) => {
        state.currentUser = user;
        updateAuthUI(user);
      });
    };
    if (window.fb) {
      attach();
    } else {
      window.addEventListener('firebase-ready', attach, { once: true });
    }
  }

  function updateAuthUI(user) {
    const isAdmin = Boolean(user && user.email === ADMIN_EMAIL);
    dom.tabAdmin.style.display = isAdmin ? '' : 'none';
    if (!isAdmin && state.currentScreen === 'screen-admin') {
      switchScreen('screen-home');
    }

    if (user) {
      dom.authNavLabel.textContent = `👤 ${user.email}`;
      dom.authLoggedOutView.style.display = 'none';
      dom.authLoggedInView.style.display = 'block';
      dom.authCurrentEmail.textContent = user.email;
      loadUserProfile(user);
      if (isAdmin) loadAdminUsers();
    } else {
      dom.authNavLabel.textContent = '👤 Giriş Yap';
      dom.authLoggedOutView.style.display = 'block';
      dom.authLoggedInView.style.display = 'none';
      state.userProfile = null;
      renderPortfolioUI();
    }
  }

  function setAuthMode(mode) {
    state.authMode = mode;
    dom.authErrorMsg.style.display = 'none';
    if (mode === 'signup') {
      dom.authModalTitle.textContent = '📝 Kayıt Ol';
      dom.btnSubmitAuth.textContent = 'Kayıt Ol';
      dom.btnToggleAuthMode.textContent = 'Zaten hesabın var mı? Giriş Yap';
    } else {
      dom.authModalTitle.textContent = '👤 Giriş Yap';
      dom.btnSubmitAuth.textContent = 'Giriş Yap';
      dom.btnToggleAuthMode.textContent = 'Hesabın yok mu? Kayıt Ol';
    }
  }

  async function submitAuth() {
    const email = dom.authEmailInput.value.trim();
    const password = dom.authPasswordInput.value;
    dom.authErrorMsg.style.display = 'none';

    if (!email || !password) {
      dom.authErrorMsg.textContent = 'E-posta ve şifre zorunludur.';
      dom.authErrorMsg.style.display = 'block';
      return;
    }

    try {
      if (state.authMode === 'signup') {
        const cred = await window.fb.signUp(email, password);
        const displayName = email.split('@')[0];
        await window.fb.createUserDoc(cred.user.uid, {
          email,
          displayName,
          balanceTRY: STARTING_BALANCE_TRY,
          portfolio: [],
          accountCurrencyVersion: ACCOUNT_CURRENCY_VERSION,
          gems: 100,
          ownedItems: [],
          status: 'active',
          createdAt: window.fb.serverTimestamp()
        });
        await window.fb.createPublicProfile(cred.user.uid, { email, displayName });
      } else {
        await window.fb.signIn(email, password);
      }
      dom.authEmailInput.value = '';
      dom.authPasswordInput.value = '';
      closeModal('modalAuth');
    } catch (err) {
      dom.authErrorMsg.textContent = translateAuthError(err.code);
      dom.authErrorMsg.style.display = 'block';
    }
  }

  function translateAuthError(code) {
    const map = {
      'auth/email-already-in-use': 'Bu e-posta zaten kayıtlı.',
      'auth/invalid-email': 'Geçersiz e-posta adresi.',
      'auth/weak-password': 'Şifre en az 6 karakter olmalı.',
      'auth/invalid-credential': 'E-posta veya şifre hatalı.',
      'auth/user-not-found': 'Kullanıcı bulunamadı.',
      'auth/wrong-password': 'Şifre hatalı.',
      'auth/too-many-requests': 'Çok fazla deneme yapıldı, lütfen biraz bekleyin.'
    };
    return map[code] || 'Bir hata oluştu, lütfen tekrar deneyin.';
  }

  // --- Admin Paneli ---
  async function loadAdminUsers() {
    dom.adminUsersTableBody.innerHTML = '';
    try {
      const snapshot = await window.fb.getAllUsers();
      if (snapshot.empty) {
        dom.adminUsersEmptyState.style.display = 'block';
        return;
      }
      dom.adminUsersEmptyState.style.display = 'none';

      const rows = [];
      snapshot.forEach((docSnap) => {
        const u = docSnap.data();
        const uid = docSnap.id;
        const isSuspended = u.status === 'suspended';
        const createdDate = u.createdAt?.toDate ? u.createdAt.toDate().toLocaleDateString('tr-TR') : '-';

        const portfolioCount = (Array.isArray(u.portfolio) ? u.portfolio : []).length;
        rows.push(`
          <tr data-uid="${uid}">
            <td>
              <div style="font-weight: 600;">${u.displayName || '-'}</div>
              <div style="font-size: 0.78rem; color: var(--text-muted);">${u.email || '-'}</div>
            </td>
            <td>${createdDate}</td>
            <td>
              <input type="number" class="form-control admin-balance-input" data-uid="${uid}" value="${u.balanceTRY ?? 0}" style="width: 140px; padding: 6px 10px;">
            </td>
            <td>
              <span style="padding: 4px 10px; border-radius: 20px; font-size: 0.78rem; font-weight: 600; ${isSuspended ? 'background: rgba(239,68,68,0.15); color:#ef4444;' : 'background: rgba(16,185,129,0.15); color:#10b981;'}">
                ${isSuspended ? 'Askıya Alındı' : 'Aktif'}
              </span>
            </td>
            <td style="white-space: nowrap;">
              <button class="btn-secondary" data-admin-action="view-portfolio" data-uid="${uid}" style="padding: 6px 10px; font-size: 0.78rem; color: #38bdf8;">🛒 Sepet (${portfolioCount})</button>
              <button class="btn-secondary" data-admin-action="save-balance" data-uid="${uid}" style="padding: 6px 10px; font-size: 0.78rem;">💾 Kaydet</button>
              <button class="btn-secondary" data-admin-action="toggle-status" data-uid="${uid}" data-current-status="${u.status || 'active'}" style="padding: 6px 10px; font-size: 0.78rem;">${isSuspended ? '✅ Aktif Et' : '⛔ Askıya Al'}</button>
              <button class="btn-secondary" data-admin-action="delete" data-uid="${uid}" style="padding: 6px 10px; font-size: 0.78rem; color: #ef4444;">🗑️ Sil</button>
            </td>
          </tr>
        `);
      });
      dom.adminUsersTableBody.innerHTML = rows.join('');
    } catch (err) {
      dom.adminUsersTableBody.innerHTML = `<tr><td colspan="5" style="color:#ef4444;">Kullanıcılar yüklenemedi: ${err.message}</td></tr>`;
    }
  }

  async function handleAdminAction(action, uid, rowEl) {
    try {
      if (action === 'view-portfolio') {
        openAdminPortfolioModal(uid);
      } else if (action === 'save-balance') {
        const input = rowEl.querySelector('.admin-balance-input');
        const newBalance = parseFloat(input.value);
        await window.fb.updateUserDoc(uid, { balanceTRY: newBalance });
        loadAdminUsers();
      } else if (action === 'toggle-status') {
        const btn = rowEl.querySelector('[data-admin-action="toggle-status"]');
        const current = btn.dataset.currentStatus;
        const next = current === 'suspended' ? 'active' : 'suspended';
        await window.fb.updateUserDoc(uid, { status: next });
        loadAdminUsers();
      } else if (action === 'delete') {
        if (confirm('Bu kullanıcının Firestore profilini kalıcı olarak silmek istediğinize emin misiniz?')) {
          await window.fb.deleteUserDoc(uid);
          loadAdminUsers();
        }
      }
    } catch (err) {
      alert(`İşlem başarısız: ${err.message}`);
    }
  }

  // --- 🎁 Kozmetik Mağaza Kataloğu (Gerçek Para Değil, Elmas/Gem ile Satın Alınır) ---
  const STORE_ITEMS = [
    { id: 'emoji_bull', emoji: '🐂', name: 'Boğa Rozeti', price: 20, desc: 'Profilinde yükseliş ruh halini yansıt.' },
    { id: 'emoji_bear', emoji: '🐻', name: 'Ayı Rozeti', price: 20, desc: 'Temkinli/düşüş moduna geçenler için.' },
    { id: 'emoji_diamond', emoji: '💎', name: 'Elmas El Rozeti', price: 35, desc: 'Uzun vadeli tutuş disiplinini göster.' },
    { id: 'emoji_rocket', emoji: '🚀', name: 'Roket Rozeti', price: 35, desc: 'Güçlü yükseliş anlarını kutla.' },
    { id: 'emoji_crown', emoji: '👑', name: 'Taç Rozeti', price: 60, desc: 'Liderlik tablosunda öne çıkanlar için.' },
    { id: 'emoji_wizard', emoji: '🧙', name: 'Grafik Büyücüsü', price: 60, desc: 'Teknik analiz tutkunlarına özel.' },
    { id: 'emoji_shield', emoji: '🛡️', name: 'Sağlam Portföy Kalkanı', price: 45, desc: 'Riskten kaçınan, dengeli yatırımcı rozeti.' },
    { id: 'emoji_fire', emoji: '🔥', name: 'Ateşli Seri Rozeti', price: 45, desc: 'Art arda başarılı işlemleri kutla.' },
    { id: 'badge_millionaire', emoji: '🏆', name: 'Efsanevi Yatırımcı', price: null, purchasable: false, desc: 'Sanal portföyünü ₺25.000.000\'a çıkaranlara özel — satın alınamaz, kazanılır.' }
  ];

  const MILLIONAIRE_BADGE_ID = 'badge_millionaire';
  const MILLIONAIRE_THRESHOLD_TRY = 25000000;

  // --- 💎 Elmas Paketleri (Gerçek Para — Ödeme Altyapısı Henüz Bağlı Değil) ---
  const GEM_PACKS = [
    { id: 'pack_starter', gems: 100, bonus: 0, priceTRY: 19.99, label: null },
    { id: 'pack_popular', gems: 300, bonus: 50, priceTRY: 49.99, label: '⭐ En Popüler' },
    { id: 'pack_value', gems: 650, bonus: 150, priceTRY: 89.99, label: '🔥 Fırsat' },
    { id: 'pack_mega', gems: 1500, bonus: 500, priceTRY: 179.99, label: '👑 En Avantajlı' }
  ];

  // --- 💱 Forex Sepeti (Kaldıraçlı Simülasyon) ---
  const FOREX_PAIRS = {
    EURUSD: { label: 'EUR/USD', fallbackRate: 1.08 },
    GBPUSD: { label: 'GBP/USD', fallbackRate: 1.27 },
    USDJPY: { label: 'USD/JPY', fallbackRate: 149.0 },
    USDTRY: { label: 'USD/TRY', fallbackRate: FALLBACK_USD_TRY },
    EURTRY: { label: 'EUR/TRY', fallbackRate: 55.90 }
  };

  async function fetchFxPairRate(pair) {
    if (!state.fxPairRates) state.fxPairRates = {};
    if (state.fxPairRates[pair]) return state.fxPairRates[pair];

    const from = pair.slice(0, 3);
    const to = pair.slice(3, 6);
    try {
      const res = await fetch(`${state.workerUrl}/api/fx/rate?from=${from}&to=${to}`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.rate) {
          state.fxPairRates[pair] = data.rate;
          return data.rate;
        }
      }
    } catch (e) {
      console.warn('Forex kur çekme uyarısı, varsayılan kur kullanılıyor:', e);
    }
    const fallback = (FOREX_PAIRS[pair] || {}).fallbackRate || 1.0;
    state.fxPairRates[pair] = fallback;
    return fallback;
  }

  function calcForexPnlTRY(item, currentRate) {
    const percentMove = ((currentRate - item.entryRate) / item.entryRate) * (item.direction === 'short' ? -1 : 1);
    return item.marginTRY * item.leverage * percentMove;
  }

  // --- Sepetteki BIST/Kripto Varlıkların Canlı Fiyatı (ASSET_UNIVERSE'deki statik
  // örnek fiyatlarla karışıp yanlış kâr/zarar göstermesin diye worker'dan çekilir) ---
  async function fetchLivePrice(symbol, type) {
    try {
      const res = await fetch(`${state.workerUrl}/api/live-price?symbol=${encodeURIComponent(symbol)}&type=${type}`);
      if (res.ok) {
        const data = await res.json();
        if (data && typeof data.price === 'number') return data.price;
      }
    } catch (e) {
      console.warn('Canlı fiyat çekme uyarısı:', e);
    }
    return null;
  }

  // --- Para Birimleri & Canlı Kur Çevrimi ---
  const COUNTRY_CURRENCIES = {
    'TR': { code: 'TRY', symbol: '₺', defaultRate: FALLBACK_USD_TRY },
    'US': { code: 'USD', symbol: '$', defaultRate: 1.00 },
    'DE': { code: 'EUR', symbol: '€', defaultRate: 0.92 },
    'GB': { code: 'GBP', symbol: '£', defaultRate: 0.77 },
    'JP': { code: 'JPY', symbol: '¥', defaultRate: 145.0 },
    'CN': { code: 'CNY', symbol: '¥', defaultRate: 7.15 },
  };

  async function fetchLiveExchangeRate(currencyCode) {
    if (currencyCode === 'USD') return 1.0;
    if (state.liveRates[currencyCode]) return state.liveRates[currencyCode];

    try {
      const res = await fetch(`${state.workerUrl}/api/fx/rate?to=${currencyCode}`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.rate) {
          state.liveRates[currencyCode] = data.rate;
          if (currencyCode === 'TRY') state.usdTryRate = data.rate;
          return data.rate;
        }
      }
    } catch (e) {
      console.warn('Kur çekme uyarısı, varsayılan kur kullanılıyor:', e);
    }

    const match = Object.values(COUNTRY_CURRENCIES).find(c => c.code === currencyCode);
    const rate = match ? match.defaultRate : FALLBACK_USD_TRY;
    state.liveRates[currencyCode] = rate;
    if (currencyCode === 'TRY') state.usdTryRate = rate;
    return rate;
  }

  // --- Sanal hesap TL'dir: BIST/Fon zaten TL, ABD hissesi ve kripto USD fiyatlıdır → kurla TL'ye çevrilir ---
  function isTryAsset(type) {
    return type === 'bist' || type === 'fund';
  }

  function nativeToTry(price, type) {
    return isTryAsset(type) ? price : price * (state.usdTryRate || FALLBACK_USD_TRY);
  }

  function tryToNative(priceTRY, type) {
    return isTryAsset(type) ? priceTRY : priceTRY / (state.usdTryRate || FALLBACK_USD_TRY);
  }

  // Ortalama alış fiyatı varlığın kendi para biriminde gösterilir (BIST/Fon → ₺, ABD/Kripto → $).
  function avgCostNativeOf(item) {
    return typeof item.avgCostNative === 'number' ? item.avgCostNative : tryToNative(item.avgCostTRY, item.type);
  }

  function escapeHtml(text) {
    return String(text).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  }

  function fmtTRY(amount) {
    const abs = Math.abs(amount).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return `${amount < 0 ? '-' : ''}₺${abs}`;
  }

  // --- Kullanıcı Profili ve Portföy Verisi ---
  async function loadUserProfile(user) {
    if (!user) {
      state.userProfile = null;
      renderPortfolioUI();
      renderStoreUI();
      return;
    }

    try {
      const snap = await window.fb.getUserDoc(user.uid);
      if (snap.exists()) {
        const data = snap.data();

        // Eski USD tabanlı hesaplar TL'ye geçişte sıfırlanır: 250.000 TL nakit, boş portföy.
        if (data.accountCurrencyVersion !== ACCOUNT_CURRENCY_VERSION) {
          const resetFields = {
            balanceTRY: STARTING_BALANCE_TRY,
            portfolio: [],
            accountCurrencyVersion: ACCOUNT_CURRENCY_VERSION
          };
          await window.fb.updateUserDoc(user.uid, resetFields);
          Object.assign(data, resetFields);
        }

        state.userProfile = {
          uid: user.uid,
          email: user.email,
          displayName: data.displayName || user.email.split('@')[0],
          balanceTRY: typeof data.balanceTRY === 'number' ? data.balanceTRY : STARTING_BALANCE_TRY,
          portfolio: Array.isArray(data.portfolio) ? data.portfolio : [],
          gems: typeof data.gems === 'number' ? data.gems : 100,
          ownedItems: Array.isArray(data.ownedItems) ? data.ownedItems : [],
          showOnLeaderboard: Boolean(data.showOnLeaderboard),
          autoTradingEnabled: Boolean(data.autoTradingEnabled),
          autoTradingCryptoEnabled: Boolean(data.autoTradingCryptoEnabled),
          autoTradingForexEnabled: Boolean(data.autoTradingForexEnabled),
          status: data.status || 'active',
          localCurrency: data.localCurrency || 'TRY'
        };
      } else {
        const defaultProfile = {
          email: user.email,
          displayName: user.email.split('@')[0],
          balanceTRY: STARTING_BALANCE_TRY,
          portfolio: [],
          accountCurrencyVersion: ACCOUNT_CURRENCY_VERSION,
          gems: 100,
          ownedItems: [],
          showOnLeaderboard: false,
          autoTradingEnabled: false,
          autoTradingCryptoEnabled: false,
          autoTradingForexEnabled: false,
          status: 'active',
          localCurrency: 'TRY',
          createdAt: window.fb.serverTimestamp()
        };
        await window.fb.createUserDoc(user.uid, defaultProfile);
        await window.fb.createPublicProfile(user.uid, { email: user.email, displayName: defaultProfile.displayName });
        state.userProfile = { uid: user.uid, ...defaultProfile };
      }
    } catch (err) {
      console.warn('Kullanıcı profili okunurken hata veya offline mod:', err);
      state.userProfile = {
        uid: user.uid,
        email: user.email,
        displayName: user.email.split('@')[0],
        balanceTRY: STARTING_BALANCE_TRY,
        portfolio: [],
        gems: 100,
        ownedItems: [],
        showOnLeaderboard: false,
        autoTradingEnabled: false,
        autoTradingCryptoEnabled: false,
        autoTradingForexEnabled: false,
        status: 'active',
        localCurrency: 'TRY'
      };
    }

    renderPortfolioUI();
    renderStoreUI();
  }

  function getCurrentAssetPrice(symbol) {
    if (state.activeAsset && state.activeAsset.symbol === symbol && state.activeAsset.price) {
      return state.activeAsset.price;
    }
    const match = ASSET_UNIVERSE.find(a => a.symbol === symbol);
    if (match) return match.basePrice;
    return 100.0;
  }

  // --- Sepete Ekleme Modalı Mantığı ---
  let currentModalAsset = null;

  function openAddToBasketModal(asset = null) {
    if (!state.currentUser) {
      openModal('modalAuth');
      return;
    }

    const targetAsset = asset || state.activeAsset;
    if (!targetAsset) return;

    currentModalAsset = targetAsset;
    const currentPrice = targetAsset.price || targetAsset.basePrice || 100.0;

    dom.basketModalSymbolBadge.textContent = targetAsset.symbol;
    dom.basketModalAssetName.textContent = targetAsset.name;
    dom.basketModalAssetType.textContent = assetTypeLabel(targetAsset.type);
    dom.basketModalMarketPrice.textContent = `${currencySymbolFor(targetAsset.type)}${currentPrice.toFixed(2)}`;

    const priceLabel = document.getElementById('basketPriceLabel');
    if (priceLabel) priceLabel.textContent = `Birim Alış Fiyatı (${currencySymbolFor(targetAsset.type) === '₺' ? 'TL' : 'USD'})`;

    dom.basketInputShares.value = '1';
    dom.basketInputPrice.value = currentPrice.toFixed(2);
    dom.basketErrorMsg.style.display = 'none';

    updateBasketCalculations();
    openModal('modalAddToBasket');
  }

  function updateBasketCalculations() {
    const shares = parseFloat(dom.basketInputShares.value) || 0;
    const price = parseFloat(dom.basketInputPrice.value) || 0;
    const priceTRY = nativeToTry(price, currentModalAsset?.type);
    const totalCost = shares * priceTRY;
    const userCash = state.userProfile ? state.userProfile.balanceTRY : STARTING_BALANCE_TRY;
    const remaining = userCash - totalCost;

    if (isTryAsset(currentModalAsset?.type)) {
      dom.basketCalcTotalCost.textContent = fmtTRY(totalCost);
    } else {
      // ABD hissesi / kripto: dolar tutarı ve hesaptan düşecek TL karşılığı birlikte gösterilir
      const totalUSD = shares * price;
      dom.basketCalcTotalCost.textContent = `$${totalUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (≈ ${fmtTRY(totalCost)})`;
    }
    dom.basketAvailableCash.textContent = fmtTRY(userCash);
    dom.basketRemainingCash.textContent = fmtTRY(remaining);

    if (remaining < 0) {
      dom.basketRemainingCash.style.color = '#ef4444';
      dom.basketErrorMsg.textContent = `Yetersiz sanal bakiye! Bu alım için ${fmtTRY(Math.abs(remaining))} daha bakiyeye ihtiyacınız var.`;
      dom.basketErrorMsg.style.display = 'block';
      dom.btnConfirmAddToBasket.disabled = true;
      dom.btnConfirmAddToBasket.style.opacity = '0.5';
    } else {
      dom.basketRemainingCash.style.color = 'var(--text-secondary)';
      dom.basketErrorMsg.style.display = 'none';
      dom.btnConfirmAddToBasket.disabled = false;
      dom.btnConfirmAddToBasket.style.opacity = '1';
    }
  }

  async function confirmAddToBasket() {
    if (!state.currentUser || !state.userProfile || !currentModalAsset) return;

    const shares = parseFloat(dom.basketInputShares.value);
    const price = parseFloat(dom.basketInputPrice.value);
    if (!shares || shares <= 0 || !price || price <= 0) {
      dom.basketErrorMsg.textContent = 'Lütfen geçerli bir adet ve fiyat giriniz.';
      dom.basketErrorMsg.style.display = 'block';
      return;
    }

    const priceTRY = nativeToTry(price, currentModalAsset.type);
    const totalCost = shares * priceTRY;
    if (totalCost > state.userProfile.balanceTRY) {
      dom.basketErrorMsg.textContent = 'Yetersiz bakiye.';
      dom.basketErrorMsg.style.display = 'block';
      return;
    }

    dom.btnConfirmAddToBasket.disabled = true;
    dom.btnConfirmAddToBasket.textContent = 'İşleniyor...';

    try {
      const portfolio = [...state.userProfile.portfolio];
      const existingIdx = portfolio.findIndex(p => p.symbol === currentModalAsset.symbol);

      if (existingIdx >= 0) {
        const existing = portfolio[existingIdx];
        const newShares = existing.shares + shares;
        const newAvgCost = ((existing.shares * existing.avgCostTRY) + (shares * priceTRY)) / newShares;
        const newAvgCostNative = ((existing.shares * avgCostNativeOf(existing)) + (shares * price)) / newShares;
        portfolio[existingIdx] = {
          ...existing,
          shares: Number(newShares.toFixed(4)),
          avgCostTRY: Number(newAvgCost.toFixed(6)),
          avgCostNative: Number(newAvgCostNative.toFixed(8)),
          lastUpdated: new Date().toISOString()
        };
      } else {
        portfolio.push({
          symbol: currentModalAsset.symbol,
          name: currentModalAsset.name,
          type: currentModalAsset.type || 'stock',
          shares: Number(shares.toFixed(4)),
          avgCostTRY: Number(priceTRY.toFixed(6)),
          avgCostNative: Number(price.toFixed(8)),
          addedAt: new Date().toISOString()
        });
      }

      const newBalance = Number((state.userProfile.balanceTRY - totalCost).toFixed(2));
      state.userProfile.portfolio = portfolio;
      state.userProfile.balanceTRY = newBalance;

      await window.fb.updateUserDoc(state.currentUser.uid, {
        portfolio,
        balanceTRY: newBalance
      });

      closeModal('modalAddToBasket');
      renderPortfolioUI();
      alert(`✅ ${shares} adet ${currentModalAsset.symbol} başarıyla sepetinize eklendi!`);
    } catch (err) {
      dom.basketErrorMsg.textContent = `Hata: ${err.message}`;
      dom.basketErrorMsg.style.display = 'block';
    } finally {
      dom.btnConfirmAddToBasket.disabled = false;
      dom.btnConfirmAddToBasket.textContent = '🛒 Sepete Ekle & Satın Al';
    }
  }

  // --- Sepetten Satış Modalı Mantığı ---
  let currentSellItem = null;

  function openSellFromBasketModal(symbol) {
    if (!state.currentUser || !state.userProfile) return;
    const item = state.userProfile.portfolio.find(p => p.symbol === symbol);
    if (!item) return;

    currentSellItem = item;
    const currentPrice = getCurrentAssetPrice(item.symbol);

    dom.sellModalSymbolBadge.textContent = item.symbol;
    dom.sellModalAssetName.textContent = item.name;
    dom.sellModalCurrentShares.textContent = item.shares;
    dom.sellModalMarketPrice.textContent = `${currencySymbolFor(item.type)}${currentPrice.toFixed(2)}`;
    dom.sellModalAvgCostDisplay.textContent = `${currencySymbolFor(item.type)}${avgCostNativeOf(item).toFixed(2)}`;

    dom.sellInputShares.value = item.shares.toString();
    dom.sellInputShares.max = item.shares.toString();
    dom.sellErrorMsg.style.display = 'none';

    updateSellCalculations();
    openModal('modalSellFromBasket');
  }

  function updateSellCalculations() {
    if (!currentSellItem) return;
    const sharesToSell = parseFloat(dom.sellInputShares.value) || 0;
    const currentPrice = getCurrentAssetPrice(currentSellItem.symbol);
    const currentPriceTRY = nativeToTry(currentPrice, currentSellItem.type);
    const returnTRY = sharesToSell * currentPriceTRY;
    const costBasis = sharesToSell * currentSellItem.avgCostTRY;
    const profitLoss = returnTRY - costBasis;
    const profitPct = costBasis > 0 ? (profitLoss / costBasis) * 100 : 0;

    dom.sellCalcReturnTRY.textContent = `${fmtTRY(returnTRY)}`;
    
    const sign = profitLoss >= 0 ? '+' : '';
    dom.sellCalcProfitLossDisplay.textContent = `${sign}${fmtTRY(profitLoss)} (${sign}${profitPct.toFixed(2)}%)`;
    dom.sellCalcProfitLossDisplay.style.color = profitLoss >= 0 ? '#10b981' : '#ef4444';

    if (sharesToSell <= 0 || sharesToSell > currentSellItem.shares) {
      dom.sellErrorMsg.textContent = `Lütfen 0 ile ${currentSellItem.shares} arasında bir adet girin.`;
      dom.sellErrorMsg.style.display = 'block';
      dom.btnConfirmSell.disabled = true;
      dom.btnConfirmSell.style.opacity = '0.5';
    } else {
      dom.sellErrorMsg.style.display = 'none';
      dom.btnConfirmSell.disabled = false;
      dom.btnConfirmSell.style.opacity = '1';
    }
  }

  async function confirmSellFromBasket() {
    if (!state.currentUser || !state.userProfile || !currentSellItem) return;
    const sharesToSell = parseFloat(dom.sellInputShares.value);
    if (!sharesToSell || sharesToSell <= 0 || sharesToSell > currentSellItem.shares) {
      dom.sellErrorMsg.textContent = 'Geçersiz satış miktarı.';
      dom.sellErrorMsg.style.display = 'block';
      return;
    }

    dom.btnConfirmSell.disabled = true;
    dom.btnConfirmSell.textContent = 'Satış İşleniyor...';

    try {
      const currentPrice = getCurrentAssetPrice(currentSellItem.symbol);
      const currentPriceTRY = nativeToTry(currentPrice, currentSellItem.type);
      const returnTRY = Number((sharesToSell * currentPriceTRY).toFixed(2));
      let portfolio = [...state.userProfile.portfolio];

      if (sharesToSell >= currentSellItem.shares) {
        portfolio = portfolio.filter(p => p.symbol !== currentSellItem.symbol);
      } else {
        const idx = portfolio.findIndex(p => p.symbol === currentSellItem.symbol);
        if (idx >= 0) {
          portfolio[idx] = {
            ...portfolio[idx],
            shares: Number((portfolio[idx].shares - sharesToSell).toFixed(4)),
            lastUpdated: new Date().toISOString()
          };
        }
      }

      const newBalance = Number((state.userProfile.balanceTRY + returnTRY).toFixed(2));
      state.userProfile.portfolio = portfolio;
      state.userProfile.balanceTRY = newBalance;

      await window.fb.updateUserDoc(state.currentUser.uid, {
        portfolio,
        balanceTRY: newBalance
      });

      closeModal('modalSellFromBasket');
      renderPortfolioUI();
      alert(`✅ ${sharesToSell} adet ${currentSellItem.symbol} satıldı. ${fmtTRY(returnTRY)} nakit bakiyenize eklendi!`);
    } catch (err) {
      dom.sellErrorMsg.textContent = `Hata: ${err.message}`;
      dom.sellErrorMsg.style.display = 'block';
    } finally {
      dom.btnConfirmSell.disabled = false;
      dom.btnConfirmSell.textContent = '💰 Satışı Onayla & Nakde Çevir';
    }
  }

  // --- 💱 Forex Sepeti (Kaldıraçlı Simülasyon) ---
  async function openForexPosition() {
    if (!state.currentUser || !state.userProfile) {
      alert('Forex pozisyonu açmak için giriş yapmalısınız.');
      return;
    }

    const pair = dom.forexPairSelect.value;
    const direction = dom.forexDirectionSelect.value;
    const leverage = Number(dom.forexLeverageSelect.value);
    const marginTRY = Number(dom.forexMarginInput.value);
    const balanceTRY = state.userProfile.balanceTRY || 0;

    if (!marginTRY || marginTRY < 100) {
      alert('Lütfen en az ₺100 marj girin.');
      return;
    }
    if (marginTRY > balanceTRY) {
      alert('Yetersiz sanal bakiye.');
      return;
    }

    dom.btnOpenForexPosition.disabled = true;
    dom.btnOpenForexPosition.textContent = 'Açılıyor...';
    try {
      const entryRate = await fetchFxPairRate(pair);
      delete state.fxPairRates[pair]; // Bir sonraki taze çekim için önbelleği temizle

      const newItem = {
        id: `fx_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        symbol: pair,
        type: 'forex',
        direction,
        leverage,
        marginTRY,
        entryRate,
        openedAt: new Date().toISOString()
      };

      const portfolio = [...(state.userProfile.portfolio || []), newItem];
      const newBalance = Number((balanceTRY - marginTRY).toFixed(2));

      await window.fb.updateUserDoc(state.currentUser.uid, { portfolio, balanceTRY: newBalance });
      state.userProfile.portfolio = portfolio;
      state.userProfile.balanceTRY = newBalance;

      renderPortfolioUI();
      alert(`✅ ${FOREX_PAIRS[pair].label} paritesinde ${leverage}x kaldıraçlı ${direction === 'short' ? 'Sat' : 'Al'} pozisyonu açıldı. Giriş kuru: ${entryRate.toFixed(4)}`);
    } catch (err) {
      alert(`Pozisyon açılamadı: ${err.message}`);
    } finally {
      dom.btnOpenForexPosition.disabled = false;
      dom.btnOpenForexPosition.textContent = 'Pozisyon Aç';
    }
  }

  async function closeForexPosition(id) {
    if (!state.currentUser || !state.userProfile) return;
    const portfolio = state.userProfile.portfolio || [];
    const idx = portfolio.findIndex(p => p.id === id);
    if (idx < 0) return;

    const item = portfolio[idx];
    if (!confirm(`${FOREX_PAIRS[item.symbol]?.label || item.symbol} pozisyonunu kapatmak istediğinize emin misiniz?`)) return;

    try {
      delete state.fxPairRates[item.symbol]; // Kapanışta taze kur al
      const currentRate = await fetchFxPairRate(item.symbol);
      const pnlTRY = calcForexPnlTRY(item, currentRate);
      const returnTRY = Math.max(0, item.marginTRY + pnlTRY);

      const newPortfolio = portfolio.filter((_, i) => i !== idx);
      const newBalance = Number((state.userProfile.balanceTRY + returnTRY).toFixed(2));

      await window.fb.updateUserDoc(state.currentUser.uid, { portfolio: newPortfolio, balanceTRY: newBalance });
      state.userProfile.portfolio = newPortfolio;
      state.userProfile.balanceTRY = newBalance;

      renderPortfolioUI();
      const sign = pnlTRY >= 0 ? '+' : '';
      alert(`✅ Pozisyon kapatıldı. Sonuç: ${sign}${fmtTRY(pnlTRY)}. ${fmtTRY(returnTRY)} nakit bakiyenize eklendi.`);
    } catch (err) {
      alert(`Pozisyon kapatılamadı: ${err.message}`);
    }
  }

  // --- Portföy ve Sepetim Ekranı Render Mantığı ---
  async function renderPortfolioUI() {
    if (!dom.portfolioGuestState) return;

    if (!state.currentUser) {
      dom.portfolioGuestState.style.display = 'block';
      dom.portfolioUserState.style.display = 'none';
      return;
    }

    dom.portfolioGuestState.style.display = 'none';
    dom.portfolioUserState.style.display = 'block';

    if (dom.autoTradingCheckbox) {
      dom.autoTradingCheckbox.checked = Boolean(state.userProfile.autoTradingEnabled);
    }
    if (dom.autoTradingCryptoCheckbox) {
      dom.autoTradingCryptoCheckbox.checked = Boolean(state.userProfile.autoTradingCryptoEnabled);
    }
    if (dom.autoTradingForexCheckbox) {
      dom.autoTradingForexCheckbox.checked = Boolean(state.userProfile.autoTradingForexEnabled);
    }

    const profile = state.userProfile || { balanceTRY: STARTING_BALANCE_TRY, portfolio: [] };
    const cashTRY = profile.balanceTRY || 0;
    const portfolio = profile.portfolio || [];

    let totalAssetValueTRY = 0;
    let totalCostBasisTRY = 0;

    const forexItemsList = portfolio.filter(p => p.type === 'forex');
    const uniqueForexPairs = [...new Set(forexItemsList.map(p => p.symbol))];
    const forexRateEntries = await Promise.all(uniqueForexPairs.map(async pair => [pair, await fetchFxPairRate(pair)]));
    const forexRates = Object.fromEntries(forexRateEntries);

    const liveHoldingItems = portfolio.filter(p => p.type === 'bist' || p.type === 'crypto');
    const uniqueHoldingKeys = [...new Set(liveHoldingItems.map(p => `${p.type}:${p.symbol}`))];
    const livePriceEntries = await Promise.all(uniqueHoldingKeys.map(async key => {
      const [type, symbol] = key.split(':');
      return [key, await fetchLivePrice(symbol, type)];
    }));
    const livePrices = Object.fromEntries(livePriceEntries);

    function buildForexRow(item) {
      const currentRate = forexRates[item.symbol] || item.entryRate;
      const pnlTRY = calcForexPnlTRY(item, currentRate);
      const currentValueTRY = Math.max(0, item.marginTRY + pnlTRY);
      const pnlPct = item.marginTRY > 0 ? (pnlTRY / item.marginTRY) * 100 : 0;
      const isProfitable = pnlTRY >= 0;
      const sign = isProfitable ? '+' : '';
      const pairInfo = FOREX_PAIRS[item.symbol] || { label: item.symbol };

      totalAssetValueTRY += currentValueTRY;
      totalCostBasisTRY += item.marginTRY;

      return `
        <tr>
          <td style="font-weight: 700; color: #fff;">
            ${pairInfo.label}
            ${item.managedByBot ? '<span title="AI Sepet Botu tarafından yönetiliyor" style="font-size: 0.7rem; background: rgba(6,182,212,0.15); color: var(--color-primary); padding: 2px 6px; border-radius: 10px; margin-left: 4px;">🤖 Bot</span>' : ''}
          </td>
          <td>${item.direction === 'short' ? '📉 Sat' : '📈 Al'}</td>
          <td style="font-weight: 600;">${item.leverage}x</td>
          <td>${item.entryRate.toFixed(4)}</td>
          <td style="font-weight: 600;">${currentRate.toFixed(4)}</td>
          <td>${fmtTRY(item.marginTRY)}</td>
          <td>
            <span class="change-pill ${isProfitable ? 'bullish' : 'bearish'}">
              ${sign}${fmtTRY(pnlTRY)} (${sign}${pnlPct.toFixed(2)}%)
            </span>
          </td>
          <td style="text-align: right; white-space: nowrap;">
            <button class="btn-secondary" data-forex-action="close" data-forex-id="${item.id}" style="padding: 5px 10px; font-size: 0.75rem; color: #ef4444;">✕ Kapat</button>
          </td>
        </tr>
      `;
    }

    function buildRow(item) {
      const livePrice = livePrices[`${item.type}:${item.symbol}`];
      const curPrice = (typeof livePrice === 'number') ? livePrice : getCurrentAssetPrice(item.symbol);
      const curPriceTRY = nativeToTry(curPrice, item.type);
      const marketVal = item.shares * curPriceTRY;
      const costVal = item.shares * item.avgCostTRY;
      const profitVal = marketVal - costVal;
      const profitPct = costVal > 0 ? (profitVal / costVal) * 100 : 0;
      const isProfitable = profitVal >= 0;
      const sign = isProfitable ? '+' : '';

      totalAssetValueTRY += marketVal;
      totalCostBasisTRY += costVal;

      return `
        <tr>
          <td>
            <div style="font-weight: 700; font-size: 0.95rem; color: #fff;">
              ${item.symbol}
              ${item.managedByBot ? '<span title="AI Sepet Botu tarafından yönetiliyor" style="font-size: 0.7rem; background: rgba(6,182,212,0.15); color: var(--color-primary); padding: 2px 6px; border-radius: 10px; margin-left: 4px;">🤖 Bot</span>' : ''}
            </div>
            <div style="font-size: 0.78rem; color: var(--text-muted);">${item.name}</div>
          </td>
          <td style="font-weight: 600;">${item.shares}</td>
          <td>${currencySymbolFor(item.type)}${avgCostNativeOf(item).toFixed(2)}</td>
          <td style="font-weight: 600;">${currencySymbolFor(item.type)}${curPrice.toFixed(2)}</td>
          <td style="font-weight: 700; color: #fff;">${fmtTRY(marketVal)}</td>
          <td>
            <span class="change-pill ${isProfitable ? 'bullish' : 'bearish'}">
              ${sign}${fmtTRY(profitVal)} (${sign}${profitPct.toFixed(2)}%)
            </span>
          </td>
          <td style="text-align: right; white-space: nowrap;">
            <button class="btn-secondary" data-portfolio-action="chart" data-symbol="${item.symbol}" style="padding: 5px 10px; font-size: 0.75rem; margin-right: 4px;">📊 Grafik</button>
            <button class="btn-secondary" data-portfolio-action="buy-more" data-symbol="${item.symbol}" style="padding: 5px 10px; font-size: 0.75rem; margin-right: 4px; color: var(--color-primary);">🛒 Ekle</button>
            <button class="btn-secondary" data-portfolio-action="sell" data-symbol="${item.symbol}" style="padding: 5px 10px; font-size: 0.75rem; color: #ef4444;">💰 Sat</button>
          </td>
        </tr>
      `;
    }

    const stockItems = portfolio.filter(p => p.type === 'bist' || p.type === 'stock');
    const cryptoItems = portfolio.filter(p => p.type === 'crypto');
    const fundItems = portfolio.filter(p => p.type === 'fund');
    const forexItems = forexItemsList;

    const stockRows = stockItems.map(buildRow);
    const cryptoRows = cryptoItems.map(buildRow);
    const fundRows = fundItems.map(buildRow);
    const forexRows = forexItems.map(buildForexRow);

    const totalPortfolioTRY = cashTRY + totalAssetValueTRY;
    const totalProfitTRY = totalPortfolioTRY - STARTING_BALANCE_TRY;
    const totalProfitPct = (totalProfitTRY / STARTING_BALANCE_TRY) * 100;
    const isOverallProfit = totalProfitTRY >= 0;
    const sign = isOverallProfit ? '+' : '';

    dom.portfolioTotalValueTRY.textContent = `${fmtTRY(totalPortfolioTRY)}`;
    
    // Canlı kurla karşılık: Türkiye'de dolar karşılığı, diğer bölgelerde o bölgenin para birimi gösterilir
    const currentCountry = state.currentRegion || 'TR';
    const currencyInfo = (currentCountry === 'TR' ? null : COUNTRY_CURRENCIES[currentCountry]) || COUNTRY_CURRENCIES['US'];
    const usdTry = await fetchLiveExchangeRate('TRY');
    const rate = await fetchLiveExchangeRate(currencyInfo.code); // 1 USD = rate birim
    const localVal = (totalPortfolioTRY / usdTry) * rate;
    dom.portfolioTotalValueLocal.textContent = `≈ ${localVal.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} ${currencyInfo.symbol} (${currencyInfo.code})`;

    dom.portfolioCashTRY.textContent = `${fmtTRY(cashTRY)}`;
    dom.portfolioProfitLossTRY.textContent = `${sign}${fmtTRY(totalProfitTRY)}`;
    dom.portfolioProfitLossTRY.style.color = isOverallProfit ? '#10b981' : '#ef4444';
    dom.portfolioProfitLossPct.textContent = `${sign}${totalProfitPct.toFixed(2)}%`;
    dom.portfolioProfitLossPct.style.color = isOverallProfit ? '#10b981' : '#ef4444';
    dom.portfolioAssetCount.textContent = `${portfolio.length} Varlık`;

    checkMillionaireMilestone(totalPortfolioTRY);
    syncLeaderboardEntry(totalPortfolioTRY, totalProfitPct);

    if (portfolio.length === 0) {
      dom.portfolioEmptyState.style.display = 'block';
      dom.portfolioTableContainer.style.display = 'none';
    } else {
      dom.portfolioEmptyState.style.display = 'none';
      dom.portfolioTableContainer.style.display = 'block';

      dom.portfolioStockCount.textContent = stockItems.length;
      dom.portfolioCryptoCount.textContent = cryptoItems.length;
      dom.portfolioFundCount.textContent = fundItems.length;
      dom.portfolioForexCount.textContent = forexItems.length;

      dom.portfolioGroupStock.style.display = stockItems.length ? 'block' : 'none';
      dom.portfolioGroupCrypto.style.display = cryptoItems.length ? 'block' : 'none';
      dom.portfolioGroupFund.style.display = fundItems.length ? 'block' : 'none';
      dom.portfolioGroupForex.style.display = forexItems.length ? 'block' : 'none';

      dom.portfolioStockTableBody.innerHTML = stockRows.join('');
      dom.portfolioCryptoTableBody.innerHTML = cryptoRows.join('');
      dom.portfolioFundTableBody.innerHTML = fundRows.join('');
      dom.portfolioForexTableBody.innerHTML = forexRows.join('');
    }
  }

  // --- 📸 Kazanç Ekran Görüntüsü / Paylaşım Kartı ---
  function generateShareCard() {
    if (!state.userProfile) return;

    const profile = state.userProfile;
    const portfolio = profile.portfolio || [];
    let assetValueTRY = 0;
    portfolio.forEach(item => {
      if (item.type === 'forex') {
        const currentRate = (state.fxPairRates && state.fxPairRates[item.symbol]) || item.entryRate;
        assetValueTRY += Math.max(0, item.marginTRY + calcForexPnlTRY(item, currentRate));
        return;
      }
      const curPrice = getCurrentAssetPrice(item.symbol);
      assetValueTRY += item.shares * nativeToTry(curPrice, item.type);
    });
    const totalTRY = (profile.balanceTRY || 0) + assetValueTRY;
    const profitTRY = totalTRY - STARTING_BALANCE_TRY;
    const profitPct = (profitTRY / STARTING_BALANCE_TRY) * 100;
    const isProfit = profitTRY >= 0;

    const canvas = dom.shareCardCanvas;
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;

    // Arka plan
    const bgGradient = ctx.createLinearGradient(0, 0, 0, H);
    bgGradient.addColorStop(0, '#0d1322');
    bgGradient.addColorStop(1, '#070a12');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, W, H);

    // Marka
    ctx.fillStyle = '#06b6d4';
    ctx.font = 'bold 44px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('📈 TrendVest', 60, 110);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '24px sans-serif';
    ctx.fillText('Sanal Portföy Performansı', 60, 150);

    // Kullanıcı
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '26px sans-serif';
    ctx.fillText(profile.displayName || profile.email || 'Yatırımcı', 60, 210);

    // Toplam değer
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 90px monospace';
    ctx.fillText(`${fmtTRY(totalTRY)}`, 60, 350);

    // Kâr/Zarar rozeti
    const sign = isProfit ? '+' : '';
    ctx.fillStyle = isProfit ? '#10b981' : '#ef4444';
    ctx.font = 'bold 52px monospace';
    ctx.fillText(`${sign}${fmtTRY(profitTRY)} (${sign}${profitPct.toFixed(2)}%)`, 60, 430);

    // Ayraç
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.beginPath();
    ctx.moveTo(60, 490);
    ctx.lineTo(W - 60, 490);
    ctx.stroke();

    // Alt bilgiler
    ctx.fillStyle = '#94a3b8';
    ctx.font = '28px sans-serif';
    ctx.fillText(`🧺 ${portfolio.length} Pozisyon`, 60, 560);
    ctx.fillText(`📅 ${new Date().toLocaleDateString('tr-TR')}`, 60, 610);

    // Yasal uyarı (görselde de taşınmalı)
    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 24px sans-serif';
    wrapText(ctx, '⚠️ Bu görsel simüle sanal portföy sonucudur. Yatırım tavsiyesi veya gerçek finansal kazanç kanıtı değildir.', 60, H - 140, W - 120, 32);

    ctx.fillStyle = '#475569';
    ctx.font = '22px sans-serif';
    ctx.fillText('trendvest.app — Global Market & AI Analytics', 60, H - 50);

    dom.btnDownloadShareCard.href = canvas.toDataURL('image/png');
  }

  function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
    const words = text.split(' ');
    let line = '';
    let curY = y;
    for (const word of words) {
      const testLine = line + word + ' ';
      if (ctx.measureText(testLine).width > maxWidth && line !== '') {
        ctx.fillText(line, x, curY);
        line = word + ' ';
        curY += lineHeight;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, x, curY);
  }

  // --- Admin Paneli: Kullanıcı Sepeti İnceleme ---
  async function openAdminPortfolioModal(uid) {
    try {
      const snap = await window.fb.getUserDoc(uid);
      if (!snap.exists()) {
        alert('Kullanıcı bulunamadı.');
        return;
      }
      const u = snap.data();
      const portfolio = Array.isArray(u.portfolio) ? u.portfolio : [];
      const cash = u.balanceTRY ?? STARTING_BALANCE_TRY;

      dom.adminPortfolioUserEmail.textContent = u.email || uid;
      dom.adminPortfolioUserCash.textContent = fmtTRY(cash);

      let totalVal = cash;
      const rows = portfolio.map(item => {
        const curPrice = getCurrentAssetPrice(item.symbol);
        const curPriceTRY = nativeToTry(curPrice, item.type);
        const mVal = item.shares * curPriceTRY;
        const cVal = item.shares * item.avgCostTRY;
        const pVal = mVal - cVal;
        const pPct = cVal > 0 ? (pVal / cVal) * 100 : 0;
        const isProf = pVal >= 0;
        const sign = isProf ? '+' : '';
        totalVal += mVal;

        return `
          <tr>
            <td><strong>${item.symbol}</strong> <span style="font-size:0.75rem; color:var(--text-muted);">(${item.name})</span></td>
            <td>${item.shares}</td>
            <td>${currencySymbolFor(item.type)}${avgCostNativeOf(item).toFixed(2)}</td>
            <td>${currencySymbolFor(item.type)}${curPrice.toFixed(2)}</td>
            <td style="font-weight:600;">${fmtTRY(mVal)}</td>
            <td style="color: ${isProf ? '#10b981' : '#ef4444'}; font-weight:600;">${sign}${fmtTRY(pVal)} (${sign}${pPct.toFixed(1)}%)</td>
          </tr>
        `;
      });

      dom.adminPortfolioUserTotal.textContent = fmtTRY(totalVal);

      if (portfolio.length === 0) {
        dom.adminPortfolioEmptyState.style.display = 'block';
        dom.adminPortfolioTableContainer.style.display = 'none';
      } else {
        dom.adminPortfolioEmptyState.style.display = 'none';
        dom.adminPortfolioTableContainer.style.display = 'block';
        dom.adminPortfolioTableBody.innerHTML = rows.join('');
      }

      openModal('modalAdminPortfolio');
    } catch (err) {
      alert(`Portföy yüklenirken hata: ${err.message}`);
    }
  }

  // --- 🎁 Kozmetik Mağaza & Hediyeleşme ---
  function renderStoreUI() {
    if (!dom.storeGuestState) return;

    if (!state.currentUser || !state.userProfile) {
      dom.storeGuestState.style.display = 'block';
      dom.storeUserState.style.display = 'none';
      return;
    }

    dom.storeGuestState.style.display = 'none';
    dom.storeUserState.style.display = 'block';

    const gems = state.userProfile.gems || 0;
    const owned = state.userProfile.ownedItems || [];
    dom.storeGemBalance.textContent = gems;

    dom.gemPacksGrid.innerHTML = GEM_PACKS.map(pack => {
      const totalGems = pack.gems + pack.bonus;
      const perGem = pack.priceTRY / totalGems;
      return `
        <div class="store-card" style="${pack.label ? 'border-color: rgba(245,158,11,0.5);' : ''}">
          <div class="ai-pick-card-top">
            <span class="asset-card-symbol">💎 ${totalGems.toLocaleString('tr-TR')} Elmas</span>
            ${pack.label ? `<span class="ai-pick-score-badge" style="background: rgba(245,158,11,0.15); color: #fbbf24;">${pack.label}</span>` : ''}
          </div>
          ${pack.bonus > 0 ? `<p class="ai-pick-highlight-text">${pack.gems} + <strong style="color:#34d399;">${pack.bonus} bonus</strong> elmas</p>` : ''}
          <p style="font-size: 0.72rem; color: var(--text-muted); margin-top: 4px;">Elmas başına ≈ ₺${perGem.toFixed(3)}</p>
          <button class="btn-primary" data-store-action="buy-gems" data-pack-id="${pack.id}" style="width: 100%; margin-top: 10px; padding: 8px;">₺${pack.priceTRY.toFixed(2)}</button>
        </div>
      `;
    }).join('');

    dom.storeItemsGrid.innerHTML = STORE_ITEMS.filter(item => item.purchasable !== false).map(item => {
      const ownedCount = owned.filter(id => id === item.id).length;
      const canAfford = gems >= item.price;
      return `
        <div class="store-card">
          <div class="ai-pick-card-top">
            <div>
              <span class="asset-card-symbol">${item.emoji} ${item.name}</span>
              ${ownedCount > 0 ? `<div class="asset-card-name">Sahipsin: ${ownedCount} adet</div>` : ''}
            </div>
            <span class="ai-pick-score-badge">💎 ${item.price}</span>
          </div>
          <p class="ai-pick-highlight-text">${item.desc}</p>
          <button class="btn-primary" data-store-action="buy" data-item-id="${item.id}" style="width: 100%; margin-top: 10px; padding: 8px; ${canAfford ? '' : 'opacity: 0.5;'}" ${canAfford ? '' : 'disabled'}>
            ${canAfford ? '💎 Satın Al' : 'Yetersiz Elmas'}
          </button>
        </div>
      `;
    }).join('');

    if (owned.length === 0) {
      dom.storeOwnedEmptyState.style.display = 'block';
      dom.storeOwnedGrid.innerHTML = '';
    } else {
      dom.storeOwnedEmptyState.style.display = 'none';
      const uniqueOwned = [...new Set(owned)];
      dom.storeOwnedGrid.innerHTML = uniqueOwned.map(itemId => {
        const item = STORE_ITEMS.find(i => i.id === itemId);
        if (!item) return '';
        const count = owned.filter(id => id === itemId).length;
        const isTransferable = item.purchasable !== false;
        return `
          <div class="store-card">
            <div class="ai-pick-card-top">
              <span class="asset-card-symbol">${item.emoji} ${item.name}</span>
              <span class="ai-pick-score-badge">x${count}</span>
            </div>
            ${isTransferable
              ? `<button class="btn-secondary" data-store-action="gift" data-item-id="${item.id}" style="width: 100%; margin-top: 10px; padding: 8px;">🎁 Hediye Gönder</button>`
              : `<div style="width: 100%; margin-top: 10px; padding: 8px; text-align: center; font-size: 0.78rem; color: var(--text-muted);">🔒 Kazanılan rozet, devredilemez</div>`}
          </div>
        `;
      }).join('');
    }

    loadIncomingGifts();
  }

  // --- 🏆 ₺25.000.000 Hedefi: Otomatik Rozet & Statü ---
  let millionaireCheckInFlight = false;

  async function checkMillionaireMilestone(totalPortfolioTRY) {
    if (!dom.millionaireBanner || !state.userProfile) return;

    const alreadyOwned = (state.userProfile.ownedItems || []).includes(MILLIONAIRE_BADGE_ID);

    if (alreadyOwned) {
      dom.millionaireBanner.style.display = 'flex';
      return;
    }

    if (totalPortfolioTRY < MILLIONAIRE_THRESHOLD_TRY || millionaireCheckInFlight) {
      dom.millionaireBanner.style.display = 'none';
      return;
    }

    millionaireCheckInFlight = true;
    try {
      const newOwned = [...(state.userProfile.ownedItems || []), MILLIONAIRE_BADGE_ID];
      await window.fb.updateUserDoc(state.currentUser.uid, { ownedItems: newOwned });
      state.userProfile.ownedItems = newOwned;
      dom.millionaireBanner.style.display = 'flex';
      alert('🏆 Tebrikler! Sanal portföyünü ₺25.000.000\'a çıkardın ve "Efsanevi Yatırımcı" rozetini kazandın!');
    } catch (err) {
      console.warn('Efsanevi Yatırımcı rozeti verilemedi:', err);
    } finally {
      millionaireCheckInFlight = false;
    }
  }

  async function buyStoreItem(itemId) {
    const item = STORE_ITEMS.find(i => i.id === itemId);
    if (!item || !state.userProfile) return;

    const gems = state.userProfile.gems || 0;
    if (gems < item.price) {
      alert('Yetersiz elmas bakiyesi.');
      return;
    }

    try {
      const newGems = gems - item.price;
      const newOwned = [...(state.userProfile.ownedItems || []), item.id];
      await window.fb.updateUserDoc(state.currentUser.uid, { gems: newGems, ownedItems: newOwned });
      state.userProfile.gems = newGems;
      state.userProfile.ownedItems = newOwned;
      renderStoreUI();
    } catch (err) {
      alert(`Satın alma başarısız: ${err.message}`);
    }
  }

  let currentGiftItemId = null;

  function openSendGiftModal(itemId) {
    const item = STORE_ITEMS.find(i => i.id === itemId);
    if (!item) return;
    currentGiftItemId = itemId;
    dom.giftItemPreview.textContent = `${item.emoji} ${item.name} gönderiyorsun.`;
    dom.giftRecipientEmail.value = '';
    dom.giftErrorMsg.style.display = 'none';
    openModal('modalSendGift');
  }

  async function confirmSendGift() {
    const email = dom.giftRecipientEmail.value.trim();
    if (!email) {
      dom.giftErrorMsg.textContent = 'Lütfen bir e-posta adresi girin.';
      dom.giftErrorMsg.style.display = 'block';
      return;
    }
    if (email === state.currentUser.email) {
      dom.giftErrorMsg.textContent = 'Kendinize hediye gönderemezsiniz.';
      dom.giftErrorMsg.style.display = 'block';
      return;
    }

    const item = STORE_ITEMS.find(i => i.id === currentGiftItemId);
    if (!item) return;
    if (item.purchasable === false) {
      dom.giftErrorMsg.textContent = 'Bu rozet kazanılarak elde edilir, hediye edilemez.';
      dom.giftErrorMsg.style.display = 'block';
      return;
    }

    dom.btnConfirmSendGift.disabled = true;
    dom.btnConfirmSendGift.textContent = 'Gönderiliyor...';

    try {
      const recipient = await window.fb.findUserByEmail(email);
      if (!recipient) {
        dom.giftErrorMsg.textContent = 'Bu e-postayla kayıtlı bir kullanıcı bulunamadı.';
        dom.giftErrorMsg.style.display = 'block';
        return;
      }

      const owned = [...state.userProfile.ownedItems];
      const idx = owned.indexOf(item.id);
      if (idx === -1) {
        dom.giftErrorMsg.textContent = 'Bu üründen sahip değilsiniz.';
        dom.giftErrorMsg.style.display = 'block';
        return;
      }
      owned.splice(idx, 1);

      await window.fb.updateUserDoc(state.currentUser.uid, { ownedItems: owned });
      state.userProfile.ownedItems = owned;

      await window.fb.createGift({
        fromUid: state.currentUser.uid,
        fromEmail: state.currentUser.email,
        toUid: recipient.uid,
        toEmail: email,
        itemId: item.id,
        claimed: false,
        createdAt: window.fb.serverTimestamp()
      });

      closeModal('modalSendGift');
      renderStoreUI();
      alert(`✅ ${item.emoji} ${item.name} başarıyla ${email} adresine gönderildi!`);
    } catch (err) {
      dom.giftErrorMsg.textContent = `Hata: ${err.message}`;
      dom.giftErrorMsg.style.display = 'block';
    } finally {
      dom.btnConfirmSendGift.disabled = false;
      dom.btnConfirmSendGift.textContent = '🎁 Gönder';
    }
  }

  async function loadIncomingGifts() {
    if (!state.currentUser || !dom.storeGiftsList) return;
    try {
      const gifts = await window.fb.getIncomingGifts(state.currentUser.uid);
      if (gifts.length === 0) {
        dom.storeGiftsEmptyState.style.display = 'block';
        dom.storeGiftsList.innerHTML = '';
        return;
      }
      dom.storeGiftsEmptyState.style.display = 'none';
      dom.storeGiftsList.innerHTML = gifts.map(g => {
        const item = STORE_ITEMS.find(i => i.id === g.itemId);
        if (!item) return '';
        return `
          <div style="display: flex; align-items: center; justify-content: space-between; background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 12px 16px; margin-bottom: 8px;">
            <div>
              <strong>${item.emoji} ${item.name}</strong>
              <div style="font-size: 0.78rem; color: var(--text-muted);">Gönderen: ${g.fromEmail}</div>
            </div>
            <button class="btn-primary" data-gift-action="claim" data-gift-id="${g.id}" data-item-id="${item.id}" style="padding: 6px 14px;">Al</button>
          </div>
        `;
      }).join('');
    } catch (err) {
      console.warn('Gelen hediyeler yüklenemedi:', err);
    }
  }

  async function claimGiftAction(giftId, itemId) {
    try {
      const newOwned = [...(state.userProfile.ownedItems || []), itemId];
      await window.fb.updateUserDoc(state.currentUser.uid, { ownedItems: newOwned });
      state.userProfile.ownedItems = newOwned;
      await window.fb.claimGift(giftId);
      renderStoreUI();
    } catch (err) {
      alert(`Hediye alınamadı: ${err.message}`);
    }
  }

  // --- 🏆 Liderlik Tablosu ---
  async function syncLeaderboardEntry(totalTRY, profitPct) {
    if (!state.currentUser || !state.userProfile) return;
    try {
      if (state.userProfile.showOnLeaderboard) {
        await window.fb.setLeaderboardEntry(state.currentUser.uid, {
          displayName: state.userProfile.displayName || state.userProfile.email.split('@')[0],
          totalTRY,
          profitPct,
          updatedAt: window.fb.serverTimestamp()
        });
      } else {
        await window.fb.deleteLeaderboardEntry(state.currentUser.uid);
      }
    } catch (err) {
      console.warn('Liderlik tablosu güncellenemedi:', err);
    }
  }

  async function toggleLeaderboardOptIn(checked) {
    if (!state.currentUser || !state.userProfile) return;
    try {
      await window.fb.updateUserDoc(state.currentUser.uid, { showOnLeaderboard: checked });
      state.userProfile.showOnLeaderboard = checked;
      renderPortfolioUI(); // toplam değeri yeniden hesaplayıp senkronize eder
    } catch (err) {
      alert(`Ayar kaydedilemedi: ${err.message}`);
    }
  }

  async function toggleAutoTrading(checked) {
    if (!state.currentUser || !state.userProfile) return;
    try {
      await window.fb.updateUserDoc(state.currentUser.uid, { autoTradingEnabled: checked });
      state.userProfile.autoTradingEnabled = checked;
      if (checked) {
        alert('🤖 Otomatik AI Sepet Botu açıldı! Bir dakika içinde piyasayı kontrol edip uygun fırsat bulursa sepetine otomatik ekleyecek.');
      }
    } catch (err) {
      alert(`Ayar kaydedilemedi: ${err.message}`);
      dom.autoTradingCheckbox.checked = !checked;
    }
  }

  async function toggleAutoTradingCrypto(checked) {
    if (!state.currentUser || !state.userProfile) return;
    try {
      await window.fb.updateUserDoc(state.currentUser.uid, { autoTradingCryptoEnabled: checked });
      state.userProfile.autoTradingCryptoEnabled = checked;
      if (checked) {
        alert('🪙 Otomatik Kripto Sepet Botu açıldı! Bir dakika içinde piyasayı kontrol edip uygun fırsat bulursa sepetine otomatik ekleyecek.');
      }
    } catch (err) {
      alert(`Ayar kaydedilemedi: ${err.message}`);
      dom.autoTradingCryptoCheckbox.checked = !checked;
    }
  }

  async function toggleAutoTradingForex(checked) {
    if (!state.currentUser || !state.userProfile) return;
    try {
      await window.fb.updateUserDoc(state.currentUser.uid, { autoTradingForexEnabled: checked });
      state.userProfile.autoTradingForexEnabled = checked;
      if (checked) {
        alert('💱 Otomatik Forex Sepet Botu açıldı! Bir dakika içinde pariteleri kontrol edip uygun fırsat bulursa sanal bakiyenle pozisyon açacak.');
      }
    } catch (err) {
      alert(`Ayar kaydedilemedi: ${err.message}`);
      dom.autoTradingForexCheckbox.checked = !checked;
    }
  }

  async function renderLeaderboard() {
    if (!dom.leaderboardTableBody) return;

    if (dom.leaderboardOptInBox) {
      dom.leaderboardOptInBox.style.display = state.currentUser ? 'flex' : 'none';
      if (dom.leaderboardOptInCheckbox && state.userProfile) {
        dom.leaderboardOptInCheckbox.checked = Boolean(state.userProfile.showOnLeaderboard);
      }
    }

    try {
      // TL geçişinden önceki (totalUSD'li) kayıtlar, sahibi tekrar giriş yapıp güncelleyene kadar gizlenir.
      const entries = (await window.fb.getLeaderboard()).filter(e => typeof e.totalTRY === 'number');
      entries.sort((a, b) => b.totalTRY - a.totalTRY);

      if (entries.length === 0) {
        dom.leaderboardEmptyState.style.display = 'block';
        dom.leaderboardTableBody.innerHTML = '';
        return;
      }

      dom.leaderboardEmptyState.style.display = 'none';
      const rankIcons = ['🥇', '🥈', '🥉'];
      dom.leaderboardTableBody.innerHTML = entries.slice(0, 50).map((entry, idx) => {
        const isProfit = (entry.profitPct || 0) >= 0;
        const sign = isProfit ? '+' : '';
        const isMe = state.currentUser && entry.uid === state.currentUser.uid;
        return `
          <tr style="${isMe ? 'background: rgba(6,182,212,0.08);' : ''}">
            <td style="font-weight: 700;">${rankIcons[idx] || `#${idx + 1}`}</td>
            <td>${entry.displayName || 'Yatırımcı'}${isMe ? ' <span style="color: var(--color-primary); font-size: 0.75rem;">(Sen)</span>' : ''}</td>
            <td style="font-weight: 700;">${fmtTRY((entry.totalTRY || 0))}</td>
            <td style="color: ${isProfit ? '#10b981' : '#ef4444'}; font-weight: 600;">${sign}${(entry.profitPct || 0).toFixed(2)}%</td>
          </tr>
        `;
      }).join('');
    } catch (err) {
      dom.leaderboardTableBody.innerHTML = `<tr><td colspan="4" style="color:#ef4444;">Liderlik tablosu yüklenemedi: ${err.message}</td></tr>`;
    }
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

    // Ekran 5 (Portföy & Sepetim) açıldığında güncelle
    if (screenId === 'screen-portfolio') {
      renderPortfolioUI();
    }

    if (screenId === 'screen-store') {
      renderStoreUI();
    }

    if (screenId === 'screen-leaderboard') {
      renderLeaderboard();
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
    const exchange = COUNTRY_EXCHANGES[countryCode] || COUNTRY_EXCHANGES['TR'];
    state.currentRegion = exchange.code;
    localStorage.setItem('trendvest_region', exchange.code);

    dom.currentRegionFlag.textContent = exchange.flag;
    dom.currentRegionName.textContent = exchange.name;

    // BIST uyarısı ve başlık kontrolü
    if (exchange.code === 'TR') {
      dom.bistNoticeBanner.style.display = 'flex';
      dom.regionalSectionTitle.textContent = `🇹🇷 BIST 10 Lokomotif Hisseleri`;
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
  // Sabit listede olmayan BIST hissesinin gerçek fiyatını/göstergelerini worker'dan çekip listeye ekler,
  // böylece sepet, satış ve tarayıcı ekranları da bu hisseyi tanır.
  async function ensureBistAsset(symbol) {
    const existing = ASSET_UNIVERSE.find(a => a.symbol === symbol);
    if (existing) return existing;
    try {
      const res = await fetch(`${state.workerUrl}/api/bist/quote?symbol=${encodeURIComponent(symbol)}`);
      if (!res.ok) return null;
      const data = await res.json();
      if (typeof data.basePrice !== 'number') return null;
      ASSET_UNIVERSE.push(data);
      return data;
    } catch (e) {
      console.warn('BIST fiyat çekme uyarısı:', e);
      return null;
    }
  }

  async function loadAssetDetail(symbol, type = 'bist') {
    if (type === 'bist') await ensureBistAsset(symbol);
    let asset = ASSET_UNIVERSE.find(a => a.symbol === symbol) || {
      symbol,
      name: symbol,
      type,
      exchange: type === 'crypto' ? 'Crypto' : (type === 'bist' ? 'BIST' : (type === 'fund' ? 'TEFAS' : 'NASDAQ')),
      basePrice: 150,
      change24h: 1.2,
      volume: 1000000
    };

    state.activeAsset = { ...asset };

    // Başlık ve Rozetleri Güncelle
    dom.detailSymbolBadge.textContent = asset.symbol;
    dom.detailAssetName.textContent = asset.name;
    dom.detailExchangeBadge.textContent = asset.exchange;
    dom.detailAssetType.textContent = assetTypeLabel(asset.type);
    renderDetailPrice(asset);

    // Favori Yıldızını Güncelle
    const isFav = state.watchlist.includes(asset.symbol);
    dom.btnToggleFavorite.style.color = isFav ? '#fbbf24' : 'var(--text-muted)';

    // Gerçek mum verisi (yoksa örnek grafik) + teknik gösterge kartları
    loadChartData(state.activeAsset);

    // Profil ve Haberler
    renderAssetProfileAndNews(asset);

    // AI Başlığını Senkronize Et
    dom.aiTargetAssetName.textContent = `${asset.name} (${asset.symbol})`;
  }

  // Yeterli mum yoksa kartta önceki varlığın/örnek değerin kalmaması için
  function setMetricUnavailable(valueEl, badgeEl, statusEl) {
    valueEl.textContent = '—';
    badgeEl.className = 'change-pill neutral';
    badgeEl.textContent = 'Yetersiz Veri';
    statusEl.textContent = 'Bu zaman diliminde hesaplamak için yeterli mum yok; daha uzun bir zaman dilimi seçin.';
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
    } else {
      setMetricUnavailable(dom.metricRSIValue, dom.metricRSIBadge, dom.metricRSIStatus);
      dom.rsiBarFill.style.width = '0%';
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
    } else {
      setMetricUnavailable(dom.metricMACDValue, dom.metricMACDBadge, dom.metricMACDStatus);
    }

    // 4. SMA Durumu
    if (trendInfo.lastSMA20 && !trendInfo.lastSMA50) {
      // Kısa zaman dilimlerinde (ör. 1 ay ≈ 22 mum) SMA50 için yeterli veri yok — eski değeri bırakma
      const smaCur = currencySymbolFor(state.activeAsset?.type);
      dom.metricSMAValues.textContent = `SMA20: ${smaCur}${Number(trendInfo.lastSMA20).toFixed(2)} | SMA50: —`;
      dom.metricSMABadge.className = 'change-pill neutral';
      dom.metricSMABadge.textContent = 'Yetersiz Veri';
      dom.metricSMAStatus.textContent = 'SMA50 için en az 50 mum gerekir; 1Y veya 5Y görünümünü seçin.';
    } else if (trendInfo.lastSMA20 && trendInfo.lastSMA50) {
      const smaCur = currencySymbolFor(state.activeAsset?.type);
      dom.metricSMAValues.textContent = `SMA20: ${smaCur}${Number(trendInfo.lastSMA20).toFixed(2)} | SMA50: ${smaCur}${Number(trendInfo.lastSMA50).toFixed(2)}`;
      dom.metricSMABadge.className = `change-pill ${trendInfo.lastSMA20 >= trendInfo.lastSMA50 ? 'bullish' : 'bearish'}`;
      dom.metricSMABadge.textContent = trendInfo.lastSMA20 >= trendInfo.lastSMA50 ? 'Boğa Eğilimi' : 'Ayı Eğilimi';
      dom.metricSMAStatus.textContent = trendInfo.smaState;
    } else {
      setMetricUnavailable(dom.metricSMAValues, dom.metricSMABadge, dom.metricSMAStatus);
    }

    // Durumu sakla (AI paneli için)
    state.activeAsset.technicals = trendInfo;
  }

  function renderDetailPrice(asset) {
    const curSymbol = currencySymbolFor(asset.type);
    dom.detailCurrentPrice.textContent = `${curSymbol}${asset.basePrice.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const isBullish = asset.change24h >= 0;
    dom.detailChange24h.className = `change-pill ${isBullish ? 'bullish' : 'bearish'}`;
    dom.detailChange24h.textContent = `${isBullish ? '+' : ''}${asset.change24h.toFixed(2)}%`;
    dom.detailPriceDiff.textContent = `${isBullish ? '+' : ''}${curSymbol}${((asset.basePrice * asset.change24h) / 100).toFixed(2)} Bugün`;
  }

  // Grafiği worker'dan gelen gerçek mumlarla doldurur ve başlıktaki fiyatı canlı fiyatla günceller.
  // Veri yoksa (ör. TEFAS fonları) örnek grafiğe düşer ve grafiğin üzerinde bunu açıkça belirtir.
  let chartLoadSeq = 0;
  async function loadChartData(asset) {
    const seq = ++chartLoadSeq;
    let live = null;
    try {
      const res = await fetch(`${state.workerUrl}/api/candles?symbol=${encodeURIComponent(asset.symbol)}&type=${asset.type}&tf=${state.currentTimeframe}`);
      if (res.ok) live = await res.json();
    } catch (e) {
      console.warn('Mum verisi çekme uyarısı:', e);
    }
    if (seq !== chartLoadSeq || !state.activeAsset || state.activeAsset.symbol !== asset.symbol) return; // bu arada başka varlığa geçildi

    const isReal = Boolean(live && Array.isArray(live.candles) && live.candles.length >= 5);
    const candles = isReal ? live.candles : generateHistoricalCandles(asset.basePrice, state.currentTimeframe);

    if (isReal && typeof live.price === 'number') {
      const change24h = typeof live.prevClose === 'number' && live.prevClose > 0
        ? Math.round(((live.price - live.prevClose) / live.prevClose) * 10000) / 100
        : state.activeAsset.change24h;
      Object.assign(state.activeAsset, { basePrice: live.price, price: live.price, change24h });
      const listed = ASSET_UNIVERSE.find(a => a.symbol === asset.symbol);
      if (listed) Object.assign(listed, { basePrice: live.price, change24h });
      renderDetailPrice(state.activeAsset);
    }

    state.activeAsset.candles = candles;
    if (state.chartInstance) state.chartInstance.setData(candles);
    updateTechnicalPanels(candles);
    setChartNotice(isReal ? '' : 'ℹ️ Bu varlık için canlı grafik verisi bulunamadı — gösterilen grafik temsilidir.');
  }

  function setChartNotice(text) {
    let notice = document.getElementById('chartDataNotice');
    if (!notice) {
      notice = document.createElement('div');
      notice.id = 'chartDataNotice';
      notice.style.cssText = 'font-size: 0.78rem; color: #fbbf24; padding: 6px 2px;';
      document.getElementById('chartContainer').before(notice);
    }
    notice.textContent = text;
    notice.style.display = text ? 'block' : 'none';
  }

  // --- Yedek: Temsili Mum Verisi Üretici (canlı veri olmayan varlıklar için) ---
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
    const cur = currencySymbolFor(asset.type);
    // Profil Alanı
    dom.companyProfileContent.innerHTML = `
      <p><strong>Varlık:</strong> ${asset.name} (${asset.symbol})</p>
      <p><strong>Borsa / Piyasa:</strong> ${asset.exchange} (${asset.type === 'bist' ? 'Borsa İstanbul' : (asset.type === 'fund' ? 'Türkiye Elektronik Fon Alım Satım Platformu' : asset.type.toUpperCase())})</p>
      <p><strong>Piyasa Değeri:</strong> ~${cur}${((asset.basePrice * (asset.volume || 10000000)) / 1000000).toLocaleString('tr-TR', { maximumFractionDigits: 0 })} M</p>
      <p><strong>Takip Tipi:</strong> ${asset.type === 'bist' ? 'Borsa İstanbul Lokomotif Şirketi' : (asset.type === 'crypto' ? 'Blokzincir / Kripto Para Birimi' : (asset.type === 'fund' ? 'TEFAS Yatırım Fonu' : 'Halka Açık Anonim Şirket Hissesi'))}</p>
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

  // --- Piyasa Kartları (BIST 10) ---
  function renderMarketGrids() {
    // Ana menüde yalnızca BIST 10 hisseleri listelenir
    const bistAssets = ASSET_UNIVERSE.filter(a => a.type === 'bist').slice(0, 10);
    dom.regionalGrid.innerHTML = bistAssets.map(a => createAssetCardHTML(a)).join('');

    // Yatırım Fonları (TEFAS)
    if (dom.fundGrid) {
      const fundAssets = ASSET_UNIVERSE.filter(a => a.type === 'fund');
      dom.fundGrid.innerHTML = fundAssets.map(a => createAssetCardHTML(a)).join('');
    }

    // Global / Yabancı borsa alanı ana menüde gizlenir
    if (dom.globalGrid) {
      dom.globalGrid.innerHTML = '';
      dom.globalGrid.style.display = 'none';
    }

    renderCryptoScreen();
  }

  // --- 🪙 Kripto Paralar Ekranı (En Çok İşlem Gören) ---
  function renderCryptoScreen() {
    if (!dom.cryptoScreenGrid) return;
    const cryptoAssets = ASSET_UNIVERSE
      .filter(a => a.type === 'crypto')
      .sort((a, b) => b.volume - a.volume);
    dom.cryptoScreenGrid.innerHTML = cryptoAssets.map(a => createAssetCardHTML(a)).join('');
  }

  // --- ✨ AI Hisse Önerileri (Teknik Skorlama + AI Yorumu) ---
  function computeCompositeScore(asset) {
    const rsiScore = (asset.rsi - 50); // momentum yönü
    const trendScore = (asset.sma20 > asset.sma50) ? 15 : -10;
    const volumeScore = (asset.volumeRatio - 1) * 12;
    const changeScore = asset.change24h * 3;
    const raw = 50 + rsiScore + trendScore + volumeScore + changeScore;
    return Math.max(0, Math.min(100, Math.round(raw)));
  }

  function getTopAIPicks(count = 3) {
    return [...ASSET_UNIVERSE]
      .filter(a => a.type === 'bist')
      .map(a => ({ ...a, score: computeCompositeScore(a) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, count);
  }

  function trendDirectionOf(asset) {
    if (asset.rsi >= 60 || asset.change24h >= 2) return 'Yükseliş';
    if (asset.rsi <= 40 || asset.change24h <= -2) return 'Düşüş';
    return 'Yatay';
  }

  async function loadAIRecommendations() {
    if (!dom.aiPicksGrid) return;
    const picks = getTopAIPicks(3);
    dom.aiPicksGrid.innerHTML = `<div class="ai-picks-loading">✨ AI teknik değerlendirme hazırlanıyor...</div>`;

    const payloadAssets = picks.map(p => ({
      symbol: p.symbol,
      name: p.name,
      price: p.basePrice,
      change24h: p.change24h,
      rsi: p.rsi,
      trendDirection: trendDirectionOf(p),
      score: p.score
    }));

    let recommendations;
    try {
      const res = await fetch(`${state.workerUrl}/api/ai/recommendations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assets: payloadAssets })
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      recommendations = data.recommendations;
    } catch (err) {
      console.warn('AI önerileri alınamadı, algoritmik özet kullanılıyor:', err);
      recommendations = payloadAssets.map(a => ({
        symbol: a.symbol,
        highlight: `${a.symbol}, ${a.trendDirection === 'Yükseliş' ? 'yükseliş eğilimli' : a.trendDirection === 'Düşüş' ? 'zayıf seyirli' : 'yatay'} bir teknik görünüm sergiliyor. RSI ${a.rsi} seviyesinde ve 24 saatte %${a.change24h} değişim kaydetti; bileşik teknik skor ${a.score}/100.`
      }));
    }

    dom.aiPicksGrid.innerHTML = picks.map(p => {
      const rec = recommendations.find(r => r.symbol === p.symbol);
      const isBullish = p.change24h >= 0;
      return `
        <div class="ai-pick-card" data-symbol="${p.symbol}" data-type="${p.type}">
          <div class="ai-pick-card-top">
            <div>
              <span class="asset-card-symbol">${p.symbol}</span>
              <div class="asset-card-name">${p.name}</div>
            </div>
            <span class="ai-pick-score-badge">Skor ${p.score}/100</span>
          </div>
          <div class="asset-card-price-row">
            <span class="asset-card-price">₺${p.basePrice.toFixed(2)}</span>
            <span class="change-pill ${isBullish ? 'bullish' : 'bearish'}">${isBullish ? '+' : ''}${p.change24h.toFixed(2)}%</span>
          </div>
          <p class="ai-pick-highlight-text">${rec ? rec.highlight : ''}</p>
        </div>
      `;
    }).join('');
  }

  function createAssetCardHTML(asset, isWatchlistCard = false) {
    const isBullish = asset.change24h >= 0;
    const isFav = state.watchlist.includes(asset.symbol);
    const curSymbol = currencySymbolFor(asset.type);

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
          <span class="asset-card-price">${curSymbol}${asset.basePrice.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
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
  // Önce yerel listede aranır; 2+ karakterde tüm Borsa İstanbul worker üzerinden (Yahoo) ayrıca taranır.
  let bistSearchTimer = null;
  let bistSearchSeq = 0;

  function handleSearchInput(query) {
    const cleanQuery = query.trim().toLowerCase();
    clearTimeout(bistSearchTimer);
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

    const searchRemote = cleanQuery.length >= 2;
    renderSearchResults(query, results, searchRemote);
    if (!searchRemote) return;

    const seq = ++bistSearchSeq;
    bistSearchTimer = setTimeout(async () => {
      let remote = [];
      try {
        const res = await fetch(`${state.workerUrl}/api/bist/search?q=${encodeURIComponent(query.trim())}`);
        if (res.ok) remote = (await res.json()).results || [];
      } catch (e) {
        console.warn('BIST arama uyarısı:', e);
      }
      if (seq !== bistSearchSeq) return; // kullanıcı bu arada yazmaya devam etti
      const known = new Set(results.map(r => r.symbol));
      const extra = remote.filter(r => !known.has(r.symbol));
      renderSearchResults(query, [...results, ...extra], false);
    }, 300);
  }

  function renderSearchResults(query, results, stillSearching) {
    if (results.length === 0) {
      dom.searchDropdown.innerHTML = `
        <div style="padding: 16px; text-align: center; color: var(--text-muted); font-size: 0.88rem;">
          ${stillSearching ? 'Borsa İstanbul\'da aranıyor...' : `"${escapeHtml(query)}" ile eşleşen hisse veya kripto bulunamadı.`}
        </div>
      `;
    } else {
      dom.searchDropdown.innerHTML = results.map(r => `
        <div class="search-result-item" data-symbol="${r.symbol}" data-type="${r.type}">
          <div class="search-result-left">
            <span class="search-item-badge ${r.type === 'crypto' ? 'badge-crypto' : (r.type === 'bist' ? 'badge-bist' : (r.type === 'fund' ? 'badge-fund' : 'badge-stock'))}">
              ${r.type === 'crypto' ? 'KRİPTO' : (r.type === 'bist' ? 'BIST' : (r.type === 'fund' ? 'FON' : 'ABD'))}
            </span>
            <div>
              <div class="search-item-symbol">${r.symbol}</div>
              <div class="search-item-name">${escapeHtml(r.name)}</div>
            </div>
          </div>
          ${typeof r.basePrice === 'number' ? `
          <div style="text-align: right; font-family: var(--font-mono); font-size: 0.9rem;">
            <div>${currencySymbolFor(r.type)}${r.basePrice.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <div style="color: ${r.change24h >= 0 ? '#10b981' : '#ef4444'}; font-size: 0.78rem;">
              ${r.change24h >= 0 ? '+' : ''}${r.change24h.toFixed(2)}%
            </div>
          </div>` : `
          <div style="text-align: right; font-size: 0.75rem; color: var(--text-muted);">Canlı fiyat için tıklayın</div>`}
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
          <td><span class="detail-market-badge">${asset.type === 'bist' ? 'BIST' : asset.type.toUpperCase()}</span></td>
          <td style="font-family: var(--font-mono); font-weight: 700;">${asset.type === 'bist' ? '₺' : '$'}${asset.basePrice.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
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
    } else if (modalId === 'modalAuth' && !state.currentUser) {
      setAuthMode('login');
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
      const card = e.target.closest('.asset-card, .ai-pick-card');
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
        
        // Seçilen zaman dilimi için mumları yeniden yükle
        if (state.activeAsset) loadChartData(state.activeAsset);
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
    dom.btnOpenAuthModal.addEventListener('click', () => openModal('modalAuth'));

    // Auth Modu Değiştirme (Giriş <-> Kayıt)
    dom.btnToggleAuthMode.addEventListener('click', () => {
      setAuthMode(state.authMode === 'login' ? 'signup' : 'login');
    });

    // Giriş / Kayıt Gönderimi
    dom.btnSubmitAuth.addEventListener('click', () => submitAuth());
    dom.authPasswordInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') submitAuth();
    });

    // Çıkış Yap
    dom.btnSignOut.addEventListener('click', async () => {
      await window.fb.signOut();
      closeModal('modalAuth');
    });

    // Admin: Kullanıcıları Yenile
    dom.btnRefreshUsers.addEventListener('click', () => loadAdminUsers());

    // AI Hisse Önerilerini Yenile
    if (dom.btnRefreshAIPicks) {
      dom.btnRefreshAIPicks.addEventListener('click', () => loadAIRecommendations());
    }

    // --- Portföy & Sepetim Event Dinleyicileri ---
    if (dom.btnOpenAddToBasketModal) {
      dom.btnOpenAddToBasketModal.addEventListener('click', () => openAddToBasketModal());
    }

    if (dom.btnPortfolioExploreMarkets) {
      dom.btnPortfolioExploreMarkets.addEventListener('click', () => switchScreen('screen-home'));
    }

    if (dom.btnPortfolioLoginPrompt) {
      dom.btnPortfolioLoginPrompt.addEventListener('click', () => openModal('modalAuth'));
    }

    if (dom.btnPortfolioEmptyExplore) {
      dom.btnPortfolioEmptyExplore.addEventListener('click', () => switchScreen('screen-home'));
    }

    // Sepete Ekle Modalı Dinleyicileri
    if (dom.basketInputShares) {
      dom.basketInputShares.addEventListener('input', updateBasketCalculations);
    }
    if (dom.basketInputPrice) {
      dom.basketInputPrice.addEventListener('input', updateBasketCalculations);
    }
    document.querySelectorAll('.btn-quick-qty').forEach(btn => {
      btn.addEventListener('click', () => {
        const qty = btn.dataset.qty;
        if (dom.basketInputShares) {
          dom.basketInputShares.value = qty;
          updateBasketCalculations();
        }
      });
    });
    if (dom.btnConfirmAddToBasket) {
      dom.btnConfirmAddToBasket.addEventListener('click', confirmAddToBasket);
    }

    // Satış Modalı Dinleyicileri
    if (dom.sellInputShares) {
      dom.sellInputShares.addEventListener('input', updateSellCalculations);
    }
    document.querySelectorAll('.btn-quick-sell').forEach(btn => {
      btn.addEventListener('click', () => {
        if (!currentSellItem) return;
        const pct = parseFloat(btn.dataset.pct) || 100;
        const qty = Number(((currentSellItem.shares * pct) / 100).toFixed(4));
        if (dom.sellInputShares) {
          dom.sellInputShares.value = qty.toString();
          updateSellCalculations();
        }
      });
    });
    if (dom.btnConfirmSell) {
      dom.btnConfirmSell.addEventListener('click', confirmSellFromBasket);
    }

    // Portföy Tablosu Aksiyonları (Event Delegation)
    if (dom.portfolioTableContainer) {
      dom.portfolioTableContainer.addEventListener('click', (e) => {
        const forexBtn = e.target.closest('[data-forex-action]');
        if (forexBtn) {
          if (forexBtn.dataset.forexAction === 'close') {
            closeForexPosition(forexBtn.dataset.forexId);
          }
          return;
        }

        const btn = e.target.closest('[data-portfolio-action]');
        if (!btn) return;
        const action = btn.dataset.portfolioAction;
        const symbol = btn.dataset.symbol;

        if (action === 'chart') {
          const item = state.userProfile?.portfolio.find(p => p.symbol === symbol);
          loadAssetDetail(symbol, item?.type);
          switchScreen('screen-detail');
        } else if (action === 'buy-more') {
          const match = ASSET_UNIVERSE.find(a => a.symbol === symbol) || { symbol, name: symbol, type: 'stock', basePrice: 100 };
          openAddToBasketModal(match);
        } else if (action === 'sell') {
          openSellFromBasketModal(symbol);
        }
      });
    }

    // 💱 Forex: Pozisyon Aç
    if (dom.btnOpenForexPosition) {
      dom.btnOpenForexPosition.addEventListener('click', openForexPosition);
    }

    // 🎁 Mağaza: Ürün Satın Alma (Event Delegation)
    if (dom.storeItemsGrid) {
      dom.storeItemsGrid.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-store-action="buy"]');
        if (btn) buyStoreItem(btn.dataset.itemId);
      });
    }

    // 💎 Mağaza: Elmas Paketi Satın Alma (Ödeme Altyapısı Henüz Yok)
    if (dom.gemPacksGrid) {
      dom.gemPacksGrid.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-store-action="buy-gems"]');
        if (!btn) return;
        dom.gemPaymentNotice.style.display = 'block';
        dom.gemPaymentNotice.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    }

    // 🎁 Mağaza: Koleksiyondan Hediye Gönderme (Event Delegation)
    if (dom.storeOwnedGrid) {
      dom.storeOwnedGrid.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-store-action="gift"]');
        if (btn) openSendGiftModal(btn.dataset.itemId);
      });
    }

    // 🎁 Mağaza: Gelen Hediyeyi Alma (Event Delegation)
    if (dom.storeGiftsList) {
      dom.storeGiftsList.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-gift-action="claim"]');
        if (btn) claimGiftAction(btn.dataset.giftId, btn.dataset.itemId);
      });
    }

    if (dom.btnRefreshGifts) {
      dom.btnRefreshGifts.addEventListener('click', () => loadIncomingGifts());
    }

    if (dom.btnStoreLoginPrompt) {
      dom.btnStoreLoginPrompt.addEventListener('click', () => openModal('modalAuth'));
    }

    if (dom.btnConfirmSendGift) {
      dom.btnConfirmSendGift.addEventListener('click', () => confirmSendGift());
    }

    // 📸 Kazanç Paylaşım Kartı
    if (dom.btnSharePortfolio) {
      dom.btnSharePortfolio.addEventListener('click', () => {
        generateShareCard();
        openModal('modalSharePortfolio');
      });
    }

    // 🏆 Liderlik Tablosu
    if (dom.btnRefreshLeaderboard) {
      dom.btnRefreshLeaderboard.addEventListener('click', () => renderLeaderboard());
    }
    if (dom.leaderboardOptInCheckbox) {
      dom.leaderboardOptInCheckbox.addEventListener('change', (e) => toggleLeaderboardOptIn(e.target.checked));
    }

    // 🤖 Otomatik AI Sepet Botları
    if (dom.autoTradingCheckbox) {
      dom.autoTradingCheckbox.addEventListener('change', (e) => toggleAutoTrading(e.target.checked));
    }
    if (dom.autoTradingCryptoCheckbox) {
      dom.autoTradingCryptoCheckbox.addEventListener('change', (e) => toggleAutoTradingCrypto(e.target.checked));
    }
    if (dom.autoTradingForexCheckbox) {
      dom.autoTradingForexCheckbox.addEventListener('change', (e) => toggleAutoTradingForex(e.target.checked));
    }

    // Admin: Tablo İçi Aksiyonlar (Event Delegation)
    dom.adminUsersTableBody.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-admin-action]');
      if (btn) {
        handleAdminAction(btn.dataset.adminAction, btn.dataset.uid, btn.closest('tr'));
      }
    });

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
