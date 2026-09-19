// AI Provider Abstraction Layer for ScamShield AI
// Decouples the rest of the application from specific LLM providers (Groq, fallbacks)

 const { analyzeWithGroq } = require('./groq');

async function analyzeContent({ inputText, urlFlags = [], dnsIntel = null, language = 'en' }) {
  const provider = process.env.AI_PROVIDER || 'groq';
  
  if (provider === 'groq') {
    return await analyzeWithGroq(inputText, urlFlags, language, dnsIntel);
  }
  
  // Fallback to Groq
  return await analyzeWithGroq(inputText, urlFlags, language, dnsIntel);
}

module.exports = {
  analyzeContent
};
