/**
 * TrendVest — TradingView Lightweight Charts Entegrasyonu
 * Mum grafik (Candlestick), Hacim (Histogram) ve Hareketli Ortalama katmanları yönetir.
 */

class TrendVestChart {
  constructor(containerId) {
    this.container = typeof containerId === 'string' ? document.getElementById(containerId) : containerId;
    this.chart = null;
    this.candleSeries = null;
    this.volumeSeries = null;
    this.sma20Series = null;
    this.sma50Series = null;
    this.ema20Series = null;
    this.resizeObserver = null;

    this.activeIndicators = {
      volume: true,
      sma20: true,
      sma50: false,
      ema20: false
    };

    this.rawCandles = [];
    this.initChart();
  }

  initChart() {
    if (!this.container) return;
    if (typeof LightweightCharts === 'undefined') {
      console.warn('LightweightCharts CDN henüz yüklenmedi, bekleniyor...');
      return;
    }

    // Eski grafiği temizle
    if (this.chart) {
      this.chart.remove();
      this.chart = null;
    }

    const chartOptions = {
      layout: {
        background: { color: '#0b0f19' },
        textColor: '#94a3b8',
        fontSize: 12,
        fontFamily: "'JetBrains Mono', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
      },
      grid: {
        vertLines: { color: 'rgba(255, 255, 255, 0.04)' },
        horzLines: { color: 'rgba(255, 255, 255, 0.04)' }
      },
      crosshair: {
        mode: LightweightCharts.CrosshairMode.Normal,
        vertLine: {
          width: 1,
          color: 'rgba(148, 163, 184, 0.4)',
          style: LightweightCharts.LineStyle.Dashed
        },
        horzLine: {
          width: 1,
          color: 'rgba(148, 163, 184, 0.4)',
          style: LightweightCharts.LineStyle.Dashed
        }
      },
      rightPriceScale: {
        borderColor: 'rgba(255, 255, 255, 0.08)',
        visible: true,
        autoScale: true,
        scaleMargins: {
          top: 0.1,
          bottom: 0.25
        }
      },
      timeScale: {
        borderColor: 'rgba(255, 255, 255, 0.08)',
        timeVisible: true,
        secondsVisible: false
      },
      handleScroll: {
        vertTouchDrag: false
      }
    };

    this.chart = LightweightCharts.createChart(this.container, chartOptions);

    // Mum Serisi (Candlestick)
    this.candleSeries = this.chart.addCandlestickSeries({
      upColor: '#10b981',
      downColor: '#ef4444',
      borderVisible: false,
      wickUpColor: '#10b981',
      wickDownColor: '#ef4444'
    });

    // Hacim Serisi (Volume Histogram - Altta %25 alan)
    this.volumeSeries = this.chart.addHistogramSeries({
      color: '#3b82f6',
      priceFormat: {
        type: 'volume'
      },
      priceScaleId: 'volume_scale'
    });

    this.chart.priceScale('volume_scale').applyOptions({
      scaleMargins: {
        top: 0.8,
        bottom: 0
      }
    });

    // SMA 20 Serisi (Sarı / Amber Çizgi)
    this.sma20Series = this.chart.addLineSeries({
      color: '#f59e0b',
      lineWidth: 2,
      title: 'SMA 20',
      priceLineVisible: false
    });

    // SMA 50 Serisi (Mavi Çizgi)
    this.sma50Series = this.chart.addLineSeries({
      color: '#38bdf8',
      lineWidth: 2,
      title: 'SMA 50',
      priceLineVisible: false
    });

    // EMA 20 Serisi (Mor Çizgi)
    this.ema20Series = this.chart.addLineSeries({
      color: '#a855f7',
      lineWidth: 2,
      title: 'EMA 20',
      priceLineVisible: false
    });

    // Responsive Boyutlandırma
    this.setupResizeObserver();
  }

  setupResizeObserver() {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }

    this.resizeObserver = new ResizeObserver(entries => {
      if (!entries || entries.length === 0 || !this.chart) return;
      const { width, height } = entries[0].contentRect;
      if (width > 0 && height > 0) {
        this.chart.applyOptions({ width, height });
      }
    });

    this.resizeObserver.observe(this.container);
  }

  /**
   * Grafiği veriyle besler
   * @param {Array<{time: number|string, open: number, high: number, low: number, close: number, volume?: number}>} candles
   */
  setData(candles) {
    if (!this.chart) this.initChart();
    if (!this.chart || !candles || candles.length === 0) return;

    this.rawCandles = candles;

    // Mum verilerini yükle
    const candleData = candles.map(c => ({
      time: c.time,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close
    }));
    this.candleSeries.setData(candleData);

    // Hacim verilerini yükle
    if (this.volumeSeries) {
      const volumeData = candles.map(c => ({
        time: c.time,
        value: c.volume || 0,
        color: (c.close >= c.open) ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)'
      }));
      this.volumeSeries.setData(this.activeIndicators.volume ? volumeData : []);
    }

    // Göstergeleri hesapla ve yükle
    this.updateIndicators();

    // Zaman eksenini optimize sığdır
    this.chart.timeScale().fitContent();
  }

  /**
   * İstemci tarafı SMA ve EMA hesaplayıp çizgilere atar
   */
  updateIndicators() {
    if (!this.rawCandles || this.rawCandles.length === 0) return;
    if (typeof TechnicalIndicators === 'undefined') return;

    // SMA 20
    if (this.activeIndicators.sma20 && this.sma20Series) {
      const sma20 = TechnicalIndicators.calculateSMA(this.rawCandles, 20);
      this.sma20Series.setData(sma20);
    } else if (this.sma20Series) {
      this.sma20Series.setData([]);
    }

    // SMA 50
    if (this.activeIndicators.sma50 && this.sma50Series) {
      const sma50 = TechnicalIndicators.calculateSMA(this.rawCandles, 50);
      this.sma50Series.setData(sma50);
    } else if (this.sma50Series) {
      this.sma50Series.setData([]);
    }

    // EMA 20
    if (this.activeIndicators.ema20 && this.ema20Series) {
      const ema20 = TechnicalIndicators.calculateEMA(this.rawCandles, 20);
      this.ema20Series.setData(ema20);
    } else if (this.ema20Series) {
      this.ema20Series.setData([]);
    }
  }

  /**
   * Göstergeyi aç/kapat
   */
  toggleIndicator(indicatorName, isVisible) {
    if (this.activeIndicators.hasOwnProperty(indicatorName)) {
      this.activeIndicators[indicatorName] = isVisible;
      if (indicatorName === 'volume' && this.volumeSeries) {
        if (isVisible) {
          const volumeData = this.rawCandles.map(c => ({
            time: c.time,
            value: c.volume || 0,
            color: (c.close >= c.open) ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)'
          }));
          this.volumeSeries.setData(volumeData);
        } else {
          this.volumeSeries.setData([]);
        }
      } else {
        this.updateIndicators();
      }
    }
  }

  destroy() {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
    if (this.chart) {
      this.chart.remove();
      this.chart = null;
    }
  }
}

if (typeof window !== 'undefined') {
  window.TrendVestChart = TrendVestChart;
}
