<div align="center">

# 🛡️ ScamShield AI
### Zero-Hour Behavioral Defense & Digital Fraud Decision Support

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Vercel-black?style=for-the-badge&logo=vercel)](https://scamshield-lac-rho.vercel.app)
[![GitHub Repo](https://img.shields.io/badge/Source%20Code-GitHub-181717?style=for-the-badge&logo=github)](https://github.com/ridhiambala87/scamshield)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](LICENSE)

**Detect. Explain. Protect.**  
*Stopping digital payment fraud and social engineering traps before they reach public blacklists.*

[Explore Live Demo](https://scamshield-lac-rho.vercel.app) · [Report Issue](https://github.com/ridhiambala87/scamshield/issues)

</div>

---

## 📌 Executive Summary

Digital payment fraud (fake bank KYC, reverse UPI cashback deception, utility disconnection threats, and task scams) is skyrocketing across Tier 1, 2, and 3 demographics.

Most anti-scam tools (Truecaller, VirusTotal, SMS Blockers) rely on **static crowdsourced blacklists**: they only flag a malicious domain or number **after** hundreds or thousands of victims have already fallen for it and reported it. Attackers exploit this window by deploying disposable $0.99 domains (`sbi-online-kyc-update.xyz`), scamming victims within 30 minutes, and abandoning the infrastructure before blacklists update.

**ScamShield AI is zero-hour behavioral defense.**  
It evaluates psychological coercion patterns, deceptive domain synthetics, adversarial leetspeak, and live server-side DNS resolution at **Minute Zero**—protecting the very first victim.

---

## ⚡ Key Features

- **Multi-Modal Threat Ingestion:** Analyzes raw messages, chat screenshots (local Tesseract OCR with automatic WhatsApp/Telegram UI noise filtering), URLs, and QR codes (UPI payment scheme decoding).
- **Live Server-Side DNS & MX Intelligence:** Dynamically queries DNS A-records and Mail Exchange (MX) delegation to catch unmapped/NXDOMAIN phishing hosts in real-time.
- **Adversarial Obfuscation Normalization:** Automatically defeats leetspeak and spaced characters (`s b i - k y c` → `sbi-kyc`, `bl0cked` → `blocked`, `0tp` → `otp`).
- **Honest & Auditable Risk Score:** Eliminates black-box synthetic numbers. Every composite score (0–100) is backed by an open 4-part point audit:
  $$\text{Score} = \text{Threat Signals} + \text{URL Intelligence} + \text{Behavioral Indicators} + \text{AI Context}$$
- **Multi-Tier Explanations:**
  - 🎓 **Simple:** Jargon-free advice for everyday users.
  - 💻 **Technical:** Deep heuristics, DNS headers, and JSON intel.
  - 🛡️ **Family Protection:** Empathetic alert with a **1-Click WhatsApp Deep Link** to warn relatives instantly.
- **Golden-Hour Recovery Protocol:** Direct integration with the **National Cyber Crime Helpline (1930)** and step-by-step evidence preservation for [cybercrime.gov.in](https://cybercrime.gov.in).
- **Technical Threat Intel Export:** 1-click structured JSON download for SIEM ingestion and incident response.

---

## 🏗️ Technical Architecture

```
                                USER INPUT
               (Text / Screenshot / URL / QR Code)
                                    │
                                    ▼
       ┌──────────────────────────────────────────────────────────┐
       │ 1. Ingestion & Adversarial Pre-processing                │
       │    - 1280px Canvas Contrast Enhancer (Tesseract.js)      │
       │    - Chat UI Noise Stripping (WhatsApp / SMS)            │
       │    - Obfuscation Normalizer (Leetspeak / Spaced Words)   │
       │    - jsQR Decoder (Reverse UPI String Extraction)        │
       └────────────────────────────┬─────────────────────────────┘
                                    │
                                    ▼
       ┌──────────────────────────────────────────────────────────┐
       │ 2. Live Server-Side DNS & MX Intelligence                │
       │    - Real-time DNS A-record queries (getaddrinfo)        │
       │    - Mail Exchange (MX) record resolution                │
       │    - Identifies Disposable & NXDOMAIN Phishing Hosts     │
       └────────────────────────────┬─────────────────────────────┘
                                    │
                                    ▼
       ┌──────────────────────────────────────────────────────────┐
       │ 3. Deterministic Threat Signal Engine                    │
       │    - 6 core vectors: Urgency, Credentials, Impersonation │
       │    - 100% offline fallback capability in browser         │
       └────────────────────────────┬─────────────────────────────┘
                                    │
                                    ▼
       ┌──────────────────────────────────────────────────────────┐
       │ 4. Groq AI Contextual Reasoning Layer                    │
       │    - Llama 3.1 8B Instant inference                      │
       │    - Decoupled provider abstraction                      │
       │    - Multilingual & Hinglish nuances                     │
       │    - In-memory LRU cache (< 15ms repeat responses)       │
       └────────────────────────────┬─────────────────────────────┘
                                    │
                                    ▼
                   HONEST EXPLAINABLE RISK DASHBOARD
           (Score Breakdown + Threat Highlighting + Actions)
```

---

## 🔬 ScamShield AI vs. Basic Filters & Blacklists

| Capability | Static Blacklists (Truecaller/VirusTotal) | Basic Keyword Filter | ScamShield AI Hybrid Engine |
| :--- | :---: | :---: | :---: |
| **Zero-Hour Detection** | ❌ Fails on new domains | ⚠️ High false positives | ✅ **Inspects intent & domain syntax immediately** |
| **Reverse UPI Exploits**| ❌ No QR inspection | ❌ Cannot parse schemes | ✅ **Detects collect-request deception** |
| **Adversarial Evasion** | ❌ Misses obfuscated text | ❌ Bypassed by `s b i` or `0tp` | ✅ **Pre-processed leetspeak normalizer** |
| **DNS Intelligence**    | ⚠️ Third-party database only | ❌ None | ✅ **Live A-record & MX server verification** |
| **Explainability**      | ❌ Binary Block / Allow | ❌ None | ✅ **Auditable 4-part reproducible breakdown** |
| **Post-Incident Recovery**| ❌ None | ❌ None | ✅ **1930 Cyber helpline golden-hour workflow** |

---

## 🚀 Quick Start (Local Setup)

### Prerequisites
- Node.js (v18 or higher)
- NPM

### 1. Clone the Repository
```bash
git clone https://github.com/ridhiambala87/scamshield.git
cd scamshield
```

### 2. Configure Environment Variables
Create a `.env` file in the root directory:
```ini
GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=llama-3.1-8b-instant
PORT=3000
```
> *Note: If no Groq API key is provided, ScamShield automatically and gracefully falls back to its internal deterministic threat engine.*

### 3. Start the Server
```bash
node server.js
```
Open your browser and navigate to:
👉 `http://localhost:3000`

---

## 🌐 Production Deployment (Vercel)

This repository includes a pre-configured `vercel.json` for serverless deployment.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/ridhiambala87/scamshield)

Add the following environment variables in your Vercel Dashboard:
- `GROQ_API_KEY`
- `GROQ_MODEL` (`llama-3.1-8b-instant`)

---

## 🔒 Privacy & Data Ethics

- **Zero Storage of Personal Data:** Submitted screenshots are processed ephemerally on the client or in-memory. Images are never stored on persistent storage.
- **Client-Side Scan History:** Scan records are stored exclusively inside the user's browser `localStorage`.
- **API Key Security:** AI provider keys reside strictly on the server backend and are never exposed to the client.

---

## 📞 Emergency Helplines (India)

If you or someone you know has fallen victim to digital financial fraud:
- **National Cyber Crime Helpline:** Dial **1930** (24x7 Golden Hour Support)
- **National Cyber Crime Reporting Portal:** [https://cybercrime.gov.in](https://cybercrime.gov.in)

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.
