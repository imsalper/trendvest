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
  const to = (url.searchParams.get('to') || 'TRY').toUpperCase();

  if (to === 'USD') {
    return jsonResponse({ from: 'USD', to: 'USD', rate: 1.0 });
  }

  const cacheKey = new Request(url.toString(), request);
  const cache = caches.default;
  const cachedResponse = await cache.match(cacheKey);
  if (cachedResponse) return cachedResponse;

  const res = await fetch(`https://api.frankfurter.app/latest?from=USD&to=${encodeURIComponent(to)}`, {
    headers: { 'Accept': 'application/json' }
  });
  const data = await res.json();
  const rate = data?.rates?.[to];

  const response = new Response(JSON.stringify({ from: 'USD', to, rate: rate ?? null }), {
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
