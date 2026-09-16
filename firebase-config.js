/**
 * TrendVest — Firebase Yapılandırması ve Akıllı İstemci Katmanı
 * 
 * Esnek Mimari:
 * - Kullanıcı Firebase Console'dan yapılandırma bilgilerini girmişse doğrudan Cloud Firestore ve Firebase Auth'a bağlanır.
 * - Henüz anahtarlar girilmemişse, arayüzün kesintisiz çalışması için yerel LocalStorageBackend devreye girer.
 */

const FirebaseConfigManager = {
  // Varsayılan veya localStorage'dan okunan Firebase yapılandırması
  getConfig() {
    try {
      const saved = localStorage.getItem('trendvest_firebase_config');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return {
      apiKey: "AIzaSyBchFRE4ChKyBRi7udsPCduOgiz7qvZKvM",
      authDomain: "trendvest-7a93a.firebaseapp.com",
      projectId: "trendvest-7a93a",
      storageBucket: "trendvest-7a93a.firebasestorage.app",
      messagingSenderId: "1098194707168",
      appId: "1:1098194707168:web:6d1d3ecc2adc0394c8e685"
    };
  },

  saveConfig(config) {
    localStorage.setItem('trendvest_firebase_config', JSON.stringify(config));
  },

  isConfigured() {
    const config = this.getConfig();
    return Boolean(config.apiKey && config.projectId);
  }
};

// Yerel Simülasyon Veri Deposu (Offline / Anahtarsız Anında Kullanım)
class LocalStorageBackend {
  constructor() {
    this.initDefaultData();
  }

  initDefaultData() {
    if (!localStorage.getItem('trendvest_user')) {
      const defaultUser = {
        uid: 'user_demo_trader',
        displayName: 'Demo Yatırımcı',
        email: 'trader@trendvest.local',
        photoURL: 'https://api.dicebear.com/7.x/bottts/svg?seed=DemoTrader',
        balanceUSD: 10000.00,
        localCurrency: 'TRY',
        localRate: 34.25,
        level: 'Acemi Yatırımcı',
        badge: '🌱',
        score: 10,
        createdAt: new Date().toISOString()
      };
      localStorage.setItem('trendvest_user', JSON.stringify(defaultUser));
    }

    if (!localStorage.getItem('trendvest_portfolio')) {
      // Başlangıç örnek pozisyonları (Kullanıcı doğrudan portföyü dolu görsün)
      const initialPortfolio = [
        { symbol: 'AAPL', name: 'Apple Inc.', type: 'stock', shares: 10, avgCostUSD: 215.00, currentPriceUSD: 224.50 },
        { symbol: 'BTC', name: 'Bitcoin', type: 'crypto', shares: 0.05, avgCostUSD: 61200.00, currentPriceUSD: 63850.00 },
        { symbol: 'THYAO', name: 'Türk Hava Yolları', type: 'bist', shares: 40, avgCostUSD: 290.00, currentPriceUSD: 304.50 }
      ];
      localStorage.setItem('trendvest_portfolio', JSON.stringify(initialPortfolio));
    }

    if (!localStorage.getItem('trendvest_transactions')) {
      const initialTx = [
        { id: 'tx_1', userId: 'user_demo_trader', symbol: 'AAPL', name: 'Apple Inc.', type: 'BUY', shares: 10, priceUSD: 215.00, totalUSD: 2150.00, date: 'Dün' },
        { id: 'tx_2', userId: 'user_demo_trader', symbol: 'BTC', name: 'Bitcoin', type: 'BUY', shares: 0.05, priceUSD: 61200.00, totalUSD: 3060.00, date: '3 gün önce' },
        { id: 'tx_3', userId: 'user_demo_trader', symbol: 'THYAO', name: 'Türk Hava Yolları', type: 'BUY', shares: 40, priceUSD: 290.00, totalUSD: 1160.00, date: '1 hafta önce' }
      ];
      localStorage.setItem('trendvest_transactions', JSON.stringify(initialTx));
    }
  }

  getCurrentUser() {
    try {
      return JSON.parse(localStorage.getItem('trendvest_user'));
    } catch (e) {
      return null;
    }
  }

  updateUser(updates) {
    const user = this.getCurrentUser();
    if (!user) return;
    const updated = { ...user, ...updates };
    localStorage.setItem('trendvest_user', JSON.stringify(updated));
    return updated;
  }
}

// Global Referans
window.FirebaseConfigManager = FirebaseConfigManager;
window.LocalStorageBackend = new LocalStorageBackend();
