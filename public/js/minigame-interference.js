// Мини-игра «Помехи» — расшифровка зашумлённой аудиозаписи
(function() {
  let returnNode = null;

  window.addEventListener('vn:startMinigame', (e) => {
    if (e.detail.game !== 'interference') return;
    returnNode = e.detail.returnNode;
    startInterference();
  });

  // Фрагменты записи с пробелами-помехами
  const fragments = [
    { corrupted: 'объект... [шум] ...сектор Г... [помехи] ...двадцать', clean: 'объект литораль сектор Г двадцать три субъекта', key: 'двадцать' },
    { corrupted: '[помехи] ...патоген... [шум] ...таргетинг по... [обрыв]', clean: 'управляемый патоген таргетинг по генетическому маркеру', key: 'патоген' },
    { corrupted: '...власов... [шум] ...санкционировал... [помехи] ...восемь', clean: 'власов санкционировал эксперимент восьмого января', key: 'восьмого' },
    { corrupted: '[обрыв] ...арис говорил... [шум] ...это необходимо', clean: 'арис говорил что это необходимо ради проекта', key: 'необходимо' },
    { corrupted: '...выжившие... [помехи] ...сектор В... [шум] ...трое', clean: 'выжившие из сектора В трое мутировавших', key: 'трое' },
  ];

  function startInterference() {
    const layer = document.getElementById('minigame-layer');
    layer.innerHTML = '';
    layer.classList.remove('hidden');

    let currentFragment = 0;
    let decoded = [];
    let attempts = 0;

    const container = document.createElement('div');
    container.style.cssText = `
      display:flex; flex-direction:column; align-items:center; justify-content:center;
      height:100%; padding:2rem; gap:1.5rem; font-family:'Share Tech Mono',monospace;
      background:#020204;
    `;

    container.innerHTML = `
      <div style="font-size:clamp(0.8rem,1.4vw,1rem);letter-spacing:.3em;text-transform:uppercase;color:rgba(200,192,176,0.5);">
        РАСШИФРОВКА АУДИОЗАПИСИ
      </div>

      <!-- Осциллограф -->
      <canvas id="osc-canvas" width="600" height="80"
        style="width:min(600px,90vw);height:80px;border:1px solid rgba(200,192,176,0.1);"></canvas>

      <!-- Текущий фрагмент -->
      <div id="intf-fragment" style="
        width:min(600px,90vw); padding:1rem 1.5rem;
        border:1px solid rgba(200,192,176,0.15);
        background:rgba(7,7,14,0.8);
        font-size:clamp(0.75rem,1.2vw,0.9rem);
        color:rgba(200,192,176,0.6); line-height:1.8; letter-spacing:.05em;
        min-height:3.5em; display:flex; align-items:center;
      "></div>

      <div style="font-size:clamp(0.6rem,0.9vw,0.75rem);color:rgba(136,120,104,0.5);">
        Введите ключевое слово из фрагмента
      </div>

      <div style="display:flex; gap:.8rem; align-items:center; width:min(600px,90vw);">
        <input id="intf-input" type="text" autocomplete="off" spellcheck="false"
          placeholder="ключевое слово..."
          style="flex:1; background:transparent; border:1px solid rgba(200,192,176,0.2);
            color:rgba(200,192,176,0.9); padding:.5em .8em;
            font-family:'Share Tech Mono',monospace; font-size:clamp(0.7rem,1vw,0.85rem);
            letter-spacing:.1em; outline:none;">
        <button id="intf-submit"
          style="font-family:'Share Tech Mono',monospace; font-size:clamp(0.6rem,0.9vw,0.75rem);
            padding:.5em 1.2em; background:transparent; border:1px solid rgba(200,192,176,0.3);
            color:rgba(200,192,176,0.7); cursor:pointer; letter-spacing:.1em;
            transition:background .2s;">
          →
        </button>
      </div>

      <div id="intf-status" style="font-size:clamp(0.6rem,0.9vw,0.75rem);color:rgba(136,120,104,0.5);min-height:1.5em;"></div>

      <!-- Прогресс -->
      <div style="display:flex; gap:.4rem; align-items:center;">
        ${fragments.map((_, i) => `<div class="intf-dot" data-i="${i}"
          style="width:8px;height:8px;border:1px solid rgba(200,192,176,0.3);border-radius:50%;
          background:transparent;transition:background .3s;"></div>`).join('')}
      </div>
    `;
    layer.appendChild(container);

    // Осциллограф
    const osc = document.getElementById('osc-canvas');
    const octx = osc.getContext('2d');
    let oscT = 0;
    let oscAnimating = true;

    function drawOsc() {
      if (!oscAnimating) return;
      oscT += 0.05;
      const w = osc.width, h = osc.height;
      octx.clearRect(0, 0, w, h);
      octx.strokeStyle = 'rgba(100,180,120,0.6)';
      octx.lineWidth = 1.5;
      octx.beginPath();
      for (let x = 0; x < w; x++) {
        const noise = Math.random() * 8 - 4;
        const signal = Math.sin(x * 0.04 + oscT) * 18 + Math.sin(x * 0.11 + oscT * 1.3) * 8;
        const y = h / 2 + signal + noise;
        x === 0 ? octx.moveTo(x, y) : octx.lineTo(x, y);
      }
      octx.stroke();
      requestAnimationFrame(drawOsc);
    }
    drawOsc();

    // Показ фрагмента
    function showFragment(idx) {
      const f = fragments[idx];
      const el = document.getElementById('intf-fragment');
      // Анимируем помехи
      let renderCount = 0;
      const glitch = setInterval(() => {
        const noise = f.corrupted.split('').map(c =>
          Math.random() < 0.05 ? ['█','▓','░','▒'][Math.floor(Math.random()*4)] : c
        ).join('');
        el.textContent = renderCount < 4 ? noise : f.corrupted;
        renderCount++;
        if (renderCount >= 6) clearInterval(glitch);
      }, 80);

      document.getElementById('intf-input').value = '';
      document.getElementById('intf-input').focus();
    }

    function checkAnswer() {
      const input = document.getElementById('intf-input');
      const status = document.getElementById('intf-status');
      const val = input.value.trim().toLowerCase();
      const f = fragments[currentFragment];

      if (val === f.key) {
        status.textContent = '✓ расшифровано';
        status.style.color = 'rgba(100,180,120,0.8)';
        decoded.push(f.clean);

        // Сохраняем в движке
        if (window._vnEngine) {
          window._vnEngine.state.flags[`запись_${currentFragment + 1}_расшифрована`] = true;
        }

        // Зажигаем точку прогресса
        const dot = container.querySelector(`.intf-dot[data-i="${currentFragment}"]`);
        if (dot) dot.style.background = 'rgba(100,180,120,0.7)';

        currentFragment++;
        attempts = 0;

        if (currentFragment >= fragments.length) {
          // Всё расшифровано
          status.textContent = 'Запись полностью расшифрована.';
          if (window._vnEngine) window._vnEngine.state.flags['запись_полностью_расшифрована'] = true;
          setTimeout(() => {
            oscAnimating = false;
            window.dispatchEvent(new CustomEvent('vn:minigameEnd', { detail: { returnNode } }));
          }, 1800);
        } else {
          setTimeout(() => {
            status.textContent = '';
            showFragment(currentFragment);
          }, 900);
        }
      } else {
        attempts++;
        if (attempts >= 3) {
          // Подсказка — показываем первые буквы
          status.textContent = `Подсказка: «${f.key[0]}${f.key[1]}...»`;
        } else {
          status.textContent = '— сигнал не распознан —';
        }
        status.style.color = 'rgba(180,100,80,0.7)';
        input.style.borderColor = 'rgba(180,100,80,0.4)';
        setTimeout(() => { input.style.borderColor = 'rgba(200,192,176,0.2)'; }, 600);
      }
    }

    document.getElementById('intf-submit').addEventListener('click', checkAnswer);
    document.getElementById('intf-input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') checkAnswer();
    });

    // Клавиша Escape тоже работает
    container.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        oscAnimating = false;
        const target = skipNode || returnNode;
        window.dispatchEvent(new CustomEvent('vn:minigameEnd', { detail: { returnNode: target } }));
      }
    });

    // Кнопка пропуска — всегда видна
    const skipBtn = document.createElement('button');
    skipBtn.textContent = 'пропустить →';
    skipBtn.style.cssText = `
      position:absolute; bottom:1.5rem; right:2rem;
      font-family:'Share Tech Mono',monospace; font-size:clamp(0.5rem,0.75vw,0.65rem);
      letter-spacing:.15em; text-transform:uppercase; color:rgba(200,192,176,0.2);
      background:transparent; border:none; cursor:pointer;
      transition:color .3s; padding:.3em .5em;
    `;
    skipBtn.addEventListener('mouseenter', () => skipBtn.style.color = 'rgba(200,192,176,0.5)');
    skipBtn.addEventListener('mouseleave', () => skipBtn.style.color = 'rgba(200,192,176,0.2)');
    skipBtn.addEventListener('click', () => {
      oscAnimating = false;
      // Если есть skipNode — идём туда, иначе на returnNode
      const target = skipNode || returnNode;
      window.dispatchEvent(new CustomEvent('vn:minigameEnd', { detail: { returnNode: target } }));
    });
    container.style.position = 'relative';
    container.appendChild(skipBtn);

    showFragment(0);
  }
})();
