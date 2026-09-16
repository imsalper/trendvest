/**
 * TrendVest — İstemci Tarafı Teknik Göstergeler Motoru (Client-side Technical Indicators)
 * Saf JavaScript ile SMA, EMA, RSI, MACD ve Trend Sinyali hesaplar.
 */

const TechnicalIndicators = {
  /**
   * Basit Hareketli Ortalama (Simple Moving Average - SMA)
   * @param {Array<{time: number|string, close: number}>} data - Fiyat dizisi
   * @param {number} period - Periyot (örn. 20, 50, 200)
   * @returns {Array<{time: number|string, value: number}>}
   */
  calculateSMA(data, period) {
    if (!data || data.length < period) return [];
    const results = [];
    let sum = 0;

    for (let i = 0; i < data.length; i++) {
      const price = data[i].close ?? data[i].value ?? 0;
      sum += price;

      if (i >= period) {
        const oldPrice = data[i - period].close ?? data[i - period].value ?? 0;
        sum -= oldPrice;
      }

      if (i >= period - 1) {
        results.push({
          time: data[i].time,
          value: Number((sum / period).toFixed(4))
        });
      }
    }
    return results;
  },

  /**
   * Üstel Hareketli Ortalama (Exponential Moving Average - EMA)
   * @param {Array<{time: number|string, close: number}>} data - Fiyat dizisi
   * @param {number} period - Periyot (örn. 12, 20, 26)
   * @returns {Array<{time: number|string, value: number}>}
   */
  calculateEMA(data, period) {
    if (!data || data.length < period) return [];
    const results = [];
    const multiplier = 2 / (period + 1);

    // İlk EMA değeri olarak ilk N periyodun SMA'sı alınır
    let initialSMA = 0;
    for (let i = 0; i < period; i++) {
      initialSMA += (data[i].close ?? data[i].value ?? 0);
    }
    let prevEMA = initialSMA / period;

    results.push({
      time: data[period - 1].time,
      value: Number(prevEMA.toFixed(4))
    });

    for (let i = period; i < data.length; i++) {
      const price = data[i].close ?? data[i].value ?? 0;
      const currentEMA = (price - prevEMA) * multiplier + prevEMA;
      results.push({
        time: data[i].time,
        value: Number(currentEMA.toFixed(4))
      });
      prevEMA = currentEMA;
    }
    return results;
  },

  /**
   * Göreceli Güç Endeksi (Relative Strength Index - RSI 14)
   * Wilder's Smoothing tekniği ile hesaplanır.
   * @param {Array<{time: number|string, close: number}>} data
   * @param {number} period - Varsayılan: 14
   * @returns {Array<{time: number|string, value: number}>}
   */
  calculateRSI(data, period = 14) {
    if (!data || data.length <= period) return [];
    const results = [];

    let gains = 0;
    let losses = 0;

    // İlk periyot için ortalama kazanç ve kayıp
    for (let i = 1; i <= period; i++) {
      const prevClose = data[i - 1].close ?? data[i - 1].value ?? 0;
      const currClose = data[i].close ?? data[i].value ?? 0;
      const change = currClose - prevClose;

      if (change > 0) gains += change;
      else losses += Math.abs(change);
    }

    let avgGain = gains / period;
    let avgLoss = losses / period;

    let rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    let rsi = 100 - (100 / (1 + rs));

    results.push({
      time: data[period].time,
      value: Number(rsi.toFixed(2))
    });

    // Wilder's Smoothing ile kalan barlar
    for (let i = period + 1; i < data.length; i++) {
      const prevClose = data[i - 1].close ?? data[i - 1].value ?? 0;
      const currClose = data[i].close ?? data[i].value ?? 0;
      const change = currClose - prevClose;

      const currentGain = change > 0 ? change : 0;
      const currentLoss = change < 0 ? Math.abs(change) : 0;

      avgGain = ((avgGain * (period - 1)) + currentGain) / period;
      avgLoss = ((avgLoss * (period - 1)) + currentLoss) / period;

      if (avgLoss === 0) {
        rsi = 100;
      } else {
        rs = avgGain / avgLoss;
        rsi = 100 - (100 / (1 + rs));
      }

      results.push({
        time: data[i].time,
        value: Number(rsi.toFixed(2))
      });
    }

    return results;
  },

  /**
   * MACD (Moving Average Convergence Divergence)
   * Standart parametreler: Hızlı=12, Yavaş=26, Sinyal=9
   * @param {Array<{time: number|string, close: number}>} data
   * @param {number} fastPeriod - 12
   * @param {number} slowPeriod - 26
   * @param {number} signalPeriod - 9
   * @returns {{
   *   macd: Array<{time: number|string, value: number}>,
   *   signal: Array<{time: number|string, value: number}>,
   *   histogram: Array<{time: number|string, value: number, color?: string}>
   * }}
   */
  calculateMACD(data, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
    if (!data || data.length < slowPeriod + signalPeriod) {
      return { macd: [], signal: [], histogram: [] };
    }

    const fastEMA = this.calculateEMA(data, fastPeriod);
    const slowEMA = this.calculateEMA(data, slowPeriod);

    // Fast EMA ve Slow EMA zamanlarını senkronize et
    const fastMap = new Map(fastEMA.map(item => [item.time, item.value]));
    const macdLine = [];

    for (const slowItem of slowEMA) {
      const fastVal = fastMap.get(slowItem.time);
      if (fastVal !== undefined) {
        macdLine.push({
          time: slowItem.time,
          close: Number((fastVal - slowItem.value).toFixed(4)),
          value: Number((fastVal - slowItem.value).toFixed(4))
        });
      }
    }

    // Sinyal Hattı: MACD hattının 9 periyotluk EMA'sı
    const signalLine = this.calculateEMA(macdLine, signalPeriod);
    const signalMap = new Map(signalLine.map(item => [item.time, item.value]));

    const histogram = [];
    for (const item of macdLine) {
      const sigVal = signalMap.get(item.time);
      if (sigVal !== undefined) {
        const histValue = Number((item.value - sigVal).toFixed(4));
        histogram.push({
          time: item.time,
          value: histValue,
          color: histValue >= 0 ? '#10b981' : '#ef4444'
        });
      }
    }

    return {
      macd: macdLine.map(m => ({ time: m.time, value: m.value })),
      signal: signalLine,
      histogram
    };
  },

  /**
   * Genel Trend Yönü ve Özet Skor Hesaplayıcı
   * Fiyat, SMA20, SMA50, RSI ve MACD durumlarını harmanlar.
   * @param {Array<{time: number|string, close: number}>} data
   * @returns {{
   *   direction: 'Yükseliş' | 'Düşüş' | 'Yatay',
   *   badgeColor: string,
   *   badgeText: string,
   *   rsi: number|null,
   *   rsiState: string,
   *   macdState: string,
   *   smaState: string,
   *   score: number // -100 ile +100 arası momentum skoru
   * }}
   */
  evaluateTrend(data) {
    if (!data || data.length < 30) {
      return {
        direction: 'Yatay',
        badgeColor: 'neutral',
        badgeText: 'Yatay / Nötr ⚖️',
        rsi: null,
        rsiState: 'Yetersiz Veri',
        macdState: 'Yetersiz Veri',
        smaState: 'Yetersiz Veri',
        score: 0
      };
    }

    const currentPrice = data[data.length - 1].close ?? data[data.length - 1].value;
    const sma20 = this.calculateSMA(data, 20);
    const sma50 = this.calculateSMA(data, 50);
    const rsiList = this.calculateRSI(data, 14);
    const macdResult = this.calculateMACD(data, 12, 26, 9);

    const lastSMA20 = sma20.length ? sma20[sma20.length - 1].value : null;
    const lastSMA50 = sma50.length ? sma50[sma50.length - 1].value : null;
    const lastRSI = rsiList.length ? rsiList[rsiList.length - 1].value : 50;

    const lastMACD = macdResult.macd.length ? macdResult.macd[macdResult.macd.length - 1].value : 0;
    const lastSignal = macdResult.signal.length ? macdResult.signal[macdResult.signal.length - 1].value : 0;
    const lastHist = macdResult.histogram.length ? macdResult.histogram[macdResult.histogram.length - 1].value : 0;

    let score = 0; // -100 (Aşırı Ayı) ile +100 (Aşırı Boğa)

    // 1. SMA Değerlendirmesi
    let smaState = 'Nötr';
    if (lastSMA20 !== null && lastSMA50 !== null) {
      if (currentPrice > lastSMA20 && lastSMA20 > lastSMA50) {
        score += 35;
        smaState = 'Güçlü Boğa Dizilimi (Fiyat > SMA20 > SMA50)';
      } else if (currentPrice > lastSMA20) {
        score += 15;
        smaState = 'Kısa Vadeli Pozitif (Fiyat > SMA20)';
      } else if (currentPrice < lastSMA20 && lastSMA20 < lastSMA50) {
        score -= 35;
        smaState = 'Güçlü Ayı Dizilimi (Fiyat < SMA20 < SMA50)';
      } else if (currentPrice < lastSMA20) {
        score -= 15;
        smaState = 'Kısa Vadeli Negatif (Fiyat < SMA20)';
      }
    }

    // 2. RSI Değerlendirmesi
    let rsiState = 'Dengeli (Nötr Bölge)';
    if (lastRSI >= 70) {
      score += 10;
      rsiState = `Aşırı Alım (${lastRSI}) — Olası Düzeltme Riski`;
    } else if (lastRSI > 55) {
      score += 25;
      rsiState = `Pozitif Momentum (${lastRSI})`;
    } else if (lastRSI <= 30) {
      score -= 10;
      rsiState = `Aşırı Satım (${lastRSI}) — Olası Tepki Alanı`;
    } else if (lastRSI < 45) {
      score -= 25;
      rsiState = `Negatif Baskı (${lastRSI})`;
    }

    // 3. MACD Değerlendirmesi
    let macdState = 'Nötr';
    if (lastHist > 0) {
      if (lastMACD > 0) {
        score += 30;
        macdState = 'Pozitif Bölgede Güçlü Momentum (MACD > Sinyal > 0)';
      } else {
        score += 15;
        macdState = 'Toparlanma Eğilimi (MACD > Sinyal)';
      }
    } else {
      if (lastMACD < 0) {
        score -= 30;
        macdState = 'Negatif Bölgede Satış Baskısı (MACD < Sinyal < 0)';
      } else {
        score -= 15;
        macdState = 'Zayıflama Eğilimi (MACD < Sinyal)';
      }
    }

    // Sonuç Rozeti Belirleme
    let direction = 'Yatay';
    let badgeColor = 'neutral';
    let badgeText = 'Yatay / Nötr ⚖️';

    if (score >= 30) {
      direction = 'Yükseliş';
      badgeColor = 'bullish';
      badgeText = score >= 60 ? 'Güçlü Yükseliş Trendi 🚀' : 'Yükseliş Eğilimi 📈';
    } else if (score <= -30) {
      direction = 'Düşüş';
      badgeColor = 'bearish';
      badgeText = score <= -60 ? 'Güçlü Düşüş Trendi 📉' : 'Düşüş Eğilimi 🔻';
    }

    return {
      direction,
      badgeColor,
      badgeText,
      rsi: lastRSI,
      rsiState,
      macdState,
      smaState,
      score,
      lastSMA20,
      lastSMA50,
      lastMACD,
      lastSignal
    };
  }
};

// Global erişim
if (typeof window !== 'undefined') {
  window.TechnicalIndicators = TechnicalIndicators;
}
