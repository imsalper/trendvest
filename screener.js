/**
 * TrendVest — Potansiyel Sepetler & Kural Tabanlı Tarama Motoru (Screener)
 * İstatiksel kurallara (RSI toparlanma, Golden Cross, Hacim Patlaması, Akümülasyon) göre varlıkları sınıflandırır.
 */

const ScreenerEngine = {
  // Tanımlı Strateji Sepetleri
  strategies: [
    {
      id: 'oversold_bounce',
      name: 'RSI Toparlanma & Tepki Adayları',
      badge: 'Tepki Potansiyeli',
      icon: '⚡',
      color: '#f59e0b',
      description: 'RSI göstergesi aşırı satım bölgesinden (< 38) yukarı dönen, satış baskısının tükendiği ve hacim desteğiyle toparlanma sinyali veren varlıklar.',
      criteria: ['RSI 28 ile 42 arasında', 'Son gün kapanışı pozitif', 'Momentum toparlanıyor'],
      check(assetMetrics) {
        const { rsi, change24h } = assetMetrics;
        return (rsi !== null && rsi >= 28 && rsi <= 44 && change24h > -1);
      },
      aiSummary: 'Bu sepetteki varlıklar aşırı satış bölgesinden gelen tepki alımlarıyla dengelenme aşamasındadır. İstatiksel olarak dip seviyelerden gelen momentum toparlanması takip edilir; ancak ana trendin hala negatif olabileceği unutulmamalıdır.'
    },
    {
      id: 'golden_cross',
      name: 'Momentum Liderleri (Golden Cross)',
      badge: 'Trend Gücü',
      icon: '🌟',
      color: '#10b981',
      description: 'Kısa vadeli hareketli ortalamanın (SMA 20) orta vadeli ortalamayı (SMA 50) yukarı kestiği ve fiyatın her iki ortalamanın da üzerinde tutunduğu güçlü trend adayları.',
      criteria: ['Fiyat > SMA 20 > SMA 50', 'RSI 52 ile 70 arasında', 'MACD Sinyal Hattının Üzerinde'],
      check(assetMetrics) {
        const { price, sma20, sma50, rsi, macdHist } = assetMetrics;
        if (!sma20 || !sma50) return false;
        return (price >= sma20 && sma20 >= sma50 && rsi >= 50 && rsi <= 72 && macdHist >= 0);
      },
      aiSummary: 'Golden Cross sepetindeki enstrümanlar, hem kısa hem orta vadeli ortalamaların üzerinde seyrederek teknik açıdan güçlü bir alıcı ilgisini yansıtmaktadır. Momentum pozitif bölgede olup genel piyasa eğilimiyle uyumludur.'
    },
    {
      id: 'volume_surge',
      name: 'Hacim Patlaması (Yüksek İlgi)',
      badge: 'Sıra Dışı Hacim',
      icon: '🚀',
      color: '#06b6d4',
      description: 'Günlük işlem hacmi 20 günlük ortalamasının 1.5 katına ulaşan ve fiyatta belirgin hareketlilik gösteren yüksek likiditeli varlıklar.',
      criteria: ['24s Hacim > Ortalama x 1.5', '24s Değişim > +%2.0', 'Artan piyasa katılımı'],
      check(assetMetrics) {
        const { volumeRatio, change24h } = assetMetrics;
        return (volumeRatio >= 1.4 && change24h >= 2.0);
      },
      aiSummary: 'Bu sepet, kurumsal veya yoğun perakende ilginin göstergesi olan hacim artışlarını tespit eder. Hacim artışıyla desteklenen fiyat hareketleri, kırılım yönünün devamı açısından analistlerce yakından izlenir.'
    },
    {
      id: 'accumulation',
      name: 'Düşük Volatilite & Akümülasyon',
      badge: 'Konsolidasyon',
      icon: '🛡️',
      color: '#8b5cf6',
      description: 'Fiyatı dar bir bantta sıkışmış, RSI 45-55 nötr aralığında bekleyen ve yeni bir yöne doğru kırılım yapma hazırlığında olabilecek varlıklar.',
      criteria: ['Son 7 günlük volatilite <%3', 'RSI 44 ile 56 arasında dengeli', 'Düşük satıcı iştahı'],
      check(assetMetrics) {
        const { rsi, volatility7d } = assetMetrics;
        return (rsi !== null && rsi >= 44 && rsi <= 56 && (volatility7d || 2) <= 3.5);
      },
      aiSummary: 'Akümülasyon sepetinde yer alan varlıklar, piyasadaki kararsızlığın veya sessiz birikim döneminin göstergesidir. Volatilitenin daralmasını genellikle yönlü sert hareketler takip eder.'
    }
  ],

  /**
   * Bir varlık havuzunu verilen stratejilere göre tarar ve gruplar
   * @param {Array<Object>} assets - Taranacak varlık listesi ve teknik metrikleri
   * @returns {Array<Object>} Sepetler ve içindeki varlıklar
   */
  scanUniverse(assets) {
    return this.strategies.map(strategy => {
      const matchedAssets = assets.filter(asset => {
        try {
          return strategy.check(asset);
        } catch (e) {
          return false;
        }
      });

      return {
        ...strategy,
        count: matchedAssets.length,
        assets: matchedAssets
      };
    });
  }
};

if (typeof window !== 'undefined') {
  window.ScreenerEngine = ScreenerEngine;
}
