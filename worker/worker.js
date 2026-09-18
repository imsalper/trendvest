/**
 * TrendVest — Cloudflare Worker API Proxy & AI Analiz Ağ Geçidi
 * 
 * Güvenlik Mimarisi:
 * - Finnhub API Key ve OpenAI/Anthropic API Key sunucu ortam değişkenlerinde (secret) tutulur.
 * - İstemciden gelen isteklere 60 saniyelik HTTP ve Worker Cache uygulanır (Finnhub kota koruması).
 * - Sıkı yasal kurallı AI finansal durum özeti üretilir (asla al/sat tavsiyesi içermez).
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
  'Access-Control-Max-Age': '86400',
};

export default {
  async fetch(request, env, ctx) {
    // OPTIONS Preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    const url = new URL(request.url);
    const pathname = url.pathname;

    try {
      // 1. Sağlık Kontrolü (Health Check)
      if (pathname === '/' || pathname === '/api/health') {
        return jsonResponse({
          status: 'ok',
          service: 'TrendVest Proxy & AI Gateway',
          timestamp: new Date().toISOString(),
          hasFinnhubKey: Boolean(env.FINNHUB_API_KEY),
          hasOpenAIKey: Boolean(env.OPENAI_API_KEY),
          hasAnthropicKey: Boolean(env.ANTHROPIC_API_KEY)
        });
      }

      // 2. Finnhub Proxy Uç Noktaları (60s Cache)
      if (pathname.startsWith('/api/finnhub/')) {
        return await handleFinnhub(request, env, ctx, url);
      }

      // 3. CoinGecko Proxy Uç Noktaları (60s Cache)
      if (pathname.startsWith('/api/coingecko/')) {
        return await handleCoinGecko(request, env, ctx, url);
      }

      // 3b. Döviz Kuru Proxy Uç Noktası (Frankfurter.app, 1 saatlik cache)
      if (pathname === '/api/fx/rate') {
        return await handleFxRate(request, ctx, url);
      }

      // 3c. Sepet Görüntüleme İçin Canlı Fiyat (BIST: Yahoo Finance, Kripto: Kraken)
      if (pathname === '/api/live-price') {
        return await handleLivePrice(url);
      }

      // 3d. Tüm Borsa İstanbul hisselerinde arama ve anlık özet (Yahoo Finance, 1 saat / 60 sn cache)
      if (pathname === '/api/bist/search') {
        return await handleBistSearch(request, ctx, url);
      }
      if (pathname === '/api/bist/quote') {
        return await handleBistQuote(request, ctx, url);
      }

      // 4. AI Analiz Uç Noktası
      if (pathname === '/api/ai/analyze' && request.method === 'POST') {
        return await handleAIAnalysis(request, env);
      }

      // 5. AI Sepet Yorum Uç Noktası
      if (pathname === '/api/ai/screen-comment' && request.method === 'POST') {
        return await handleAIScreenComment(request, env);
      }

      // 6. AI Hisse Önerileri Uç Noktası
      if (pathname === '/api/ai/recommendations' && request.method === 'POST') {
        return await handleAIRecommendations(request, env);
      }

      return jsonResponse({ error: 'Uç nokta bulunamadı' }, 404);
    } catch (err) {
      return jsonResponse({ error: err.message || 'Sunucu hatası' }, 500);
    }
  },

  // 🤖 Otomatik AI Sepet Botu — Cloudflare Cron Trigger ile 7/24 çalışır
  async scheduled(event, env, ctx) {
    ctx.waitUntil(runAutoTradingBot(env));
  }
};

/**
 * Finnhub API İsteklerini Yönetir ve Önbelleğe Alır
 */
async function handleFinnhub(request, env, ctx, url) {
  const finnhubKey = env.FINNHUB_API_KEY;
  if (!finnhubKey) {
    return jsonResponse({ error: 'FINNHUB_API_KEY Cloudflare Worker secret olarak tanımlanmamış.' }, 500);
  }

  // Önbellek kontrolü (Cloudflare Cache API)
  const cacheKey = new Request(url.toString(), request);
  const cache = caches.default;
  let cachedResponse = await cache.match(cacheKey);
  if (cachedResponse) {
    return cachedResponse;
  }

  const endpoint = url.pathname.replace('/api/finnhub/', '');
  let finnhubUrl = `https://finnhub.io/api/v1/`;

  if (endpoint === 'quote') {
    const symbol = url.searchParams.get('symbol') || 'AAPL';
    finnhubUrl += `quote?symbol=${encodeURIComponent(symbol)}&token=${finnhubKey}`;
  } else if (endpoint === 'candle') {
    const symbol = url.searchParams.get('symbol') || 'AAPL';
    const resolution = url.searchParams.get('resolution') || 'D';
    const from = url.searchParams.get('from') || Math.floor((Date.now() - 30 * 86400000) / 1000);
    const to = url.searchParams.get('to') || Math.floor(Date.now() / 1000);
    finnhubUrl += `stock/candle?symbol=${encodeURIComponent(symbol)}&resolution=${resolution}&from=${from}&to=${to}&token=${finnhubKey}`;
  } else if (endpoint === 'search') {
    const q = url.searchParams.get('q') || '';
    finnhubUrl += `search?q=${encodeURIComponent(q)}&token=${finnhubKey}`;
  } else if (endpoint === 'profile') {
    const symbol = url.searchParams.get('symbol') || 'AAPL';
    finnhubUrl += `stock/profile2?symbol=${encodeURIComponent(symbol)}&token=${finnhubKey}`;
  } else if (endpoint === 'news') {
    const symbol = url.searchParams.get('symbol') || 'AAPL';
    const toDate = new Date().toISOString().split('T')[0];
    const fromDate = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
    finnhubUrl += `company-news?symbol=${encodeURIComponent(symbol)}&from=${fromDate}&to=${toDate}&token=${finnhubKey}`;
  } else {
    return jsonResponse({ error: 'Geçersiz Finnhub uç noktası' }, 400);
  }

  const res = await fetch(finnhubUrl, {
    headers: { 'Accept': 'application/json' }
  });

  const data = await res.json();
  const response = new Response(JSON.stringify(data), {
    status: res.status,
    headers: {
      ...CORS_HEADERS,
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=60' // 60 saniyelik cache
    }
  });

  // Başarılı yanıtları Cloudflare önbelleğine ekle
  if (res.ok) {
    ctx.waitUntil(cache.put(cacheKey, response.clone()));
  }

  return response;
}

/**
 * CoinGecko API İsteklerini Yönetir ve Önbelleğe Alır
 */
async function handleCoinGecko(request, env, ctx, url) {
  const cacheKey = new Request(url.toString(), request);
  const cache = caches.default;
  let cachedResponse = await cache.match(cacheKey);
  if (cachedResponse) {
    return cachedResponse;
  }

  const endpoint = url.pathname.replace('/api/coingecko/', '');
  let cgUrl = `https://api.coingecko.com/api/v3/`;

  if (endpoint === 'price') {
    const ids = url.searchParams.get('ids') || 'bitcoin,ethereum';
    cgUrl += `simple/price?ids=${encodeURIComponent(ids)}&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true&include_market_cap=true`;
  } else if (endpoint === 'search') {
    const query = url.searchParams.get('query') || '';
    cgUrl += `search?query=${encodeURIComponent(query)}`;
  } else if (endpoint === 'market_chart') {
    const id = url.searchParams.get('id') || 'bitcoin';
    const days = url.searchParams.get('days') || '30';
    cgUrl += `coins/${encodeURIComponent(id)}/market_chart?vs_currency=usd&days=${days}`;
  } else if (endpoint === 'coins') {
    const id = url.searchParams.get('id') || 'bitcoin';
    cgUrl += `coins/${encodeURIComponent(id)}?localization=false&tickers=false&community_data=false&developer_data=false`;
  } else {
    return jsonResponse({ error: 'Geçersiz CoinGecko uç noktası' }, 400);
  }

  const res = await fetch(cgUrl, {
    headers: {
      'Accept': 'application/json',
      'User-Agent': 'TrendVest-Platform/1.0'
    }
  });

  const data = await res.json();
  const response = new Response(JSON.stringify(data), {
    status: res.status,
    headers: {
      ...CORS_HEADERS,
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=60'
    }
  });

  if (res.ok) {
    ctx.waitUntil(cache.put(cacheKey, response.clone()));
  }

  return response;
}

/**
 * Döviz Kuru Proxy (Frankfurter.app) — Tarayıcıdan doğrudan erişimde CORS engeline takılır,
 * bu yüzden Worker üzerinden 1 saatlik önbellekle sunulur.
 */
async function handleFxRate(request, ctx, url) {
  const from = (url.searchParams.get('from') || 'USD').toUpperCase();
  const to = (url.searchParams.get('to') || 'TRY').toUpperCase();

  if (to === from) {
    return jsonResponse({ from, to, rate: 1.0 });
  }

  const cacheKey = new Request(url.toString(), request);
  const cache = caches.default;
  const cachedResponse = await cache.match(cacheKey);
  if (cachedResponse) return cachedResponse;

  const res = await fetch(`https://api.frankfurter.app/latest?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`, {
    headers: { 'Accept': 'application/json' }
  });
  const data = await res.json();
  const rate = data?.rates?.[to];

  const response = new Response(JSON.stringify({ from, to, rate: rate ?? null }), {
    status: res.status,
    headers: {
      ...CORS_HEADERS,
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600'
    }
  });

  if (res.ok && rate) {
    ctx.waitUntil(cache.put(cacheKey, response.clone()));
  }

  return response;
}

// Sepetteki BIST/kripto varlıkların güncel fiyatını, botun kullandığı aynı
// kaynaklarla (Yahoo Finance / Kraken) döndürür — ASSET_UNIVERSE'deki statik
// örnek fiyatlarla karışıp yanlış kâr/zarar göstermesin diye.
async function cachedJson(request, ctx, url, maxAgeSec, producer) {
  const cacheKey = new Request(url.toString(), request);
  const cache = caches.default;
  const hit = await cache.match(cacheKey);
  if (hit) return hit;
  const body = await producer();
  const response = new Response(JSON.stringify(body), {
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json', 'Cache-Control': `public, max-age=${maxAgeSec}` }
  });
  ctx.waitUntil(cache.put(cacheKey, response.clone()));
  return response;
}

// Uygulamadaki sabit listede olmayan BIST hisseleri için: Yahoo aramasında sadece İstanbul (IST) sonuçları
async function handleBistSearch(request, ctx, url) {
  const q = (url.searchParams.get('q') || '').trim();
  if (q.length < 2) return jsonResponse({ results: [] });

  return cachedJson(request, ctx, url, 3600, async () => {
    const res = await fetch(`https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(q)}&quotesCount=15&newsCount=0`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; TrendVestBot/1.0)' }
    });
    const data = await res.json().catch(() => ({}));
    const results = (data.quotes || [])
      .filter(item => item.exchange === 'IST' && item.quoteType === 'EQUITY' && /\.IS$/.test(item.symbol || ''))
      .map(item => ({
        symbol: item.symbol.replace(/\.IS$/, ''),
        name: item.longname || item.shortname || item.symbol,
        type: 'bist',
        exchange: 'BIST'
      }));
    return { results };
  });
}

// Tek bir BIST hissesinin canlı fiyatı, günlük değişimi ve tarayıcının kullandığı gösterge alanları
async function handleBistQuote(request, ctx, url) {
  const symbol = (url.searchParams.get('symbol') || '').toUpperCase().replace(/\.IS$/, '');
  if (!/^[A-Z0-9]{2,8}$/.test(symbol)) return jsonResponse({ error: 'Geçersiz sembol' }, 400);

  return cachedJson(request, ctx, url, 60, async () => {
    const res = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}.IS?interval=1d&range=3mo`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; TrendVestBot/1.0)' }
    });
    const data = await res.json().catch(() => ({}));
    const result = data?.chart?.result?.[0];
    const quote = result?.indicators?.quote?.[0] || {};
    const closes = (quote.close || []).filter(c => typeof c === 'number');
    const volumes = (quote.volume || []).filter(v => typeof v === 'number');
    if (!result || closes.length < 2) return { symbol, error: 'Veri bulunamadı' };

    const price = result.meta?.regularMarketPrice ?? closes[closes.length - 1];
    const prevClose = closes[closes.length - 2];
    const lastVolume = volumes[volumes.length - 1] || 0;
    const avgVolume = volumes.length ? volumes.slice(-20).reduce((a, b) => a + b, 0) / Math.min(20, volumes.length) : 0;
    return {
      symbol,
      name: result.meta?.longName || result.meta?.shortName || symbol,
      type: 'bist',
      exchange: 'BIST',
      basePrice: price,
      change24h: prevClose ? Math.round(((price - prevClose) / prevClose) * 10000) / 100 : 0,
      volume: lastVolume,
      rsi: calculateRSI(closes, 14),
      sma20: Math.round(calculateSMA(closes, 20) * 100) / 100,
      sma50: Math.round(calculateSMA(closes, Math.min(50, closes.length)) * 100) / 100,
      volumeRatio: avgVolume ? Math.round((lastVolume / avgVolume) * 100) / 100 : 1
    };
  });
}

async function handleLivePrice(url) {
  const symbol = (url.searchParams.get('symbol') || '').toUpperCase();
  const type = (url.searchParams.get('type') || '').toLowerCase();
  if (!symbol || !['bist', 'crypto'].includes(type)) {
    return jsonResponse({ error: 'symbol ve type=bist|crypto parametreleri gerekli' }, 400);
  }

  let price = null;
  if (type === 'bist') {
    const candles = await fetchBistCandles(symbol);
    price = candles ? candles.lastPrice : null;
  } else {
    price = await fetchCryptoSpotPrice(symbol);
  }

  return jsonResponse({ symbol, type, price });
}

/**
 * AI Analizini Yapar (OpenAI veya Anthropic)
 */
async function handleAIAnalysis(request, env) {
  const body = await request.json();
  const { asset, technicals, timeframe } = body;

  if (!asset || !technicals) {
    return jsonResponse({ error: 'Varlık ve teknik gösterge verisi eksik.' }, 400);
  }

  const systemPrompt = `Sen TrendVest finansal veri analitiği platformunun uzman analist modelisin.
GÖREVİN: Kullanıcının sağladığı hisse senedi veya kripto paraya ait son fiyat hareketlerini ve teknik göstergeleri (SMA, EMA, RSI, MACD, Trend skoru) analiz ederek sade, duru ve profesyonel Türkçe bir piyasa durumu özeti üretmektir.

KRİTİK VE ZORUNLU YASAL KURALLAR:
1. KESİNLİKLE 'al', 'sat', 'tut', 'hedef fiyat', 'kesin yükselecek', 'düşecek' gibi hiçbir doğrudan yatırım tavsiyesi verme.
2. Yalnızca mevcut matematiksel göstergelerin ve fiyat aksiyonunun neye işaret ettiğini nesnel olarak açıkla.
3. Yanıtını şu 3 başlık altında yapılandır:
   - 📊 Genel Trend ve Fiyat Hareketi
   - ⚡ Teknik Göstergelerin Dili (RSI, MACD, Hareketli Ortalamalar)
   - 🔍 Takip Edilmesi Gereken Teknik Eşikler & Risk Faktörleri
4. En sonda şu yasal uyarıyı aynen bırak:
   "⚠️ Yasal Uyarı: Bu analiz tamamen teknik verilere dayalı algoritmik bir özet olup yatırım danışmanlığı veya tavsiyesi niteliği taşımaz."`;

  const userPrompt = `Lütfen şu varlık için teknik durum analizini hazırla:
- Varlık: ${asset.name} (${asset.symbol}) [Tür: ${asset.type === 'crypto' ? 'Kripto Para' : 'Hisse Senedi'}]
- Güncel Fiyat: $${asset.price}
- 24s Değişim: %${asset.change24h}
- Seçili Zaman Aralığı: ${timeframe || '1 Aylık'}
- Teknik Trend Yönü: ${technicals.direction} (Rozet: ${technicals.badgeText})
- Momentum Skoru: ${technicals.score} / 100
- RSI (14): ${technicals.rsi} (${technicals.rsiState})
- SMA Durumu: ${technicals.smaState} (SMA20: $${technicals.lastSMA20 || '-'}, SMA50: $${technicals.lastSMA50 || '-'})
- MACD Durumu: ${technicals.macdState}`;

  // OpenAI veya Anthropic üzerinden üretim
  if (env.OPENAI_API_KEY) {
    const aiResponse = await callOpenAI(env.OPENAI_API_KEY, systemPrompt, userPrompt);
    return jsonResponse({ analysis: aiResponse, provider: 'OpenAI' });
  } else if (env.ANTHROPIC_API_KEY) {
    const aiResponse = await callAnthropic(env.ANTHROPIC_API_KEY, systemPrompt, userPrompt);
    return jsonResponse({ analysis: aiResponse, provider: 'Anthropic' });
  } else {
    // API anahtarı yoksa kural tabanlı akıllı simülasyon özeti döndür
    const simulatedResponse = generateRuleBasedSummary(asset, technicals);
    return jsonResponse({ 
      analysis: simulatedResponse, 
      provider: 'TrendVest-Algorithmic-Engine',
      notice: 'Sunucuda AI_API_KEY tanımlı olmadığı için yerleşik algoritmik analiz motoru kullanıldı.' 
    });
  }
}

/**
 * AI Sepet Yorumunu Yapar
 */
async function handleAIScreenComment(request, env) {
  const body = await request.json();
  const { strategyName, strategyDesc, matchedCount, sampleAssets } = body;

  const prompt = `${strategyName} stratejisi ile yapılan kural tabanlı taramada ${matchedCount} adet varlık tespit edildi. 
Kriterler: ${strategyDesc}.
Örnek varlıklar: ${(sampleAssets || []).join(', ')}.
Bu stratejinin finansal piyasalardaki mantığını ve yatırımcıların bu teknik gösterge kombinasyonunu neden izlediğini 2 kısa paragrafta açıkla. Asla al/sat tavsiyesi verme.`;

  if (env.OPENAI_API_KEY) {
    const res = await callOpenAI(env.OPENAI_API_KEY, "Sen tarafsız bir finansal piyasa analistisin. Asla yatırım tavsiyesi verme.", prompt);
    return jsonResponse({ commentary: res });
  } else if (env.ANTHROPIC_API_KEY) {
    const res = await callAnthropic(env.ANTHROPIC_API_KEY, "Sen tarafsız bir finansal piyasa analistisin. Asla yatırım tavsiyesi verme.", prompt);
    return jsonResponse({ commentary: res });
  } else {
    return jsonResponse({
      commentary: `${strategyName} sepeti, kural tabanlı matematiksel filtreleme ile oluşturulmuştur. Bu gösterge bileşimi, piyasadaki momentum ve hacim dinamiklerini takip etmek için analistlerce sıkça kullanılan istatistiksel bir tarama yöntemidir.`
    });
  }
}

/**
 * AI Hisse Önerileri (Teknik Öne Çıkanlar) Üretir
 */
async function handleAIRecommendations(request, env) {
  const body = await request.json();
  const { assets } = body;

  if (!Array.isArray(assets) || assets.length === 0) {
    return jsonResponse({ error: 'Varlık listesi eksik.' }, 400);
  }

  const systemPrompt = `Sen TrendVest platformunun tarafsız teknik analiz motorusun.
GÖREVİN: Sana verilen, kural tabanlı bir skorlama ile önceden seçilmiş hisse senetlerinin her biri için 2-3 cümlelik, sade Türkçe bir "neden teknik olarak öne çıktı" açıklaması üretmektir.
KRİTİK VE ZORUNLU YASAL KURALLAR:
1. KESİNLİKLE 'al', 'sat', 'tut', 'hedef fiyat' gibi hiçbir doğrudan yatırım tavsiyesi verme.
2. Yalnızca verilen teknik göstergelerin (RSI, trend, hacim, değişim) neye işaret ettiğini nesnel olarak açıkla.
3. Yanıtını HER hisse için ayrı ayrı, tam olarak şu formatta ver (başka hiçbir şey ekleme):
### SEMBOL
<2-3 cümlelik teknik açıklama>`;

  const userPrompt = `Aşağıdaki hisseler için teknik öne çıkma açıklaması üret:\n\n` +
    assets.map(a => `- ${a.symbol} (${a.name}): Fiyat $${a.price}, 24s Değişim %${a.change24h}, RSI ${a.rsi}, Trend: ${a.trendDirection}, Skor: ${a.score}/100`).join('\n');

  let rawText;
  if (env.OPENAI_API_KEY) {
    rawText = await callOpenAI(env.OPENAI_API_KEY, systemPrompt, userPrompt);
  } else if (env.ANTHROPIC_API_KEY) {
    rawText = await callAnthropic(env.ANTHROPIC_API_KEY, systemPrompt, userPrompt);
  } else {
    return jsonResponse({
      recommendations: assets.map(a => ({ symbol: a.symbol, highlight: generateRuleBasedHighlight(a) })),
      provider: 'TrendVest-Algorithmic-Engine'
    });
  }

  const recommendations = parseRecommendationSections(rawText, assets);
  return jsonResponse({ recommendations, provider: env.OPENAI_API_KEY ? 'OpenAI' : 'Anthropic' });
}

function parseRecommendationSections(rawText, assets) {
  const sections = (rawText || '').split(/###\s+/).map(s => s.trim()).filter(Boolean);
  const bySymbol = {};
  sections.forEach(section => {
    const [firstLine, ...rest] = section.split('\n');
    const symbol = (firstLine || '').trim();
    const text = rest.join(' ').trim();
    if (symbol) bySymbol[symbol] = text;
  });

  return assets.map(a => ({
    symbol: a.symbol,
    highlight: bySymbol[a.symbol] || generateRuleBasedHighlight(a)
  }));
}

function generateRuleBasedHighlight(a) {
  return `${a.symbol}, ${a.trendDirection === 'Yükseliş' ? 'yükseliş eğilimli' : a.trendDirection === 'Düşüş' ? 'zayıf seyirli' : 'yatay'} bir teknik görünüm sergiliyor. RSI ${a.rsi} seviyesinde ve 24 saatte %${a.change24h} değişim kaydetti; bileşik teknik skor ${a.score}/100.`;
}

async function callOpenAI(apiKey, systemPrompt, userPrompt) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.3,
      max_tokens: 600
    })
  });

  const data = await res.json();
  return data.choices?.[0]?.message?.content || 'Analiz üretilemedi.';
}

async function callAnthropic(apiKey, systemPrompt, userPrompt) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      system: systemPrompt,
      messages: [
        { role: 'user', content: userPrompt }
      ],
      max_tokens: 600
    })
  });

  const data = await res.json();
  return data.content?.[0]?.text || data.error?.message || 'Analiz üretilemedi.';
}

function generateRuleBasedSummary(asset, technicals) {
  const dirText = technicals.direction === 'Yükseliş' 
    ? 'pozitif bir yukarı yönlü ivme içerisinde seyretmektedir.' 
    : technicals.direction === 'Düşüş' 
    ? 'satış baskısı altında zayıf bir seyir izlemektedir.' 
    : 'belirgin bir trend oluşturmaksızın yatay ve dengeli bir bantta dalgalanmaktadır.';

  return `### 📊 Genel Trend ve Fiyat Hareketi
${asset.name} (${asset.symbol}), güncel $${asset.price} seviyesinde işlem görmekte olup son 24 saatte %${asset.change24h} değişim göstermiştir. Teknik göstergelerin bileşik momentum skoru (${technicals.score}/100), varlığın şu an ${dirText}

### ⚡ Teknik Göstergelerin Dili
- **RSI (14 Göreceli Güç Endeksi):** ${technicals.rsi} seviyesindedir. ${technicals.rsiState}.
- **Hareketli Ortalamalar (SMA 20 & 50):** ${technicals.smaState}.
- **MACD (12, 26, 9):** ${technicals.macdState}.

### 🔍 Takip Edilmesi Gereken Teknik Eşikler & Risk Faktörleri
Fiyat hareketlerinin devamlılığı için kısa vadeli hareketli ortalama seviyesi ($${technicals.lastSMA20 || 'Dinamik'}) kritik destek/direnç eşiği olarak izlenebilir. Piyasa oynaklığı dönemlerinde ani hacim dalgalanmalarına karşı dikkatli olunmalıdır.

⚠️ *Yasal Uyarı: Bu analiz tamamen teknik verilere dayalı algoritmik bir özet olup yatırım danışmanlığı veya tavsiyesi niteliği taşımaz.*`;
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...CORS_HEADERS,
      'Content-Type': 'application/json'
    }
  });
}

/* ============================================================================
 * 🤖 OTOMATİK AI SEPET BOTU (Sanal Para, Cloudflare Cron Trigger)
 * Gerçek Finnhub piyasa verisiyle BIST 10 hisselerini tarar, kural tabanlı
 * RSI/SMA skorlaması yapar ve opt-in olmuş kullanıcıların Firestore
 * portföylerinde SANAL alım/satım simüle eder. Gerçek para/emir yoktur.
 * ==========================================================================*/

const BOT_WATCHLIST = ['THYAO', 'AKBNK', 'GARAN', 'EREGL', 'ASELS', 'KCHOL', 'ISCTR', 'TUPRS', 'SAHOL', 'BIMAS'];
const BOT_CRYPTO_WATCHLIST = ['BTC', 'ETH', 'BNB', 'SOL', 'AVAX'];
const KRAKEN_PAIR_MAP = { BTC: 'XBTUSD', ETH: 'ETHUSD', BNB: 'BNBUSD', SOL: 'SOLUSD', AVAX: 'AVAXUSD' };
const BOT_TAKE_PROFIT_PCT = 3.0;
const BOT_STOP_LOSS_PCT = 4.0;
const BOT_DEFAULT_BUDGET_TRY = 10000.0; // Sanal hesap TL'dir (başlangıç ₺250.000); her bot alımı en fazla ₺10.000
const BOT_MAX_POSITIONS_PER_MARKET = 5; // Her bot (hisse/kripto/forex) sepetinde aynı anda en fazla 5 farklı varlık
const ACCOUNT_CURRENCY_VERSION = 2; // Uygulamadaki TL geçiş sürümüyle aynı olmalı
// Forex botu: uygulamadaki manuel Forex Sepeti ile aynı pariteler ve pozisyon yapısı.
// Hedef/stop marj üzerinden (kaldıraç dahil) hesaplanır: 10x'te %0.3'lük kur hareketi = marjda %3.
const BOT_FOREX_PAIRS = ['EURUSD', 'GBPUSD', 'USDJPY', 'USDTRY', 'EURTRY'];
const BOT_FOREX_LEVERAGE = 10;

// --- Firestore Admin REST Erişimi (Servis Hesabı JWT İmzalama) ---
let _cachedFirestoreToken = null;
let _cachedFirestoreTokenExpiry = 0;

function base64UrlEncode(input) {
  const base64 = typeof input === 'string'
    ? btoa(input)
    : btoa(String.fromCharCode(...new Uint8Array(input)));
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function getFirestoreAccessToken(env) {
  const now = Math.floor(Date.now() / 1000);
  if (_cachedFirestoreToken && _cachedFirestoreTokenExpiry > now + 60) {
    return _cachedFirestoreToken;
  }

  const serviceAccount = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT_JSON);
  const header = { alg: 'RS256', typ: 'JWT' };
  const claim = {
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/datastore',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600
  };

  const encHeader = base64UrlEncode(JSON.stringify(header));
  const encClaim = base64UrlEncode(JSON.stringify(claim));
  const signingInput = `${encHeader}.${encClaim}`;

  const pemBody = serviceAccount.private_key
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s/g, '');
  const derBytes = Uint8Array.from(atob(pemBody), c => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    derBytes,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    new TextEncoder().encode(signingInput)
  );

  const encSignature = base64UrlEncode(signature);
  const jwt = `${signingInput}.${encSignature}`;

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt
    })
  });

  const tokenData = await tokenRes.json();
  if (!tokenData.access_token) {
    throw new Error(`Firestore OAuth token alınamadı: ${JSON.stringify(tokenData)}`);
  }

  _cachedFirestoreToken = tokenData.access_token;
  _cachedFirestoreTokenExpiry = now + (tokenData.expires_in || 3600);
  return _cachedFirestoreToken;
}

function jsToFirestoreValue(val) {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === 'boolean') return { booleanValue: val };
  if (typeof val === 'number') return { doubleValue: val };
  if (typeof val === 'string') return { stringValue: val };
  if (Array.isArray(val)) return { arrayValue: { values: val.map(jsToFirestoreValue) } };
  if (typeof val === 'object') {
    const fields = {};
    for (const k in val) fields[k] = jsToFirestoreValue(val[k]);
    return { mapValue: { fields } };
  }
  return { stringValue: String(val) };
}

function firestoreValueToJs(value) {
  if (!value) return null;
  if ('nullValue' in value) return null;
  if ('booleanValue' in value) return value.booleanValue;
  if ('doubleValue' in value) return value.doubleValue;
  if ('integerValue' in value) return Number(value.integerValue);
  if ('stringValue' in value) return value.stringValue;
  if ('timestampValue' in value) return value.timestampValue;
  if ('arrayValue' in value) return (value.arrayValue.values || []).map(firestoreValueToJs);
  if ('mapValue' in value) {
    const obj = {};
    const fields = value.mapValue.fields || {};
    for (const k in fields) obj[k] = firestoreValueToJs(fields[k]);
    return obj;
  }
  return null;
}

function firestoreDocToJs(doc) {
  const obj = {};
  const fields = doc.fields || {};
  for (const k in fields) obj[k] = firestoreValueToJs(fields[k]);
  return obj;
}

async function firestoreRunQuery(env, projectId, structuredQuery) {
  const token = await getFirestoreAccessToken(env);
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ structuredQuery })
  });
  const data = await res.json();
  if (!Array.isArray(data)) return [];
  return data
    .filter(row => row.document)
    .map(row => ({
      uid: row.document.name.split('/').pop(),
      ...firestoreDocToJs(row.document)
    }));
}

async function firestorePatchDoc(env, projectId, collection, docId, updates) {
  const token = await getFirestoreAccessToken(env);
  const fieldPaths = Object.keys(updates).map(k => `updateMask.fieldPaths=${encodeURIComponent(k)}`).join('&');
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${collection}/${docId}?${fieldPaths}`;
  const fields = {};
  for (const k in updates) fields[k] = jsToFirestoreValue(updates[k]);

  const res = await fetch(url, {
    method: 'PATCH',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields })
  });
  return res.json();
}

// --- Basit RSI / SMA Hesaplama (Finnhub Günlük Mumlar Üzerinden) ---
function calculateRSI(closes, period = 14) {
  if (closes.length < period + 1) return 50;
  let gains = 0, losses = 0;
  for (let i = closes.length - period; i < closes.length; i++) {
    const change = closes[i] - closes[i - 1];
    if (change > 0) gains += change; else losses += Math.abs(change);
  }
  const avgGain = gains / period;
  const avgLoss = losses / period;
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return Math.round((100 - (100 / (1 + rs))) * 100) / 100;
}

function calculateSMA(closes, period) {
  if (closes.length < period) return closes[closes.length - 1] || 0;
  const slice = closes.slice(closes.length - period);
  return slice.reduce((a, b) => a + b, 0) / period;
}

// Finnhub'ın ücretsiz planı BIST geçmiş mum verisine izin vermediği (403) için
// Yahoo Finance'in herkese açık chart uç noktası kullanılıyor (anahtarsız, ücretsiz).
async function fetchBistCandles(symbol) {
  return fetchYahooCandles(`${symbol}.IS`, symbol);
}

async function fetchYahooCandles(yahooSymbol, symbol) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?interval=1d&range=3mo`;
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; TrendVestBot/1.0)' } });
    const data = await res.json();
    const result = data?.chart?.result?.[0];
    const rawCloses = result?.indicators?.quote?.[0]?.close;
    if (!Array.isArray(rawCloses)) {
      console.log(`[DEBUG] ${symbol} Yahoo hatası: HTTP ${res.status}, body=${JSON.stringify(data).slice(0, 200)}`);
      return null;
    }
    const closes = rawCloses.filter(c => typeof c === 'number');
    if (closes.length < 20) {
      console.log(`[DEBUG] ${symbol} Yahoo yetersiz veri: ${closes.length} nokta`);
      return null;
    }
    return { closes, lastPrice: closes[closes.length - 1] };
  } catch (e) {
    console.log(`[DEBUG] ${symbol} Yahoo exception: ${e.message}`);
    return null;
  }
}

async function scanBistCandidates() {
  const candidates = [];
  const debugScores = [];
  for (const symbol of BOT_WATCHLIST) {
    const candles = await fetchBistCandles(symbol);
    if (!candles) {
      debugScores.push(`${symbol}=veri yok`);
      continue;
    }

    const rsi = calculateRSI(candles.closes, 14);
    const sma20 = calculateSMA(candles.closes, 20);
    const sma50 = calculateSMA(candles.closes, Math.min(50, candles.closes.length));
    const price = candles.lastPrice;

    let score = 50;
    if (rsi <= 35) score += 25;
    else if (rsi <= 45) score += 15;
    else if (rsi >= 70) score -= 30;
    if (price > sma20 && sma20 > sma50) score += 20;
    else if (price < sma50) score -= 15;

    debugScores.push(`${symbol}=${score}(RSI ${rsi})`);

    if (score >= 70) candidates.push({ symbol, price, rsi, sma20, sma50, score });
  }
  console.log(`Hisse skor detayları: ${debugScores.join(', ')}`);
  return candidates.sort((a, b) => b.score - a.score);
}

// --- Kripto Tarama (Kraken Genel API: anahtarsız, ücretsiz — Binance Cloudflare IP'lerini,
// CoinGecko ise anonim rate limiti engelliyordu; Kraken ikisinden de etkilenmiyor) ---
async function fetchCryptoCandles(ticker) {
  const pair = KRAKEN_PAIR_MAP[ticker] || `${ticker}USD`;
  const url = `https://api.kraken.com/0/public/OHLC?pair=${pair}&interval=5`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    if (data.error && data.error.length > 0) {
      console.log(`[DEBUG] ${ticker} Kraken hatası: HTTP ${res.status}, error=${JSON.stringify(data.error)}`);
      return null;
    }
    const resultKey = Object.keys(data.result || {}).find(k => k !== 'last');
    const rows = resultKey ? data.result[resultKey] : null;
    if (!Array.isArray(rows)) {
      console.log(`[DEBUG] ${ticker} Kraken hatası: beklenmeyen yanıt şekli, body=${JSON.stringify(data).slice(0, 200)}`);
      return null;
    }
    const closes = rows.map(r => parseFloat(r[4])).filter(c => !isNaN(c));
    if (closes.length < 20) {
      console.log(`[DEBUG] ${ticker} Kraken yetersiz veri: ${closes.length} nokta`);
      return null;
    }
    return { closes, lastPrice: closes[closes.length - 1] };
  } catch (e) {
    console.log(`[DEBUG] ${ticker} Kraken exception: ${e.message}`);
    return null;
  }
}

async function fetchCryptoSpotPrice(ticker) {
  const pair = KRAKEN_PAIR_MAP[ticker] || `${ticker}USD`;
  const url = `https://api.kraken.com/0/public/Ticker?pair=${pair}`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    const resultKey = Object.keys(data.result || {})[0];
    const price = resultKey ? parseFloat(data.result[resultKey].c[0]) : NaN;
    return isNaN(price) ? null : price;
  } catch (e) {
    return null;
  }
}

async function scanCryptoCandidates() {
  const candidates = [];
  const debugScores = [];
  for (const coinId of BOT_CRYPTO_WATCHLIST) {
    const candles = await fetchCryptoCandles(coinId);
    if (!candles) {
      debugScores.push(`${coinId}=veri yok`);
      continue;
    }

    const rsi = calculateRSI(candles.closes, 14);
    const sma20 = calculateSMA(candles.closes, 20);
    const sma50 = calculateSMA(candles.closes, Math.min(50, candles.closes.length));
    const price = candles.lastPrice;

    let score = 50;
    if (rsi <= 35) score += 25;
    else if (rsi <= 45) score += 15;
    else if (rsi >= 70) score -= 30;
    if (price > sma20 && sma20 > sma50) score += 20;
    else if (price < sma50) score -= 15;

    debugScores.push(`${coinId}=${score}(RSI ${rsi})`);

    if (score >= 70) candidates.push({ symbol: coinId, price, rsi, sma20, sma50, score });
  }
  console.log(`Kripto skor detayları: ${debugScores.join(', ')}`);
  return candidates.sort((a, b) => b.score - a.score);
}

// --- Forex Tarama (sinyal için Yahoo günlük mumları, giriş/çıkış kuru için uygulamanın
// da kullandığı Frankfurter kuru — böylece sepette görünen K/Z ile botun kararı aynı kura dayanır) ---
async function fetchForexRate(pair) {
  const from = pair.slice(0, 3);
  const to = pair.slice(3, 6);
  try {
    const res = await fetch(`https://api.frankfurter.app/latest?from=${from}&to=${to}`);
    const data = await res.json();
    const rate = data?.rates?.[to];
    return typeof rate === 'number' ? rate : null;
  } catch (e) {
    return null;
  }
}

async function scanForexCandidates() {
  const candidates = [];
  const debugScores = [];
  for (const pair of BOT_FOREX_PAIRS) {
    const candles = await fetchYahooCandles(`${pair}=X`, pair);
    if (!candles) {
      debugScores.push(`${pair}=veri yok`);
      continue;
    }

    const rsi = calculateRSI(candles.closes, 14);
    const sma20 = calculateSMA(candles.closes, 20);
    const sma50 = calculateSMA(candles.closes, Math.min(50, candles.closes.length));
    const price = candles.lastPrice;

    // Hisse/kripto botuyla aynı puanlama; forex'te açığa satış da mümkün olduğu için ayna puanı da hesaplanır.
    let longScore = 50;
    if (rsi <= 35) longScore += 25;
    else if (rsi <= 45) longScore += 15;
    else if (rsi >= 70) longScore -= 30;
    if (price > sma20 && sma20 > sma50) longScore += 20;
    else if (price < sma50) longScore -= 15;

    let shortScore = 50;
    if (rsi >= 65) shortScore += 25;
    else if (rsi >= 55) shortScore += 15;
    else if (rsi <= 30) shortScore -= 30;
    if (price < sma20 && sma20 < sma50) shortScore += 20;
    else if (price > sma50) shortScore -= 15;

    const direction = shortScore > longScore ? 'short' : 'long';
    const score = Math.max(longScore, shortScore);
    debugScores.push(`${pair}=${direction} ${score}(RSI ${rsi})`);

    if (score >= 70) candidates.push({ symbol: pair, direction, rsi, score });
  }
  console.log(`Forex skor detayları: ${debugScores.join(', ')}`);
  return candidates.sort((a, b) => b.score - a.score);
}

// --- Bot Ana Döngüsü ---
async function fetchUsdTryRate() {
  try {
    const res = await fetch('https://api.frankfurter.app/latest?from=USD&to=TRY');
    const data = await res.json();
    if (data?.rates?.TRY) return data.rates.TRY;
  } catch (e) {
    // yut ve varsayılana düş
  }
  return 48.7;
}

async function runAutoTradingBot(env) {
  if (!env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    console.log('Bot çalıştırılamadı: FIREBASE_SERVICE_ACCOUNT_JSON eksik.');
    return;
  }

  const serviceAccount = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT_JSON);
  const projectId = serviceAccount.project_id;
  const usdTryRate = await fetchUsdTryRate(); // Sanal bakiye TL'dir; kripto fiyatları USD gelir ve kurla TL'ye çevrilir

  const [stockUsers, cryptoUsers, forexUsers] = await Promise.all([
    firestoreRunQuery(env, projectId, {
      from: [{ collectionId: 'users' }],
      where: {
        fieldFilter: {
          field: { fieldPath: 'autoTradingEnabled' },
          op: 'EQUAL',
          value: { booleanValue: true }
        }
      }
    }),
    firestoreRunQuery(env, projectId, {
      from: [{ collectionId: 'users' }],
      where: {
        fieldFilter: {
          field: { fieldPath: 'autoTradingCryptoEnabled' },
          op: 'EQUAL',
          value: { booleanValue: true }
        }
      }
    }),
    firestoreRunQuery(env, projectId, {
      from: [{ collectionId: 'users' }],
      where: {
        fieldFilter: {
          field: { fieldPath: 'autoTradingForexEnabled' },
          op: 'EQUAL',
          value: { booleanValue: true }
        }
      }
    })
  ]);

  const usersByUid = new Map();
  for (const u of stockUsers) usersByUid.set(u.uid, u);
  for (const u of cryptoUsers) usersByUid.set(u.uid, u);
  for (const u of forexUsers) usersByUid.set(u.uid, u);
  const users = Array.from(usersByUid.values());

  console.log(`AI Sepet Botu döngüsü başladı: ${stockUsers.length} hisse botu, ${cryptoUsers.length} kripto botu, ${forexUsers.length} forex botu katılımcısı, USD/TRY: ${usdTryRate}`);

  if (users.length === 0) {
    return;
  }

  // Taramalar ve fiyatlar döngü başına bir kez çekilir, tüm kullanıcılar arasında paylaşılır
  const scanCache = {};
  const getCandidates = async market => {
    if (!(market in scanCache)) {
      const scan = { bist: scanBistCandidates, crypto: scanCryptoCandidates, forex: scanForexCandidates }[market];
      scanCache[market] = await scan();
      console.log(`${market} taraması: ${scanCache[market].map(c => `${c.symbol}(${c.score})`).join(', ') || 'eşik (70) üzerinde aday yok'}`);
    }
    return scanCache[market];
  };
  const priceCache = {};
  const cached = async (key, fn) => {
    if (!(key in priceCache)) priceCache[key] = await fn();
    return priceCache[key];
  };
  const getBistPriceTRY = symbol => cached(`bist:${symbol}`, async () => (await fetchBistCandles(symbol))?.lastPrice ?? null);
  const getCryptoPriceUSD = symbol => cached(`crypto:${symbol}`, () => fetchCryptoSpotPrice(symbol));
  const getForexRate = pair => cached(`forex:${pair}`, () => fetchForexRate(pair));

  // Açık bot pozisyonunun güncel TL değeri ve kâr/zarar yüzdesi (fiyat alınamazsa null)
  async function valuePosition(pos) {
    if (pos.type === 'forex') {
      const rate = await getForexRate(pos.symbol);
      if (!rate) return null;
      const move = ((rate - pos.entryRate) / pos.entryRate) * (pos.direction === 'short' ? -1 : 1);
      const pnlTRY = pos.marginTRY * pos.leverage * move;
      return { valueTRY: Math.max(0, pos.marginTRY + pnlTRY), pnlPct: (pnlTRY / pos.marginTRY) * 100, exitPrice: rate };
    }
    const priceTRY = pos.type === 'bist'
      ? await getBistPriceTRY(pos.symbol)
      : ((await getCryptoPriceUSD(pos.symbol)) || 0) * usdTryRate;
    if (!priceTRY) return null;
    return { valueTRY: pos.shares * priceTRY, pnlPct: ((priceTRY - pos.avgCostTRY) / pos.avgCostTRY) * 100, exitPrice: Math.round(priceTRY * 100) / 100 };
  }

  // Aday için ₺budget'lık yeni bot pozisyonu oluşturur (fiyat alınamazsa null)
  async function openPosition(market, cand, budget) {
    const now = new Date().toISOString();
    if (market === 'forex') {
      const entryRate = await getForexRate(cand.symbol);
      if (!entryRate) return null;
      return {
        id: `fx_bot_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        symbol: cand.symbol, type: 'forex', direction: cand.direction, leverage: BOT_FOREX_LEVERAGE,
        marginTRY: Number(budget.toFixed(2)), entryRate, managedByBot: true, openedAt: now
      };
    }
    const nativePrice = market === 'bist' ? cand.price : (await getCryptoPriceUSD(cand.symbol)) || cand.price;
    const priceTRY = market === 'bist' ? nativePrice : nativePrice * usdTryRate;
    if (!priceTRY) return null;
    return {
      symbol: cand.symbol, name: cand.symbol, type: market,
      shares: Number((budget / priceTRY).toFixed(market === 'bist' ? 4 : 8)),
      avgCostTRY: Math.round(priceTRY * 1e6) / 1e6,
      avgCostNative: nativePrice,
      managedByBot: true, addedAt: now
    };
  }

  const BOT_MARKETS = [
    { market: 'bist', flag: 'autoTradingEnabled', label: 'Hisse' },
    { market: 'crypto', flag: 'autoTradingCryptoEnabled', label: 'Kripto' },
    { market: 'forex', flag: 'autoTradingForexEnabled', label: 'Forex' }
  ];

  for (const user of users) {
    let portfolio = Array.isArray(user.portfolio) ? user.portfolio : [];
    // TL'ye geçmemiş (eski USD) hesaplara dokunma — kullanıcı uygulamaya girince sıfırlanıp TL'ye geçer
    if (user.accountCurrencyVersion !== ACCOUNT_CURRENCY_VERSION || typeof user.balanceTRY !== 'number') continue;

    let balanceTRY = user.balanceTRY;
    let history = Array.isArray(user.botTradeHistory) ? user.botTradeHistory : [];
    let dirty = false;

    for (const { market, flag, label } of BOT_MARKETS) {
      if (user[flag] !== true) continue;
      try {
        // 1) Satış: hedefe (+%3) ya da stopa (-%4) ulaşan bot pozisyonlarını kapat
        const soldNow = new Set();
        for (const pos of portfolio.filter(p => p.managedByBot === true && p.type === market)) {
          const v = await valuePosition(pos);
          if (!v || (v.pnlPct < BOT_TAKE_PROFIT_PCT && v.pnlPct > -BOT_STOP_LOSS_PCT)) continue;
          balanceTRY = Number((balanceTRY + v.valueTRY).toFixed(2));
          portfolio = portfolio.filter(p => p !== pos);
          soldNow.add(pos.symbol);
          history.push({
            symbol: pos.symbol,
            market,
            action: v.pnlPct >= BOT_TAKE_PROFIT_PCT ? 'TAKE_PROFIT' : 'STOP_LOSS',
            ...(market === 'forex' ? { direction: pos.direction } : {}),
            buyPrice: market === 'forex' ? pos.entryRate : pos.avgCostTRY,
            sellPrice: v.exitPrice,
            pnlPct: Math.round(v.pnlPct * 100) / 100,
            closedAt: new Date().toISOString()
          });
          dirty = true;
          console.log(`[BOT SAT - ${label}] ${user.uid} | ${pos.symbol} | K/Z: ${v.pnlPct.toFixed(2)}%`);
        }

        // 2) Alım: sepette boş yer varsa en yüksek puanlı adaylardan, her biri en fazla ₺10.000
        let openCount = portfolio.filter(p => p.managedByBot === true && p.type === market).length;
        if (openCount >= BOT_MAX_POSITIONS_PER_MARKET) continue;
        const heldSymbols = new Set(portfolio.filter(p => p.type === market).map(p => p.symbol));
        for (const cand of await getCandidates(market)) {
          if (openCount >= BOT_MAX_POSITIONS_PER_MARKET) break;
          // Elde olanı tekrar alma; bu turda satılanı hemen geri alma
          if (heldSymbols.has(cand.symbol) || soldNow.has(cand.symbol)) continue;
          const budget = Math.min(BOT_DEFAULT_BUDGET_TRY, balanceTRY);
          if (budget < 100) break;
          const pos = await openPosition(market, cand, budget);
          if (!pos) continue;
          portfolio = [...portfolio, pos];
          balanceTRY = Number((balanceTRY - budget).toFixed(2));
          heldSymbols.add(cand.symbol);
          openCount++;
          dirty = true;
          console.log(`[BOT AL - ${label}] ${user.uid} | ${cand.symbol}${cand.direction ? ` ${cand.direction}` : ''} | ₺${budget} | Skor: ${cand.score}`);
        }
      } catch (err) {
        console.log(`${label} botu hatası (${user.uid}): ${err.message}`);
      }
    }

    if (dirty) {
      try {
        await firestorePatchDoc(env, projectId, 'users', user.uid, {
          portfolio,
          balanceTRY,
          botTradeHistory: history.slice(-20)
        });
      } catch (err) {
        console.log(`Bot kaydetme hatası (${user.uid}): ${err.message}`);
      }
    }
  }
}
