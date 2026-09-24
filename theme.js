/**
 * ScamShield AI - Theme Management System
 * Handles dark, light, and system theme switching.
 */
(function() {
    'use strict';

    const STORAGE_KEY = 'scamshield_theme';
    const THEME_COLORS = {
        dark: '#07090E',
        light: '#F8FAFC'
    };

    class ThemeManager {
        constructor() {
            this.mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            this.currentMode = 'dark'; // default
        }

        /**
         * Initialize the theme system by reading from localStorage
         */
        initTheme() {
            const savedTheme = localStorage.getItem(STORAGE_KEY);
            this.setTheme(savedTheme || 'dark');
        }

        /**
         * Set the theme mode
         * @param {string} mode - 'dark', 'light', or 'system'
         */
        setTheme(mode) {
            if (!['dark', 'light', 'system'].includes(mode)) {
                mode = 'dark';
            }

            this.currentMode = mode;
            localStorage.setItem(STORAGE_KEY, mode);
            this._applyTheme();
        }

        /**
         * Return the user's selected mode
         * @returns {string} 'dark', 'light', or 'system'
         */
        getTheme() {
            return this.currentMode;
        }

        /**
         * Return the actual theme being rendered
         * @returns {string} 'dark' or 'light'
         */
        getResolvedTheme() {
            if (this.currentMode === 'system') {
                return this.mediaQuery.matches ? 'dark' : 'light';
            }
            return this.currentMode;
        }

        /**
         * Watch for system theme changes and update if mode is 'system'
         */
        watchSystemTheme() {
            this.mediaQuery.addEventListener('change', () => {
                if (this.currentMode === 'system') {
                    this._applyTheme();
                }
            });
        }

        /**
         * Internal method to apply the resolved theme to the DOM
         * @private
         */
        _applyTheme() {
            const resolved = this.getResolvedTheme();
            document.documentElement.dataset.theme = resolved;
            
            // Update meta theme-color if it exists
            const metaThemeColor = document.querySelector('meta[name="theme-color"]');
            if (metaThemeColor) {
                metaThemeColor.setAttribute('content', THEME_COLORS[resolved]);
            }
        }
    }

    // Expose to window
    window.ThemeManager = new ThemeManager();

    // Auto-initialize on script load
    window.ThemeManager.initTheme();
    window.ThemeManager.watchSystemTheme();
})();
