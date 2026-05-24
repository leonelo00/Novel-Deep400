// ============================================================
//  ГЛУБИНА 400 — Движок новеллы
// ============================================================

class VNEngine {
  constructor() {
    this.state = {
      currentScene: null,
      currentNode: null,
      variables: {},
      history: [],
      flags: {},
    };
    this.saves       = this._loadAllSaves();
    this.isAuto      = false;
    this.autoTimer   = null;
    this.textSpeed   = parseInt(localStorage.getItem('vn_textSpeed') ?? '30');
    this.isTyping      = false;
    this.skipTyping    = false;
    this.isTransitioning = false; // блокировка во время ChapterScreen и переходов
    // Восстанавливаем громкость
    const savedVol = parseFloat(localStorage.getItem('vn_bgmVol') ?? '0.5');
    AudioManager.bgmVolume = savedVol;
    const savedSfx = parseFloat(localStorage.getItem('vn_sfxVol') ?? '0.8');
    AudioManager.sfxVolume = savedSfx;

    // Биндим UI только внутри игрового экрана
    this._bindGameUI();
  }

  // ─── ЗАГРУЗКА СЦЕНЫ ────────────────────────────────────────

  async loadScene(sceneId, nodeId = null) {
    // Сбрасываем game over / ending экран если он был
    const ml = document.getElementById('minigame-layer');
    if (ml) { ml.classList.add('hidden'); ml.innerHTML = ''; }
    const dlg = document.getElementById('dialogue-box');
    const toolbar = document.getElementById('game-toolbar');
    if (dlg) dlg.style.display = '';
    if (toolbar) toolbar.style.display = '';
    try {
      const res = await fetch(`/api/scene/${sceneId}`);
      if (!res.ok) throw new Error('Scene not found: ' + sceneId);
      const scene = await res.json();

      this.state.currentScene = scene;
      this.state.currentNode  = nodeId
        ? scene.nodes.find(n => n.id === nodeId)
        : scene.nodes[0];

      await this._applyBackground(scene.background);
      if (scene.music) AudioManager.play(scene.music);
      this._processNode(this.state.currentNode);
    } catch (e) {
      console.error('[VNEngine] loadScene error:', e);
    }
  }

  // ─── ОБРАБОТКА УЗЛА ────────────────────────────────────────

  _processNode(node) {
    if (!node) return this._endScene();

    // Нормализуем поле персонажа (поддержка 'speaker' и 'character')
    if (!node.character && node.speaker) node.character = node.speaker;

    this.state.history.push({ ...node });
    if (this.state.history.length > 300) this.state.history.shift();

    // Смена фона / музыки / sfx внутри узла
    if (node.bg_change) this._applyBackground(node.bg_change);
    if (node.background) this._applyBackground(node.background);
    if (node.music) AudioManager.play(node.music);
    if (node.sfx) AudioManager.sfx(node.sfx);

    // Применяем флаги и переменные
    if (node.setFlag) this.state.flags[node.setFlag] = true;
    if (node.setVar)  this.state.variables[node.setVar.key] = node.setVar.value;
    if (node.addVar)  this.state.variables[node.addVar.key] = (this.state.variables[node.addVar.key] || 0) + node.addVar.value;

    // Скрываем выборы
    document.getElementById('choices-container')?.classList.add('hidden');

    switch (node.type) {
      case 'narration':
        this._showText(null, node.text, null, () => this._onTextDone(node));
        break;
      case 'dialogue': {
        // Воспроизводим голос если файл существует
        const char = (node.character || node.speaker || '').toLowerCase().trim();
        const charMap = {
          'алекс':'alex','alex':'alex','арис':'aris','aris':'aris',
          'лена':'lena','михаил':'mikhail','власов':'vlasov',
          'горбатова':'gorbatova','скляров':'sklyarov',
          'ермолов':'ermolov','соболев':'sobolev'
        };
        const charEn = charMap[char] || char.replace(/\s+/g,'_');
        if (charEn && node.id) {
          AudioManager.voice(`${charEn}_${node.id}`);
        }
        this._showText(node.character, node.text, node.expression, () => this._onTextDone(node));
        break;
      }
      case 'choice':
        this._showText(null, node.text, null, () => {});
        this._showChoices(node.choices);
        break;
      case 'minigame':
        this._launchMinigame(node.game, node.next, node.skipNode);
        break;
      case 'auto':
        // Автоматический переход без показа текста
        this._advance(node);
        break;
      default:
        this._advance(node);
    }
  }

  _onTextDone(node) {
    if (this.isAuto) {
      this.autoTimer = setTimeout(() => this._advance(node), 1800);
    }
  }

  _advance(node) {
    if (this.autoTimer) { clearTimeout(this.autoTimer); this.autoTimer = null; }
    AudioManager.stopVoice();
    if (!node) { this._endScene(); return; }

    let nextId = node.next;
    if (node.conditionalNext) {
      const cn = node.conditionalNext;
      if (cn.flag && this.state.flags[cn.flag]) nextId = cn.true;
      if (cn.var !== undefined) {
        const val = this.state.variables[cn.var] || 0;
        if (cn.equals !== undefined && val === cn.equals) nextId = cn.true;
        if (cn.gte !== undefined && val >= cn.gte) nextId = cn.true;
      }
    }

    if (nextId) {
      const next = this.state.currentScene.nodes.find(n => n.id === nextId);
      this.state.currentNode = next;
      this._processNode(next);
    } else if (node.nextScene) {
      this._transitionToScene(node.nextScene, node.chapterTitle);
    } else {
      // Проверяем — это концовка или просто конец главы?
      const endingData = this._getEndingData(node.id);
      if (endingData) {
        this._showEndingScreen(endingData);
      } else {
        this._endScene();
      }
    }
  }

  _handleChoice(choice) {
    if (choice.setFlag) this.state.flags[choice.setFlag] = true;
    if (choice.setVar)  this.state.variables[choice.setVar.key] = choice.setVar.value;
    if (choice.addVar)  this.state.variables[choice.addVar.key] = (this.state.variables[choice.addVar.key] || 0) + choice.addVar.value;

    const next = this.state.currentScene.nodes.find(n => n.id === choice.next);
    this.state.currentNode = next;
    this._processNode(next);
  }


  async _showEndingScreen(data) {
    // Скрываем диалоговый блок и спрайты
    const dlg = document.getElementById('dialogue-box');
    const sprite = document.getElementById('char-sprite');
    if (dlg) dlg.style.display = 'none';
    if (sprite) sprite.classList.add('hidden');

    // Фон — чёрный
    const bg = document.getElementById('game-background');
    if (bg) bg.style.backgroundImage = '';
    if (typeof FallbackBG !== 'undefined') FallbackBG.hide();
    document.getElementById('game-screen').style.background = '#080808';

    // Генерируем случайный «шум» газеты через CSS
    const layer = document.getElementById('minigame-layer');
    layer.classList.remove('hidden');
    layer.innerHTML = '';

    // Текст концовки разбиваем на параграфы
    const paragraphs = data.body.split('\n').filter(l => l.trim());

    // Загружаем фоновое изображение концовки
    if (data.bg) {
      const bgEl = document.getElementById('game-background');
      const tryExts = ['jpg','png','svg','placeholder.svg'];
      let loaded = false;
      for (const ext of tryExts) {
        const src = `/assets/images/bg/${data.bg}.${ext}`;
        const ok = await new Promise(r => { const i = new Image(); i.onload = () => r(true); i.onerror = () => r(false); i.src = src; });
        if (ok) { bgEl.style.backgroundImage = `url(${src})`; bgEl.style.backgroundSize = 'cover'; bgEl.style.backgroundPosition = 'center'; loaded = true; break; }
      }
      if (!loaded) FallbackBG?.show();
    }

    layer.innerHTML = `
      <div id="ending-newspaper">
        <div id="ending-paper-grain"></div>
        <div id="ending-content">
          <div id="ending-meta">${data.sub}</div>
          <h1 id="ending-title">${data.title}</h1>
          ${data.desc ? `<div id="ending-desc">${data.desc}</div>` : ''}
          <div id="ending-rule"></div>
          <div id="ending-columns">
            <div id="ending-text">
              ${paragraphs.map(p => `<p>${p}</p>`).join('')}
            </div>
            <div id="ending-photo-col">
              <div id="ending-photo">
                <canvas id="ending-photo-canvas" width="280" height="210"></canvas>
                <div id="ending-photo-caption">Объект «Литораль» · −400 м · 2031</div>
              </div>
            </div>
          </div>
          <div id="ending-rule-bottom"></div>
          <div id="ending-actions">
            <button class="ending-btn" onclick="
              document.getElementById('dialogue-box').style.display='';
              window.goToMainMenu();
            ">Выйти в меню</button>
            <button class="ending-btn" onclick="
              document.getElementById('dialogue-box').style.display='';
              document.getElementById('minigame-layer').classList.add('hidden');
              window._menuSystem?.open('load', window._vnEngine);
            ">Загрузить</button>
          </div>
        </div>
      </div>
    `;

    // Рисуем процедурное «фото» — схема объекта в ч/б
    const canvas = document.getElementById('ending-photo-canvas');
    if (canvas) this._drawEndingPhoto(canvas, data.title);

    // Анимация появления
    requestAnimationFrame(() => {
      const paper = document.getElementById('ending-newspaper');
      if (paper) { paper.style.opacity = '0'; paper.style.transition = 'opacity 1.8s ease'; }
      requestAnimationFrame(() => { if (paper) paper.style.opacity = '1'; });
    });
  }

  _drawEndingPhoto(canvas, title) {
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;

    // Фон — зернистый серый
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, W, H);

    // Зерно
    for (let i = 0; i < 8000; i++) {
      const x = Math.random() * W;
      const y = Math.random() * H;
      const v = Math.floor(Math.random() * 60 + 10);
      ctx.fillStyle = `rgba(${v},${v},${v},${Math.random() * 0.4 + 0.1})`;
      ctx.fillRect(x, y, 1, 1);
    }

    // Рисуем разные сцены в зависимости от концовки
    ctx.strokeStyle = 'rgba(200,200,200,0.25)';
    ctx.lineWidth = 1;

    if (title.includes('ПЛАМЯ') || title.includes('ПЕПЕЛ')) {
      // Огонь / взрыв — радиальные линии
      const cx = W * .5, cy = H * .45;
      for (let a = 0; a < Math.PI * 2; a += 0.18) {
        const r = 20 + Math.random() * 50;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a)*8, cy + Math.sin(a)*8);
        ctx.lineTo(cx + Math.cos(a)*r, cy + Math.sin(a)*r);
        ctx.stroke();
      }
    } else if (title.includes('БЕЗУМИЕ') || title.includes('НАДСМ')) {
      // Решётка
      for (let x = 30; x < W; x += 28) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
      }
      for (let y = 30; y < H; y += 28) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
      }
      // Фигура за решёткой
      ctx.fillStyle = 'rgba(120,120,120,0.15)';
      ctx.beginPath(); ctx.arc(W*.5, H*.42, 40, 0, Math.PI*2); ctx.fill();
    } else {
      // Коридор с перспективой
      const cx = W * .5, vy = H * .38;
      const corners = [[0,0],[W,0],[W,H],[0,H]];
      corners.forEach(([px, py]) => {
        ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(cx, vy); ctx.stroke();
      });
      [[W*.2,0],[W*.8,0],[W*.8,H],[W*.2,H]].forEach(([px,py]) => {
        ctx.beginPath(); ctx.moveTo(px,py); ctx.lineTo(cx,vy); ctx.stroke();
      });
      // Человек в конце
      ctx.fillStyle = 'rgba(150,150,150,0.2)';
      ctx.beginPath(); ctx.arc(cx, vy+8, 7, 0, Math.PI*2); ctx.fill();
      ctx.fillRect(cx-4, vy+15, 8, 16);
    }

    // Виньетка поверх
    const vig = ctx.createRadialGradient(W*.5,H*.5,H*.1,W*.5,H*.5,H*.7);
    vig.addColorStop(0, 'transparent');
    vig.addColorStop(1, 'rgba(0,0,0,0.7)');
    ctx.fillStyle = vig;
    ctx.fillRect(0,0,W,H);
  }

  _isMinigameActive() {
    const layer = document.getElementById('minigame-layer');
    return layer && !layer.classList.contains('hidden');
  }

  _getEndingData(nodeId) {

const ENDING_DATA = {
  'a2_end_pepel_11':    { title: 'ПЕПЕЛ',            sub: 'Объект «Литораль» · Акт II',  bg: 'ending_pepel',
    desc: 'Тупиковая концовка. Алекс не сделал выбор вовремя — и выбор сделали за него.',
    body: 'То, что сожжено — не вернуть.\nНо пепел помнит форму огня.\n\nАлекс Громов не вышел из объекта в ту ночь. Официальная версия: несчастный случай при исполнении служебных обязанностей. Дело закрыто.' },

  'a2_end_protocol_11': { title: 'ПРОТОКОЛ',         sub: 'Объект «Литораль» · Акт II',  bg: 'ending_protocol',
    desc: 'Тупиковая концовка. Система поглотила Алекса прежде, чем он успел её понять.',
    body: 'Система не ломает тебя.\nОна делает тебя своей частью.\nИ ты перестаёшь замечать разницу.\n\nГромов приступил к новым обязанностям 14 апреля 2031 года. Показания: не противоречат официальной версии.' },

  'a2_end_sloi_10':     { title: 'СЛОИ',             sub: 'Объект «Литораль» · Акт II',  bg: 'ending_sloi',
    desc: 'Тупиковая концовка. Глубина оказалась многослойнее, чем Алекс был готов принять.',
    body: 'Ты не разгадал глубину.\nНо глубина запомнила тебя.\n\nСекретный объект продолжает работу. Алекс Громов числится в отпуске. Связи с внешним миром — нет.' },

  'a3_end1_end':        { title: 'ОЧИЩАЮЩЕЕ ПЛАМЯ', sub: 'Глубина 400 · Концовка I',    bg: 'ending_1_plamya',
    desc: 'Объект уничтожен. Правда — сожжена вместе с ним. Единственный выход, который никого не спасает.',
    body: 'Некоторые глубины — не в земле.\n\nОбъект «Литораль» уничтожен в 04:17. Жертв нет. Выживших — трое. Документация — ноль.' },

  'a3_end2_end':        { title: 'ЦЕНА ПРАВДЫ',      sub: 'Глубина 400 · Концовка II',   bg: 'ending_2_pravda',
    desc: 'Материалы преданы огласке. Мир узнает. Но Алекс уже не уверен, что это изменит что-либо.',
    body: 'Это как пытаться замолчать пожар руками.\nМожно какое-то время. Потом — нет.\n\nНебо было синим. Именно синим.\n\nМатериалы переданы в редакцию. Публикация — через 72 часа. Громов ждёт.' },

  'a3_end3_end':        { title: 'НАДСМОТРЩИК',      sub: 'Глубина 400 · Концовка III',  bg: 'ending_3_nadsm',
    desc: 'Алекс принял систему. Теперь он — её часть. Худшая концовка, которая ощущается как победа.',
    body: 'Жалость потребляет ресурс.\nЯ избавился.\n\nИли почти. Или — пока.\n\nПроект «Литораль» входит в следующую фазу. Новый куратор — Громов А.В. Допуск: абсолютный.' },

  'a3_end4_end':        { title: 'ОБЪЕКТ №403',      sub: 'Глубина 400 · Концовка IV',   bg: 'ending_4_ob403',
    desc: 'Субъект вывезен. Алекс сохранил чужую жизнь ценой собственной свободы. Вопрос — чьей.',
    body: 'Разница в температуре транспортировки.\n\nОн это помнил. Скляров успел. Это что-то значило.\n\nПока — достаточно.\n\nСубъект №403 доставлен в нейтральную зону. Идентификация не установлена.' },

  'a3_end5_end':        { title: 'ТИХОЕ ТЕЧЕНИЕ',    sub: 'Глубина 400 · Концовка V',    bg: 'ending_5_techenie',
    desc: 'Контакт установлен. Алекс первый, кто выбрал слушать — а не уничтожать.',
    body: 'Некоторые глубины — не в земле.\nНекоторые выходы — не через тоннель.\n\nСлушаю.\n\nКонтакт установлен. Первый полноценный сеанс — 48 часов. Отчёт засекречен.' },

  'a3_end6_end':        { title: 'БЕЗУМИЕ',          sub: 'Глубина 400 · Концовка VI',   bg: 'ending_6_bezumie',
    desc: 'Стадия три. Граница между Алексом и объектом исследования окончательно стёрта.',
    body: 'Субъект Громов. Стадия три.\n\nОн улыбается. За окном которого нет — идёт снег.\n\nНекоторые глубины не в земле. Некоторые — внутри.\n\nГлавное что — осталось. Держусь.' },
};

    return ENDING_DATA[nodeId] || null;
  }

  _endScene() {
    // Показываем экран завершения главы / концовки
    const textEl = document.getElementById('dialogue-text');
    const nameWrap = document.getElementById('char-name-wrap');
    const sprite = document.getElementById('char-sprite');
    if (nameWrap) nameWrap.style.display = 'none';
    if (sprite) sprite.classList.add('hidden');
    if (textEl) textEl.textContent = '';

    const layer = document.getElementById('minigame-layer');
    if (!layer) return;
    layer.classList.remove('hidden');
    layer.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;
        height:100%;gap:2rem;font-family:'Share Tech Mono',monospace;">
        <div style="font-size:clamp(0.6rem,1vw,0.8rem);letter-spacing:.4em;
          color:rgba(200,192,176,0.3);text-transform:uppercase;">конец главы</div>
        <div style="width:120px;height:1px;background:rgba(200,192,176,0.15);"></div>
        <div style="display:flex;gap:1.5rem;margin-top:1rem;">
          <button onclick="window.goToMainMenu()" style="
            font-family:'Share Tech Mono',monospace;font-size:clamp(0.6rem,0.9vw,0.75rem);
            padding:.6em 1.4em;background:transparent;
            border:1px solid rgba(200,192,176,0.2);color:rgba(200,192,176,0.5);
            cursor:pointer;letter-spacing:.15em;text-transform:uppercase;
            transition:all .2s;" onmouseenter="this.style.color='rgba(200,192,176,0.9)';this.style.borderColor='rgba(200,192,176,0.5)'"
            onmouseleave="this.style.color='rgba(200,192,176,0.5)';this.style.borderColor='rgba(200,192,176,0.2)'">
            В меню
          </button>
          <button onclick="window._menuSystem?.open('load',window._vnEngine)" style="
            font-family:'Share Tech Mono',monospace;font-size:clamp(0.6rem,0.9vw,0.75rem);
            padding:.6em 1.4em;background:transparent;
            border:1px solid rgba(200,192,176,0.2);color:rgba(200,192,176,0.5);
            cursor:pointer;letter-spacing:.15em;text-transform:uppercase;
            transition:all .2s;" onmouseenter="this.style.color='rgba(200,192,176,0.9)';this.style.borderColor='rgba(200,192,176,0.5)'"
            onmouseleave="this.style.color='rgba(200,192,176,0.5)';this.style.borderColor='rgba(200,192,176,0.2)'">
            Загрузить
          </button>
        </div>
      </div>`;
  }

  async _transitionToScene(sceneId, chapterTitle) {
    this.isTransitioning = true;
    if (chapterTitle) {
      await ChapterScreen.show(chapterTitle.label, chapterTitle.title);
    }
    await this.loadScene(sceneId);
    this.isTransitioning = false;
  }

  // ─── ОТОБРАЖЕНИЕ ТЕКСТА ─────────────────────────────────────

  _showText(character, text, expression, onDone) {
    const box     = document.getElementById('dialogue-box');
    const nameEl  = document.getElementById('char-name');
    const nameWrap= document.getElementById('char-name-wrap');
    const textEl  = document.getElementById('dialogue-text');
    const sprite  = document.getElementById('char-sprite');
    const advance = document.getElementById('dialogue-advance');

    box.classList.remove('hidden');
    advance?.classList.remove('visible');

    if (character) {
      nameEl.textContent = character;
      nameWrap.style.display = 'block';
    } else {
      nameWrap.style.display = 'none';
    }

    // Если expression не задан — подставляем дефолтный neutral по имени персонажа
    if (!expression && character) {
      const defaultExpressions = {
        'алекс':     'alex/neutral',
        'лена':      'lena/neutral',
        'власов':    'vlasov/neutral',
        'арис':      'aris/neutral',
        'михаил':    'mikhail/neutral',
        'горбатова': 'gorbatova/neutral',
        'скляров':   'sklyarov/neutral',
        'соболев':   'sobolev/neutral',
        'ермолов':   'ermolov/neutral',
      };
      expression = defaultExpressions[character.toLowerCase().trim()] || null;
    }

    if (expression && sprite) {
      this._loadSprite(sprite, expression);
      sprite.classList.remove('hidden');
    } else if (sprite) {
      sprite.src = '';
      sprite.classList.add('hidden');
    }

    this._typeText(textEl, text, onDone);
  }

  _loadSprite(sprite, expression) {
    const exts = ['png', 'jpg', 'svg'];
    let idx = 0;
    const tryNext = () => {
      if (idx < exts.length) {
        sprite.src = `/assets/images/sprites/${expression}.${exts[idx++]}`;
      } else {
        // Пробуем SVG-заглушку напрямую (если expression = char/pose, файл уже там)
        sprite.onerror = null;
        sprite.classList.add('hidden');
      }
    };
    sprite.onerror = tryNext;
    tryNext();
  }

  _typeText(el, text, onDone) {
    if (this._typingTimer) clearInterval(this._typingTimer);
    el.textContent = '';

    if (this.textSpeed === 0) {
      el.textContent = text;
      document.getElementById('dialogue-advance')?.classList.add('visible');
      onDone?.();
      return;
    }

    this.isTyping   = true;
    this.skipTyping = false;
    let i = 0;

    this._typingTimer = setInterval(() => {
      if (this.skipTyping) {
        clearInterval(this._typingTimer);
        el.textContent = text;
        this.isTyping   = false;
        this.skipTyping = false;
        document.getElementById('dialogue-advance')?.classList.add('visible');
        onDone?.();
        return;
      }
      el.textContent += text[i];
      i++;
      if (i >= text.length) {
        clearInterval(this._typingTimer);
        this.isTyping = false;
        document.getElementById('dialogue-advance')?.classList.add('visible');
        onDone?.();
      }
    }, this.textSpeed);
  }

  _showChoices(choices) {
    const container = document.getElementById('choices-container');
    container.innerHTML = '';
    container.classList.remove('hidden');

    choices.forEach((choice, idx) => {
      const btn = document.createElement('button');
      btn.className = 'choice-btn';
      btn.textContent = choice.text;
      btn.style.animationDelay = `${idx * 80}ms`;
      btn.addEventListener('click', () => {
        container.classList.add('hidden');
        this._handleChoice(choice);
      });
      container.appendChild(btn);
    });
  }

  // ─── ФОНЫ ──────────────────────────────────────────────────

  async _applyBackground(bgName) {
    if (!bgName) return;
    const bg = document.getElementById('game-background');

    if (bgName.startsWith('video:')) {
      const name = bgName.replace('video:', '');
      let video = document.getElementById('bg-video');
      if (!video) {
        video = document.createElement('video');
        video.id = 'bg-video'; video.autoplay = true;
        video.loop = true; video.muted = true;
        video.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:0';
        bg.parentElement.insertBefore(video, bg);
      }
      video.src = `/assets/video/${name}.mp4`;
      video.play().catch(() => {});
      bg.style.backgroundImage = '';
      FallbackBG.hide();
      return;
    }

    const old = document.getElementById('bg-video');
    if (old) old.remove();

    // Если чёрный фон — показываем процедурный коридор
    if (bgName === 'black') {
      bg.style.backgroundImage = '';
      FallbackBG.show();
      return;
    }

    for (const ext of ['jpg', 'png', 'gif', 'svg']) {
      const src = `/assets/images/bg/${bgName}.${ext}`;
      const ok = await new Promise(r => {
        const img = new Image();
        img.onload = () => r(true);
        img.onerror = () => r(false);
        img.src = src;
      });
      if (ok) {
        bg.style.backgroundImage = `url(${src})`;
        FallbackBG.hide();
        return;
      }
    }

    // Пробуем SVG-заглушку
    const placeholderSrc = `/assets/images/bg/${bgName}.placeholder.svg`;
    const placeholderOk = await new Promise(r => {
      const img = new Image();
      img.onload = () => r(true);
      img.onerror = () => r(false);
      img.src = placeholderSrc;
    });
    if (placeholderOk) {
      bg.style.backgroundImage = `url(${placeholderSrc})`;
      FallbackBG.hide();
      return;
    }

    // Ничего не нашли — процедурный коридор
    bg.style.backgroundImage = '';
    FallbackBG.show();
  }

  // ─── МИНИ-ИГРЫ ─────────────────────────────────────────────

  _launchMinigame(gameName, returnNode, skipNode) {
    document.getElementById('minigame-layer').classList.remove('hidden');
    // Скрываем диалоговый бокс и тулбар во время мини-игры
    const dlg = document.getElementById('dialogue-box');
    const toolbar = document.getElementById('game-toolbar');
    if (dlg) dlg.style.display = 'none';
    if (toolbar) toolbar.style.display = 'none';
    window.dispatchEvent(new CustomEvent('vn:startMinigame', {
      detail: { game: gameName, returnNode, skipNode }
    }));
  }

  // ─── СОХРАНЕНИЯ ────────────────────────────────────────────

  save(slot = 0) {
    const data = {
      state:     JSON.parse(JSON.stringify(this.state)),
      timestamp: Date.now(),
      preview:   { text: (this.state.currentNode?.text || '').slice(0, 60) + '...' }
    };
    const saves = this._loadAllSaves();
    saves[slot] = data;
    localStorage.setItem('vn_saves', JSON.stringify(saves));
    this._notify(`Сохранено в слот ${slot + 1}`);
  }

  load(slot = 0) {
    const saves = this._loadAllSaves();
    const data  = saves[slot];
    if (!data) return this._notify('Слот пуст');

    this.state = data.state;

    const gameScreen = document.getElementById('game-screen');
    const mainMenu   = document.getElementById('main-menu');
    const transition = document.getElementById('scene-transition');

    if (gameScreen.classList.contains('hidden')) {
      transition.classList.add('active');
      setTimeout(() => {
        mainMenu.classList.add('hidden');
        gameScreen.classList.remove('hidden');
        this.loadScene(this.state.currentScene.id, this.state.currentNode?.id);
        setTimeout(() => transition.classList.remove('active'), 50);
      }, 400);
    } else {
      this.loadScene(this.state.currentScene.id, this.state.currentNode?.id);
    }
    this._notify(`Загружено из слота ${slot + 1}`);
  }

  _loadAllSaves() {
    try { return JSON.parse(localStorage.getItem('vn_saves')) || {}; }
    catch { return {}; }
  }

  getAllSaves() { return this._loadAllSaves(); }

  // ─── НАСТРОЙКИ ─────────────────────────────────────────────

  setTextSpeed(v) {
    this.textSpeed = v;
    localStorage.setItem('vn_textSpeed', v);
  }

  toggleAuto() {
    this.isAuto = !this.isAuto;
    document.getElementById('btn-auto')?.classList.toggle('active', this.isAuto);
  }

  // ─── УВЕДОМЛЕНИЯ ───────────────────────────────────────────

  _notify(msg) {
    const el = document.getElementById('notification');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('show');
    setTimeout(() => el.classList.remove('show'), 2500);
  }

  // ─── БИНДИНГ UI ИГРОВОГО ЭКРАНА ────────────────────────────

  _bindGameUI() {
    // Клик по диалогу — пропуск или продвижение
    document.getElementById('dialogue-box')?.addEventListener('click', (e) => {
      if (e.target.id === 'dialogue-skip') return;
      if (this.isTransitioning) return; // блокируем во время перехода/ChapterScreen
      if (this._isMinigameActive()) return; // блокируем во время мини-игры
      if (this.isTyping) {
        this.skipTyping = true;
      } else if (this.state.currentNode?.type !== 'choice') {
        this._advance(this.state.currentNode);
      }
    });

    // Кнопка пропуска
    document.getElementById('dialogue-skip')?.addEventListener('click', () => {
      if (this._isMinigameActive()) return;
      if (this.isTyping) this.skipTyping = true;
      else this._advance(this.state.currentNode);
    });

    // Тулбар
    document.getElementById('btn-auto')?.addEventListener('click', () => this.toggleAuto());
    document.getElementById('btn-save')?.addEventListener('click', () => {
      window._menuSystem?.open('save', this);
    });
    document.getElementById('btn-load')?.addEventListener('click', () => {
      window._menuSystem?.open('load', this);
    });
    document.getElementById('btn-history')?.addEventListener('click', () => {
      window._menuSystem?.openHistory(this.state.history);
    });
    document.getElementById('btn-settings')?.addEventListener('click', () => {
      window._menuSystem?.openSettings(this);
    });
    document.getElementById('btn-menu')?.addEventListener('click', () => {
      window._menuSystem?.openPause(this);
    });

    // Клавиатура — только когда игровой экран активен
    document.addEventListener('keydown', (e) => {
      const gameScreen = document.getElementById('game-screen');
      if (gameScreen?.classList.contains('hidden')) return;

      if (e.code === 'Space' || e.code === 'ArrowRight') {
        if (this.isTransitioning) return; // блокируем во время перехода/ChapterScreen
        if (this._isMinigameActive()) return; // блокируем во время мини-игры
        e.preventDefault();
        if (this.isTyping) this.skipTyping = true;
        else if (this.state.currentNode?.type !== 'choice') this._advance(this.state.currentNode);
      }
      if (e.code === 'Escape') {
        window._menuSystem?.openPause(this);
      }
    });
  }
}

// ──────────────────────────────────────────────────────────────
//  AUDIO MANAGER
// ──────────────────────────────────────────────────────────────

const AudioManager = {
  bgmTrack: null,
  bgmName:  null,
  bgmVolume: 0.5,
  sfxVolume: 0.8,

  play(trackName, loop = true) {
    if (!trackName || this.bgmName === trackName) return;
    this.stop();
    this.bgmTrack = new Audio(`/assets/audio/bgm/${trackName}.mp3`);
    this.bgmTrack.loop   = loop;
    this.bgmTrack.volume = this.bgmVolume;
    this.bgmTrack.play().catch(() => {});
    this.bgmName = trackName;
  },

  stop() {
    if (this.bgmTrack) { this.bgmTrack.pause(); this.bgmTrack = null; this.bgmName = null; }
  },

  sfx(name) {
    const s = new Audio(`/assets/audio/sfx/${name}.mp3`);
    s.volume = this.sfxVolume;
    s.play().catch(() => {});
  },

  voiceTrack: null,
  voiceVolume: 0.85,

  voice(name) {
    this.stopVoice();
    const v = new Audio(`/assets/audio/voice/${name}.mp3`);
    v.volume = this.voiceVolume;
    v.onerror = () => {}; // тихо игнорируем отсутствующие файлы
    v.play().catch(() => {});
    this.voiceTrack = v;
  },

  stopVoice() {
    if (this.voiceTrack) {
      this.voiceTrack.pause();
      this.voiceTrack.currentTime = 0;
      this.voiceTrack = null;
    }
  },

  setVolume(v) {
    this.bgmVolume = v;
    if (this.bgmTrack) this.bgmTrack.volume = v;
    localStorage.setItem('vn_bgmVol', v);
  },

  setSfxVolume(v) {
    this.sfxVolume = v;
    localStorage.setItem('vn_sfxVol', v);
  }
};

// ──────────────────────────────────────────────────────────────
//  FALLBACK BACKGROUND — процедурный коридор
// ──────────────────────────────────────────────────────────────

const FallbackBG = {
  canvas: null, ctx: null, T: 0, active: false, raf: null,

  init() {
    this.canvas = document.getElementById('fallback-bg');
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    window.addEventListener('resize', () => this.resize());
    this.resize();
  },

  resize() {
    if (!this.canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const W = window.innerWidth;
    const H = window.innerHeight;
    this.canvas.width  = W * dpr;
    this.canvas.height = H * dpr;
    this.canvas.style.width  = W + 'px';
    this.canvas.style.height = H + 'px';
    if (this.ctx) this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  },

  show() {
    if (!this.canvas) return;
    this.canvas.style.display = 'block';
    this.active = true;
    this.loop();
  },

  hide() {
    this.active = false;
    if (this.raf) { cancelAnimationFrame(this.raf); this.raf = null; }
    if (this.canvas) this.canvas.style.display = 'none';
  },

  loop() {
    if (!this.active) return;
    this.T += .008;
    const c = this.ctx;
    const W = parseInt(this.canvas.style.width) || this.canvas.width;
    const H = parseInt(this.canvas.style.height) || this.canvas.height;
    c.clearRect(0,0,W,H);

    // Тёмный коридор
    const bg = c.createRadialGradient(W*.5,H*.35,0,W*.5,H*.35,W*.75);
    bg.addColorStop(0, '#0d0e1a');
    bg.addColorStop(.3, '#080a14');
    bg.addColorStop(.7, '#060810');
    bg.addColorStop(1,  '#04050c');
    c.fillStyle = bg;
    c.fillRect(0,0,W,H);

    // Перспективные линии коридора
    const cx = W*.5, fy = H*.38;
    const lines = [
      [0,0],[W,0],[W,H],[0,H],
      [W*.12,0],[W*.88,0],[W*.88,H],[W*.12,H],
      [W*.25,0],[W*.75,0],[W*.75,H],[W*.25,H],
    ];

    c.strokeStyle = 'rgba(180,175,165,.04)';
    c.lineWidth = 1;
    [[0,0],[W,0],[W,H],[0,H]].forEach(([px,py]) => {
      c.beginPath(); c.moveTo(px,py); c.lineTo(cx,fy); c.stroke();
    });
    [[W*.15,0],[W*.85,0],[W*.85,H],[W*.15,H]].forEach(([px,py]) => {
      c.beginPath(); c.moveTo(px,py); c.lineTo(cx,fy); c.stroke();
    });
    [[W*.3,0],[W*.7,0],[W*.7,H],[W*.3,H]].forEach(([px,py]) => {
      c.beginPath(); c.moveTo(px,py); c.lineTo(cx,fy); c.stroke();
    });

    // Горизонтальные «секции» коридора
    for (let i = 0; i < 6; i++) {
      const t = i / 6;
      const y = fy + (H - fy) * t;
      const xOff = W * .5 * (1 - t * .8);
      c.strokeStyle = `rgba(180,175,165,${.03 + t*.02})`;
      c.lineWidth = 1;
      c.beginPath(); c.moveTo(cx-xOff, y); c.lineTo(cx+xOff, y); c.stroke();
    }

    // Мерцающий свет в глубине
    const gp = .5 + .3*Math.sin(this.T*.7);
    const grd = c.createRadialGradient(cx,fy,0,cx,fy,W*.15);
    grd.addColorStop(0, `rgba(200,195,180,${.04*gp})`);
    grd.addColorStop(1, 'transparent');
    c.fillStyle = grd;
    c.beginPath(); c.arc(cx,fy,W*.15,0,Math.PI*2); c.fill();

    // Аварийный индикатор — очень слабо
    const rp = Math.abs(Math.sin(this.T*1.3));
    if (rp > .8) {
      c.fillStyle = `rgba(60,20,10,${(rp-.8)*.03})`;
      c.fillRect(0,0,W,H);
    }

    // Лёгкий крестообразный блик в центре (как на скрине)
    const cx2 = W * .5, cy2 = H * .38;
    const glowAmt = .012 + .006 * Math.sin(this.T * .5);
    c.save();
    c.globalAlpha = glowAmt;
    c.strokeStyle = 'rgba(180,175,200,1)';
    c.lineWidth = 1;
    // Диагонали
    const diagLen = Math.min(W,H) * .22;
    c.beginPath();
    c.moveTo(cx2 - diagLen, cy2 - diagLen * .55);
    c.lineTo(cx2 + diagLen, cy2 + diagLen * .55);
    c.stroke();
    c.beginPath();
    c.moveTo(cx2 + diagLen, cy2 - diagLen * .55);
    c.lineTo(cx2 - diagLen, cy2 + diagLen * .55);
    c.stroke();
    c.restore();

    // Виньетка
    const vig = c.createRadialGradient(W*.5,H*.5,H*.15,W*.5,H*.5,H*.9);
    vig.addColorStop(0, 'transparent');
    vig.addColorStop(.6, 'rgba(0,0,0,.3)');
    vig.addColorStop(1, 'rgba(0,0,0,.92)');
    c.fillStyle = vig;
    c.fillRect(0,0,W,H);

    this.raf = requestAnimationFrame(() => this.loop());
  }
};

// ──────────────────────────────────────────────────────────────
//  CHAPTER SCREEN
// ──────────────────────────────────────────────────────────────

const ChapterScreen = {
  show(label, title, duration = 2800) {
    const screen   = document.getElementById('chapter-screen');
    const labelEl  = document.getElementById('chapter-label');
    const titleEl  = document.getElementById('chapter-title');
    if (!screen || !titleEl) return Promise.resolve();
    if (labelEl) labelEl.textContent = label || '';
    titleEl.textContent = title || '';
    screen.classList.add('show');
    return new Promise(resolve => {
      setTimeout(() => {
        screen.classList.remove('show');
        setTimeout(resolve, 600);
      }, duration);
    });
  }
};

// ──────────────────────────────────────────────────────────────
//  LOADING SCREEN
// ──────────────────────────────────────────────────────────────

const LoadingScreen = {
  show() {
    document.getElementById('loading-screen')?.classList.add('show');
  },
  hide() {
    document.getElementById('loading-screen')?.classList.remove('show');
  }
};

// Инициализируем fallback bg при загрузке
document.addEventListener('DOMContentLoaded', () => {
  FallbackBG.init();
});
