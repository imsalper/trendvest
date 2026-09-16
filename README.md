# 📈 TrendVest — Global Hisse & Kripto Takip + AI Analiz Platformu

> **"Piyasaları Keşfet, Veriyle Analiz Et."**

TrendVest; ABD, Avrupa, Borsa İstanbul (BIST) ve Kripto para piyasalarını tek bir modern çatı altında toplayan; **TradingView Lightweight Charts** ile profesyonel grafikler sunan; **SMA, EMA, RSI ve MACD** göstergelerini istemci tarafında saf JavaScript ile hesaplayan; kural tabanlı **Potansiyel Sepetler** ve **Cloudflare Worker** arkasındaki güvenli AI desteğiyle finansal piyasaları anlaşılır kılan yeni nesil bir analiz platformudur.

---

## 🌐 Temel Özellikler ve Ekranlar

| Ekran | Başlık | Özellikler |
| :---: | :--- | :--- |
| **1** | **Piyasalar & Arama** | Hisse senetleri (Finnhub) ve Kripto paraları (CoinGecko) eşzamanlı arama, dinamik otomatik tamamlama, favoriler (Watchlist), bölgesel ve küresel öne çıkanlar. |
| **2** | **Detay & Grafik** | Anlık fiyat, 24s/7g değişimler, TradingView mum & hacim grafikleri (1G, 1H, 1A, 1Y, 5Y, TÜMÜ), istemci tarafı teknik göstergeler, dinamik trend yönü rozeti, şirket profili ve son haberler. |
| **3** | **AI Yorum Paneli** | Fiyat aksiyonu ve teknik göstergeleri değerlendiren profesyonel durum analizi. *(Zorunlu kural: Asla al/sat tavsiyesi içermez, salt analitiktir).* |
| **4** | **Potansiyel Sepetler** | İstatiksel kurallarla (RSI Toparlanma, Golden Cross, Hacim Patlaması, Konsolidasyon) taranan sepetler, AI strateji özeti ve büyük yasal sorumluluk uyarısı. |

---

## 🌍 Konuma Göre Otomatik Borsa Tespiti

Kullanıcıdan tarayıcı izin pop-up'ı talep edilmeksizin, IP tabanlı ülke tespiti (`ipapi.co` / `ip-api.com`) yapılır:
- 🇹🇷 **Türkiye:** Otomatik olarak **BIST** hisseleri öne çıkarılır. *(Finnhub ücretsiz katmanı gereği BIST verisi sınırlı olduğunda zarif bir bilgilendirme rozeti açılır).*
- 🇺🇸 **ABD:** **NASDAQ / NYSE** hisseleri öne çıkarılır.
- 🇩🇪 **Almanya:** **XETRA** hisseleri öne çıkarılır.
- Kullanıcı dilediği an üst menüdeki **Bölge: [Değiştir ▾]** butonundan borsasını elle değiştirebilir.

---

## 🛡️ Güvenlik ve Mimari (Dualog & Bloom Standardı)

```
[Kullanıcı Tarayıcısı (HTML5 / Vanilla JS)]
       │
       ├─ (1) Saf JS ile İstemci Tarafı Teknik Hesaplamalar (SMA, EMA, RSI, MACD)
       ├─ (2) TradingView Lightweight Charts Mum + Hacim Çizimi
       │
       ▼  GET /api/finnhub/*  &  POST /api/ai/analyze
[Cloudflare Worker Backend Proxy]
(trendvest-proxy.imsalper.workers.dev)
       │
       ├─ 60 Saniyelik Akıllı Önbellek (Finnhub 60 req/dk kotasını korur)
       │
       ├──► [Finnhub API] (FINNHUB_API_KEY gizli tutulur)
       ├──► [CoinGecko API] (Kripto verileri)
       └──► [OpenAI / Anthropic API] (AI_API_KEY gizli tutulur, katı yasal kural denetimi)
```

---

## 💻 Yerel Geliştirme ve Çalıştırma

Projeyi bilgisayarınızda çalıştırmak için herhangi bir kurulum (npm/node) zorunluluğu yoktur:

```bash
# TrendVest proje dizinine gidin:
cd trendvest

# Python ile yerel web sunucusunu başlatın:
python3 -m http.server 8089
```

Tarayıcınızda `http://localhost:8089` adresini açarak uygulamayı doğrudan test edebilirsiniz.

---

## ⚖️ Zorunlu Yasal Uyarı

TrendVest yatırım danışmanlığı faaliyeti yürütmez. Sunulan grafikler, teknik göstergeler, tarama sepetleri ve yapay zeka analizleri eğitim ve istatistiksel bilgilendirme amaçlıdır; **kesinlikle yatırım tavsiyesi (al/sat/tut) niteliği taşımaz**.
