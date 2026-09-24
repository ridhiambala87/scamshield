// Deterministic Threat Intelligence Engine for ScamShield AI
// Comprehensive rule heuristics, domain reputation checks, and pattern indicators.
// Works both server-side (Node.js) and client-side (offline fallback in browser).

(function(root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.ThreatEngine = factory();
  }
}(typeof self !== 'undefined' ? self : this, function() {

  const KNOWN_LEGIT_DOMAINS = [
    'sbi.co.in', 'onlinesbi.sbi', 'hdfcbank.com', 'icicibank.com', 'axisbank.com',
    'punjabnationalbank.in', 'pnbindia.in', 'bankofbaroda.in', 'kotak.com',
    'paytm.com', 'phonepe.com', 'google.com', 'amazon.in', 'flipkart.com',
    'incometax.gov.in', 'cybercrime.gov.in', 'uidai.gov.in', 'passportindia.gov.in',
    'irctc.co.in', 'epfindia.gov.in', 'rbi.org.in'
  ];

  const SUSPICIOUS_TLDS = [
    '.xyz', '.top', '.click', '.link', '.info', '.zip', '.tk', '.ml', '.ga',
    '.cf', '.gq', '.work', '.rest', '.bar', '.live', '.online', '.site', '.monster',
    '.vip', '.icu', '.monster', '.buzz', '.cc', '.cn'
  ];

  const BRAND_TARGETS = [
    { name: 'SBI', regex: /\b(sbi|state bank|yono)\b/i, legit: ['sbi.co.in', 'onlinesbi.sbi', 'onlinesbi.com'] },
    { name: 'HDFC Bank', regex: /\b(hdfc|hdfcbank)\b/i, legit: ['hdfcbank.com', 'hdfc.com'] },
    { name: 'ICICI Bank', regex: /\b(icici|icicibank|imobile)\b/i, legit: ['icicibank.com'] },
    { name: 'Axis Bank', regex: /\b(axis|axisbank)\b/i, legit: ['axisbank.com'] },
    { name: 'Punjab National Bank', regex: /\b(pnb|punjab national)\b/i, legit: ['punjabnationalbank.in', 'pnbindia.in'] },
    { name: 'Paytm', regex: /\b(paytm|paytm payments)\b/i, legit: ['paytm.com'] },
    { name: 'PhonePe', regex: /\b(phonepe|phone pe)\b/i, legit: ['phonepe.com'] },
    { name: 'Google Pay', regex: /\b(gpay|google pay|tez)\b/i, legit: ['google.com', 'pay.google.com'] },
    { name: 'Amazon', regex: /\b(amazon|amazon pay|amazon in)\b/i, legit: ['amazon.in', 'amazon.com'] },
    { name: 'Flipkart', regex: /\b(flipkart)\b/i, legit: ['flipkart.com'] },
    { name: 'Income Tax Dept', regex: /\b(income tax|itr|tax refund|pan card)\b/i, legit: ['incometax.gov.in', 'incometaxindia.gov.in'] },
    { name: 'Electricity Dept / Discom', regex: /\b(electricity bill|power supply|discom|bijli|bses|tatapower)\b/i, legit: [] },
    { name: 'Telegram', regex: /\b(telegram|t\.me)\b/i, legit: ['telegram.org', 't.me'] },
    { name: 'WhatsApp', regex: /\b(whatsapp|wa\.me)\b/i, legit: ['whatsapp.com', 'wa.me'] },
    { name: 'India Post / Courier', regex: /\b(indiapost|india post|speed post|customs|fedex|dhl|bluedart)\b/i, legit: ['indiapost.gov.in', 'fedex.com', 'dhl.com'] }
  ];

  function extractUrls(text) {
    if (!text || typeof text !== 'string') return [];
    const urlRegex = /(https?:\/\/[^\s<>"'\)]+|www\.[^\s<>"'\)]+|[a-zA-Z0-9-]+\.(?:com|in|org|net|xyz|top|site|live|click|link|info|online|co\.in|gov\.in|cc|icu|zip)[^\s<>"'\)]*)/gi;
    const matches = text.match(urlRegex) || [];
    return matches.map(u => u.trim());
  }

  function analyzeUrl(rawUrl) {
    const flags = [];
    const signals = [];
    let parsed = null;
    let urlString = (rawUrl || '').trim();
    if (!urlString.startsWith('http://') && !urlString.startsWith('https://')) {
      urlString = 'https://' + urlString;
    }

    try {
      parsed = new URL(urlString);
    } catch (e) {
      flags.push('Malformed URL structure');
      signals.push({
        type: 'SUSPICIOUS_LINK',
        label: 'Malformed URL Structure',
        severity: 'HIGH',
        points: 18,
        evidence: rawUrl,
        explanation: 'The destination link has an invalid or obfuscated URL format.'
      });
      return { isValid: false, flags, signals, host: '', protocol: '', rawUrl };
    }

    const host = parsed.hostname.toLowerCase();

    // 1. Protocol
    if (parsed.protocol !== 'https:') {
      flags.push('Unencrypted HTTP protocol (no TLS security)');
      signals.push({
        type: 'SUSPICIOUS_LINK',
        label: 'Insecure Connection (HTTP)',
        severity: 'MEDIUM',
        points: 12,
        evidence: parsed.protocol,
        explanation: 'Destination site does not use HTTPS encryption, exposing any entered data.'
      });
    }

    // 2. IP Address as host
    if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host)) {
      flags.push('Direct numeric IP address host instead of registered domain');
      signals.push({
        type: 'SUSPICIOUS_LINK',
        label: 'IP-Address Destination Host',
        severity: 'CRITICAL',
        points: 26,
        evidence: host,
        explanation: 'Legitimate financial and government portals use registered domain names, not bare IP addresses.'
      });
    }

    // 3. Suspicious TLD
    const matchedTld = SUSPICIOUS_TLDS.find(tld => host.endsWith(tld));
    if (matchedTld) {
      flags.push(`Uses high-risk top-level domain (${matchedTld}) commonly associated with phishing`);
      signals.push({
        type: 'SUSPICIOUS_LINK',
        label: `High-Risk TLD (${matchedTld})`,
        severity: 'HIGH',
        points: 20,
        evidence: host,
        explanation: `The ${matchedTld} domain extension has high abuse rates for short-lived phishing sites.`
      });
    }

    // 4. Excessive hyphens
    const hyphenCount = (host.match(/-/g) || []).length;
    if (hyphenCount >= 2) {
      flags.push('Domain contains multiple hyphens (typosquatting / lookalike pattern)');
      signals.push({
        type: 'SUSPICIOUS_LINK',
        label: 'Hyphenated Lookalike Domain',
        severity: 'HIGH',
        points: 15,
        evidence: host,
        explanation: 'Phishing actors combine brand names with hyphens (e.g., sbi-online-kyc-update).'
      });
    }

    // 5. Excessive subdomains
    const parts = host.split('.');
    if (parts.length > 3 && !host.endsWith('.co.in') && !host.endsWith('.gov.in')) {
      flags.push('Excessive subdomain chaining used to hide real apex domain on mobile');
      signals.push({
        type: 'SUSPICIOUS_LINK',
        label: 'Excessive Subdomain Chaining',
        severity: 'MEDIUM',
        points: 14,
        evidence: host,
        explanation: 'Deep subdomain nesting disguises the real domain on truncated mobile viewports.'
      });
    }

    // 6. Brand impersonation inside domain
    for (const b of BRAND_TARGETS) {
      const brandWord = b.name.toLowerCase().split(' ')[0];
      if (host.includes(brandWord) && b.legit.length > 0) {
        const isLegit = b.legit.some(legitDomain => host === legitDomain || host.endsWith('.' + legitDomain));
        if (!isLegit) {
          flags.push(`Potential brand impersonation: "${b.name}" in unauthorized domain (${host})`);
          signals.push({
            type: 'IMPERSONATION',
            label: `Unauthorized ${b.name} Lookalike`,
            severity: 'CRITICAL',
            points: 28,
            evidence: host,
            explanation: `The domain references "${b.name}" but does not belong to authorized ${b.name} web properties.`
          });
        }
      }
    }

    // 6b. Typosquatting: visually disguised brand domains (rn→m, vv→w, 0→o, 1→l, 5→s, 3→e, 4→a)
    //     e.g. rnicrosoft.com renders like microsoft.com in most fonts.
    const BRAND_CORES = ['microsoft', 'google', 'amazon', 'flipkart', 'whatsapp', 'telegram', 'paytm', 'phonepe', 'sbi', 'hdfc', 'icici', 'axisbank', 'snapchat', 'instagram', 'facebook'];
    const LEGIT_APEXES = ['microsoft.com', 'microsoftonline.com', 'live.com', 'google.com', 'amazon.com', 'amazon.in', 'flipkart.com', 'whatsapp.com', 'telegram.org', 'paytm.com', 'phonepe.com', 'sbi.co.in', 'onlinesbi.sbi', 'onlinesbi.com', 'hdfcbank.com', 'hdfc.com', 'icicibank.com', 'axisbank.com', 'snapchat.com', 'instagram.com', 'facebook.com'];
    const canon = (s) => s.replace(/rn/g, 'm').replace(/vv/g, 'w').replace(/0/g, 'o').replace(/1/g, 'l').replace(/5/g, 's').replace(/3/g, 'e').replace(/4/g, 'a').replace(/\|/g, 'l');
    const canonicalHost = canon(host);
    const isKnownLegit = LEGIT_APEXES.some(a => host === a || host.endsWith('.' + a));
    if (!isKnownLegit) {
      const disguisedBrand = BRAND_CORES.find(core => canonicalHost.includes(core) && !host.includes(core));
      if (disguisedBrand) {
        flags.push(`Typosquatting: domain visually impersonates "${disguisedBrand}" using disguised characters (${host})`);
        signals.push({
          type: 'IMPERSONATION',
          label: `Typosquat of ${disguisedBrand} (Lookalike Characters)`,
          severity: 'CRITICAL',
          points: 30,
          evidence: host,
          explanation: `Read at a glance this domain looks like "${disguisedBrand}", but swap the disguised characters (rn→m, 0→o, 1→l…) and it is a different, attacker-controlled domain. This is the classic rn→m typosquat technique.`
        });
      }
    }

    // 6c. Non-ASCII (IDN homoglyph) characters in host — e.g. Cyrillic 'а' inside 'pаypal'
    if (/[^\x00-\x7F]/.test(host)) {
      flags.push('Internationalized domain with non-ASCII homoglyph characters');
      signals.push({
        type: 'IMPERSONATION',
        label: 'Homoglyph / IDN Spoofing',
        severity: 'CRITICAL',
        points: 30,
        evidence: host,
        explanation: 'The domain contains characters from other alphabets that look identical to Latin letters — a standard technique for faking trusted brands.'
      });
    }

    // 7. URL shorteners
    const shorteners = ['bit.ly', 'tinyurl.com', 't.co', 'is.gd', 'cutt.ly', 'rb.gy', 'wa.link', 'cutt.us'];
    if (shorteners.includes(host)) {
      flags.push(`Uses URL shortening service (${host}) concealing real destination`);
      signals.push({
        type: 'SUSPICIOUS_LINK',
        label: 'Concealed Destination (URL Shortener)',
        severity: 'MEDIUM',
        points: 14,
        evidence: host,
        explanation: 'URL shorteners are used to hide the true landing page and bypass initial filters.'
      });
    }

    return {
      isValid: true,
      rawUrl,
      url: urlString,
      host,
      flags,
      signals,
      protocol: parsed.protocol,
      pathname: parsed.pathname
    };
  }

  function normalizeText(text) {
    if (!text || typeof text !== 'string') return '';
    let t = text;
    // 1. Collapse spaced characters e.g. 's b i' -> 'sbi', 'k y c' -> 'kyc'
    t = t.replace(/\b([a-zA-Z0-9])\s+([a-zA-Z0-9])\s+([a-zA-Z0-9])(\s+([a-zA-Z0-9]))*\b/g, (m) => m.replace(/\s+/g, ''));
    // 2. Simple leetspeak substitutions
    t = t.replace(/0/g, 'o')
         .replace(/1/g, 'i')
         .replace(/3/g, 'e')
         .replace(/4/g, 'a')
         .replace(/5/g, 's')
         .replace(/@/g, 'a')
         .replace(/\$/g, 's');
    // 3. Normalize repeated punctuation/spaces
    t = t.replace(/[!]{2,}/g, '!').replace(/\s+/g, ' ').trim();
    return t;
  }

  function detectThreatSignals(text, externalUrlFlags = []) {
    const signals = [];
    if (!text || typeof text !== 'string') {
      return { signals, urls: [], urlAnalysisList: [], normalizedText: '' };
    }
    const normalizedText = normalizeText(text);
    const lower = text.toLowerCase();
    const normLower = normalizedText.toLowerCase();

    // Vector 1: URGENCY & THREATS
    const urgencyPatterns = [
      { regex: /\b(account|sim|pan|aadhaar|debit card|credit card|yono|services?)\s*(will be|is|is being|has been)\s*(blocked|suspended|terminated|deactivated|cancelled|locked)\b/i, label: 'Account Suspension Threat', severity: 'HIGH', points: 22, reason: 'Claims immediate account suspension or service disruption to create panic.' },
      { regex: /\b(within\s*\d+\s*(hours?|hrs?|mins?|minutes?)|immediately|urgent|last reminder|before 24 hours|today itself|by tonight|before midnight)\b/i, label: 'Artificial Time Pressure', severity: 'HIGH', points: 16, reason: 'Forces an urgent deadline so victims act hastily without verification.' },
      { regex: /\b(police|arrest|court|legal notice|warrant|cbi|trai disconnection|customs seizure|narcotics)\b/i, label: 'Law Enforcement / Legal Coercion', severity: 'CRITICAL', points: 26, reason: 'Impersonates police, court, or enforcement agencies to intimidate the victim.' },
      { regex: /\b(electricity|power|bijli)\s*(cut off|disconnect|disconnected tonight|bill unpaid|disconnection)\b/i, label: 'Utility Disconnection Threat', severity: 'HIGH', points: 22, reason: 'Threatens power cutoff to force immediate payment to an unauthorized number.' }
    ];

    urgencyPatterns.forEach(p => {
      const match = text.match(p.regex);
      if (match) {
        signals.push({
          type: 'URGENCY',
          label: p.label,
          severity: p.severity,
          points: p.points,
          evidence: match[0],
          explanation: p.reason
        });
      }
    });

    // Vector 2: CREDENTIAL & DATA THEFT
    // Check if OTP/PIN request is an affirmative harvesting request vs legitimate "do not share" warning
    const isDefensiveOtpNotice = /\b(do\s*not|never|don't|not\s*to\s*be|should\s*not)\s*(share|disclose|tell|reveal)\s*(your|this)?\s*(otp|pin|password|mpin|cvv)\b/i.test(text);

    if (!isDefensiveOtpNotice) {
      const credentialPatterns = [
        { regex: /\b(share|send|enter|verify|provide|update)\s*(your)?\s*(otp|one time password|mpin|pin|cvv|atm pin|password|credentials)\b/i, label: 'Credential / OTP Solicitation', severity: 'CRITICAL', points: 30, reason: 'Legitimate financial institutions and services will NEVER ask for your OTP, PIN, or password.' },
        { regex: /\b(update|verify|complete|re-activate|mandatory)\s*(your)?\s*(kyc|pan|aadhaar|bank account|customer details|documents)\b/i, label: 'Unsolicited KYC / Identity Verification', severity: 'HIGH', points: 24, reason: 'Fake KYC updates are a primary pretext for identity theft and credential harvesting.' },
        { regex: /\b(download|install)\s*(anydesk|teamviewer|rustdesk|quicksupport|\.apk|app from link)\b/i, label: 'Remote Control / Sideloading App Request', severity: 'CRITICAL', points: 30, reason: 'Instructs victim to install remote desktop tools or untrusted APKs to hijack the device.' }
      ];

      credentialPatterns.forEach(p => {
        const match = text.match(p.regex);
        if (match) {
          signals.push({
            type: 'CREDENTIAL_REQUEST',
            label: p.label,
            severity: p.severity,
            points: p.points,
            evidence: match[0],
            explanation: p.reason
          });
        }
      });
    }

    // Vector 3: FINANCIAL DECEPTION & REVERSE UPI
    const paymentPatterns = [
      { regex: /\b(won|winner|lottery|congratulations|reward|gift card|cashback|kbc)\s*(of|worth|rs\.?|inr)?\s*([0-9,]+|crores?|lakhs?|million)?\b/i, label: 'Lottery / High Cash Prize Bait', severity: 'HIGH', points: 20, reason: 'Promises unrealistic prize money to deceive victim into paying advance fees or processing charges.' },
      { regex: /\b(refund|tax refund|overpaid|cashback)\s*(of|worth|rs\.?|inr)?\s*([0-9,]+)?\s*(approved|pending|credited|claim)\b/i, label: 'Fake Refund Bait', severity: 'HIGH', points: 18, reason: 'Claims an unsolicited refund is waiting to trick victim into accepting a debit request.' },
      { regex: /\b(scan\s*qr|enter\s*(upi)?\s*pin)\s*(to receive|to get|for credit|to claim money)\b/i, label: 'Reverse UPI Scam (Scan/PIN to Receive)', severity: 'CRITICAL', points: 30, reason: 'In UPI, you NEVER need to scan a QR code or enter your UPI PIN to receive money.' },
      { regex: /\bupi:\/\/pay\?[^\s]+/i, label: 'Embedded UPI Payment URI', severity: 'HIGH', points: 18, reason: 'Direct payment deep-link intended to initiate immediate fund transfer.' }
    ];

    paymentPatterns.forEach(p => {
      const match = text.match(p.regex);
      if (match) {
        signals.push({
          type: 'PAYMENT_REQUEST',
          label: p.label,
          severity: p.severity,
          points: p.points,
          evidence: match[0],
          explanation: p.reason
        });
      }
    });

    // Vector 4: TASK / JOB / INVESTMENT SCAMS
    const jobInvestmentPatterns = [
      { regex: /\b(work from home|part time job|youtube like|telegram task|daily earn|earn\s*rs?\.?\s*\d{3,5}|daily salary)\b/i, label: 'Part-Time Task / Telegram Job Scam', severity: 'HIGH', points: 22, reason: 'Offers simple daily tasks (e.g. YouTube likes, ratings) leading to prepaid deposit traps.' },
      { regex: /\b(guaranteed returns?|double your money|daily profit|crypto investment|forex trading bot|high profit)\b/i, label: 'Guaranteed Return Investment Scheme', severity: 'HIGH', points: 24, reason: 'Promises impossible guaranteed returns typical of Ponzi schemes and fake trading apps.' }
    ];

    jobInvestmentPatterns.forEach(p => {
      const match = text.match(p.regex);
      if (match) {
        signals.push({
          type: 'SOCIAL_ENGINEERING',
          label: p.label,
          severity: p.severity,
          points: p.points,
          evidence: match[0],
          explanation: p.reason
        });
      }
    });

    // Vector 5: BRAND IMPERSONATION IN CONTENT
    BRAND_TARGETS.forEach(b => {
      if (b.regex.test(text)) {
        const suspiciousContext = /blocked|verify\s*kyc|urgent|click\s*link|refund|fee|fine|bill|disconnection|officer\s*arrest|suspension/i.test(text);
        if (suspiciousContext) {
          signals.push({
            type: 'IMPERSONATION',
            label: `Brand Impersonation (${b.name})`,
            severity: 'HIGH',
            points: 18,
            evidence: b.name,
            explanation: `Message attempts to appear as an official communication from ${b.name} while carrying suspicious triggers.`
          });
        }
      }
    });

    // Vector 7: WOMEN SAFETY / DIGITAL ABUSE PATTERNS
    const womenSafetyPatterns = [
      { regex: /\b(private|intimate)\s*(photos?|videos?|images?|pics?).*\b(publish|post|expose|leak|send to|share|show|upload)\b/i, label: 'Sextortion / Blackmail Threat', severity: 'CRITICAL', points: 28, reason: 'Threats to publish private content are a form of digital abuse known as sextortion.' },
      { regex: /\b(publish|post|expose|leak|send to|share|upload).*\b(private|intimate)\s*(photos?|videos?|images?|pics?)\b/i, label: 'Sextortion / Blackmail Threat', severity: 'CRITICAL', points: 28, reason: 'Threats to publish private content are a form of digital abuse known as sextortion.' },
      { regex: /\b(friends|family|everyone)\s*(will see|will know|will find out)\b/i, label: 'Exposure Threat / Social Blackmail', severity: 'HIGH', points: 22, reason: 'Threatening to expose personal information to social circles is a form of coercion.' },
      { regex: /\b(my\s*(love|darling|sweetheart|dear)).*\b(send\s*money|western\s*union|gift\s*card)\b/i, label: 'Romance Scam Indicators', severity: 'HIGH', points: 22, reason: 'Combines romantic language with financial requests, a common romance scam pattern.' },
      { regex: /\b(stuck\s*at\s*airport|hospital\s*emergency|wallet\s*(stolen|lost)|need\s*money\s*for\s*ticket)\b/i, label: 'Romance Scam Emergency Pretext', severity: 'HIGH', points: 18, reason: 'Fabricated emergencies are commonly used in romance scams to justify urgent money requests.' },
      { regex: /\b(registration\s*fee|training\s*fee|joining\s*fee).*\b(selected|position|job|hired)\b/i, label: 'Fake Recruitment / Advance Fee', severity: 'HIGH', points: 20, reason: 'Legitimate employers never charge registration, training, or joining fees.' },
      { regex: /\b(scholarship|admission)\s*(approved|confirmed|selected).*\b(processing\s*fee|registration\s*fee)\b/i, label: 'Scholarship / Admission Scam', severity: 'HIGH', points: 20, reason: 'Genuine scholarships never require upfront processing or registration fees.' },
      { regex: /\b(brand\s*collaboration|paid\s*review|influencer\s*program|sponsored\s*post).*\b(verification\s*fee|registration\s*fee)\b/i, label: 'Influencer / Brand Deal Scam', severity: 'MEDIUM', points: 16, reason: 'Legitimate brand deals never require creators to pay verification or registration fees.' }
    ];

    womenSafetyPatterns.forEach(p => {
      const match = text.match(p.regex);
      if (match) {
        signals.push({
          type: 'WOMEN_SAFETY',
          label: p.label,
          severity: p.severity,
          points: p.points,
          evidence: match[0],
          explanation: p.reason
        });
      }
    });

    // Vector 6: URL EXTRACTION & HEURISTIC ANALYSIS
    const urls = extractUrls(text);
    const urlAnalysisList = [];
    urls.forEach(u => {
      const uRes = analyzeUrl(u);
      urlAnalysisList.push(uRes);
      if (uRes.signals && uRes.signals.length) {
        signals.push(...uRes.signals);
      }
    });

    // External URL flags passed from front-end
    if (Array.isArray(externalUrlFlags)) {
      externalUrlFlags.forEach(f => {
        if (!signals.some(s => s.explanation === f || s.label === f)) {
          signals.push({
            type: 'SUSPICIOUS_LINK',
            label: 'URL Heuristic Trigger',
            severity: 'MEDIUM',
            points: 12,
            evidence: f,
            explanation: f
          });
        }
      });
    }

    return { signals, urls, urlAnalysisList };
  }

  function calculateThreatBreakdown(signals) {
    const categories = {
      SOCIAL_ENGINEERING: 0,
      URGENCY: 0,
      IMPERSONATION: 0,
      SUSPICIOUS_LINK: 0,
      PAYMENT_REQUEST: 0,
      CREDENTIAL_REQUEST: 0
    };

    signals.forEach(s => {
      const key = s.type || 'SOCIAL_ENGINEERING';
      if (categories[key] !== undefined) {
        categories[key] += s.points;
      }
    });

    return {
      socialEngineering: Math.min(100, Math.round(categories.SOCIAL_ENGINEERING * 2.2)),
      urgency: Math.min(100, Math.round(categories.URGENCY * 2.4)),
      impersonation: Math.min(100, Math.round(categories.IMPERSONATION * 2.2)),
      suspiciousLink: Math.min(100, Math.round(categories.SUSPICIOUS_LINK * 2.2)),
      paymentRequest: Math.min(100, Math.round((categories.PAYMENT_REQUEST + categories.CREDENTIAL_REQUEST) * 1.8))
    };
  }

  function classifyScamCategory(signals, text) {
    const lower = text.toLowerCase();
    const types = signals.map(s => s.type);

    if (lower.includes('kyc') || lower.includes('pan card') || lower.includes('aadhaar')) {
      return 'Phishing / Fake KYC Verification';
    }
    if (lower.includes('electricity') || lower.includes('power cut') || lower.includes('bijli') || lower.includes('discom')) {
      return 'Utility / Electricity Bill Impersonation';
    }
    if (lower.includes('customs') || lower.includes('courier') || lower.includes('delivery') || lower.includes('package') || lower.includes('parcel')) {
      return 'Delivery / Customs Clearance Scam';
    }
    if (lower.includes('work from home') || lower.includes('youtube like') || lower.includes('telegram task') || lower.includes('part time job')) {
      return 'Job & Task Fraud';
    }
    if (lower.includes('crypto') || lower.includes('investment') || lower.includes('double your money') || lower.includes('guaranteed profit')) {
      return 'High-Yield Investment Scam';
    }
    if (types.includes('PAYMENT_REQUEST') || lower.includes('upi') || lower.includes('qr code') || lower.includes('refund')) {
      return 'Financial Fraud / UPI Deception';
    }
    if (types.includes('CREDENTIAL_REQUEST') || types.includes('SUSPICIOUS_LINK') || types.includes('IMPERSONATION')) {
      return 'Phishing / Financial Impersonation';
    }
    if (signals.length > 0) {
      return 'Social Engineering / Suspicious Message';
    }
    return 'Legitimate / Low Risk Communication';
  }

  function buildLocalAssessment(text, externalUrlFlags = [], language = 'en') {
    const { signals, urls, urlAnalysisList } = detectThreatSignals(text, externalUrlFlags);

    // Deduplicate signals by label
    const uniqueSignals = [];
    const seen = new Set();
    for (const s of signals) {
      if (!seen.has(s.label)) {
        seen.add(s.label);
        uniqueSignals.push(s);
      }
    }

    let localThreatPoints = 0;
    let urlPoints = 0;
    let socialEngineeringPoints = 0;

    uniqueSignals.forEach(s => {
      if (s.type === 'SUSPICIOUS_LINK') urlPoints += s.points;
      else if (s.type === 'SOCIAL_ENGINEERING' || s.type === 'URGENCY') socialEngineeringPoints += s.points;
      else localThreatPoints += s.points;
    });

    const rawTotal = localThreatPoints + urlPoints + socialEngineeringPoints;
    let riskScore = Math.min(98, Math.max(5, rawTotal));
    if (uniqueSignals.length === 0) {
      riskScore = 5;
    }

    let riskLevel = 'LOW';
    if (riskScore >= 75) riskLevel = 'CRITICAL';
    else if (riskScore >= 50) riskLevel = 'HIGH';
    else if (riskScore >= 25) riskLevel = 'MEDIUM';

    const category = classifyScamCategory(uniqueSignals, text);
    const threatBreakdown = calculateThreatBreakdown(uniqueSignals);

    const redFlags = uniqueSignals.length > 0
      ? uniqueSignals.map(s => `[${s.severity}] ${s.label}: ${s.explanation}`)
      : ['No common fraud indicators or credential harvesting patterns detected.'];

    const actionSteps = [];
    if (riskLevel === 'CRITICAL' || riskLevel === 'HIGH') {
      actionSteps.push('Do not click any link or open attached files.');
      actionSteps.push('Never share OTP, PIN, password, or banking credentials.');
      actionSteps.push('Do not call phone numbers mentioned in the message.');
      actionSteps.push('Verify independently by opening the official app or website directly.');
      actionSteps.push('Report and block the sender immediately.');
    } else if (riskLevel === 'MEDIUM') {
      actionSteps.push('Exercise caution: verify the sender identity through official channels.');
      actionSteps.push('Check the destination domain carefully before entering credentials.');
      actionSteps.push('Avoid sharing any sensitive information.');
    } else {
      actionSteps.push('No obvious malicious triggers detected.');
      actionSteps.push('Standard precaution: always verify unexpected payment requests.');
    }

    const ifMoneySent = (riskLevel === 'CRITICAL' || riskLevel === 'HIGH' || riskLevel === 'MEDIUM') ? [
      'Call National Cyber Crime Helpline immediately at 1930 (Golden Hour for fund recovery).',
      'Report the incident at cybercrime.gov.in with transaction details.',
      'Contact your bank immediately to block cards, freeze netbanking, and report unauthorized debits.',
      'Preserve screenshots, transaction IDs (UTR/Txn ID), and sender numbers as evidence.'
    ] : [];

    let explainSimple = '';
    let explainTechnical = '';
    let explainFamily = '';

    if (language === 'hi') {
      explainSimple = riskLevel === 'LOW'
        ? 'यह संदेश सुरक्षित प्रतीत होता है। इसमें कोई स्पष्ट धोखाधड़ी के संकेत नहीं मिले हैं।'
        : `यह ${category} का संदिग्ध संदेश है। यह आपको डराकर या लालच देकर निजी जानकारी या पैसे ऐंठने की कोशिश कर सकता है।`;
      explainTechnical = `स्थानीय नियम आधारित इंजन ने ${uniqueSignals.length} थ्रेट सिग्नल डिटेक्ट किए हैं। जोखिम स्कोर: ${riskScore}/100 (${riskLevel})।`;
      explainFamily = riskLevel === 'LOW'
        ? 'यह सामान्य संदेश लग रहा है। चिंता की कोई बात नहीं है।'
        : '⚠️ यह संदेश खतरनाक लग रहा है! किसी भी लिंक पर क्लिक न करें, कोई OTP या पासवर्ड किसी को न बताएं, और कोई पैसा न भेजें।';
    } else if (language === 'hinglish') {
      explainSimple = riskLevel === 'LOW'
        ? 'Yeh message safe lag raha hai. Koi fake ya fraud indicators nahi mile.'
        : `Yeh ${category} ka fraud message lag raha hai. Fake urgency create karke aapka data ya paisa lene ki koshish hai.`;
      explainTechnical = `Rule engine flagged ${uniqueSignals.length} threat vectors. Risk Score: ${riskScore}/100 with category ${category}.`;
      explainFamily = riskLevel === 'LOW'
        ? 'Yeh message theek lag raha hai. Tension mat lijiye.'
        : '⚠️ Yeh message fraud lag raha hai! Link par click mat karna, kisi ko OTP ya PIN mat dena, aur official bank app se check karo.';
    } else {
      explainSimple = riskLevel === 'LOW'
        ? 'This communication appears legitimate with no common fraudulent triggers.'
        : `This appears to be a ${category} attempt designed to manipulate you through urgency, impersonation, or deceptive links.`;
      explainTechnical = `Deterministic heuristic engine flagged ${uniqueSignals.length} threat vectors. Composite risk score: ${riskScore}/100 (${riskLevel}) based on structural signals.`;
      explainFamily = riskLevel === 'LOW'
        ? 'This message looks normal. No reason to worry.'
        : '⚠️ This message is dangerous! Do not tap the link, never share your OTP or bank details with anyone, and do not send any money.';
    }

    const confidence = uniqueSignals.length >= 3 ? 'HIGH' : uniqueSignals.length >= 1 ? 'MEDIUM' : 'HIGH';

    return {
      risk_score: riskScore,
      risk_level: riskLevel,
      category: category,
      confidence: confidence,
      threat_signals: uniqueSignals,
      threat_breakdown: threatBreakdown,
      red_flags: redFlags,
      action_steps: actionSteps,
      if_money_sent: ifMoneySent,
      explain_simple: explainSimple,
      explain_technical: explainTechnical,
      explain_family: explainFamily,
      score_breakdown: {
        threat_signals: localThreatPoints,
        url_intelligence: urlPoints,
        behavioral_indicators: socialEngineeringPoints,
        ai_context_adjustment: 0,
        total: riskScore
      },
      urls_inspected: urlAnalysisList,
      source: 'local_rule_engine'
    };
  }

  return {
    normalizeText,
    analyzeUrl,
    detectThreatSignals,
    calculateThreatBreakdown,
    classifyScamCategory,
    buildLocalAssessment
  };
}));
