(function () {
    'use strict';

    // Inject styles
    function injectStyles() {
        if (document.getElementById('scamshield-toast-styles')) return;

        const style = document.createElement('style');
        style.id = 'scamshield-toast-styles';
        style.textContent = `
            #toast-container {
                position: fixed;
                top: 80px;
                right: 20px;
                z-index: 10000;
                display: flex;
                flex-direction: column;
                gap: 12px;
                pointer-events: none;
            }
            .toast {
                display: flex;
                align-items: center;
                background: rgba(30, 30, 35, 0.85);
                backdrop-filter: blur(10px);
                -webkit-backdrop-filter: blur(10px);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 8px;
                padding: 12px 16px;
                min-width: 300px;
                max-width: 400px;
                box-shadow: 0 8px 16px rgba(0, 0, 0, 0.3);
                pointer-events: auto;
                position: relative;
                overflow: hidden;
                color: #fff;
                font-family: system-ui, -apple-system, sans-serif;
                animation: toast-slide-in 0.3s ease-out forwards;
                opacity: 0;
            }
            .toast.toast-closing {
                animation: toast-fade-out 0.2s ease-in forwards;
            }
            
            .toast-icon {
                font-size: 1.2rem;
                margin-right: 12px;
                display: flex;
                align-items: center;
                justify-content: center;
                width: 24px;
                height: 24px;
                border-radius: 50%;
            }
            
            .toast-content {
                flex-grow: 1;
                font-size: 0.9rem;
                line-height: 1.4;
            }
            
            .toast-close {
                background: none;
                border: none;
                color: rgba(255, 255, 255, 0.5);
                cursor: pointer;
                padding: 4px;
                margin-left: 12px;
                font-size: 1.2rem;
                line-height: 1;
                transition: color 0.2s;
            }
            .toast-close:hover {
                color: rgba(255, 255, 255, 0.9);
            }
            
            .toast-progress {
                position: absolute;
                bottom: 0;
                left: 0;
                height: 3px;
                background-color: rgba(255, 255, 255, 0.3);
                width: 100%;
                transform-origin: left;
            }
            
            /* Type-specific styling */
            .toast-success .toast-icon { color: var(--low, #10b981); }
            .toast-success .toast-progress { background-color: var(--low, #10b981); }
            
            .toast-warning .toast-icon { color: var(--medium, #f59e0b); }
            .toast-warning .toast-progress { background-color: var(--medium, #f59e0b); }
            
            .toast-error .toast-icon { color: var(--critical, #ef4444); }
            .toast-error .toast-progress { background-color: var(--critical, #ef4444); }
            
            .toast-info .toast-icon { color: var(--primary, #3b82f6); }
            .toast-info .toast-progress { background-color: var(--primary, #3b82f6); }
            
            /* Animations */
            @keyframes toast-slide-in {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
            @keyframes toast-fade-out {
                from {
                    transform: translateX(0);
                    opacity: 1;
                }
                to {
                    transform: translateX(100%);
                    opacity: 0;
                }
            }
            
            /* Prefers reduced motion */
            @media (prefers-reduced-motion: reduce) {
                .toast, .toast.toast-closing {
                    animation: none !important;
                }
                .toast {
                    opacity: 1;
                }
                .toast.toast-closing {
                    opacity: 0;
                }
                .toast-progress {
                    transition: none !important;
                }
            }
        `;
        document.head.appendChild(style);
    }

    function getContainer() {
        let container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            container.setAttribute('aria-live', 'polite');
            document.body.appendChild(container);
        }
        return container;
    }

    const icons = {
        success: '✓',
        warning: '⚠',
        error: '✕',
        info: 'ℹ'
    };

    /**
     * Show a toast notification
     * @param {string} message - The message to display
     * @param {string} type - 'success', 'warning', 'error', 'info'
     * @param {number} duration - Duration in ms (default: 3000)
     */
    window.showToast = function(message, type = 'info', duration = 3000) {
        injectStyles();
        const container = getContainer();

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.setAttribute('role', 'alert');

        const icon = document.createElement('div');
        icon.className = 'toast-icon';
        icon.textContent = icons[type] || icons.info;

        const content = document.createElement('div');
        content.className = 'toast-content';
        content.textContent = message;

        const closeBtn = document.createElement('button');
        closeBtn.className = 'toast-close';
        closeBtn.innerHTML = '&times;';
        closeBtn.setAttribute('aria-label', 'Close notification');

        const progress = document.createElement('div');
        progress.className = 'toast-progress';

        toast.appendChild(icon);
        toast.appendChild(content);
        toast.appendChild(closeBtn);
        toast.appendChild(progress);

        container.appendChild(toast);

        let startTime = null;
        let animationFrameId;
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        function updateProgress(timestamp) {
            if (!startTime) startTime = timestamp;
            const elapsed = timestamp - startTime;
            const remaining = Math.max(0, 1 - (elapsed / duration));
            
            if (!prefersReducedMotion) {
                progress.style.transform = `scaleX(${remaining})`;
            }

            if (elapsed < duration) {
                animationFrameId = requestAnimationFrame(updateProgress);
            } else {
                dismissToast();
            }
        }

        function dismissToast() {
            if (animationFrameId) {
                cancelAnimationFrame(animationFrameId);
            }
            toast.classList.add('toast-closing');
            
            if (prefersReducedMotion) {
                toast.remove();
            } else {
                toast.addEventListener('animationend', () => {
                    toast.remove();
                }, { once: true });
            }
        }

        closeBtn.addEventListener('click', dismissToast);

        if (duration > 0) {
            animationFrameId = requestAnimationFrame(updateProgress);
        }
    };
})();
