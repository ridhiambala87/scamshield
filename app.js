// SCAMSHIELD AI FRONTEND CONTROLLER PART 1

document.querySelectorAll('[data-page]').forEach(el => {
  el.addEventListener('click', (e) => {
    e.preventDefault();
    const target = el.dataset.page;
    switchPage(target);
  });
});

function switchPage(pageId) {
  document.querySelectorAll('.navlink').forEach(n => {
    n.classList.toggle('active', n.dataset.page === pageId);
  });
  document.querySelectorAll('.page').forEach(p => {
    p.classList.toggle('active', p.id === 'page-' + pageId);
  });
  if (pageId === 'dashboard') renderDashboard();
  if (pageId === 'history') renderHistory();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

const tabs = document.querySelectorAll('.tab-btn');
tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    tabs.forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
    tab.classList.add('active');
    document.getElementById('tab-' + tab.dataset.tab).classList.remove('hidden');
    if (typeof renderJudgeDemoChips === 'function') {
      renderJudgeDemoChips(tab.dataset.tab);
    }
  });
});

let ocrExtractedText = "";
const screenshotDrop = document.getElementById('screenshotDrop');
const screenshotFile = document.getElementById('screenshotFile');

// Intelligent Canvas-based Image Preprocessor for OCR
async function preprocessImageForOcr(imageFile) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        let w = img.width;
        let h = img.height;

        // Optimize dimensions for high OCR fidelity without browser memory exhaustion
        if (w > 1280) {
          const ratio = 1280 / w;
          w = 1280;
          h = Math.round(h * ratio);
        } else if (w < 800) {
          const ratio = 1100 / w;
          w = 1100;
          h = Math.round(h * ratio);
        }

        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);

        const imgData = ctx.getImageData(0, 0, w, h);
        const data = imgData.data;

        // Grayscale conversion and contrast enhancement
        // Suppresses faint background doodle wallpaper patterns (e.g. WhatsApp Web backgrounds)
        const contrast = 1.30;
        const intercept = 128 * (1 - contrast);

        for (let i = 0; i < data.length; i += 4) {
          const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
          let enhanced = gray * contrast + intercept;
          if (enhanced > 242) enhanced = 255;
          if (enhanced < 30) enhanced = 0;
          data[i] = enhanced;
          data[i + 1] = enhanced;
          data[i + 2] = enhanced;
        }

        ctx.putImageData(imgData, 0, 0);
        canvas.toBlob(blob => {
          resolve(blob || imageFile);
        }, 'image/png');
      } catch (err) {
        console.warn('Image preprocessing fallback to raw file:', err);
        resolve(imageFile);
      }
    };
    img.onerror = () => resolve(imageFile);
    img.src = URL.createObjectURL(imageFile);
  });
}

// Clean chat UI noise (e.g. browser URL bars, 'Type a message', contact headers)
function cleanChatOcrText(rawText) {
  if (!rawText) return { text: '', isChat: false, platform: '' };

  const isWhatsApp = /whatsapp|web\.whatsapp\.com|type a message|see more chat history|click here for contact info/i.test(rawText);
  const isTelegram = /telegram|t\.me/i.test(rawText);

  const noisePatterns = [
    /^https?:\/\/web\.whatsapp\.com[^\s]*/i,
    /^search or start (a )?new chat/i,
    /^click here for contact info/i,
    /^see more chat history on the app/i,
    /^get whatsapp for (windows|mac|android)/i,
    /^type a message/i,
    /^type something/i,
    /^status\b/i,
    /^communities\b/i,
    /^channels\b/i,
    /^chats\b/i,
    /^settings\b/i,
    /^new chat\b/i,
    /^[0-9]{1,2}:[0-9]{2}\s*(am|pm|AM|PM)?$/,
    /^[0-9]{1,2}\/[0-9]{1,2}\/[0-9]{2,4}$/,
    /^read more$/i,
    /^this message couldn't load\.?/i,
    /^online$/i,
    /^typing\.\.\.$/i,
    /^disappearing messages/i,
    /^end-to-end encrypted/i
  ];

  const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
  const cleanedLines = [];

  for (const line of lines) {
    const isNoise = noisePatterns.some(pattern => pattern.test(line));
    if (!isNoise) {
      cleanedLines.push(line);
    }
  }

  const cleanedText = cleanedLines.join('\n');
  return {
    text: cleanedText.length > 5 ? cleanedText : rawText,
    isChat: isWhatsApp || isTelegram,
    platform: isWhatsApp ? 'WhatsApp Web / Mobile' : isTelegram ? 'Telegram' : ''
  };
}

async function processScreenshotFile(file, label = 'Screenshot Loaded') {
  if (!file) return;

  const preview = document.getElementById('screenshotPreview');
  preview.src = URL.createObjectURL(file);
  preview.classList.remove('hidden');
  document.getElementById('screenshotPrompt').classList.add('hidden');

  const stagedBox = document.getElementById('ocrStagedProgress');
  stagedBox.classList.remove('hidden');
  const step1 = document.getElementById('ocrStep1');
  const step2 = document.getElementById('ocrStep2');
  const step3 = document.getElementById('ocrStep3');
  const btn = document.getElementById('analyzeBtn');

  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Extracting & Cleaning Message via OCR...';
  }

  step1.className = "stage-step active";
  step1.innerHTML = `<span class="stage-icon"><span class="spinner"></span></span> Step 1: Preprocessing & Contrast Optimization...`;

  try {
    const optimizedBlob = await preprocessImageForOcr(file);
    step1.className = "stage-step done";
    step1.innerHTML = `<span class="stage-icon">✓</span> Step 1: Image Contrast & Resolution Optimized`;

    step2.className = "stage-step active";
    step2.innerHTML = '<span class="stage-icon"><span class="spinner"></span></span> Step 2: Optical Character Recognition (OCR)...';

    const result = await Tesseract.recognize(optimizedBlob, 'eng');
    const rawText = (result.data?.text || '').trim();

    step2.className = "stage-step done";
    step2.innerHTML = '<span class="stage-icon">✓</span> Step 2: Text Extracted via Tesseract OCR';

    step3.className = "stage-step active";
    step3.innerHTML = '<span class="stage-icon"><span class="spinner"></span></span> Step 3: Filtering UI Noise & Extracting Messages...';

    const cleanedResult = cleanChatOcrText(rawText);
    ocrExtractedText = cleanedResult.text;

    step3.className = "stage-step done";
    step3.innerHTML = '<span class="stage-icon">✓</span> Step 3: Ready for Threat Analysis (' + ocrExtractedText.length + ' chars)';

    const editWrap = document.getElementById('ocrEditWrap');
    const editArea = document.getElementById('ocrExtractedTextArea');
    const badge = document.getElementById('ocrPlatformBadge');

    if (editWrap && editArea) {
      editWrap.classList.remove('hidden');
      editArea.value = ocrExtractedText;
    }

    if (badge) {
      if (cleanedResult.isChat) {
        badge.textContent = `💬 ${cleanedResult.platform} Detected & Cleaned`;
        badge.classList.remove('hidden');
      } else {
        badge.classList.add('hidden');
      }
    }
  } catch (err) {
    step2.className = "stage-step";
    step2.innerHTML = '<span class="stage-icon" style="color:var(--critical);">✗</span> OCR Extraction Failed: ' + err.message;
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<span>🛡️</span> Analyze Threat Signals & AI Context →';
    }
  }
}

if (screenshotDrop && screenshotFile) {
  screenshotDrop.addEventListener('click', () => screenshotFile.click());
  screenshotFile.addEventListener('change', (e) => {
    processScreenshotFile(e.target.files[0], 'File Selected');
  });

  // Drag and Drop
  screenshotDrop.addEventListener('dragover', (e) => {
    e.preventDefault();
    screenshotDrop.style.borderColor = 'var(--cyan)';
    screenshotDrop.style.background = 'rgba(6,182,212,0.06)';
  });
  screenshotDrop.addEventListener('dragleave', () => {
    screenshotDrop.style.borderColor = '';
    screenshotDrop.style.background = '';
  });
  screenshotDrop.addEventListener('drop', (e) => {
    e.preventDefault();
    screenshotDrop.style.borderColor = '';
    screenshotDrop.style.background = '';
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processScreenshotFile(e.dataTransfer.files[0], 'Dropped File');
    }
  });
}

// Global Clipboard Paste Support (Ctrl+V) for Instant Screenshots
window.addEventListener('paste', (e) => {
  const items = e.clipboardData?.items;
  if (!items) return;

  for (let i = 0; i < items.length; i++) {
    if (items[i].type && items[i].type.indexOf('image') !== -1) {
      const file = items[i].getAsFile();
      if (file) {
        const tabBtn = document.querySelector('.tab-btn[data-tab="screenshot"]');
        if (tabBtn) tabBtn.click();
        processScreenshotFile(file, 'Pasted from Clipboard (Ctrl+V)');
        break;
      }
    }
  }
});

let qrDecodedPayload = "";
const qrDrop = document.getElementById('qrDrop');
const qrFile = document.getElementById('qrFile');

if (qrDrop && qrFile) {
  qrDrop.addEventListener('click', () => qrFile.click());
  qrFile.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const preview = document.getElementById('qrPreview');
    preview.src = URL.createObjectURL(file);
    preview.classList.remove('hidden');
    document.getElementById('qrPrompt').classList.add('hidden');

    const statusBox = document.getElementById('qrStatusBox');
    statusBox.classList.remove('hidden');
    statusBox.innerHTML = '<div class="stage-step active"><span class="stage-icon"><span class="spinner"></span></span> Decoding QR matrix...</div>';

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: "attemptBoth"
      });

      if (code) {
        qrDecodedPayload = code.data;
        const isUpi = qrDecodedPayload.startsWith('upi://');
        statusBox.innerHTML = `
          <div class="stage-step done"><span class="stage-icon">✓</span> QR Code Decoded Successfully</div>
          <div style="font-size:12.5px;color:var(--ink);margin-top:4px;word-break:break-all;">
            <b>Destination:</b> <code>${escapeHtml(qrDecodedPayload)}</code>
          </div>
          ${isUpi ? '<div style="font-size:12px;color:var(--high);margin-top:4px;">⚠️ Contains UPI Payment payload. Ensure you are not sending money under false pretenses.</div>' : ''}
        `;
      } else {
        statusBox.innerHTML = '<div class="stage-step" style="color:var(--high);"><span class="stage-icon">⚠️</span> Could not decode QR code. Please try a higher-contrast image or tighter crop.</div>';
      }
    };
    img.src = preview.src;
  });
}


﻿// SCAMSHIELD AI FRONTEND CONTROLLER PART 2

// SCAMSHIELD AI MULTI-MODAL JUDGE DEMO SUITE
// Tab-contextual realistic samples for Message, Screenshot (OCR), URL, and QR Code

const TAB_DEMO_PRESETS = {
  text: [
    {
      id: 'kyc',
      label: '🏦 Fake Bank KYC',
      text: "URGENT! Dear SBI User, Your YONO Account & NetBanking will be suspended today due to pending KYC verification. Please click the link immediately to update your Aadhaar and PAN: https://sbi-online-kyc-update.xyz/verify"
    },
    {
      id: 'upi',
      label: '💳 Reverse UPI Fraud',
      text: "Dear Customer, you have won a cashback of Rs. 4,999 on PhonePe! To credit this reward to your account, scan this QR code or click upi://pay?pa=refund998@ybl&pn=PhonePeRewards&am=4999 and enter your UPI PIN to claim money."
    },
    {
      id: 'job',
      label: '💼 Telegram Job Scam',
      text: "🌟 GLOBAL AMAZON PART-TIME OPPORTUNITY! Earn Rs. 3,000 to Rs. 8,000 daily from home just by liking YouTube videos and rating products. Daily payout guaranteed. No experience required. Join our official Telegram group immediately: https://t.me/amazon_daily_tasks_india"
    },
    {
      id: 'crypto',
      label: '📈 Crypto Investment',
      text: "Exclusive VIP Trading Signal: Double your investment within 24 hours! Guaranteed 500% profit with zero risk. Send minimum 0.05 BTC or 5,000 INR to our automated bot and start withdrawing profits today: https://bit-guaranteed-returns.click/invest"
    },
    {
      id: 'delivery',
      label: '📦 Customs / Delivery',
      text: "India Post Alert: Your package #IN982183 has been held at customs depot due to an incorrect delivery address and unpaid clearance fee of Rs. 48. Update your details within 12 hours to avoid seizure: https://indiapost-parcel-clearance.top/track"
    },
    {
      id: 'adversarial',
      label: '🛡️ Obfuscated Evasion Test',
      text: "URG3NT! Dear SBI User, Your Y0N0 NetBanking will be bl0cked t0day due to pending K-Y-C. Visit http://s b i - k y c .xyz/v to verify ur 0tp"
    },
    {
      id: 'legit',
      label: '✅ Legitimate Bank Alert',
      text: "Dear Customer, your SBI Debit Card ending in 4102 was used for Rs. 450.00 at Swiggy on 13-Sep. If not done by you, forward this SMS to 9223008333 to block card immediately. Do not share OTP with anyone."
    }
  ],

  screenshot: [
    {
      id: 'ss_kyc',
      label: '💬 WhatsApp KYC Phishing Chat',
      type: 'whatsapp',
      sender: 'SBI YONO Support (+91 98112 04918)',
      text: "URGENT! Dear SBI User, Your YONO NetBanking will be suspended today due to pending KYC verification. Please click the link immediately to verify your Aadhaar and PAN: https://sbi-online-kyc-update.xyz/verify",
      time: '11:42 AM'
    },
    {
      id: 'ss_power',
      label: '📱 Electricity Disconnection SMS',
      type: 'sms',
      sender: 'VK-POWERC',
      text: "Dear Consumer, your electricity power will be disconnected tonight at 9:30 PM from the power office because your previous month bill was not updated. Immediately call officer at 8820319482. Download update APK: https://power-discom-bill.xyz/update.apk",
      time: '04:15 PM'
    },
    {
      id: 'ss_upi',
      label: '💸 PhonePe Cashback Screenshot',
      type: 'whatsapp',
      sender: 'PhonePe Rewards',
      text: "Congratulations! You have received a cashback reward of Rs 4,999 on PhonePe. Scan QR code or click upi://pay?pa=refund998@ybl&am=4999 and enter your UPI PIN to claim money.",
      time: '01:20 PM'
    },
    {
      id: 'ss_job',
      label: '💼 Telegram Job Offer Chat',
      type: 'whatsapp',
      sender: 'Amazon Recruiter (+91 93102 91823)',
      text: "Global Amazon Part-Time Opportunity! Earn Rs 3,000 to Rs 8,000 daily from home just by rating products and liking YouTube videos. Daily payout guaranteed. Contact on Telegram: https://t.me/amazon_daily_tasks_india",
      time: '10:05 AM'
    },
    {
      id: 'ss_legit',
      label: '✅ Safe Friend WhatsApp Chat',
      type: 'whatsapp',
      sender: 'Rahul (College Friend)',
      text: "Wishing u a very happy birthday! Ik humare bich kuch sahi nhi h but dil se very sorry. Apna padhai pr focus kr and achi si job le!",
      time: '12:04 AM'
    }
  ],

  url: [
    {
      id: 'url_kyc',
      label: '🚨 sbi-online-kyc-update.xyz (Phishing)',
      url: 'https://sbi-online-kyc-update.xyz/verify'
    },
    {
      id: 'url_tax',
      label: '⚠️ verify-tax-refund.online (Insecure HTTP)',
      url: 'http://verify-tax-refund.online/claim'
    },
    {
      id: 'url_post',
      label: '📦 indiapost-parcel-clearance.top (Fake Parcel)',
      url: 'https://indiapost-parcel-clearance.top/track'
    },
    {
      id: 'url_crypto',
      label: '📈 bit-guaranteed-returns.click (Crypto Ponzi)',
      url: 'https://bit-guaranteed-returns.click/invest'
    },
    {
      id: 'url_legit',
      label: '✅ onlinesbi.sbi (Official Bank Portal)',
      url: 'https://onlinesbi.sbi'
    }
  ],

  qr: [
    {
      id: 'qr_reverse_upi',
      label: '💸 Reverse UPI Fraud (PhonePe ₹4,999)',
      payload: 'upi://pay?pa=refund998@ybl&pn=PhonePeRewards&am=4999'
    },
    {
      id: 'qr_kyc',
      label: '🚨 Fake KYC Phishing Link QR',
      payload: 'https://sbi-online-kyc-update.xyz/verify'
    },
    {
      id: 'qr_power',
      label: '⚡ Fake Electricity Payment QR',
      payload: 'upi://pay?pa=discom882031@paytm&pn=ElectricityBill&am=1850'
    },
    {
      id: 'qr_legit',
      label: '✅ Safe Merchant Payment (Swiggy ₹250)',
      payload: 'upi://pay?pa=swiggy@icici&pn=SwiggyOrders&am=250'
    }
  ]
};

// Helper: Pulse the main Analyze button to guide judge interaction
function pulseAnalyzeButton() {
  const btn = document.getElementById('analyzeBtn');
  if (btn) {
    btn.scrollIntoView({ behavior: 'smooth', block: 'center' });
    btn.style.boxShadow = '0 0 25px var(--cyan)';
    setTimeout(() => { btn.style.boxShadow = ''; }, 1200);
  }
}

// 1. Text Preset Loader
function loadSampleText(text) {
  const input = document.getElementById('textInput');
  if (input) {
    input.value = text;
    pulseAnalyzeButton();
  }
}

// 2. Screenshot Canvas Mockup Generator for OCR Demo
function generateSampleScreenshotBlob(demo) {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    canvas.width = 540;
    canvas.height = 680;
    const ctx = canvas.getContext('2d');

    const isWhatsApp = demo.type === 'whatsapp';
    const bgColor = isWhatsApp ? '#EFEAE2' : '#0F172A';
    const headerColor = isWhatsApp ? '#075E54' : '#1E293B';
    const bubbleColor = isWhatsApp ? '#FFFFFF' : '#1E293B';
    const textColor = isWhatsApp ? '#111B21' : '#F8FAFC';

    // Background
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Status Bar
    ctx.fillStyle = headerColor;
    ctx.fillRect(0, 0, canvas.width, 24);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '12px sans-serif';
    ctx.fillText('10:30', 20, 17);
    ctx.fillText('LTE 95%', canvas.width - 65, 17);

    // App Header Bar
    ctx.fillStyle = headerColor;
    ctx.fillRect(0, 24, canvas.width, 64);

    // Back Arrow
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText('←', 16, 62);

    // Avatar Circle
    ctx.beginPath();
    ctx.arc(58, 56, 18, 0, Math.PI * 2);
    ctx.fillStyle = isWhatsApp ? '#25D366' : '#3B82F6';
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText(demo.sender.charAt(0).toUpperCase(), 53, 61);

    // Sender Name
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 15px sans-serif';
    const senderTitle = demo.sender.length > 26 ? demo.sender.slice(0, 24) + '...' : demo.sender;
    ctx.fillText(senderTitle, 86, 52);
    ctx.font = '11px sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.fillText(isWhatsApp ? 'online · tap for contact info' : 'SMS Message', 86, 68);

    // Header Action Icons
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '16px sans-serif';
    ctx.fillText('📞', canvas.width - 70, 60);
    ctx.fillText('⋮', canvas.width - 30, 60);

    // Date Badge
    ctx.fillStyle = 'rgba(0,0,0,0.10)';
    roundRect(ctx, canvas.width / 2 - 40, 105, 80, 24, 12);
    ctx.fill();
    ctx.fillStyle = '#4B5563';
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText('TODAY', canvas.width / 2 - 20, 121);

    // Message Bubble
    const bubbleX = 24;
    const bubbleY = 145;
    const maxBubbleWidth = 440;
    
    ctx.font = '15px sans-serif';
    const words = demo.text.split(/\s+/);
    const lines = [];
    let currentLine = '';

    for (const w of words) {
      const test = currentLine ? currentLine + ' ' + w : w;
      if (ctx.measureText(test).width > maxBubbleWidth - 36) {
        lines.push(currentLine);
        currentLine = w;
      } else {
        currentLine = test;
      }
    }
    if (currentLine) lines.push(currentLine);

    const bubbleHeight = lines.length * 23 + 40;

    // Draw Bubble
    ctx.fillStyle = bubbleColor;
    roundRect(ctx, bubbleX, bubbleY, maxBubbleWidth, bubbleHeight, 14);
    ctx.fill();

    // Text Lines
    ctx.fillStyle = textColor;
    ctx.font = '15px sans-serif';
    lines.forEach((line, idx) => {
      ctx.fillText(line, bubbleX + 16, bubbleY + 26 + idx * 23);
    });

    // Bubble Timestamp
    ctx.font = '11px sans-serif';
    ctx.fillStyle = isWhatsApp ? '#667781' : '#94A3B8';
    ctx.fillText((demo.time || '10:35 AM') + ' ✓✓', bubbleX + maxBubbleWidth - 75, bubbleY + bubbleHeight - 10);

    // Bottom Typing Bar
    ctx.fillStyle = isWhatsApp ? '#F0F2F5' : '#1E293B';
    ctx.fillRect(0, canvas.height - 60, canvas.width, 60);

    ctx.fillStyle = isWhatsApp ? '#FFFFFF' : '#0F172A';
    roundRect(ctx, 16, canvas.height - 48, canvas.width - 80, 36, 18);
    ctx.fill();

    ctx.fillStyle = '#94A3B8';
    ctx.font = '14px sans-serif';
    ctx.fillText('Type a message...', 32, canvas.height - 25);

    // Mic button
    ctx.beginPath();
    ctx.arc(canvas.width - 34, canvas.height - 30, 20, 0, Math.PI * 2);
    ctx.fillStyle = isWhatsApp ? '#00A884' : '#3B82F6';
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '14px sans-serif';
    ctx.fillText('🎤', canvas.width - 41, canvas.height - 25);

    canvas.toBlob(blob => {
      resolve(blob);
    }, 'image/png');
  });
}

async function loadSampleScreenshot(demo) {
  const blob = await generateSampleScreenshotBlob(demo);
  if (typeof processScreenshotFile === 'function') {
    await processScreenshotFile(blob, demo.label);
  }
  pulseAnalyzeButton();
}

// 3. URL Preset Loader
function loadSampleUrl(url) {
  const input = document.getElementById('urlInput');
  if (input) {
    input.value = url;
    pulseAnalyzeButton();
  }
}

// 4. QR Code Preset Generator & Loader
function generateSampleQrCodeDataUrl(payload) {
  try {
    if (typeof qrcode === 'function') {
      const qr = qrcode(0, 'M');
      qr.addData(payload);
      qr.make();
      return qr.createDataURL(8, 16);
    }
  } catch (e) {
    console.warn('qrcode generator error:', e);
  }
  const c = document.createElement('canvas');
  c.width = 300;
  c.height = 300;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, 300, 300);
  ctx.fillStyle = '#000000';
  ctx.font = 'bold 16px monospace';
  ctx.fillText('QR DEMO PAYLOAD', 20, 150);
  return c.toDataURL('image/png');
}

function loadSampleQr(payload) {
  const dataUrl = generateSampleQrCodeDataUrl(payload);
  const preview = document.getElementById('qrPreview');
  const prompt = document.getElementById('qrPrompt');
  const statusBox = document.getElementById('qrStatusBox');

  if (preview) {
    preview.src = dataUrl;
    preview.classList.remove('hidden');
  }
  if (prompt) prompt.classList.add('hidden');

  qrDecodedPayload = payload;
  const isUpi = payload.startsWith('upi://');

  if (statusBox) {
    statusBox.classList.remove('hidden');
    statusBox.innerHTML = `
      <div class="stage-step done"><span class="stage-icon">✓</span> QR Code Generated & Decoded Successfully</div>
      <div style="font-size:12.5px;color:var(--ink);margin-top:4px;word-break:break-all;">
        <b>Decoded Payload:</b> <code>${escapeHtml(payload)}</code>
      </div>
      ${isUpi ? '<div style="font-size:12px;color:var(--high);margin-top:4px;">⚠️ Contains UPI Payment payload. Ensure you are not sending money under false pretenses.</div>' : ''}
    `;
  }

  pulseAnalyzeButton();
}

// 5. Dynamic Tab-Contextual Judge Demos Renderer
function renderJudgeDemoChips(activeTab = 'text') {
  const container = document.getElementById('demoChipsContainer');
  const label = document.getElementById('demoChipsLabel');
  if (!container) return;

  const presets = TAB_DEMO_PRESETS[activeTab] || TAB_DEMO_PRESETS.text;
  const labels = {
    text: '⚡ Message Demos:',
    screenshot: '⚡ Screenshot Demos (Click to load image):',
    url: '⚡ URL Demos (Click to test link):',
    qr: '⚡ QR Code Demos (Click to generate QR):'
  };

  if (label) label.textContent = labels[activeTab] || '⚡ Judge Demos:';

  container.innerHTML = presets.map((p, idx) => `
    <button class="example-chip" data-tab="${activeTab}" data-idx="${idx}" type="button" style="cursor:pointer;">
      ${escapeHtml(p.label)}
    </button>
  `).join('');

  container.querySelectorAll('.example-chip').forEach(chip => {
    chip.addEventListener('click', (e) => {
      e.preventDefault();
      const tab = chip.dataset.tab;
      const idx = parseInt(chip.dataset.idx, 10);
      const preset = TAB_DEMO_PRESETS[tab]?.[idx];
      if (!preset) return;

      if (tab === 'text') {
        loadSampleText(preset.text);
      } else if (tab === 'screenshot') {
        loadSampleScreenshot(preset);
      } else if (tab === 'url') {
        loadSampleUrl(preset.url);
      } else if (tab === 'qr') {
        loadSampleQr(preset.payload);
      }
    });
  });
}

// Initialize chips for initial active tab
renderJudgeDemoChips('text');

let scanHistory = [];
try {
  scanHistory = JSON.parse(localStorage.getItem('scamshield_history') || '[]');
} catch (e) {
  scanHistory = [];
}

function updateHistoryBadge() {
  const badge = document.getElementById('navHistoryCount');
  if (badge) badge.textContent = scanHistory.length;
}
updateHistoryBadge();

function addToHistory(inputPreview, result, inputType) {
  scanHistory.unshift({
    id: 'scan_' + Date.now(),
    preview: inputPreview.slice(0, 120),
    fullInput: inputPreview,
    level: result.risk_level,
    score: result.risk_score,
    category: result.category,
    inputType: inputType || 'Message',
    result: result,
    time: new Date().toLocaleString()
  });
  scanHistory = scanHistory.slice(0, 100);
  try {
    localStorage.setItem('scamshield_history', JSON.stringify(scanHistory));
  } catch (e) {}
  updateHistoryBadge();
}

function renderHistory(filter = 'all', searchQuery = '') {
  const container = document.getElementById('historyListContainer');
  if (!container) return;
  let filtered = [...scanHistory];

  if (filter === 'critical_high') {
    filtered = filtered.filter(item => item.level === 'CRITICAL' || item.level === 'HIGH');
  } else if (filter === 'medium') {
    filtered = filtered.filter(item => item.level === 'MEDIUM');
  } else if (filter === 'low') {
    filtered = filtered.filter(item => item.level === 'LOW');
  }

  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    filtered = filtered.filter(item =>
      item.preview.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q)
    );
  }

  if (!filtered.length) {
    container.innerHTML = `
      <div style="text-align:center;padding:48px 20px;color:var(--ink-dim);">
        <div style="font-size:32px;margin-bottom:8px;">🔍</div>
        <div style="font-size:15px;font-weight:600;color:var(--ink);">No Scans Found</div>
        <div style="font-size:13px;margin-top:4px;">No scan records match your criteria. Analyze something on the Scanner page.</div>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(item => `
    <div class="history-card" onclick="viewHistoryItem('${item.id}')">
      <div class="history-level-dot ${item.level.toLowerCase()}"></div>
      <div class="history-content-main">
        <div class="history-preview-text">${escapeHtml(item.preview)}</div>
        <div class="history-sub-meta">
          <span><b>${escapeHtml(item.category)}</b></span>
          <span>•</span>
          <span>${item.inputType}</span>
          <span>•</span>
          <span>${item.time}</span>
        </div>
      </div>
      <div class="history-score-badge" style="color:${getScoreColor(item.score)};">
        ${item.score}/100
      </div>
    </div>
  `).join('');
}

window.viewHistoryItem = function(id) {
  const item = scanHistory.find(i => i.id === id);
  if (!item) return;
  switchPage('scanner');
  renderResults(item.result, item.fullInput);
};

document.querySelectorAll('.filter-chip').forEach(chip => {
  chip.addEventListener('click', () => {
    document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    const query = document.getElementById('historySearch')?.value || '';
    renderHistory(chip.dataset.filter, query);
  });
});

const searchEl = document.getElementById('historySearch');
if (searchEl) {
  searchEl.addEventListener('input', (e) => {
    const activeFilter = document.querySelector('.filter-chip.active')?.dataset.filter || 'all';
    renderHistory(activeFilter, e.target.value);
  });
}

const clearBtn = document.getElementById('clearHistoryBtn');
if (clearBtn) {
  clearBtn.addEventListener('click', () => {
    if (confirm('Are you sure you want to clear all scan history from this browser?')) {
      scanHistory = [];
      localStorage.removeItem('scamshield_history');
      updateHistoryBadge();
      renderHistory();
      renderDashboard();
    }
  });
}


﻿// SCAMSHIELD AI FRONTEND CONTROLLER PART 3

function renderDashboard() {
  const total = scanHistory.length;
  const threats = scanHistory.filter(s => s.score >= 25).length;
  const highRisk = scanHistory.filter(s => s.level === 'CRITICAL' || s.level === 'HIGH').length;
  const avgScore = total > 0 ? Math.round(scanHistory.reduce((a, b) => a + (b.score || 0), 0) / total) : 0;

  const totalEl = document.getElementById('dashTotalScans');
  const threatEl = document.getElementById('dashThreatsDetected');
  const highRiskEl = document.getElementById('dashHighRisk');
  const avgEl = document.getElementById('dashAvgScore');

  if (totalEl) totalEl.textContent = total;
  if (threatEl) threatEl.textContent = threats;
  if (highRiskEl) highRiskEl.textContent = highRisk;
  if (avgEl) avgEl.innerHTML = `${avgScore}<span style="font-size:14px;color:var(--ink-dim);">/100</span>`;

  // Risk Distribution
  const dist = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
  scanHistory.forEach(s => {
    if (dist[s.level] !== undefined) dist[s.level]++;
  });

  const riskBarsEl = document.getElementById('dashRiskBars');
  if (riskBarsEl) {
    if (total === 0) {
      riskBarsEl.innerHTML = '<div style="color:var(--ink-dim);font-size:13px;padding:12px 0;">No scan data yet. Complete your first scan to view risk telemetry.</div>';
    } else {
      const levels = [
        { key: 'CRITICAL', label: 'Critical Risk', color: 'var(--critical)' },
        { key: 'HIGH', label: 'High Risk', color: 'var(--high)' },
        { key: 'MEDIUM', label: 'Medium Risk', color: 'var(--medium)' },
        { key: 'LOW', label: 'Low / Safe', color: 'var(--low)' }
      ];
      riskBarsEl.innerHTML = levels.map(l => {
        const count = dist[l.key];
        const pct = Math.round((count / total) * 100);
        return `
          <div class="signal-bar-item">
            <div class="signal-bar-meta">
              <span class="signal-bar-label">${l.label}</span>
              <span class="signal-bar-val" style="color:${l.color};">${count} (${pct}%)</span>
            </div>
            <div class="signal-bar-track">
              <div class="signal-bar-progress" style="width:${pct}%;background:${l.color};"></div>
            </div>
          </div>
        `;
      }).join('');
    }
  }

  // Category Distribution
  const catCounts = {};
  scanHistory.forEach(s => {
    catCounts[s.category] = (catCounts[s.category] || 0) + 1;
  });
  const sortedCats = Object.entries(catCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const catBarsEl = document.getElementById('dashCategoryBars');
  if (catBarsEl) {
    if (sortedCats.length === 0) {
      catBarsEl.innerHTML = '<div style="color:var(--ink-dim);font-size:13px;padding:12px 0;">No category signals detected yet.</div>';
    } else {
      catBarsEl.innerHTML = sortedCats.map(([cat, count]) => {
        const pct = Math.round((count / total) * 100);
        return `
          <div class="signal-bar-item">
            <div class="signal-bar-meta">
              <span class="signal-bar-label">${escapeHtml(cat)}</span>
              <span class="signal-bar-val">${count}</span>
            </div>
            <div class="signal-bar-track">
              <div class="signal-bar-progress" style="width:${pct}%;background:var(--cyan);"></div>
            </div>
          </div>
        `;
      }).join('');
    }
  }

  // Recent Threats in Dashboard
  const recentEl = document.getElementById('dashRecentList');
  if (recentEl) {
    if (total === 0) {
      recentEl.innerHTML = '<div style="color:var(--ink-dim);font-size:13px;padding:12px 0;">No recent threats recorded.</div>';
    } else {
      recentEl.innerHTML = scanHistory.slice(0, 5).map(item => `
        <div class="history-card" onclick="viewHistoryItem('${item.id}')">
          <div class="history-level-dot ${item.level.toLowerCase()}"></div>
          <div class="history-content-main">
            <div class="history-preview-text">${escapeHtml(item.preview)}</div>
            <div class="history-sub-meta">
              <span>${escapeHtml(item.category)}</span>
              <span>•</span>
              <span>${item.time}</span>
            </div>
          </div>
          <div class="history-score-badge" style="color:${getScoreColor(item.score)};">
            ${item.score}/100
          </div>
        </div>
      `).join('');
    }
  }
}

function getScoreColor(score) {
  if (score >= 75) return 'var(--critical)';
  if (score >= 50) return 'var(--high)';
  if (score >= 25) return 'var(--medium)';
  return 'var(--low)';
}

async function executeThreatAnalysis(inputText, urlFlags, language) {
  try {
    const response = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ inputText, urlFlags, language })
    });

    if (response.ok) {
      return await response.json();
    }
  } catch (netErr) {
    console.warn('Backend endpoint unreachable, running client-side ThreatEngine:', netErr);
  }

  if (window.ThreatEngine) {
    const fallback = window.ThreatEngine.buildLocalAssessment(inputText, urlFlags, language);
    fallback.warning = 'AI enhancement unavailable — showing local threat analysis.';
    return fallback;
  }

  throw new Error('Could not complete scam risk analysis.');
}


﻿// SCAMSHIELD AI FRONTEND CONTROLLER PART 4

let currentResult = null;
let currentInputText = "";

function renderResults(result, inputText) {
  currentResult = result;
  currentInputText = inputText;

  const levelClass = (result.risk_level || 'LOW').toLowerCase();
  const badgeColors = { critical: '#EF4444', high: '#F97316', medium: '#EAB308', low: '#10B981' };
  const badgeColor = badgeColors[levelClass] || '#3B82F6';

  const breakdown = result.threat_breakdown || {
    socialEngineering: 30, urgency: 30, impersonation: 20, suspiciousLink: 10, paymentRequest: 10
  };

  const scoreBreakdown = result.score_breakdown || {
    threat_signals: Math.round(result.risk_score * 0.4),
    url_intelligence: Math.round(result.risk_score * 0.3),
    behavioral_indicators: Math.round(result.risk_score * 0.2),
    ai_context_adjustment: Math.round(result.risk_score * 0.1),
    total: result.risk_score
  };

  // Helper for inline highlighted threat text
  const highlightedInputHtml = generateHighlightedThreatMarkup(inputText, result);

  const html = `
    <div class="result-container">
      <div class="threat-card ${levelClass}">
        
        <div class="threat-header">
          <div class="threat-title-group">
            <div class="threat-badge">
              <span style="display:inline-block;width:12px;height:12px;border-radius:50%;background:${badgeColor};box-shadow:0 0 10px ${badgeColor};"></span>
              ${result.risk_level} RISK
              <span class="confidence-pill">Confidence: ${result.confidence || 'HIGH'}</span>
              ${result.cached ? '<span class="confidence-pill" style="background:rgba(6,182,212,0.2);color:var(--cyan);">Cached Intel</span>' : ''}
            </div>
            <div class="threat-category-tag">${escapeHtml(result.category)}</div>
          </div>
          
          <div class="score-gauge-box">
            <div class="score-numeric" id="animScoreNum">0<span class="score-denominator">/100</span></div>
            <div class="score-label">Explainable Risk Index</div>
          </div>
        </div>

        <div class="risk-meter-track">
          <div class="risk-meter-fill" id="animMeterFill" style="width:0%;"></div>
        </div>

        ${result.warning ? `
          <div class="fallback-warning-badge">
            <span>ℹ️</span> ${escapeHtml(result.warning)}
          </div>
        ` : ''}

        <!-- INLINE DETECTED THREAT HIGHLIGHTING -->
        <div class="section-heading" style="margin-top:10px;">
          <span>🔍</span> Inspected Content & Detected Threat Vectors
        </div>
        <div class="threat-highlight-box">${highlightedInputHtml}</div>

        <!-- LIVE DNS INTELLIGENCE CARD (If Domain/URL analyzed) -->
        ${result.dns_intelligence ? `
          <div class="dns-intel-card">
            <div class="dns-intel-head">
              <div class="dns-intel-title">
                <span>🌐</span> Live Server-Side DNS Intelligence
              </div>
              <span class="dns-status-badge ${result.dns_intelligence.resolvable ? 'resolvable' : 'nxdomain'}">
                ${result.dns_intelligence.resolvable ? 'DNS Resolvable' : 'NXDOMAIN / Unresolvable'}
              </span>
            </div>
            <div class="dns-grid">
              <div class="dns-item">
                <div class="dns-label">Queried Target Host</div>
                <div class="dns-val">${escapeHtml(result.dns_intelligence.hostname || result.dns_intelligence.domain || 'N/A')}</div>
              </div>
              <div class="dns-item">
                <div class="dns-label">Resolved A Record IP</div>
                <div class="dns-val">${escapeHtml(result.dns_intelligence.aRecords?.[0] || result.dns_intelligence.resolvedIp || 'None (Host Unmapped)')}</div>
              </div>
              <div class="dns-item">
                <div class="dns-label">Mail Exchange (MX) Count</div>
                <div class="dns-val">${result.dns_intelligence.mxRecords ? result.dns_intelligence.mxRecords.length + ' MX server(s)' : (result.dns_intelligence.mxCount !== undefined ? result.dns_intelligence.mxCount + ' MX server(s)' : 'None detected')}</div>
              </div>
              <div class="dns-item">
                <div class="dns-label">DNS Risk Signal</div>
                <div class="dns-val" style="color:${result.dns_intelligence.resolvable ? '#6EE7B7' : '#FCA5A5'};">
                  ${escapeHtml(result.dns_intelligence.summary || result.dns_intelligence.dnsSummary || (result.dns_intelligence.resolvable ? 'Valid authoritative resolution' : 'Host unreachable on public DNS'))}
                </div>
              </div>
            </div>
          </div>
        ` : ''}

        <!-- THREAT SIGNALS BREAKDOWN -->
        <div class="signals-grid-title" style="margin-top:22px;">Threat Vector Signals Breakdown</div>
        <div class="signals-breakdown-panel">
          <div class="signal-bar-item">
            <div class="signal-bar-meta">
              <span class="signal-bar-label">Social Engineering</span>
              <span class="signal-bar-val">${breakdown.socialEngineering || 0}%</span>
            </div>
            <div class="signal-bar-track">
              <div class="signal-bar-progress" style="width:${breakdown.socialEngineering || 0}%;"></div>
            </div>
          </div>
          <div class="signal-bar-item">
            <div class="signal-bar-meta">
              <span class="signal-bar-label">Urgency Coercion</span>
              <span class="signal-bar-val">${breakdown.urgency || 0}%</span>
            </div>
            <div class="signal-bar-track">
              <div class="signal-bar-progress" style="width:${breakdown.urgency || 0}%;"></div>
            </div>
          </div>
          <div class="signal-bar-item">
            <div class="signal-bar-meta">
              <span class="signal-bar-label">Impersonation</span>
              <span class="signal-bar-val">${breakdown.impersonation || 0}%</span>
            </div>
            <div class="signal-bar-track">
              <div class="signal-bar-progress" style="width:${breakdown.impersonation || 0}%;"></div>
            </div>
          </div>
          <div class="signal-bar-item">
            <div class="signal-bar-meta">
              <span class="signal-bar-label">Suspicious Link</span>
              <span class="signal-bar-val">${breakdown.suspiciousLink || 0}%</span>
            </div>
            <div class="signal-bar-track">
              <div class="signal-bar-progress" style="width:${breakdown.suspiciousLink || 0}%;"></div>
            </div>
          </div>
          <div class="signal-bar-item">
            <div class="signal-bar-meta">
              <span class="signal-bar-label">Payment / Credential Request</span>
              <span class="signal-bar-val">${breakdown.paymentRequest || 0}%</span>
            </div>
            <div class="signal-bar-track">
              <div class="signal-bar-progress" style="width:${breakdown.paymentRequest || 0}%;"></div>
            </div>
          </div>
        </div>

        <!-- RED FLAGS / WHY WE FLAGGED THIS -->
        <div class="section-heading"><span>🚩</span> Why We Flagged This</div>
        <ul class="flags-list">
          ${(result.red_flags || []).map(f => {
            const severityMatch = f.match(/^\[(CRITICAL|HIGH|MEDIUM|LOW)\]\s*(.*)/i);
            const sev = severityMatch ? severityMatch[1].toLowerCase() : 'high';
            const text = severityMatch ? severityMatch[2] : f;
            return `
              <li class="flag-item">
                <span class="flag-severity-tag ${sev}">${sev.toUpperCase()}</span>
                <span class="flag-text">${escapeHtml(text)}</span>
              </li>
            `;
          }).join('')}
        </ul>

        <!-- WHAT SHOULD I DO NOW -->
        <div class="section-heading"><span>🛡️</span> What Should I Do Now?</div>
        <ol class="action-steps-list">
          ${(result.action_steps || []).map(step => `
            <li class="action-step-item">${escapeHtml(step)}</li>
          `).join('')}
        </ol>

        <!-- EMERGENCY GUIDANCE IF MONEY SENT (Conditional: only shown for actual threat vectors) -->
        ${(result.if_money_sent && result.if_money_sent.length && result.risk_score >= 25) ? `
          <div class="emergency-box">
            <div class="emergency-title"><span>⚠️</span> Emergency Protocol: If Money or Credentials Were Sent</div>
            <ol class="action-steps-list" style="margin-top:8px;">
              ${result.if_money_sent.map(s => `<li class="action-step-item" style="background:rgba(239,68,68,0.08);border-color:rgba(239,68,68,0.25);">${escapeHtml(s)}</li>`).join('')}
            </ol>
            <div class="emergency-helpline-row">
              <a href="tel:1930" class="helpline-btn">📞 Call Cyber Crime Helpline: 1930</a>
              <a href="https://cybercrime.gov.in" target="_blank" rel="noopener" class="portal-btn">🌐 Report at cybercrime.gov.in</a>
            </div>
          </div>
        ` : ''}

        <!-- EXPLAIN IT TO ME LIKE... -->
        <div class="section-heading"><span>🎓</span> Explain It Like...</div>
        <div class="modes-bar">
          <button class="mode-pill active" data-mode="simple">🎓 Simple</button>
          <button class="mode-pill" data-mode="technical">💻 Technical</button>
          <button class="mode-pill" data-mode="family">🛡️ Family Protection</button>
        </div>
        <div class="mode-display-box">
          <div class="mode-text-content" id="modeExplanationText">${escapeHtml(result.explain_simple || '')}</div>
          <button class="tts-btn" id="ttsVoiceBtn" title="Listen to Voice Explanation">🔊</button>
        </div>
        <div class="family-copy-box hidden" id="familyCopyWrap" style="display:flex;gap:10px;justify-content:flex-end;margin-top:12px;">
          <a id="whatsappShareLink" href="#" target="_blank" rel="noopener" class="whatsapp-share-btn">
            <span>💬</span> 1-Click Send Warning to WhatsApp
          </a>
          <button class="copy-family-btn" id="copyFamilyBtn">
            <span>📋</span> Copy Warning Text
          </button>
        </div>

        <!-- TRANSPARENCY ACCORDION: REPRODUCIBLE RISK SIGNAL BREAKDOWN -->
        <div class="transparency-box">
          <details open>
            <summary class="transparency-summary">
              <span>🔍 Honest Explainable Score Breakdown (Reproducible Point Audit)</span>
              <span>▾</span>
            </summary>
            <div class="transparency-content">
              <div class="score-breakdown-row">
                <span>Deterministic Threat Signal Rules (Heuristics):</span>
                <b>+${scoreBreakdown.threat_signals || 0} pts</b>
              </div>
              <div class="score-breakdown-row">
                <span>URL Structure & DNS Live Resolution:</span>
                <b>+${scoreBreakdown.url_intelligence || 0} pts</b>
              </div>
              <div class="score-breakdown-row">
                <span>Behavioral Indicators & Urgency Coercion:</span>
                <b>+${scoreBreakdown.behavioral_indicators || 0} pts</b>
              </div>
              <div class="score-breakdown-row">
                <span>AI Contextual Enrichment (Groq/Llama-3):</span>
                <b>+${scoreBreakdown.ai_context_adjustment || 0} pts</b>
              </div>
              <div class="score-breakdown-row total">
                <span>Final Calculated Composite Score:</span>
                <b style="color:${getScoreColor(result.risk_score)};">${result.risk_score} / 100</b>
              </div>
            </div>
          </details>
        </div>

        <!-- ACTION BUTTONS -->
        <div class="result-actions-bar">
          <button class="sec-action-btn primary" id="shareReportBtn">
            <span>📥</span> Download Threat Report (PNG)
          </button>
          <button class="sec-action-btn" id="exportJsonBtn">
            <span>💾</span> Export Threat Intel (JSON)
          </button>
          <button class="sec-action-btn" id="compareFilterBtn">
            <span>🔬</span> Compare vs Basic Keyword Filter
          </button>
          <button class="sec-action-btn" onclick="document.getElementById('results').innerHTML=''; window.scrollTo({top:0,behavior:'smooth'});">
            <span>🔄</span> New Scan
          </button>
        </div>

        <div id="filterComparisonBox" style="margin-top:16px;"></div>

      </div>
    </div>
  `;

  document.getElementById('results').innerHTML = html;
  document.getElementById('results').scrollIntoView({ behavior: 'smooth', block: 'start' });

  animateScore(result.risk_score);

  const modeMap = {
    simple: result.explain_simple || '',
    technical: result.explain_technical || '',
    family: result.explain_family || ''
  };
  let activeModeText = modeMap.simple;

  document.querySelectorAll('.mode-pill').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.mode-pill').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const mode = btn.dataset.mode;
      activeModeText = modeMap[mode];
      document.getElementById('modeExplanationText').textContent = activeModeText;
      
      const copyWrap = document.getElementById('familyCopyWrap');
      if (copyWrap) {
        if (mode === 'family') {
          copyWrap.classList.remove('hidden');
          updateFamilyShareLinks(result);
        } else {
          copyWrap.classList.add('hidden');
        }
      }
    });
  });

  const ttsBtn = document.getElementById('ttsVoiceBtn');
  if (ttsBtn) {
    ttsBtn.addEventListener('click', () => {
      speakText(activeModeText);
    });
  }

  const copyBtn = document.getElementById('copyFamilyBtn');
  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      const familyMsg = buildFamilyWarningMessage(result);
      navigator.clipboard.writeText(familyMsg).then(() => {
        copyBtn.innerHTML = '<span>✓</span> Copied to Clipboard!';
        setTimeout(() => {
          copyBtn.innerHTML = '<span>📋</span> Copy Warning Text';
        }, 2500);
      });
    });
  }

  const exportBtn = document.getElementById('exportJsonBtn');
  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      exportThreatIntelJson(result, inputText);
    });
  }

  const shareBtn = document.getElementById('shareReportBtn');
  if (shareBtn) {
    shareBtn.addEventListener('click', () => {
      generateHighDpiReportCard(result, inputText);
    });
  }

  const compBtn = document.getElementById('compareFilterBtn');
  if (compBtn) {
    compBtn.addEventListener('click', () => {
      const box = document.getElementById('filterComparisonBox');
      if (box.innerHTML) { box.innerHTML = ''; return; }
      const naive = runNaiveFilter(currentInputText);
      box.innerHTML = `
        <div class="dash-section-box" style="margin-top:12px;border-style:dashed;">
          <div style="display:flex;justify-content:space-between;align-items:center;font-size:14px;padding:6px 0;">
            <span>🛡️ <b>ScamShield AI Hybrid Engine:</b></span>
            <b style="color:${getScoreColor(result.risk_score)};">${result.risk_score}/100 — ${result.risk_level}</b>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center;font-size:14px;padding:6px 0;border-top:1px solid rgba(255,255,255,0.06);">
            <span>🔤 <b>Naive Static Keyword Filter:</b></span>
            <b style="color:${getScoreColor(naive.score)};">${naive.score}/100 — ${naive.level}</b>
          </div>
          <div style="font-size:12.5px;color:var(--ink-muted);line-height:1.5;margin-top:8px;">
            ${naive.matched.length ? `The naive keyword regex only matched isolated tokens: [${naive.matched.join(', ')}].` : 'The basic filter found <b>0</b> trigger words and completely missed this deceptive attack.'}
            ScamShield evaluated domain entropy, live DNS records, psychological urgency, and AI contextual intent.
          </div>
        </div>
      `;
    });
  }
}


﻿// SCAMSHIELD AI FRONTEND CONTROLLER PART 5

function animateScore(targetScore) {
  const numEl = document.getElementById('animScoreNum');
  const meterEl = document.getElementById('animMeterFill');
  if (!numEl || !meterEl) return;

  meterEl.style.width = targetScore + '%';

  let current = 0;
  const step = Math.max(1, Math.floor(targetScore / 30));
  const interval = setInterval(() => {
    current += step;
    if (current >= targetScore) {
      current = targetScore;
      clearInterval(interval);
    }
    numEl.innerHTML = `${current}<span class="score-denominator">/100</span>`;
  }, 20);
}

function speakText(text) {
  if (!('speechSynthesis' in window)) {
    alert("Speech synthesis is not supported by your browser.");
    return;
  }
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.rate = 0.95;
  const lang = document.getElementById('langSelect')?.value || 'en';
  if (lang === 'hi') utter.lang = 'hi-IN';
  else utter.lang = 'en-US';
  window.speechSynthesis.speak(utter);
}

function runNaiveFilter(text) {
  const keywords = ['urgent', 'kyc', 'block', 'blocked', 'otp', 'prize', 'winner', 'lottery', 'refund', 'bitcoin', 'crypto', 'double your money', 'limited time'];
  const lower = (text || '').toLowerCase();
  const matched = keywords.filter(k => lower.includes(k));
  const score = Math.min(100, matched.length * 20);
  const level = score >= 60 ? 'HIGH' : score >= 30 ? 'MEDIUM' : 'LOW';
  return { score, level, matched };
}

function generateHighDpiReportCard(result, inputText) {
  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 1400;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#07090E';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#111726';
  ctx.strokeStyle = result.risk_level === 'CRITICAL' ? '#EF4444' : result.risk_level === 'HIGH' ? '#F97316' : '#10B981';
  ctx.lineWidth = 4;
  roundRect(ctx, 40, 40, canvas.width - 80, canvas.height - 80, 24);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#3B82F6';
  ctx.font = 'bold 36px "Space Grotesk", sans-serif';
  ctx.fillText('🛡️ SCAMSHIELD AI', 80, 120);

  ctx.fillStyle = '#94A3B8';
  ctx.font = '20px "Inter", sans-serif';
  ctx.fillText('Digital Fraud Decision Support Assessment', 80, 160);

  const bannerColor = result.risk_level === 'CRITICAL' ? '#EF4444' : result.risk_level === 'HIGH' ? '#F97316' : '#10B981';
  ctx.fillStyle = bannerColor;
  ctx.font = 'bold 48px "Space Grotesk", sans-serif';
  ctx.fillText(`${result.risk_level} RISK THREAT`, 80, 250);

  ctx.fillStyle = '#E2E8F0';
  ctx.font = '26px "Inter", sans-serif';
  ctx.fillText(`Category: ${result.category}`, 80, 295);

  ctx.fillStyle = '#090D17';
  roundRect(ctx, 880, 190, 240, 120, 16);
  ctx.fill();
  ctx.fillStyle = '#FFF';
  ctx.font = 'bold 56px "JetBrains Mono", monospace';
  ctx.fillText(`${result.risk_score}`, 910, 275);
  ctx.font = '24px "Inter", sans-serif';
  ctx.fillStyle = '#64748B';
  ctx.fillText('/100', 1010, 275);

  ctx.strokeStyle = '#1E293B';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(80, 340);
  ctx.lineTo(1120, 340);
  ctx.stroke();

  ctx.fillStyle = '#94A3B8';
  ctx.font = 'bold 22px "Space Grotesk", sans-serif';
  ctx.fillText('🚩 IDENTIFIED THREAT SIGNALS', 80, 390);

  let y = 430;
  ctx.font = '20px "Inter", sans-serif';
  ctx.fillStyle = '#F1F5F9';
  (result.red_flags || []).slice(0, 4).forEach(flag => {
    y = wrapText(ctx, `• ${flag}`, 80, y, 1020, 32);
    y += 10;
  });

  y += 20;
  ctx.fillStyle = '#94A3B8';
  ctx.font = 'bold 22px "Space Grotesk", sans-serif';
  ctx.fillText('🛡️ RECOMMENDED IMMEDIATE ACTIONS', 80, y);
  y += 40;

  ctx.font = '20px "Inter", sans-serif';
  ctx.fillStyle = '#F1F5F9';
  (result.action_steps || []).slice(0, 4).forEach((step, idx) => {
    y = wrapText(ctx, `${idx + 1}. ${step}`, 80, y, 1020, 32);
    y += 10;
  });

  ctx.fillStyle = '#090D17';
  roundRect(ctx, 80, 1180, 1040, 120, 16);
  ctx.fill();

  ctx.fillStyle = '#EF4444';
  ctx.font = 'bold 20px "Inter", sans-serif';
  ctx.fillText('📞 Emergency Helpline: 1930 | Cyber Crime Portal: cybercrime.gov.in', 110, 1235);
  ctx.fillStyle = '#94A3B8';
  ctx.font = '16px "Inter", sans-serif';
  ctx.fillText('ScamShield AI Analysis · Verify independently through official channels before acting.', 110, 1270);

  const link = document.createElement('a');
  link.download = `scamshield-assessment-${Date.now()}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(' ');
  let line = '';
  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + ' ';
    if (ctx.measureText(testLine).width > maxWidth && n > 0) {
      ctx.fillText(line, x, y);
      line = words[n] + ' ';
      y += lineHeight;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line, x, y);
  return y + lineHeight;
}

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// Generate inline highlighted HTML marking detected scam keywords & URLs
function generateHighlightedThreatMarkup(text, result) {
  if (!text) return '<em>No content provided</em>';
  let escaped = escapeHtml(text);

  // 1. Highlight URLs / domains
  const urlPattern = /(https?:\/\/[^\s<>"'\)]+|www\.[^\s<>"'\)]+|[a-zA-Z0-9-]+\.(?:xyz|top|site|live|click|link|online|cc|icu|zip)[^\s<>"'\)]*)/gi;
  escaped = escaped.replace(urlPattern, (m) => {
    return `<span class="threat-mark link" title="Suspicious Link / Target">${m}</span>`;
  });

  // 2. Highlight high-urgency keywords
  const urgencyWords = [
    'urgent', 'urg3nt', 'immediately', 'suspended', 'blocked', 'bl0cked',
    'terminated', 'deactivated', 'tonight', 'within 24 hours', 'last reminder',
    'today itself', 'cut off', 'disconnection', 'police', 'arrest', 'customs depot',
    'held at customs'
  ];
  urgencyWords.forEach(w => {
    const reg = new RegExp(`\\b(${w})\\b`, 'gi');
    escaped = escaped.replace(reg, (m) => {
      return `<span class="threat-mark" title="Urgency Coercion">${m}</span>`;
    });
  });

  // 3. Highlight credential / financial triggers
  const harvestWords = [
    'kyc', 'k-y-c', 'aadhaar', 'pan', 'otp', '0tp', 'pin', 'password',
    'cashback', 'reward', 'refund', 'upi PIN', 'enter your UPI', 'scan QR',
    'guaranteed', '500% profit', 'double your', 'telegram'
  ];
  harvestWords.forEach(w => {
    const reg = new RegExp(`\\b(${w})\\b`, 'gi');
    escaped = escaped.replace(reg, (m) => {
      return `<span class="threat-mark warning" title="Potential Credential/Payment Trap">${m}</span>`;
    });
  });

  return escaped;
}

// Build standardized Family Mode safety message
function buildFamilyWarningMessage(result) {
  const category = result.category || 'Online Scam';
  const explanation = result.explain_family || 'This message looks dangerous!';
  return `⚠️ SCAMSHIELD SAFETY WARNING ⚠️\n\n🚨 Category: ${category}\nRisk Level: ${result.risk_level} (${result.risk_score}/100)\n\n${explanation}\n\n🛑 WHAT YOU MUST NOT DO:\n• Do NOT tap any links in that message\n• Do NOT share OTP, PIN, password, or Aadhaar/PAN\n• Do NOT transfer money or enter your UPI PIN\n\n✅ WHAT TO DO:\n• Contact the official bank/company using their verified app\n• If money has been lost, call National Cyber Helpline 1930 immediately\n\n🛡️ Verified by ScamShield AI (Behavioral Zero-Hour Defense)`;
}

// Update WhatsApp 1-click share URL
function updateFamilyShareLinks(result) {
  const waLink = document.getElementById('whatsappShareLink');
  if (!waLink) return;
  const msg = buildFamilyWarningMessage(result);
  waLink.href = `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`;
}

// Export Threat Intel JSON
function exportThreatIntelJson(result, inputText) {
  const payload = {
    scamshield_version: '2.0.0',
    analysis_timestamp: new Date().toISOString(),
    input_text_snippet: (inputText || '').slice(0, 300),
    assessment: {
      risk_score: result.risk_score,
      risk_level: result.risk_level,
      category: result.category,
      confidence: result.confidence || 'HIGH',
      score_breakdown: result.score_breakdown || {}
    },
    dns_intelligence: result.dns_intelligence || null,
    red_flags: result.red_flags || [],
    action_steps: result.action_steps || [],
    if_money_sent_protocol: result.if_money_sent || []
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `scamshield-threat-intel-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

// 14. Main Analyze Button Trigger
const analyzeBtn = document.getElementById('analyzeBtn');
if (analyzeBtn) {
  analyzeBtn.addEventListener('click', async () => {
    const activeTab = document.querySelector('.tab-btn.active').dataset.tab;
    let inputText = "";
    let urlFlags = [];
    let inputType = "Message";

    if (activeTab === 'text') {
      inputText = document.getElementById('textInput').value.trim();
      inputType = "Message";
    } else if (activeTab === 'screenshot') {
      inputText = document.getElementById('ocrExtractedTextArea').value.trim() || ocrExtractedText;
      inputType = "Screenshot OCR";
    } else if (activeTab === 'url') {
      inputText = document.getElementById('urlInput').value.trim();
      inputType = "URL";
      if (window.ThreatEngine) {
        const urlRes = window.ThreatEngine.analyzeUrl(inputText);
        urlFlags = urlRes.flags || [];
      }
    } else if (activeTab === 'qr') {
      inputText = qrDecodedPayload;
      inputType = "QR Code";
      if (window.ThreatEngine) {
        const urlRes = window.ThreatEngine.analyzeUrl(inputText);
        urlFlags = urlRes.flags || [];
      }
    }

    if (!inputText) {
      alert("Please provide content to analyze (type a message, upload a screenshot, enter a URL, or upload a QR code).");
      return;
    }

    const lang = document.getElementById('langSelect')?.value || 'en';
    const btn = document.getElementById('analyzeBtn');
    const stagedBox = document.getElementById('scanningStagedBox');

    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Processing Threat Pipeline...';
    if (stagedBox) stagedBox.classList.remove('hidden');
    document.getElementById('results').innerHTML = '';

    setTimeout(() => {
      const s2 = document.getElementById('scanStage2');
      if (s2) {
        s2.className = 'stage-step done';
        s2.innerHTML = '<span class="stage-icon">✓</span> Threat signal heuristics computed';
      }
      const s3 = document.getElementById('scanStage3');
      if (s3) s3.className = 'stage-step active';
    }, 400);

    setTimeout(() => {
      const s3 = document.getElementById('scanStage3');
      if (s3) {
        s3.className = 'stage-step done';
        s3.innerHTML = '<span class="stage-icon">✓</span> URL & Domain lookalikes evaluated';
      }
      const s4 = document.getElementById('scanStage4');
      if (s4) s4.className = 'stage-step active';
    }, 800);

    try {
      const result = await executeThreatAnalysis(inputText, urlFlags, lang);
      
      const s4 = document.getElementById('scanStage4');
      if (s4) {
        s4.className = 'stage-step done';
        s4.innerHTML = '<span class="stage-icon">✓</span> AI Context & Intent analyzed';
      }
      const s5 = document.getElementById('scanStage5');
      if (s5) {
        s5.className = 'stage-step done';
        s5.innerHTML = '<span class="stage-icon">✓</span> Assessment ready';
      }

      setTimeout(() => {
        if (stagedBox) stagedBox.classList.add('hidden');
        renderResults(result, inputText);
        addToHistory(inputText, result, inputType);
      }, 400);

    } catch (err) {
      if (stagedBox) stagedBox.classList.add('hidden');
      document.getElementById('results').innerHTML = `
        <div style="background:var(--critical-dim);border:1px solid var(--critical-border);border-radius:var(--radius-md);padding:18px;color:#FCA5A5;font-size:14px;margin-top:20px;">
          <b>Analysis Error:</b> ${escapeHtml(err.message)}
        </div>
      `;
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<span>🛡️</span> Analyze Threat Signals & AI Context →';
    }
  });
}


