// ScamShield AI Backend Serverless Endpoint
// Powered by Provider Abstraction (Groq AI) + Deterministic Heuristic Risk Engine + Live DNS Intelligence
// Executes server-side to protect API keys and provide resilient fallbacks.

const threatEngine = require('../lib/ai/threat-engine');
const { analyzeContent } = require('../lib/ai/provider');
const { inspectDns } = require('../lib/dns/lookup');

// Lightweight in-memory LRU cache to protect demos and eliminate duplicate API calls
const ANALYSIS_CACHE = new Map();
const MAX_CACHE_SIZE = 150;
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

// Lightweight in-memory IP rate limiter for non-distributed abuse protection
const RATE_LIMIT_MAP = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 40; // Generous for hackathon judging while preventing scripts

function getClientIp(req) {
  return req.headers['x-forwarded-for'] ? req.headers['x-forwarded-for'].split(',')[0].trim() : (req.socket ? req.socket.remoteAddress : 'local');
}

function isRateLimited(ip) {
  const now = Date.now();
  const record = RATE_LIMIT_MAP.get(ip) || { count: 0, resetAt: now + RATE_LIMIT_WINDOW_MS };
  
  if (now > record.resetAt) {
    record.count = 1;
    record.resetAt = now + RATE_LIMIT_WINDOW_MS;
    RATE_LIMIT_MAP.set(ip, record);
    return false;
  }
  
  record.count++;
  RATE_LIMIT_MAP.set(ip, record);
  return record.count > MAX_REQUESTS_PER_WINDOW;
}

function extractHostnameFromText(text) {
  if (!text || typeof text !== 'string') return null;
  const urls = threatEngine.detectThreatSignals(text).urls;
  if (urls && urls.length > 0) {
    let u = urls[0];
    if (!u.startsWith('http://') && !u.startsWith('https://')) {
      u = 'https://' + u;
    }
    try {
      const parsed = new URL(u);
      return parsed.hostname;
    } catch (e) {
      return null;
    }
  }
  return null;
}

module.exports = async function handler(req, res) {
  // CORS Headers for secure deployment & local testing
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed. Only POST is supported.' });
    return;
  }

  const clientIp = getClientIp(req);
  if (isRateLimited(clientIp)) {
    res.status(429).json({ 
      error: 'Too many analysis requests. Please wait a moment before trying again.',
      rateLimited: true
    });
    return;
  }

  try {
    const { inputText, urlFlags, language = 'en', isSimulatedDemo = false } = req.body || {};

    if (!inputText || typeof inputText !== 'string' || !inputText.trim()) {
      res.status(400).json({ error: 'Missing or invalid inputText field' });
      return;
    }

    const cleanInput = inputText.slice(0, 12000).trim();
    const cleanFlags = Array.isArray(urlFlags) ? urlFlags : [];
    const validLang = ['en', 'hi', 'hinglish'].includes(language) ? language : 'en';

    // 1. Check in-memory cache for identical requests to save LLM tokens & avoid latency
    const cacheKey = `${validLang}:${cleanInput}`;
    const cached = ANALYSIS_CACHE.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp < CACHE_TTL_MS)) {
      const cachedResult = JSON.parse(JSON.stringify(cached.data));
      cachedResult.cached = true;
      res.status(200).json(cachedResult);
      return;
    }

    // 2. Perform Live DNS Intelligence if a URL/Domain is present
    const extractedHost = extractHostnameFromText(cleanInput);
    let dnsIntel = null;
    if (extractedHost) {
      try {
        dnsIntel = await inspectDns(extractedHost);
      } catch (dnsErr) {
        console.warn('DNS lookup non-critical warning:', dnsErr.message);
      }
    }

    // 3. Try AI Provider Analysis (Groq via abstraction) if configured
    if (process.env.GROQ_API_KEY && !isSimulatedDemo) {
      try {
        const aiResult = await analyzeContent({
          inputText: cleanInput,
          urlFlags: cleanFlags,
          dnsIntel,
          language: validLang
        });

        if (dnsIntel && !aiResult.dns_intelligence) {
          aiResult.dns_intelligence = dnsIntel;
        }

        // Cache result
        if (ANALYSIS_CACHE.size >= MAX_CACHE_SIZE) {
          const firstKey = ANALYSIS_CACHE.keys().next().value;
          ANALYSIS_CACHE.delete(firstKey);
        }
        ANALYSIS_CACHE.set(cacheKey, { data: aiResult, timestamp: Date.now() });

        res.status(200).json(aiResult);
        return;
      } catch (aiErr) {
        console.warn('AI analysis unavailable, engaging local threat engine fallback:', aiErr.message);
      }
    }

    // 4. Deterministic Local Threat Engine Fallback
    const localResult = threatEngine.buildLocalAssessment(cleanInput, cleanFlags, validLang);
    if (dnsIntel) {
      localResult.dns_intelligence = dnsIntel;
      if (dnsIntel.riskBonus && dnsIntel.dnsStatus === 'nxdomain') {
        localResult.score_breakdown.url_intelligence = (localResult.score_breakdown.url_intelligence || 0) + dnsIntel.riskBonus;
        localResult.risk_score = Math.min(98, localResult.risk_score + dnsIntel.riskBonus);
        if (localResult.risk_score >= 75) localResult.risk_level = 'CRITICAL';
        else if (localResult.risk_score >= 50) localResult.risk_level = 'HIGH';
      }
    }

    localResult.warning = process.env.GROQ_API_KEY
      ? 'AI enhancement unavailable (rate limit or timeout) — showing local threat analysis.'
      : 'AI enhancement unavailable (GROQ_API_KEY not configured) — showing local threat analysis.';
    localResult.source = 'local_rule_engine';

    res.status(200).json(localResult);

  } catch (err) {
    console.error('Unhandled server error in /api/analyze:', err);
    res.status(500).json({
      error: 'An internal server error occurred while processing the threat assessment.'
    });
  }
};
