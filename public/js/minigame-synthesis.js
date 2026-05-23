// Мини-игра «Синтез стабилизатора» — переменный исход, правильная анимация жидкости
(function() {
  let returnNode = null;
  let attempt = 1;
  let crisisChoice = null;

  window.addEventListener('vn:startMinigame', (e) => {
    if (e.detail.game !== 'synthesis') return;
    returnNode = e.detail.returnNode;
    attempt = 1;
    crisisChoice = null;
    startSynthesis();
  });

  function startSynthesis() {
    const layer = document.getElementById('minigame-layer');
    layer.innerHTML = '';
    layer.classList.remove('hidden');

    const container = document.createElement('div');
    container.className = 'synthesis-game';
    container.style.background = 'var(--bg, #020204)';

    // Колба нарисована через SVG для правильной жидкости
    container.innerHTML = `
      <div class="synth-header">СИНТЕЗ СТАБИЛИЗАТОРА</div>
      <div class="synth-reactor" style="background:none;border:none;overflow:visible;">
        <svg id="synth-svg" viewBox="0 0 120 200" xmlns="http://www.w3.org/2000/svg"
          style="width:clamp(80px,14vw,140px);height:auto;display:block;margin:0 auto;">
          <!-- Определения: clip и фильтры -->
          <defs>
            <clipPath id="flask-clip">
              <!-- Форма колбы: горлышко сверху, расширяется книзу -->
              <path d="M44,10 L44,70 L10,160 Q10,190 60,190 Q110,190 110,160 L76,70 L76,10 Z"/>
            </clipPath>
            <filter id="liquid-blur">
              <feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="2" result="noise" seed="2"/>
              <feDisplacementMap in="SourceGraphic" in2="noise" scale="3" xChannelSelector="R" yChannelSelector="G"/>
            </filter>
          </defs>
          <!-- Жидкость (клипирована по форме колбы) -->
          <g clip-path="url(#flask-clip)">
            <rect id="synth-liquid-rect" x="0" y="190" width="120" height="200"
              fill="transparent" style="transition: y 1.2s cubic-bezier(.4,0,.2,1), fill 1.4s ease;"/>
            <!-- Блики на поверхности жидкости -->
            <ellipse id="synth-surface" cx="60" cy="190" rx="28" ry="4" fill="rgba(255,255,255,0.08)" style="transition: cy 1.2s cubic-bezier(.4,0,.2,1);"/>
          </g>
          <!-- Стекло колбы поверх жидкости -->
          <path d="M44,10 L44,70 L10,160 Q10,190 60,190 Q110,190 110,160 L76,70 L76,10 Z"
            fill="none" stroke="rgba(200,192,176,0.35)" stroke-width="1.5" stroke-linejoin="round"/>
          <!-- Горлышко -->
          <rect x="44" y="4" width="32" height="10" rx="1" fill="none" stroke="rgba(200,192,176,0.3)" stroke-width="1.5"/>
          <!-- Пробка -->
          <rect x="46" y="2" width="28" height="6" rx="2" fill="rgba(200,192,176,0.15)" stroke="rgba(200,192,176,0.2)" stroke-width="1"/>
          <!-- Отражение на стекле -->
          <path d="M50,20 L50,75 L36,130" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="3" stroke-linecap="round"/>
        </svg>
      </div>
      <div class="synth-status" id="synth-status">Этап 1: Добавьте компонент Альфа</div>
      <div class="synth-controls" id="synth-controls"></div>
    `;
    layer.appendChild(container);

    showStage1();
  }

  // Установить уровень жидкости (0-100) и цвет
  function setLiquid(levelPct, colorRgba) {
    const rect = document.getElementById('synth-liquid-rect');
    const surf = document.getElementById('synth-surface');
    if (!rect) return;
    // y = 190 - (190 * levelPct/100); высота колбы ~190px
    const y = 190 - Math.round(190 * levelPct / 100);
    rect.setAttribute('y', y);
    rect.style.fill = colorRgba;
    if (surf) {
      surf.setAttribute('cy', y);
      surf.style.fill = levelPct > 5 ? 'rgba(255,255,255,0.08)' : 'transparent';
    }
  }

  function showStage1() {
    const controls = document.getElementById('synth-controls');
    const status = document.getElementById('synth-status');
    setLiquid(0, 'transparent');
    status.textContent = 'Этап 1: Добавьте компонент Альфа';
    controls.innerHTML = `<button class="synth-btn synth-btn-alpha">Добавить Альфа</button>`;
    controls.querySelector('.synth-btn-alpha').addEventListener('click', () => {
      controls.innerHTML = '';
      setLiquid(28, 'rgba(220,180,160,0.55)');
      status.textContent = 'Смесь становится мутно-белой...';
      setTimeout(() => {
        setLiquid(30, 'rgba(230,225,220,0.65)');
        showStage2();
      }, 1600);
    });
  }

  function showStage2() {
    const controls = document.getElementById('synth-controls');
    const status = document.getElementById('synth-status');
    status.textContent = 'Этап 2: Добавьте компонент Бета';
    controls.innerHTML = `<button class="synth-btn synth-btn-beta">Добавить Бета</button>`;
    controls.querySelector('.synth-btn-beta').addEventListener('click', () => {
      controls.innerHTML = '';
      setLiquid(52, 'rgba(160,140,60,0.7)');
      status.textContent = 'Смесь темнеет... Пузыри! Реакция активная.';
      setTimeout(showCrisis, 1200);
    });
  }

  function showCrisis() {
    const controls = document.getElementById('synth-controls');
    const status = document.getElementById('synth-status');
    status.textContent = 'КРИЗИС: Реакция нестабильна. Что делать?';

    // Анимация пузырей через CSS animation
    const rect = document.getElementById('synth-liquid-rect');
    if (rect) rect.style.animation = 'synthBubble .35s ease-in-out infinite alternate';

    controls.innerHTML = `
      <button class="synth-btn" data-action="wait">Ждать</button>
      <button class="synth-btn" data-action="stir">Помешать</button>
      <button class="synth-btn" data-action="cool">Охладить</button>
    `;

    controls.querySelectorAll('.synth-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        crisisChoice = btn.dataset.action;
        if (rect) rect.style.animation = '';
        controls.innerHTML = '';

        if (crisisChoice === 'wait') {
          status.textContent = 'Пузыри утихают. Экзотерма выравнивается.';
          // Лучший исход — стабилизатор будет полной эффективности
        } else if (crisisChoice === 'stir') {
          status.textContent = 'Потеряли 15% эффективности. Но реакция стабилизируется.';
          if (window._vnEngine) window._vnEngine.state.flags['стабилизатор_пониженная_эффективность'] = true;
        } else { // cool
          status.textContent = 'Реакция замедлилась. Температура падает — хорошо.';
          // Нейтральный исход
        }
        setTimeout(showStage3, 2000);
      });
    });
  }

  function showStage3() {
    const controls = document.getElementById('synth-controls');
    const status = document.getElementById('synth-status');
    status.textContent = 'Ожидание... Смесь должна поменять цвет.';

    // Переход через серый → голубой → синий
    const phases = [
      ['rgba(110,115,125,0.7)', 62],
      ['rgba(80,120,180,0.8)', 72],
      ['rgba(40,90,220,0.9)', 78],
    ];
    let i = 0;
    const iv = setInterval(() => {
      const [color, lvl] = phases[i];
      setLiquid(lvl, color);
      i++;
      if (i >= phases.length) { clearInterval(iv); showGammaWindow(); }
    }, 1600);
  }

  function showGammaWindow() {
    const controls = document.getElementById('synth-controls');
    const status = document.getElementById('synth-status');
    status.textContent = '⚡ СИНИЙ! Добавьте Гамма — СЕЙЧАС!';
    setLiquid(78, 'rgba(30,80,220,0.95)');

    const windowMs = attempt === 1 ? 4500 : 3200;
    controls.innerHTML = `
      <button class="synth-btn synth-btn-gamma synth-pulse">Добавить Гамма!</button>
      <div id="synth-timer-bar" style="
        width:100%; height:3px; margin-top:.8rem;
        background:rgba(200,192,176,0.1); border-radius:2px; overflow:hidden;">
        <div id="synth-timer-fill" style="
          height:100%; width:100%;
          background:rgba(30,80,220,0.7);
          transition:width ${windowMs}ms linear;
          border-radius:2px;">
        </div>
      </div>`;

    let success = false;
    const btn = controls.querySelector('.synth-btn-gamma');

    // Запускаем анимацию таймера
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const fill = document.getElementById('synth-timer-fill');
        if (fill) fill.style.width = '0%';
      });
    });

    btn.addEventListener('click', () => { success = true; clearTimeout(failTimer); onSuccess(); });
    const failTimer = setTimeout(() => { if (!success) onFail(); }, windowMs);
  }

  function onSuccess() {
    const controls = document.getElementById('synth-controls');
    const status = document.getElementById('synth-status');
    setLiquid(85, 'rgba(20,60,210,1)');

    const rect = document.getElementById('synth-liquid-rect');
    if (rect) rect.style.filter = 'drop-shadow(0 0 12px rgba(60,120,255,0.7))';

    // Исход зависит от выбора в кризисе
    let resultMsg = 'Стабилизатор синтезирован.';
    if (window._vnEngine?.state?.flags['стабилизатор_пониженная_эффективность']) {
      resultMsg = 'Стабилизатор синтезирован. Эффективность снижена на 15%.';
    } else if (crisisChoice === 'wait') {
      resultMsg = 'Стабилизатор синтезирован. Максимальная эффективность.';
      if (window._vnEngine) window._vnEngine.state.flags['стабилизатор_максимальный'] = true;
    }

    status.textContent = resultMsg;
    controls.innerHTML = '';
    if (window._vnEngine) window._vnEngine.state.flags['стабилизатор_завершён'] = true;
    setTimeout(endMinigame, 2200);
  }

  function onFail() {
    const controls = document.getElementById('synth-controls');
    const status = document.getElementById('synth-status');
    setLiquid(40, 'rgba(50,50,60,0.5)');
    controls.innerHTML = '';

    if (attempt >= 2) {
      status.textContent = 'Компонентов больше нет. Синтез провален — история продолжается.';
      if (window._vnEngine) window._vnEngine.state.flags['стабилизатор_не_завершён'] = true;
      setTimeout(endMinigame, 2200);
    } else {
      status.textContent = 'Не успели. Осталась одна попытка.';
      attempt++;
      setTimeout(startSynthesis, 2500);
    }
  }

  function endMinigame() {
    window.dispatchEvent(new CustomEvent('vn:minigameEnd', { detail: { returnNode } }));
  }
})();
