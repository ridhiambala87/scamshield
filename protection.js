(function () {
  'use strict';

  const MODES = {
    PERSONAL: 'personal',
    WOMEN: 'women',
    FAMILY: 'family',
    SENIOR: 'senior'
  };

  const MODE_NAMES = {
    [MODES.PERSONAL]: 'Personal Protection',
    [MODES.WOMEN]: 'Women Safety Shield',
    [MODES.FAMILY]: 'Family Protection',
    [MODES.SENIOR]: 'Senior Safety'
  };

  // Keywords for Women Safety Categories
  const WOMEN_SAFETY_CATEGORIES = {
    SEXTORTION_BLACKMAIL: {
      name: 'SEXTORTION_BLACKMAIL',
      display: '🚨 POSSIBLE SEXTORTION / BLACKMAIL',
      keywords: ['photo', 'video', 'publish', 'expose', 'send money', 'private', 'leak', 'share your', 'post online', 'friends will see', 'family will see', 'pay me', 'send \u20b9', 'bitcoin', 'crypto'],
      reasons: [
        'The message contains demands for money or cryptocurrency.',
        'There are threats to publish or share private photos or videos.',
        'The sender is trying to use fear or shame to manipulate you.'
      ],
      actions: [
        '✓ Do not send any money. Paying will not make them stop.',
        '✓ Do not negotiate or respond to the threats.',
        '✓ Take screenshots of the messages, profile, and any links provided.',
        '✓ Block and report the account immediately.'
      ],
      isEmergency: true,
      empathy: 'You are not at fault. Scammers use fear to manipulate people.'
    },
    ROMANCE_SCAM: {
      name: 'ROMANCE_SCAM',
      display: '🚨 POTENTIAL ROMANCE SCAM',
      keywords: ['my love', 'darling', 'sweetheart', 'send money urgently', 'stuck at airport', 'hospital emergency', 'need money for ticket', 'gift card', 'western union', 'promise to pay back'],
      reasons: [
        'The sender is moving the relationship forward very quickly.',
        'There is an urgent request for money for an "emergency".',
        'They are asking for payment via untraceable methods like gift cards.'
      ],
      actions: [
        '✓ Do not send money, gift cards, or crypto to someone you haven\'t met in person.',
        '✓ Be cautious if they always have excuses for not meeting or video calling.',
        '✓ Do a reverse image search of their profile pictures.'
      ],
      isEmergency: false,
      empathy: 'Scammers build trust over time to take advantage of kindness.'
    },
    FAKE_RECRUITMENT: {
      name: 'FAKE_RECRUITMENT',
      display: '🚨 SUSPICIOUS JOB OFFER / RECRUITMENT',
      keywords: ['selected for position', 'registration fee', 'pay \u20b9', 'work from home', 'amazon job', 'flipkart hiring', 'data entry job', 'pay first', 'training fee', 'joining fee'],
      reasons: [
        'You are being asked to pay a fee before starting a job.',
        'The offer guarantees high pay for simple work from home.',
        'The communication looks unprofessional or unsolicited.'
      ],
      actions: [
        '✓ Legitimate companies do not ask you to pay a fee to get a job.',
        '✓ Do not share your bank account details or pay any "registration" fees.',
        '✓ Verify the job offer on the company\'s official website.'
      ],
      isEmergency: false,
      empathy: 'Job scams target people looking for genuine opportunities.'
    },
    SCHOLARSHIP_SCAM: {
      name: 'SCHOLARSHIP_SCAM',
      display: '🚨 POTENTIAL SCHOLARSHIP / ADMISSION SCAM',
      keywords: ['scholarship approved', 'admission confirmed', 'processing fee', 'seat reserved', 'university offer', 'education loan approved'],
      reasons: [
        'The message asks for an upfront fee to secure a scholarship or admission.',
        'You are being rushed to make a decision or payment.',
        'The offer seems too good to be true without a formal application process.'
      ],
      actions: [
        '✓ Real scholarships do not require a "processing fee".',
        '✓ Contact the university directly using details from their official website.',
        '✓ Do not share personal or financial documents via informal channels.'
      ],
      isEmergency: false,
      empathy: 'Education scams prey on students\' hopes and aspirations.'
    },
    INFLUENCER_SCAM: {
      name: 'INFLUENCER_SCAM',
      display: '🚨 SUSPICIOUS BRAND COLLABORATION',
      keywords: ['brand collaboration', 'paid review', 'verification fee', 'instagram selected', 'social media manager', 'influencer program', 'sponsored post offer'],
      reasons: [
        'The message asks you to pay for shipping, verification, or registration.',
        'The "brand" has very few followers or an unprofessional setup.',
        'They are offering unusually high compensation for minimal effort.'
      ],
      actions: [
        '✓ Do not pay money to receive free products for review.',
        '✓ Verify the brand\'s authenticity and check for similar scam reports.',
        '✓ Do not click on unknown links that may compromise your account.'
      ],
      isEmergency: false,
      empathy: 'Scammers exploit the desire for recognition and opportunities.'
    },
    IMPERSONATION_EMERGENCY: {
      name: 'IMPERSONATION_EMERGENCY',
      display: '🚨 IMPERSONATION / FAKE EMERGENCY',
      keywords: ['this is your', 'i am calling from', 'your son', 'your daughter', 'accident', 'arrested', 'bail money', 'hospital admit'],
      reasons: [
        'The message creates intense panic and urgency.',
        'The sender claims to be a loved one in trouble or an authority figure.',
        'There is a demand for immediate financial help to resolve a crisis.'
      ],
      actions: [
        '✓ Stay calm and do not act immediately.',
        '✓ Call the person directly on their known phone number to verify.',
        '✓ Do not send money based on a frantic message or call from an unknown number.'
      ],
      isEmergency: true,
      empathy: 'Scammers use panic to force quick, irrational decisions.'
    }
  };

  class ProtectionManager {
    constructor() {
      this.currentMode = MODES.PERSONAL;
    }

    init() {
      // Protection Modes UI was removed — reset to personal defaults and clear any
      // legacy stored mode so Senior accessibility styling never sticks invisibly.
      localStorage.removeItem('scamshield_protection_mode');
      this.currentMode = MODES.PERSONAL;
      document.body.removeAttribute('data-protection');
      this.removeSeniorMode();
    }

    setMode(mode) {
      if (!Object.values(MODES).includes(mode)) return;
      this.currentMode = mode;
      localStorage.setItem('scamshield_protection_mode', mode);
      
      document.body.setAttribute('data-protection', mode);
      
      if (mode === MODES.SENIOR) {
        this.applySeniorMode();
      } else {
        this.removeSeniorMode();
      }

      // Live-update the active card highlight (no reload needed)
      document.querySelectorAll('.protection-card[data-mode]').forEach(card => {
        card.classList.toggle('protection-card-active', card.dataset.mode === mode);
      });

      if (window.showToast) {
        const label = this.getModeName(mode);
        showToast(label + ' activated', 'success', 2200);
      }

      window.dispatchEvent(new CustomEvent('protectionModeChanged', { detail: { mode } }));
    }

    getMode() {
      return this.currentMode;
    }

    getModeName(mode) {
      return MODE_NAMES[mode] || 'Unknown Protection';
    }

    applySeniorMode() {
      document.body.setAttribute('data-senior', 'true');
    }

    removeSeniorMode() {
      document.body.removeAttribute('data-senior');
    }

    detectWomenSafetyCategory(text, signals) {
      const lowerText = text.toLowerCase();
      let detectedCategory = null;
      let matchedKeywords = [];

      for (const [key, categoryData] of Object.entries(WOMEN_SAFETY_CATEGORIES)) {
        const matches = categoryData.keywords.filter(kw => lowerText.includes(kw));
        if (matches.length > 0) {
          detectedCategory = categoryData;
          matchedKeywords = matches;
          break; // Return the first matched category
        }
      }

      if (detectedCategory) {
        return {
          detected: true,
          category: detectedCategory.display,
          reasons: detectedCategory.reasons,
          actions: detectedCategory.actions,
          isEmergency: detectedCategory.isEmergency,
          empathy: detectedCategory.empathy
        };
      }

      return {
        detected: false,
        category: '',
        reasons: [],
        actions: [],
        isEmergency: false,
        empathy: ''
      };
    }

    generateIncidentSummary(result, inputText) {
      const now = new Date();
      const dateString = now.toLocaleDateString();
      const timeString = now.toLocaleTimeString();

      let summary = `Incident Report\n`;
      summary += `Date & Time: ${dateString} ${timeString}\n`;
      if (result && result.detected) {
        summary += `Threat Category: ${result.category}\n`;
      }
      summary += `\nSuspicious Content Analyzed:\n"${inputText}"\n`;
      summary += `\nEvidence Checklist:\n`;
      summary += `[ ] Screenshots of the conversation taken\n`;
      summary += `[ ] Sender's profile/number noted\n`;
      summary += `[ ] URLs or links copied (do not click them)\n`;

      return summary;
    }

    generateWomenSafetyCard(category, reasons, actions, empathy) {
      const reasonsHtml = reasons.map(r => `<li>${r}</li>`).join('');
      const actionsHtml = actions.map(a => `<li>${a}</li>`).join('');
      const empathyHtml = empathy ? `<div class="ws-empathy">${empathy}</div>` : '';
      
      const helpModalContent = `
        <div class="ws-help-content">
          <p><strong>National Cyber Crime Reporting Portal:</strong> <a href="https://cybercrime.gov.in" target="_blank" rel="noopener noreferrer">cybercrime.gov.in</a></p>
          <p><strong>Cyber Crime Helpline:</strong> <a href="tel:1930">1930</a></p>
          <p><strong>National Commission for Women (NCW):</strong> <a href="https://ncw.nic.in" target="_blank" rel="noopener noreferrer">ncw.nic.in</a></p>
          <hr>
          <p><strong>Important Guidance:</strong></p>
          <ul>
            <li>Do not delete the messages, photos, or emails yet. They are evidence.</li>
            <li>Take clear screenshots of everything, including the sender's profile and phone number.</li>
            <li>Do not engage in further conversation or pay any money.</li>
          </ul>
          <p class="ws-empathy">Remember: You are not at fault. Reach out to trusted family, friends, or authorities for support.</p>
          <p><small>Note: Using this help section does not automatically contact authorities.</small></p>
        </div>
      `;
      const helpBtnClick = "ModalManager.openModal({id:'ws-help', title:'Get Help & Guidance', content: " + JSON.stringify(helpModalContent).replace(/'/g, "\\'") + ", size:'md'})";

      return `
        <div class="ws-insight-card">
          <div class="ws-insight-header">👩 WOMEN SAFETY INSIGHT</div>
          <div class="ws-category">${category}</div>
          <div class="ws-reasons"><h4>Why this was detected</h4><ul>${reasonsHtml}</ul></div>
          <div class="ws-actions"><h4>What you can do</h4><ul>${actionsHtml}</ul></div>
          ${empathyHtml}
          <button class="ws-help-btn" onclick="${helpBtnClick}" aria-label="Get Help and Guidance">Get Help</button>
        </div>
      `;
    }

    renderProtectionPage() {
      const getActiveCls = (mode) => this.currentMode === mode ? 'protection-card-active' : '';
      
      return `
        <div class="protection-center-container">
          <h2 data-i18n="protection_heading">Who are you protecting today?</h2>

          <div class="protection-details">
            <div class="protection-card ${getActiveCls(MODES.PERSONAL)}" data-mode="${MODES.PERSONAL}">
              <h3 data-i18n="desc_personal_title">Personal Protection</h3>
              <p data-i18n="desc_personal_text">Standard protection against phishing, UPI fraud, bank scams, fake KYC, and everyday digital threats.</p>
              <button class="activate-btn" onclick="ProtectionManager.setMode('${MODES.PERSONAL}')" aria-label="Activate Personal Protection" data-i18n="btn_activate">Activate</button>
            </div>

            <div class="protection-card ws-accent ${getActiveCls(MODES.WOMEN)}" data-mode="${MODES.WOMEN}">
              <h3 data-i18n="desc_women_title">Women Safety Shield</h3>
              <p class="subtitle" data-i18n="desc_women_subtitle">Specialized protection against harassment and digital threats</p>
              <p data-i18n="desc_women_text">Detects sextortion, romance scams, fake job offers, and impersonation. Prioritizes privacy and provides actionable guidance.</p>
              <button class="activate-btn" onclick="ProtectionManager.setMode('${MODES.WOMEN}')" aria-label="Activate Women Safety Shield" data-i18n="btn_activate">Activate</button>
            </div>

            <div class="protection-card ${getActiveCls(MODES.FAMILY)}" data-mode="${MODES.FAMILY}">
              <h3 data-i18n="desc_family_title">Family Protection</h3>
              <p data-i18n="desc_family_text">Shared threat awareness, guarding against banking scams, UPI fraud, fake calls, and impersonation of loved ones.</p>
              <button class="activate-btn" onclick="ProtectionManager.setMode('${MODES.FAMILY}')" aria-label="Activate Family Protection" data-i18n="btn_activate">Activate</button>
            </div>

            <div class="protection-card senior-accent ${getActiveCls(MODES.SENIOR)}" data-mode="${MODES.SENIOR}">
              <h3 data-i18n="desc_senior_title">Senior Safety</h3>
              <p data-i18n="desc_senior_text">Uses larger text, simpler language, and clear warnings to guard against support scams, OTP theft, and pension fraud.</p>
              <button class="activate-btn" onclick="ProtectionManager.setMode('${MODES.SENIOR}')" aria-label="Activate Senior Safety" data-i18n="btn_activate">Activate</button>
            </div>
          </div>
        </div>
      `;
    }
  }

  // Expose to window
  window.ProtectionManager = new ProtectionManager();

  // Protection Modes UI was removed — clear any legacy stored mode
  localStorage.removeItem('scamshield_protection_mode');

})();
