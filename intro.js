(function () {
    'use strict';

    const LS_KEY = 'scamshield_intro_seen';
    let overlay = null;
    let styleTag = null;
    let timeoutIds = [];

    function checkReducedMotion() {
        return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }

    function clearTimeouts() {
        timeoutIds.forEach(clearTimeout);
        timeoutIds = [];
    }

    function forceEndIntro() {
        clearTimeouts();
        if (overlay && overlay.parentNode) {
            overlay.parentNode.removeChild(overlay);
        }
        overlay = null;
    }

    function endIntro() {
        clearTimeouts();
        try {
            localStorage.setItem(LS_KEY, 'true');
        } catch (e) {
            // Ignore storage errors gracefully
        }
        if (overlay) {
            overlay.style.opacity = '0';
            setTimeout(() => {
                forceEndIntro();
            }, 500);
        }
    }

    function injectStyles() {
        if (styleTag) return;
        styleTag = document.createElement('style');
        styleTag.textContent = `
            #intro-overlay {
                position: fixed;
                inset: 0;
                z-index: 99999;
                background-color: #07090E;
                color: #FFFFFF;
                font-family: 'Inter', sans-serif;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                overflow: hidden;
                transition: opacity 0.5s ease-out;
            }
            #intro-overlay * {
                box-sizing: border-box;
            }
            .intro-scene {
                position: absolute;
                inset: 0;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                opacity: 0;
                pointer-events: none;
                transition: opacity 0.4s ease;
                will-change: opacity;
            }
            .intro-scene.active {
                opacity: 1;
            }
            .intro-skip-btn {
                position: absolute;
                bottom: 2rem;
                right: 2rem;
                background: transparent;
                border: 1px solid rgba(255, 255, 255, 0.2);
                color: rgba(255, 255, 255, 0.7);
                padding: 0.5rem 1rem;
                border-radius: 9999px;
                cursor: pointer;
                font-family: 'Space Grotesk', sans-serif;
                font-size: 0.875rem;
                transition: all 0.2s ease;
                z-index: 10;
                pointer-events: auto;
            }
            .intro-skip-btn:hover {
                color: #FFFFFF;
                border-color: rgba(255, 255, 255, 0.5);
                background: rgba(255, 255, 255, 0.1);
            }
            
            /* Scene 1 */
            .intro-particles {
                position: absolute;
                inset: 0;
                background-image: radial-gradient(rgba(255, 255, 255, 0.15) 1px, transparent 1px);
                background-size: 20px 20px;
                animation: particleMove 10s linear infinite;
                will-change: transform;
                opacity: 0.3;
            }
            @keyframes particleMove {
                0% { transform: translateY(0); }
                100% { transform: translateY(20px); }
            }
            .scene-1 .shield {
                font-size: 4.5rem;
                animation: scaleUp 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
                will-change: transform;
                transform: scale(0);
            }
            .scene-1 .title {
                font-family: 'Space Grotesk', sans-serif;
                font-size: 2.5rem;
                font-weight: 700;
                margin-top: 1rem;
                opacity: 0;
                animation: fadeIn 0.5s ease forwards 0.5s;
                will-change: opacity, transform;
            }
            .scene-1 .subtitle {
                font-size: 1.125rem;
                color: #3B82F6;
                margin-top: 0.5rem;
                opacity: 0;
                animation: fadeIn 0.5s ease forwards 0.8s;
                will-change: opacity, transform;
            }

            @keyframes scaleUp {
                0% { transform: scale(0); }
                100% { transform: scale(1); }
            }
            @keyframes fadeIn {
                0% { opacity: 0; transform: translateY(10px); }
                100% { opacity: 1; transform: translateY(0); }
            }
            @keyframes slideUpFade {
                0% { opacity: 0; transform: translateY(30px); }
                100% { opacity: 1; transform: translateY(0); }
            }

            /* Scene 2 */
            .scene-2 .msg-card {
                background: #111827;
                border: 1px solid #1F2937;
                border-radius: 12px;
                padding: 1.5rem;
                max-width: 400px;
                width: 90%;
                text-align: center;
                position: relative;
                overflow: hidden;
                opacity: 0;
                animation: slideUpFade 0.6s ease forwards;
                will-change: opacity, transform;
            }
            .scene-2 .scanner {
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                height: 2px;
                background: #06B6D4;
                box-shadow: 0 0 10px #06B6D4, 0 0 20px #06B6D4;
                animation: scanMove 1.5s ease-in-out infinite;
                will-change: transform;
            }
            @keyframes scanMove {
                0%, 100% { transform: translateY(-10px); }
                50% { transform: translateY(110px); }
            }

            /* Scene 3 */
            .scene-3 .threats {
                display: flex;
                flex-direction: column;
                gap: 1rem;
                font-family: 'Space Grotesk', sans-serif;
            }
            .scene-3 .threat-item {
                background: rgba(249, 115, 22, 0.1);
                color: #F97316;
                padding: 0.75rem 1.5rem;
                border-radius: 8px;
                border-left: 4px solid #F97316;
                display: flex;
                align-items: center;
                gap: 0.75rem;
                opacity: 0;
                transform: translateX(-20px);
                animation: slideRightFade 0.4s ease forwards;
                will-change: opacity, transform;
            }
            @keyframes slideRightFade {
                0% { opacity: 0; transform: translateX(-20px); }
                100% { opacity: 1; transform: translateX(0); }
            }

            /* Scene 4 */
            .scene-4 .gauge-container {
                position: relative;
                width: 150px;
                height: 150px;
                display: flex;
                align-items: center;
                justify-content: center;
                flex-direction: column;
            }
            .scene-4 .gauge-svg {
                position: absolute;
                inset: 0;
                width: 100%;
                height: 100%;
                transform: rotate(-90deg);
            }
            .scene-4 .gauge-bg {
                fill: none;
                stroke: #1F2937;
                stroke-width: 12;
            }
            .scene-4 .gauge-progress {
                fill: none;
                stroke: #F97316;
                stroke-width: 12;
                stroke-linecap: round;
                stroke-dasharray: 408;
                stroke-dashoffset: 408;
                animation: fillCircle 1s ease forwards 0.2s;
            }
            @keyframes fillCircle {
                0% { stroke-dashoffset: 408; }
                100% { stroke-dashoffset: 53; } /* 408 * (1 - 0.87) */
            }
            .scene-4 .score-text {
                font-family: 'JetBrains Mono', monospace;
                font-size: 2.5rem;
                font-weight: bold;
                color: #FFFFFF;
                opacity: 0;
                animation: fadeIn 0.5s ease forwards 0.6s;
                position: relative;
                z-index: 2;
                will-change: opacity, transform;
            }
            .scene-4 .score-sub {
                font-family: 'Inter', sans-serif;
                font-size: 1rem;
                color: rgba(255, 255, 255, 0.6);
                opacity: 0;
                animation: fadeIn 0.5s ease forwards 0.8s;
                margin-top: 1.5rem;
                will-change: opacity, transform;
            }
            .scene-4 .score-label {
                font-family: 'Space Grotesk', sans-serif;
                color: #F97316;
                margin-top: 0.5rem;
                font-size: 1.5rem;
                font-weight: bold;
                letter-spacing: 2px;
                animation: fadeIn 0.5s ease forwards 1s;
                opacity: 0;
                will-change: opacity, transform;
            }

            /* Scene 5 */
            .scene-5 .recs {
                display: flex;
                flex-direction: column;
                gap: 1rem;
            }
            .scene-5 .rec-item {
                color: #10B981;
                font-family: 'Inter', sans-serif;
                font-size: 1.125rem;
                display: flex;
                align-items: center;
                gap: 0.75rem;
                opacity: 0;
                animation: fadeIn 0.4s ease forwards;
                will-change: opacity, transform;
            }

            /* Scene 6 */
            .scene-6 .brand {
                font-family: 'Space Grotesk', sans-serif;
                font-size: 3rem;
                font-weight: 800;
                background: linear-gradient(to right, #3B82F6, #06B6D4);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                opacity: 0;
                animation: scaleUpFade 0.8s ease forwards;
                will-change: opacity, transform;
            }
            .scene-6 .tagline {
                font-size: 1.25rem;
                color: rgba(255, 255, 255, 0.8);
                margin-top: 1rem;
                opacity: 0;
                animation: fadeIn 0.8s ease forwards 0.4s;
                will-change: opacity, transform;
            }
            @keyframes scaleUpFade {
                0% { opacity: 0; transform: scale(0.9); }
                100% { opacity: 1; transform: scale(1); }
            }
        `;
        document.head.appendChild(styleTag);
    }

    function createOverlay() {
        const div = document.createElement('div');
        div.id = 'intro-overlay';
        div.setAttribute('aria-label', 'Intro Sequence');
        div.innerHTML = `
            <div class="intro-particles"></div>
            
            <div class="intro-scene scene-1" id="intro-scene-1">
                <div class="shield">🛡️</div>
                <div class="title">SCAMSHIELD AI</div>
                <div class="subtitle">Detect &bull; Explain &bull; Protect</div>
            </div>

            <div class="intro-scene scene-2" id="intro-scene-2">
                <div class="msg-card">
                    <div class="scanner"></div>
                    <p>URGENT! Your bank account will be suspended. Verify your KYC immediately.</p>
                </div>
            </div>

            <div class="intro-scene scene-3" id="intro-scene-3">
                <div class="threats">
                    <div class="threat-item" style="animation-delay: 0.1s">⚠ Urgency</div>
                    <div class="threat-item" style="animation-delay: 0.3s">⚠ Impersonation</div>
                    <div class="threat-item" style="animation-delay: 0.5s">⚠ Suspicious URL</div>
                    <div class="threat-item" style="animation-delay: 0.7s">⚠ Credential Request</div>
                </div>
            </div>

            <div class="intro-scene scene-4" id="intro-scene-4">
                <div class="gauge-container">
                    <svg class="gauge-svg" viewBox="0 0 150 150">
                        <circle class="gauge-bg" cx="75" cy="75" r="65" />
                        <circle class="gauge-progress" cx="75" cy="75" r="65" />
                    </svg>
                    <div class="score-text">87</div>
                </div>
                <div class="score-sub">87 / 100</div>
                <div class="score-label">HIGH RISK</div>
            </div>

            <div class="intro-scene scene-5" id="intro-scene-5">
                <div class="recs">
                    <div class="rec-item" style="animation-delay: 0.1s">✓ Don't click the link</div>
                    <div class="rec-item" style="animation-delay: 0.3s">✓ Don't share OTP</div>
                    <div class="rec-item" style="animation-delay: 0.5s">✓ Verify through official channels</div>
                </div>
            </div>

            <div class="intro-scene scene-6" id="intro-scene-6">
                <div class="brand">SCAMSHIELD AI</div>
                <div class="tagline">Before You Click, Know the Risk.</div>
            </div>

            <button class="intro-skip-btn" id="intro-skip-btn" aria-label="Skip Intro">Skip Intro &rarr;</button>
        `;
        document.body.appendChild(div);
        return div;
    }

    function startAnimation() {
        if (checkReducedMotion()) {
            document.getElementById('intro-scene-1').classList.add('active');
            timeoutIds.push(setTimeout(endIntro, 1500));
            return;
        }

        const scenes = [
            document.getElementById('intro-scene-1'),
            document.getElementById('intro-scene-2'),
            document.getElementById('intro-scene-3'),
            document.getElementById('intro-scene-4'),
            document.getElementById('intro-scene-5'),
            document.getElementById('intro-scene-6')
        ];

        // Scene 1: 0 - 2.5s
        scenes[0].classList.add('active');
        timeoutIds.push(setTimeout(() => {
            scenes[0].classList.remove('active');
            scenes[1].classList.add('active');
        }, 2500));

        // Scene 2: 2.5s - 5s
        timeoutIds.push(setTimeout(() => {
            scenes[1].classList.remove('active');
            scenes[2].classList.add('active');
        }, 5000));

        // Scene 3: 5s - 6.5s
        timeoutIds.push(setTimeout(() => {
            scenes[2].classList.remove('active');
            scenes[3].classList.add('active');
        }, 6500));

        // Scene 4: 6.5s - 8s
        timeoutIds.push(setTimeout(() => {
            scenes[3].classList.remove('active');
            scenes[4].classList.add('active');
        }, 8000));

        // Scene 5: 8s - 10s
        timeoutIds.push(setTimeout(() => {
            scenes[4].classList.remove('active');
            scenes[5].classList.add('active');
        }, 10000));

        // Scene 6: 10s - 12s (fade out to main app)
        timeoutIds.push(setTimeout(() => {
            endIntro();
        }, 12000));
    }

    window.IntroManager = {
        init: function () {
            try {
                if (localStorage.getItem(LS_KEY) === 'true') {
                    return;
                }
                this.replay();
            } catch (e) {
                console.error('IntroManager init error:', e);
                forceEndIntro();
            }
        },
        replay: function () {
            try {
                forceEndIntro();
                injectStyles();
                overlay = createOverlay();
                
                const skipBtn = document.getElementById('intro-skip-btn');
                if (skipBtn) {
                    skipBtn.addEventListener('click', () => {
                        this.skip();
                    });
                }

                // Force reflow
                void overlay.offsetWidth;

                startAnimation();
            } catch (e) {
                console.error('IntroManager replay error:', e);
                forceEndIntro();
            }
        },
        skip: function () {
            endIntro();
        }
    };
})();
