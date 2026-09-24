(function() {
    const styles = `
        .scamshield-modal-backdrop {
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(0, 0, 0, 0.6);
            backdrop-filter: blur(4px);
            -webkit-backdrop-filter: blur(4px);
            z-index: 1000;
            display: flex;
            align-items: center;
            justify-content: center;
            opacity: 0;
            visibility: hidden;
            transition: opacity 0.3s ease, visibility 0.3s ease;
        }
        
        .scamshield-modal-backdrop.is-open {
            opacity: 1;
            visibility: visible;
        }
        
        .scamshield-modal {
            background: var(--panel, #111726);
            border: 1px solid var(--panel-border, #1E293B);
            border-radius: var(--radius-xl, 1rem);
            color: var(--ink, #F1F5F9);
            display: flex;
            flex-direction: column;
            max-height: 90vh;
            transform: scale(0.95);
            opacity: 0;
            transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s ease;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.2);
            outline: none;
        }
        
        .scamshield-modal-backdrop.is-open .scamshield-modal {
            transform: scale(1);
            opacity: 1;
        }

        @media (prefers-reduced-motion: reduce) {
            .scamshield-modal-backdrop,
            .scamshield-modal {
                transition: none;
            }
        }
        
        .scamshield-modal--sm { width: 400px; max-width: 90vw; }
        .scamshield-modal--md { width: 600px; max-width: 90vw; }
        .scamshield-modal--lg { width: 800px; max-width: 90vw; }
        
        .scamshield-modal-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 1.25rem 1.5rem;
            border-bottom: 1px solid var(--panel-border, #1E293B);
        }
        
        .scamshield-modal-title {
            margin: 0;
            font-size: 1.25rem;
            font-weight: 600;
        }
        
        .scamshield-modal-close {
            background: transparent;
            border: none;
            color: var(--ink, #F1F5F9);
            opacity: 0.7;
            cursor: pointer;
            padding: 0.5rem;
            border-radius: 0.25rem;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: opacity 0.2s, background-color 0.2s, color 0.2s;
        }
        
        .scamshield-modal-close:hover,
        .scamshield-modal-close:focus {
            opacity: 1;
            color: var(--ink, #F1F5F9);
            background-color: var(--critical, #EF4444);
            outline: none;
        }
        
        .scamshield-modal-body {
            padding: 1.5rem;
            overflow-y: auto;
            flex: 1;
        }

        .scamshield-modal-footer {
            display: flex;
            gap: 0.75rem;
            justify-content: flex-end;
            padding: 1rem 1.5rem 1.25rem;
        }

        .scamshield-modal-btn {
            padding: 0.55rem 1.15rem;
            border-radius: 0.5rem;
            border: 1px solid var(--panel-border, #1E293B);
            background: var(--panel, #111726);
            color: var(--ink, #F1F5F9);
            font-size: 0.9rem;
            font-weight: 500;
            cursor: pointer;
            transition: filter 0.15s, transform 0.15s;
        }

        .scamshield-modal-btn:hover { filter: brightness(1.2); }
        .scamshield-modal-btn:active { transform: translateY(1px); }

        .scamshield-modal-btn--danger {
            border: none;
            background: var(--critical, #EF4444);
            color: #fff;
            font-weight: 600;
        }

        .scamshield-modal-btn--primary {
            border: none;
            background: var(--primary, #3B82F6);
            color: #fff;
            font-weight: 600;
        }

        body.scamshield-modal-open {
            overflow: hidden;
        }
    `;

    const styleSheet = document.createElement('style');
    styleSheet.textContent = styles;
    document.head.appendChild(styleSheet);

    const openModals = [];

    const ModalManager = {
        openModal(options) {
            const {
                id = 'modal-' + Math.random().toString(36).substring(2, 11),
                title = '',
                content = '',
                size = 'md',
                closable = true,
                onClose = null,
                // Confirm-dialog support: renders a footer with Cancel/Confirm.
                type = null,                       // 'confirm' | null
                onConfirm = null,
                confirmText = (window.I18n && I18n.t('confirm')) || 'Confirm',
                cancelText = (window.I18n && I18n.t('cancel')) || 'Cancel',
                confirmVariant = 'danger'          // 'danger' | 'primary'
            } = options;

            if (openModals.length === 0) {
                document.body.classList.add('scamshield-modal-open');
            }

            const activeElement = document.activeElement;

            const backdrop = document.createElement('div');
            backdrop.className = 'scamshield-modal-backdrop';
            backdrop.id = id;
            
            const zIndex = 1000 + (openModals.length * 10);
            backdrop.style.zIndex = zIndex;

            const modal = document.createElement('div');
            modal.className = `scamshield-modal scamshield-modal--${size}`;
            modal.setAttribute('role', 'dialog');
            modal.setAttribute('aria-modal', 'true');
            const titleId = `${id}-title`;
            modal.setAttribute('aria-labelledby', titleId);
            modal.tabIndex = -1;

            const header = document.createElement('div');
            header.className = 'scamshield-modal-header';

            const titleEl = document.createElement('h2');
            titleEl.className = 'scamshield-modal-title';
            titleEl.id = titleId;
            titleEl.textContent = title;

            const closeBtn = document.createElement('button');
            closeBtn.className = 'scamshield-modal-close';
            closeBtn.setAttribute('aria-label', 'Close dialog');
            closeBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
            
            if (closable) {
                closeBtn.addEventListener('click', () => this.closeModal(id));
                backdrop.addEventListener('click', (e) => {
                    if (e.target === backdrop) {
                        this.closeModal(id);
                    }
                });
            } else {
                closeBtn.style.display = 'none';
            }

            header.appendChild(titleEl);
            header.appendChild(closeBtn);

            const bodyEl = document.createElement('div');
            bodyEl.className = 'scamshield-modal-body';
            bodyEl.innerHTML = content;

            modal.appendChild(header);
            modal.appendChild(bodyEl);

            if (type === 'confirm') {
                const footer = document.createElement('div');
                footer.className = 'scamshield-modal-footer';

                const cancelBtn = document.createElement('button');
                cancelBtn.className = 'scamshield-modal-btn';
                cancelBtn.textContent = cancelText;
                cancelBtn.addEventListener('click', () => this.closeModal(id));

                const confirmBtn = document.createElement('button');
                confirmBtn.className = 'scamshield-modal-btn scamshield-modal-btn--' + (confirmVariant === 'primary' ? 'primary' : 'danger');
                confirmBtn.textContent = confirmText;
                confirmBtn.addEventListener('click', () => {
                    this.closeModal(id);
                    if (typeof onConfirm === 'function') onConfirm();
                });

                footer.appendChild(cancelBtn);
                footer.appendChild(confirmBtn);
                modal.appendChild(footer);
            }

            backdrop.appendChild(modal);

            document.body.appendChild(backdrop);

            const modalInstance = {
                id,
                element: backdrop,
                modalElement: modal,
                previousFocus: activeElement,
                closable,
                onClose,
                handleKeyDown: (e) => {
                    if (e.key === 'Escape' && closable && openModals[openModals.length - 1].id === id) {
                        this.closeModal(id);
                    }
                    if (e.key === 'Tab' && openModals[openModals.length - 1].id === id) {
                        trapFocus(e, modal);
                    }
                }
            };

            openModals.push(modalInstance);
            document.addEventListener('keydown', modalInstance.handleKeyDown);

            // Force reflow to ensure transitions run
            backdrop.offsetHeight;
            backdrop.classList.add('is-open');
            
            if (closable) {
                closeBtn.focus();
            } else {
                modal.focus();
            }
            
            return id;
        },

        closeModal(id) {
            const index = openModals.findIndex(m => m.id === id);
            if (index === -1) return;

            const modalInstance = openModals[index];
            const { element, previousFocus, onClose, handleKeyDown } = modalInstance;

            element.classList.remove('is-open');
            document.removeEventListener('keydown', handleKeyDown);

            const transitionDuration = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 300;
            
            setTimeout(() => {
                if (element.parentNode) {
                    element.parentNode.removeChild(element);
                }
                
                if (onClose && typeof onClose === 'function') {
                    onClose();
                }

                // If this is the topmost modal, restore focus to what was active before it opened
                if (index === openModals.length - 1 && previousFocus && typeof previousFocus.focus === 'function') {
                    previousFocus.focus();
                }

                openModals.splice(index, 1);

                if (openModals.length === 0) {
                    document.body.classList.remove('scamshield-modal-open');
                }
            }, transitionDuration);
        },

        closeAll() {
            // Close modals starting from the topmost
            [...openModals].reverse().forEach(modal => {
                this.closeModal(modal.id);
            });
        }
    };

    function trapFocus(e, modal) {
        const focusableElements = modal.querySelectorAll(
            'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        
        if (!focusableElements.length) {
            e.preventDefault();
            return;
        }

        const firstFocusableElement = focusableElements[0];
        const lastFocusableElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
            if (document.activeElement === firstFocusableElement) {
                lastFocusableElement.focus();
                e.preventDefault();
            }
        } else {
            if (document.activeElement === lastFocusableElement) {
                firstFocusableElement.focus();
                e.preventDefault();
            }
        }
    }

    window.ModalManager = ModalManager;
})();
