document.addEventListener('DOMContentLoaded', () => {

  // ══════════════════════════════════════════════════════════
  //  MENU SYSTEM — единственный, без дублей
  // ══════════════════════════════════════════════════════════

  const MS = {
    _overlay() { return document.getElementById('menu-overlay'); },
    _content() { return document.getElementById('menu-content-inner'); },

    close() { this._overlay().classList.add('hidden'); },

    open(type, engine) {
      this._overlay().classList.remove('hidden');
      const title = type === 'save' ? 'сохранение' : 'загрузка';
      this._content().innerHTML = `
        <h2>${title}</h2>
        <button class="menu-close" onclick="window._menuSystem.close()">✕</button>
        <div class="menu-body"><div class="save-slots"></div></div>
      `;
      const slots = this._content().querySelector('.save-slots');
      const saves = engine.getAllSaves();
      for (let i = 0; i < 6; i++) {
        const save = saves[i];
        const slot = document.createElement('div');
        slot.className = `save-slot ${save ? 'filled' : 'empty'}`;
        if (save) {
          const date = new Date(save.timestamp);
          const dateStr = date.toLocaleString('ru', {day:'2-digit',month:'2-digit',year:'2-digit',hour:'2-digit',minute:'2-digit'});
          const sceneLabel = {'prologue':'Пролог','act1':'Акт 1','act2':'Акт 2','act3':'Акт 3'};
          slot.innerHTML = `
            <span class="slot-num">0${i+1}</span>
            <span class="slot-info">
              <span class="slot-chapter">${sceneLabel[save.state?.currentScene?.id] || save.state?.currentScene?.id || 'Пролог'}</span>
              ${save.preview?.text || '—'}
              <small>${dateStr}</small>
            </span>`;
        } else {
          slot.innerHTML = `<span class="slot-num">0${i+1}</span><span class="slot-info">— пусто —</span>`;
        }
        slot.addEventListener('click', () => {
          if (type === 'save') engine.save(i);
          else if (save) engine.load(i);
          this.close();
        });
        slots.appendChild(slot);
      }
    },

    openHistory(history) {
      this._overlay().classList.remove('hidden');
      this._content().innerHTML = `
        <h2>журнал</h2>
        <button class="menu-close" onclick="window._menuSystem.close()">✕</button>
        <div class="menu-body"><div class="history-list"></div></div>
      `;
      const list = this._content().querySelector('.history-list');
      [...history].reverse().filter(node => node.text && node.text.trim() && !['auto','minigame','choice'].includes(node.type)).forEach(node => {
        const el = document.createElement('div');
        el.className = 'history-entry';
        const charName = node.character || node.speaker || null;
        el.innerHTML = charName
          ? `<span class="h-char">${charName}</span><span class="h-text">${node.text}</span>`
          : `<span class="h-narr">${node.text}</span>`;
        list.appendChild(el);
      });
    },

    openSettings(engine) {
      this._overlay().classList.remove('hidden');
      this._content().innerHTML = `
        <h2>настройки</h2>
        <button class="menu-close" onclick="window._menuSystem.close()">✕</button>
        <div class="menu-body">
          <div class="settings-group">
            <label>скорость текста — <span id="speed-label">${engine.textSpeed === 0 ? 'мгновенно' : engine.textSpeed + 'мс'}</span></label>
            <input type="range" min="0" max="80" step="5" value="${engine.textSpeed}" id="set-speed">
          </div>
          <div class="settings-group">
            <label>громкость музыки</label>
            <input type="range" min="0" max="1" step="0.05" value="${AudioManager.bgmVolume}" id="set-bgm">
          </div>
          <div class="settings-group">
            <label>громкость звуков</label>
            <input type="range" min="0" max="1" step="0.05" value="${AudioManager.sfxVolume}" id="set-sfx">
          </div>
        </div>
      `;
      document.getElementById('set-bgm').addEventListener('input', e => AudioManager.setVolume(+e.target.value));
      document.getElementById('set-sfx').addEventListener('input', e => AudioManager.setSfxVolume(+e.target.value));
      document.getElementById('set-speed').addEventListener('input', e => {
        engine.setTextSpeed(+e.target.value);
        document.getElementById('speed-label').textContent = +e.target.value === 0 ? 'мгновенно' : `${e.target.value}мс`;
      });
    },

    openPause(engine) {
      this._overlay().classList.remove('hidden');
      this._content().innerHTML = `
        <h2>пауза</h2>
        <button class="menu-close" onclick="window._menuSystem.close()">✕</button>
        <div class="menu-body">
          <button class="overlay-btn" onclick="window._menuSystem.close()">▶ продолжить</button>
          <button class="overlay-btn" onclick="window._menuSystem.open('save', window._vnEngine)">сохранить игру</button>
          <button class="overlay-btn" onclick="window._menuSystem.open('load', window._vnEngine)">загрузить игру</button>
          <button class="overlay-btn" onclick="window._menuSystem.openSettings(window._vnEngine)">настройки</button>
          <button class="overlay-btn danger" onclick="window.goToMainMenu()">вернуться в меню</button>
        </div>
      `;
    },
  };

  // Делаем доступным глобально для движка и inline-onclick
  window._menuSystem = MS;

  // ══════════════════════════════════════════════════════════
  //  ENGINE
  // ══════════════════════════════════════════════════════════

  const engine = new VNEngine();
  window._vnEngine = engine;

  // Состояние кнопки «Продолжить»
  const updateContinue = () => {
    const hasSaves = Object.keys(engine.getAllSaves()).length > 0;
    document.getElementById('btn-continue').disabled = !hasSaves;
  };
  updateContinue();

  // ══════════════════════════════════════════════════════════
  //  КНОПКИ ГЛАВНОГО МЕНЮ
  // ══════════════════════════════════════════════════════════

  document.getElementById('menu-content').addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;

    switch (btn.id) {
      case 'btn-new-game':
        startGame('prologue');
        break;

      case 'btn-continue': {
        const saves = engine.getAllSaves();
        const latest = Object.entries(saves)
          .sort((a, b) => b[1].timestamp - a[1].timestamp)[0];
        if (latest) engine.load(+latest[0]);
        break;
      }

      case 'btn-load-menu':
        MS.open('load', engine);
        break;

      case 'btn-settings-menu':
        MS.openSettings(engine);
        break;

    }
  });

  // Закрыть оверлей кликом по фону
  document.getElementById('menu-overlay').addEventListener('click', (e) => {
    if (e.target.id === 'menu-overlay') MS.close();
  });

  // ══════════════════════════════════════════════════════════
  //  ПЕРЕХОДЫ
  // ══════════════════════════════════════════════════════════

  function transition(cb) {
    const t = document.getElementById('scene-transition');
    t.classList.add('active');
    setTimeout(() => { cb(); setTimeout(() => t.classList.remove('active'), 50); }, 500);
  }

  async function startGame(sceneId) {
    transition(async () => {
      document.getElementById('main-menu').classList.add('hidden');
      document.getElementById('game-screen').classList.remove('hidden');
      // Сначала экран главы, потом загрузка сцены
      await ChapterScreen.show('Пролог', 'Четыреста метров тишины', 2600);
      LoadingScreen.show();
      await engine.loadScene(sceneId);
      LoadingScreen.hide();
    });
  }

  window.goToMainMenu = function() {
    MS.close();
    transition(() => {
      // Сбрасываем dirty-состояние от экрана концовки
      const dlg = document.getElementById('dialogue-box');
      const nameWrap = document.getElementById('char-name-wrap');
      const minigameLayer = document.getElementById('minigame-layer');
      const gameScreen = document.getElementById('game-screen');
      if (dlg) dlg.style.display = '';
      if (nameWrap) nameWrap.style.display = '';
      if (minigameLayer) { minigameLayer.classList.add('hidden'); minigameLayer.innerHTML = ''; }
      if (gameScreen) gameScreen.style.background = '';
      gameScreen.classList.add('hidden');
      document.getElementById('main-menu').classList.remove('hidden');
      AudioManager.stop();
      updateContinue();
    });
  };

  // ══════════════════════════════════════════════════════════
  //  МИНИ-ИГРЫ
  // ══════════════════════════════════════════════════════════

  window.addEventListener('vn:minigameEnd', (e) => {
    const layer = document.getElementById('minigame-layer');
    layer.classList.add('hidden');
    layer.innerHTML = '';
    // Восстанавливаем диалоговый бокс и тулбар
    const dlg = document.getElementById('dialogue-box');
    const toolbar = document.getElementById('game-toolbar');
    if (dlg) dlg.style.display = '';
    if (toolbar) toolbar.style.display = '';
    if (e.detail?.returnNode) {
      engine.loadScene(engine.state.currentScene.id, e.detail.returnNode);
    }
  });

});
