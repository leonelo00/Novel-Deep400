// Мини-игра «Навигация» — выбор маршрута на схеме объекта
(function() {
  let returnNode = null;

  window.addEventListener('vn:startMinigame', (e) => {
    if (e.detail.game !== 'navigation') return;
    returnNode = e.detail.returnNode;
    startNavigation();
  });

  async function startNavigation() {
    const layer = document.getElementById('minigame-layer');
    layer.innerHTML = '';
    layer.classList.remove('hidden');
    layer.style.background = 'rgba(2,2,6,0.92)';

    const routes = [
      { id: 'technical', label: 'Технический тоннель', flag: 'маршрут_технический', color: '#4a7a6a' },
      { id: 'sector_v',  label: 'Через сектор В',      flag: 'маршрут_сектор_в',   color: '#7a4a6a' },
      { id: 'main',      label: 'Главный коридор',      flag: 'маршрут_главный',     color: '#5a6a7a' },
    ];

    layer.innerHTML = `
      <div id="nav-wrap" style="
        display:flex; flex-direction:column; align-items:center;
        justify-content:center; height:100%; gap:1.4rem;
        font-family:'Share Tech Mono',monospace;
      ">
        <div style="font-size:clamp(0.7rem,1.2vw,0.9rem);letter-spacing:.3em;
          text-transform:uppercase;color:rgba(200,192,176,0.5);">
          НАВИГАЦИЯ <span style="color:rgba(200,192,176,0.25)">//</span> ОБЪЕКТ «ЛИТОРАЛЬ»
        </div>
        <div style="font-size:clamp(0.55rem,0.8vw,0.7rem);letter-spacing:.15em;
          color:rgba(200,192,176,0.25);margin-bottom:.2rem;">
          Выберите маршрут
        </div>

        <!-- Рамка карты — компактная, по центру -->
        <div id="nav-map-frame" style="
          width:min(640px,72vw); height:min(380px,42vh);
          position:relative; overflow:hidden;
          border:1px solid rgba(200,192,176,0.2);
          background:rgba(4,4,10,0.9);
          flex-shrink:0;
        ">
          <!-- SVG схема маршрутов поверх фото -->
          <img id="nav-bg-img" style="
            position:absolute;inset:0;width:100%;height:100%;
            object-fit:cover;opacity:0;transition:opacity .6s ease;
          " alt="">
          <img src="/assets/images/minigames/navigation_map.svg"
            style="position:absolute;inset:0;width:100%;height:100%;
            object-fit:contain;z-index:1;mix-blend-mode:screen;" alt="">
        </div>

        <!-- Кнопки маршрутов -->
        <div id="nav-options" style="display:flex;gap:1rem;flex-wrap:wrap;justify-content:center;"></div>

        <!-- Подтверждение -->
        <div id="nav-confirm" style="
          display:none;flex-direction:column;align-items:center;gap:.8rem;
        ">
          <div id="nav-confirm-label" style="
            font-size:clamp(0.6rem,0.9vw,0.75rem);letter-spacing:.15em;
            color:rgba(200,192,176,0.6);
          "></div>
          <div style="display:flex;gap:.8rem;">
            <button id="nav-btn-yes" style="
              font-family:'Share Tech Mono',monospace;font-size:clamp(0.55rem,0.8vw,0.7rem);
              padding:.5em 1.4em;background:transparent;
              border:1px solid rgba(200,192,176,0.4);color:rgba(200,192,176,0.8);
              cursor:pointer;letter-spacing:.15em;text-transform:uppercase;
              transition:all .2s;
            ">Подтвердить</button>
            <button id="nav-btn-no" style="
              font-family:'Share Tech Mono',monospace;font-size:clamp(0.55rem,0.8vw,0.7rem);
              padding:.5em 1.4em;background:transparent;
              border:1px solid rgba(200,192,176,0.15);color:rgba(200,192,176,0.4);
              cursor:pointer;letter-spacing:.15em;text-transform:uppercase;
              transition:all .2s;
            ">Назад</button>
          </div>
        </div>
      </div>
    `;

    // Загружаем фото в рамку карты
    const bgImg = document.getElementById('nav-bg-img');
    for (const ext of ['jpg','png','gif','webp']) {
      const src = `/assets/images/minigames/navigation_map.${ext}`;
      const ok = await new Promise(r => {
        const i = new Image();
        i.onload = () => r(true);
        i.onerror = () => r(false);
        i.src = src;
      });
      if (ok) { bgImg.src = src; bgImg.style.opacity = '0.6'; break; }
    }

    // Кнопки
    const optionsEl = document.getElementById('nav-options');
    let selected = null;

    routes.forEach(route => {
      const btn = document.createElement('button');
      btn.style.cssText = `
        font-family:'Share Tech Mono',monospace;font-size:clamp(0.55rem,0.85vw,0.72rem);
        padding:.55em 1.3em;background:transparent;
        border:1px solid ${route.color}55;color:${route.color}aa;
        cursor:pointer;letter-spacing:.12em;text-transform:uppercase;
        transition:all .2s;
      `;
      btn.textContent = route.label;

      btn.addEventListener('mouseenter', () => {
        btn.style.borderColor = route.color;
        btn.style.color = route.color;
        btn.style.background = route.color + '11';
      });
      btn.addEventListener('mouseleave', () => {
        if (selected?.id !== route.id) {
          btn.style.borderColor = route.color + '55';
          btn.style.color = route.color + 'aa';
          btn.style.background = 'transparent';
        }
      });

      btn.addEventListener('click', () => {
        selected = route;
        optionsEl.querySelectorAll('button').forEach(b => {
          b.style.borderColor = '';
          b.style.color = '';
          b.style.background = 'transparent';
        });
        btn.style.borderColor = route.color;
        btn.style.color = route.color;
        btn.style.background = route.color + '18';

        const confirm = document.getElementById('nav-confirm');
        document.getElementById('nav-confirm-label').textContent = `→ ${route.label}`;
        confirm.style.display = 'flex';
      });

      optionsEl.appendChild(btn);
    });

    document.getElementById('nav-btn-yes').addEventListener('click', () => {
      if (!selected) return;
      if (window._vnEngine) {
        window._vnEngine.state.flags[selected.flag] = true;
        window._vnEngine.state.variables['маршрут_пролога'] = selected.id;
      }
      const wrap = document.getElementById('nav-wrap');
      wrap.style.transition = 'opacity .8s ease';
      wrap.style.opacity = '0';
      setTimeout(() => {
        layer.style.background = '';
        window.dispatchEvent(new CustomEvent('vn:minigameEnd', { detail: { returnNode } }));
      }, 900);
    });

    document.getElementById('nav-btn-no').addEventListener('click', () => {
      selected = null;
      document.getElementById('nav-confirm').style.display = 'none';
      optionsEl.querySelectorAll('button').forEach(b => {
        b.style.borderColor = '';
        b.style.color = '';
        b.style.background = 'transparent';
      });
    });
  }
})();
