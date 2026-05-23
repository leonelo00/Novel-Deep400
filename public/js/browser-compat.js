// ============================================================
//  ОПРЕДЕЛЕНИЕ БРАУЗЕРА И ПРИМЕНЕНИЕ ФИКСОВ
// ============================================================

(function() {
  const ua = navigator.userAgent;
  const isSafari = /^((?!chrome|android).)*safari/i.test(ua);
  const isChrome = /chrome/i.test(ua) && !/edge/i.test(ua);
  const isFirefox = /firefox/i.test(ua);
  const isEdge = /edg/i.test(ua);
  const isMobile = /mobile|tablet|ipad|iphone/i.test(ua);
  const isRetina = window.devicePixelRatio >= 2;
  const isMac = /macintosh|mac os x/i.test(ua);

  // Добавляем классы на html элемент — можно использовать в CSS
  const html = document.documentElement;
  if (isSafari)  html.classList.add('browser-safari');
  if (isChrome)  html.classList.add('browser-chrome');
  if (isFirefox) html.classList.add('browser-firefox');
  if (isEdge)    html.classList.add('browser-edge');
  if (isMobile)  html.classList.add('is-mobile');
  if (isRetina)  html.classList.add('is-retina');
  if (isMac)     html.classList.add('is-mac');

  // Сохраняем глобально для использования в других скриптах
  window.BrowserInfo = { isSafari, isChrome, isFirefox, isEdge, isMobile, isRetina, isMac };

  // ── SAFARI ФИКСЫ ──────────────────────────────────────────

  if (isSafari) {
    // 1. Анимации — Safari иногда не запускает анимации на элементах
    //    которые появляются позже. Принудительный reflow.
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(() => {
        document.querySelectorAll('.menu-btn, .menu-logo, .menu-subtitle').forEach(el => {
          // Принудительно сбрасываем и перезапускаем анимацию
          el.style.animation = 'none';
          el.getBoundingClientRect(); // reflow
          el.style.animation = '';
        });
      }, 50);
    });

    // 2. Safari и backdrop-filter — иногда лагает на старых версиях
    const safariVersion = ua.match(/version\/(\d+)/i)?.[1];
    if (safariVersion && parseInt(safariVersion) < 15) {
      html.classList.add('safari-old');
    }

    // 3. Safari и CSS clip-path анимации — добавляем will-change
    document.addEventListener('DOMContentLoaded', () => {
      const dialogueInner = document.getElementById('dialogue-inner');
      if (dialogueInner) {
        dialogueInner.style.willChange = 'clip-path';
      }
    });

    console.log('[BrowserCompat] Safari detected — фиксы применены');
  }

  // ── RETINA ФИКС ───────────────────────────────────────────

  if (isRetina) {
    // Добавляем CSS переменную с DPR для использования в стилях
    document.documentElement.style.setProperty('--dpr', window.devicePixelRatio);
    console.log('[BrowserCompat] Retina display — DPR:', window.devicePixelRatio);
  }

  // ── FIREFOX ФИКС ──────────────────────────────────────────

  if (isFirefox) {
    // Firefox не поддерживает backdrop-filter без флага в старых версиях
    // Добавляем fallback фон для оверлеев
    document.addEventListener('DOMContentLoaded', () => {
      const overlay = document.getElementById('menu-overlay');
      if (overlay) {
        const style = window.getComputedStyle(overlay);
        if (!CSS.supports('backdrop-filter', 'blur(1px)') && 
            !CSS.supports('-webkit-backdrop-filter', 'blur(1px)')) {
          overlay.style.background = 'rgba(0,0,0,0.96)';
          html.classList.add('no-backdrop-filter');
        }
      }
    });
  }

  // ── ОБЩИЙ ФИКС: resize при смене ориентации ───────────────
  window.addEventListener('orientationchange', () => {
    setTimeout(() => window.dispatchEvent(new Event('resize')), 300);
  });

  console.log('[BrowserCompat] Браузер:', 
    isSafari ? 'Safari' : isChrome ? 'Chrome' : isFirefox ? 'Firefox' : isEdge ? 'Edge' : 'Unknown',
    '| Retina:', isRetina,
    '| Mac:', isMac,
    '| Mobile:', isMobile
  );
})();
