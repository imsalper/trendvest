# 🛡️ TrendVest Cloudflare Worker Dağıtım Rehberi

TrendVest, tıpkı **Dualog** ve **Bloom** projelerinde olduğu gibi Finnhub ve AI (OpenAI/Anthropic) API anahtarlarınızı tamamen sunucu tarafında (secret olarak) saklar. İstemci tarafındaki tarayıcı kodunda hiçbir özel anahtar bulunmaz.

---

## 🚀 1. Adım: Cloudflare Dashboard Üzerinden Dağıtım (En Kolay Yol)

1. [Cloudflare Dashboard](https://dash.cloudflare.com/)'a giriş yapın.
2. Sol menüden **Workers & Pages** bölümüne gidin ve **Create application** > **Create Worker** butonuna tıklayın.
3. Worker adını `trendvest-proxy` yapın ve **Deploy** deyin.
4. **Edit code** butonuna tıklayın ve içindeki tüm kodu silip `worker/worker.js` dosyasının içeriğini yapıştırın. Ardından **Save and deploy** deyin.

---

## 🔑 2. Adım: Secret (Gizli API Anahtarları) Tanımlama

Worker sayfasında **Settings** > **Variables and Secrets** sekmesine gelin ve şu anahtarları ekleyin:

| Secret Adı | Değer | Açıklama |
|---|---|---|
| `FINNHUB_API_KEY` | `senin_finnhub_keyin` | Finnhub ücretsiz API anahtarınız |
| `OPENAI_API_KEY` | `sk-...` | OpenAI GPT-4o-mini anahtarınız *(veya Anthropic)* |
| `ANTHROPIC_API_KEY` | `sk-ant-...` | *(Opsiyonel)* Claude 3.5 Haiku kullanmak isterseniz |

---

## ⚡ 3. Adım: TrendVest Frontend'ine Bağlama

Worker URL'niz hazır olduğunda (örneğin: `https://trendvest-proxy.imsalper.workers.dev`):
- TrendVest web sayfasındaki sağ üstteki ⚙️ **Ayarlar** simgesine tıklayın.
- **Cloudflare Worker URL** alanına bu adresi yapıştırıp **Kaydet** deyin.
- Adres `localStorage` üzerinde saklanacaktır.

*(Worker kurulmadan önce de uygulama yerleşik algoritmik simülasyon ve açık CoinGecko verileri ile sorunsuz çalışır).*
