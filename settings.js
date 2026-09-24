(function () {
  const STYLES = `
    .settings-page {
      max-width: 700px;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .settings-section {
      background: var(--panel);
      border: 1px solid var(--panel-border);
      border-radius: var(--radius-lg);
      padding: 24px;
      margin-bottom: 16px;
    }
    .settings-section-title {
      font-family: 'Space Grotesk', sans-serif;
      font-size: 16px;
      font-weight: bold;
      margin-bottom: 16px;
      margin-top: 0;
      color: var(--text-primary);
    }
    .settings-button-group {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .settings-btn {
      padding: 8px 16px;
      border: 1px solid var(--panel-border);
      background: var(--panel);
      color: var(--ink-muted);
      border-radius: 9999px;
      cursor: pointer;
      font-size: 14px;
      transition: all 0.2s ease;
    }
    .settings-btn.active {
      background: var(--primary);
      color: #FFFFFF;
      border-color: var(--primary);
    }
    .settings-btn:hover:not(.active) {
      background: var(--panel-hover);
    }
    .settings-btn-danger {
      background: var(--critical);
      color: #fff;
      border: none;
      padding: 10px 20px;
      border-radius: var(--radius-md);
      cursor: pointer;
      font-weight: 500;
      transition: background 0.2s ease;
    }
    .settings-btn-danger:hover {
      background: color-mix(in srgb, var(--critical) 80%, black);
    }
    .settings-btn-primary {
      background: var(--primary);
      color: var(--bg);
      border: none;
      padding: 10px 20px;
      border-radius: var(--radius-md);
      cursor: pointer;
      font-weight: 500;
      transition: background 0.2s ease;
    }
    .settings-btn-primary:hover {
      background: color-mix(in srgb, var(--primary) 80%, black);
    }
    .settings-form-group {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }
    .settings-form-group:last-child {
      margin-bottom: 0;
    }
    .settings-select {
      padding: 8px 12px;
      border: 1px solid var(--panel-border);
      border-radius: var(--radius-md);
      background: var(--bg);
      color: var(--text-primary);
      font-size: 14px;
      cursor: pointer;
    }
    .settings-text {
      color: var(--text-secondary);
      font-size: 14px;
      margin-bottom: 16px;
    }
    .toggle-switch {
      position: relative;
      display: inline-block;
      width: 44px;
      height: 24px;
    }
    .toggle-switch input {
      opacity: 0;
      width: 0;
      height: 0;
    }
    .toggle-slider {
      position: absolute;
      cursor: pointer;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: var(--panel-border);
      transition: .4s;
      border-radius: 24px;
    }
    .toggle-slider:before {
      position: absolute;
      content: "";
      height: 18px;
      width: 18px;
      left: 3px;
      bottom: 3px;
      background-color: white;
      transition: .4s;
      border-radius: 50%;
    }
    .toggle-switch input:checked + .toggle-slider {
      background-color: var(--primary);
    }
    .toggle-switch input:focus + .toggle-slider {
      box-shadow: 0 0 1px var(--primary);
    }
    .toggle-switch input:checked + .toggle-slider:before {
      transform: translateX(20px);
    }
  `;

  function injectStyles() {
    if (!document.getElementById('scamshield-settings-styles')) {
      const styleEl = document.createElement('style');
      styleEl.id = 'scamshield-settings-styles';
      styleEl.textContent = STYLES;
      document.head.appendChild(styleEl);
    }
  }

  const LANG_OPTIONS = [
    { value: 'en', label: 'English' },
    { value: 'hi', label: 'हिन्दी (Hindi)' },
    { value: 'hinglish', label: 'Hinglish' },
    { value: 'pa', label: 'ਪੰਜਾਬੀ (Punjabi)' },
    { value: 'bn', label: 'বাংলা (Bengali)' },
    { value: 'mr', label: 'मराठी (Marathi)' },
    { value: 'gu', label: 'ગુજરાતી (Gujarati)' },
    { value: 'ta', label: 'தமிழ் (Tamil)' },
    { value: 'te', label: 'తెలుగు (Telugu)' },
    { value: 'kn', label: 'ಕನ್ನಡ (Kannada)' },
    { value: 'ml', label: 'മലയാളം (Malayalam)' }
  ];

  function renderSettingsPage() {
    injectStyles();

    const currentTheme = window.ThemeManager ? window.ThemeManager.getTheme() : 'system';
    const currentLang = window.I18n ? window.I18n.getCurrentLanguage() : 'en';
    
    const reducedMotion = localStorage.getItem('scamshield_reduced_motion') === 'true';
    const largerText = localStorage.getItem('scamshield_larger_text') === 'true';

    return `
      <div class="settings-page">
        
        <div class="settings-section" id="settings-appearance">
          <h3 class="settings-section-title" data-i18n="settings_appearance">Appearance</h3>
          <div class="settings-button-group">
            <button class="settings-btn ${currentTheme === 'light' ? 'active' : ''}" data-theme="light" data-i18n="theme_light" aria-label="Light theme">Light</button>
            <button class="settings-btn ${currentTheme === 'dark' ? 'active' : ''}" data-theme="dark" data-i18n="theme_dark" aria-label="Dark theme">Dark</button>
            <button class="settings-btn ${currentTheme === 'system' ? 'active' : ''}" data-theme="system" data-i18n="theme_system" aria-label="System theme">System</button>
          </div>
        </div>

        <div class="settings-section" id="settings-language">
          <h3 class="settings-section-title" data-i18n="settings_language">Language</h3>
          <div class="settings-form-group">
            <span data-i18n="settings_language">App Language</span>
            <select class="settings-select" id="lang-select" aria-label="Select language">
              ${LANG_OPTIONS.map(lang => 
                `<option value="${lang.value}" ${currentLang === lang.value ? 'selected' : ''}>${lang.label}</option>`
              ).join('')}
            </select>
          </div>
        </div>

        <div class="settings-section" id="settings-accessibility">
          <h3 class="settings-section-title" data-i18n="settings_accessibility">Accessibility</h3>
          <div class="settings-form-group">
            <span data-i18n="acc_reduced_motion">Reduced Motion</span>
            <label class="toggle-switch">
              <input type="checkbox" id="toggle-reduced-motion" ${reducedMotion ? 'checked' : ''} aria-label="Toggle reduced motion">
              <span class="toggle-slider"></span>
            </label>
          </div>
          <div class="settings-form-group">
            <span data-i18n="acc_larger_text">Larger Text</span>
            <label class="toggle-switch">
              <input type="checkbox" id="toggle-larger-text" ${largerText ? 'checked' : ''} aria-label="Toggle larger text">
              <span class="toggle-slider"></span>
            </label>
          </div>
        </div>

        <div class="settings-section" id="settings-intro">
          <h3 class="settings-section-title" data-i18n="settings_intro">Product Introduction</h3>
          <p class="settings-text" data-i18n="settings_intro_desc">Review the welcome guide to learn how ScamShield AI works.</p>
          <button class="settings-btn-primary" id="btn-replay-intro" data-i18n="settings_replay_intro">Replay Product Intro</button>
        </div>

        <div class="settings-section" id="settings-privacy">
          <h3 class="settings-section-title" data-i18n="settings_privacy">Privacy & Data</h3>
          <p class="settings-text" data-i18n="settings_privacy_desc">All your data is stored locally on your device. We do not transmit your personal settings to any servers.</p>
          <button class="settings-btn-danger" id="btn-clear-data" data-i18n="settings_clear_data">Clear All Data</button>
        </div>

      </div>
    `;
  }

  function init() {
    // Theme Event Listeners
    const themeButtons = document.querySelectorAll('#settings-appearance .settings-btn');
    themeButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        themeButtons.forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        const mode = e.target.getAttribute('data-theme');
        if (window.ThemeManager?.setTheme) {
          window.ThemeManager.setTheme(mode);
        }
        if (window.showToast) {
          window.showToast('Theme changed', 'success');
        }
      });
    });

    // Language Event Listener
    const langSelect = document.getElementById('lang-select');
    if (langSelect) {
      langSelect.addEventListener('change', (e) => {
        const lang = e.target.value;
        if (window.I18n?.setLanguage) {
          window.I18n.setLanguage(lang);
        }
        if (window.showToast) {
          window.showToast('Language changed', 'success');
        }
      });
    }

    // Accessibility Event Listeners
    const reducedMotionToggle = document.getElementById('toggle-reduced-motion');
    if (reducedMotionToggle) {
      reducedMotionToggle.addEventListener('change', (e) => {
        const isChecked = e.target.checked;
        localStorage.setItem('scamshield_reduced_motion', isChecked ? 'true' : 'false');
        if (isChecked) {
          document.body.classList.add('reduced-motion');
        } else {
          document.body.classList.remove('reduced-motion');
        }
      });
    }

    const largerTextToggle = document.getElementById('toggle-larger-text');
    if (largerTextToggle) {
      largerTextToggle.addEventListener('change', (e) => {
        const isChecked = e.target.checked;
        localStorage.setItem('scamshield_larger_text', isChecked ? 'true' : 'false');
        if (isChecked) {
          document.body.setAttribute('data-larger-text', 'true');
        } else {
          document.body.removeAttribute('data-larger-text');
        }
      });
    }

    // Intro Event Listener
    const replayIntroBtn = document.getElementById('btn-replay-intro');
    if (replayIntroBtn) {
      replayIntroBtn.addEventListener('click', () => {
        if (window.IntroManager?.replay) {
          window.IntroManager.replay();
        }
      });
    }

    // Privacy Event Listener
    const clearDataBtn = document.getElementById('btn-clear-data');
    if (clearDataBtn) {
      clearDataBtn.addEventListener('click', () => {
        if (window.ModalManager?.openModal) {
          const t = (k, fallback) => (window.I18n ? I18n.t(k) : fallback) || fallback;
          window.ModalManager.openModal({
            title: t('settings_clear_data', 'Clear All Data'),
            content: '<p style="color:var(--ink-muted);margin:0;">' + t('confirm_clear_all', 'Are you sure you want to clear all data? This cannot be undone.') + '</p>',
            type: 'confirm',
            confirmText: t('confirm_clear', 'Clear Data'),
            cancelText: t('cancel', 'Cancel'),
            onConfirm: () => {
              // Clear scamshield_ keys
              Object.keys(localStorage).forEach(key => {
                if (key.startsWith('scamshield_')) {
                  localStorage.removeItem(key);
                }
              });
              if (window.showToast) {
                window.showToast('Data cleared', 'success');
              }
              setTimeout(() => {
                window.location.reload();
              }, 1000);
            }
          });
        } else {
          // Fallback if ModalManager is not available
          if (confirm('Are you sure you want to clear all data? This cannot be undone.')) {
            Object.keys(localStorage).forEach(key => {
              if (key.startsWith('scamshield_')) {
                localStorage.removeItem(key);
              }
            });
            if (window.showToast) {
              window.showToast('Data cleared', 'success');
            }
            setTimeout(() => {
              window.location.reload();
            }, 1000);
          }
        }
      });
    }
  }

  window.SettingsManager = {
    init,
    renderSettingsPage
  };
})();
