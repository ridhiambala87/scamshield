// Live DNS Intelligence Module for ScamShield AI
const dns = require('dns');


function withTimeout(promise, ms) {
  let tid;
  const to = new Promise((_, rej) => {
    tid = setTimeout(() => rej(new Error('DNS_TIMEOUT')), ms);
  });
  return Promise.race([promise, to]).then(
    res => { clearTimeout(tid); return res; },
    err__ => { clearTimeout(tid); throw err__; }
  );
}


async function inspectDns(hostname) {
  if (!hostname || typeof hostname !== 'string') return null;
  let cleanHost = hostname.toLowerCase().trim();
  if (cleanHost.includes(':')) cleanHost = cleanHost.split(':')[0];

  if (/^\d1,3\.\d1,3\.\d1,3\.\d1,3$/.test(cleanHost)) {
    return {
      hostname: cleanHost,
      isIpHost: true,
      resolvable: true,
      aRecordFound: false,
      mxRecordFound: false,
      details: 'Direct numeric IP address host (no DNS delegation)',
      summary: 'Destination is a bare IP address rather than a registered domain.',
      riskBonus: 10
    };
  }

  let aRecords = [], aRecordFound = false, mxRecords = [], mxRecordFound = false, dnsStatus = 'unresolved';

  try {
    const lookupResult = await withTimeout(dns.promises.lookup(cleanHost), 4500);
    if (lookupResult && lookupResult.address) {
      aRecords = [lookupResult.address];
      aRecordFound = true;
      dnsStatus = 'resolvable';
    }
  } catch (err) {
    if (err.code === 'ENOTFOUND' || err.code === 'NODATA' || err.code === 'ENODATA') {
      dnsStatus = 'nxdomain';
    } else if (err.message === 'DNS_TIMEOUT') {
      dnsStatus = 'nxdomain'; // falls back to unresolved for phishing domains
    } else {
      dnsStatus = 'nxdomain';
    }
  }

  if (dnsStatus === 'resolvable') {
    try {
      const resMx = await withTimeout(dns.promises.resolveMx(cleanHost), 2500);
      if (Array.isArray(resMx) && resMx.length > 0) {
        mxRecords = resMx.map(m => ({ exchange: m.exchange, priority: m.priority }));
        mxRecordFound = true;
      }
    } catch (err) {
      mxRecordFound = false;
    }
  }

  let assessmentSummary = '';
  let riskBonus = 0;

  if (dnsStatus === 'nxdomain') {
    assessmentSummary = 'Domain could not be resolved (NXDOMAIN). Host has no active DNS A record on public resolvers.';
    riskBonus = 12;
  } else if (dnsStatus === 'resolvable') {
    if (mxRecordFound) {
      assessmentSummary = 'Domain resolves to active IP(s) and has registered mail exchange (MX) delegation.';
      riskBonus = 0;
    } else {
      assessmentSummary = 'Domain resolves to active IP(s) but has no dedicated mail exchange (MX) records.';
      riskBonus = 4;
    }
  } else {
    assessmentSummary = 'Domain has limited or unconfirmed DNS telemetry at time of evaluation.';
    riskBonus = 0;
  }

  return {
    hostname: cleanHost,
    isIpHost: false,
    resolvable: aRecordFound,
    dnsStatus,
    aRecordFound,
    aRecords: aRecords,
    mxRecordFound,
    mxRecords: mxRecords.slice(0, 3),
    summary: assessmentSummary,
    riskBonus
  };
}

module.exports = { inspectDns };
