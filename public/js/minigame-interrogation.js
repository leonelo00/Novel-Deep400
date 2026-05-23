// Мини-игра «Допрос» — диалоговые цепочки с невидимым счётчиком давления
(function() {
  let returnNode = null;
  let pressure = 0; // 0-10: давление на допрашиваемого

  window.addEventListener('vn:startMinigame', (e) => {
    if (e.detail.game !== 'interrogation') return;
    returnNode = e.detail.returnNode;
    pressure = 0;
    startInterrogation();
  });

  function startInterrogation() {
    const layer = document.getElementById('minigame-layer');
    layer.innerHTML = '';
    layer.classList.remove('hidden');

    // Флаги устанавливаются ДО запуска мини-игры, так что смотрим какой последний
    const flags = window._vnEngine?.state?.flags || {};
    let subject, script;

    // Скляров — третий (оба предыдущих флага уже стоят)
    if (flags['допрос_скляров']) {
      subject = { name: 'Скляров', role: 'Лаборант систем вентиляции, 29 лет' };
      script = scriptSklyarov;
    // Горбатова — второй (флаг Ермолова уже стоит)
    } else if (flags['допрос_горбатова']) {
      subject = { name: 'Горбатова', role: 'Нейрохимик, 41 год' };
      script = scriptGorbatova;
    // Ермолов — первый
    } else {
      subject = { name: 'Ермолов', role: 'Генетик, 36 лет' };
      script = scriptErmolov;
    }

    renderInterrogation(subject, script);
  }

  const scriptGorbatova = [
    {
      text: 'Сядьте. У нас немного времени.',
      response: 'Я уже всё сказала в отчёте.',
      options: [
        { text: '[Мягко] «Отчёт — это формальность. Я хочу услышать вас.»', next: 1, pressure: -1 },
        { text: '[Нейтрально] «В отчёте есть противоречия.»', next: 1, pressure: 0 },
        { text: '[Давить] «В отчёте есть ложь.»', next: 1, pressure: 2 },
      ]
    },
    {
      text: (p) => p < 4 ? 'Хорошо. Что вы хотите знать?' : 'Я... не уверена что должна это говорить.',
      response: null,
      options: [
        { text: '«Что произошло в секторе Б 8 января?»', next: 2, pressure: 0 },
        { text: '«Вы знали о субъектах в секторе Г?»', next: 2, pressure: 1 },
        { text: '«Кто отдал приказ о переводе персонала?»', next: 2, pressure: 0 },
      ]
    },
    {
      text: (p) => p < 3
        ? 'Восьмого января была плановая проверка. Так нам сказали.'
        : p < 7
        ? 'Восьмого была... не проверка. Мы слышали звуки из сектора Г.'
        : 'Я не знаю ничего. Ничего. Пожалуйста.',
      response: null,
      options: [
        { text: '«Какие звуки?»', next: 3, pressure: 0 },
        { text: '[Молчать. Ждать.]', next: 3, pressure: -1 },
        { text: '«Имена. Мне нужны имена тех кто был в Г.»', next: 3, pressure: 3 },
      ]
    },
    {
      text: (p) => p > 6
        ? 'Пожалуйста не надо. Я ничего не знаю об именах...'
        : 'Двадцать три человека. Это всё что я знаю. Двадцать три.',
      response: null,
      options: [
        { text: '[Завершить допрос]', next: null, pressure: 0, end: true },
      ]
    }
  ];

  const scriptSklyarov = [
    {
      text: 'Скляров. Техник вентиляции.',
      response: 'Да. Что-то случилось?',
      options: [
        { text: '«Вы обслуживали тоннели минус четыре?»', next: 1, pressure: 0 },
        { text: '«Когда последний раз были в секторе Г?»', next: 1, pressure: 1 },
        { text: '[Молчать. Смотреть.]', next: 1, pressure: 2 },
      ]
    },
    {
      text: (p) => p < 5 ? 'Да, регулярно. Каждые две недели по графику.' : 'Я... по графику. Только по графику.',
      response: null,
      options: [
        { text: '«Вы слышали что-нибудь необычное?»', next: 2, pressure: 0 },
        { text: '«Там есть скрытый выход. Вы его знаете.»', next: 2, pressure: 1 },
        { text: '[Положить на стол схему тоннеля]', next: 2, pressure: -1, setFlag: 'схема_показана' },
      ]
    },
    {
      text: (p) => p > 5
        ? 'Хорошо. Хорошо. Тоннель D-7. Он не в реестре. Только я знаю.'
        : 'В тоннеле D-7 однажды слышал... не знаю. Шум. Живой.',
      response: null,
      options: [
        { text: '«Вы можете нарисовать путь?»', next: 3, pressure: 0, setFlag: 'маршрут_d7_получен' },
        { text: '[Завершить]', next: null, pressure: 0, end: true },
      ]
    },
    {
      text: () => 'Он рисует схему. Руки не дрожат — впервые за разговор.',
      response: null,
      options: [
        { text: '[Завершить допрос]', next: null, pressure: 0, end: true },
      ]
    }
  ];

  const scriptErmolov = [
    {
      text: 'Ермолов. Охрана, смена Б.',
      response: '...да.',
      options: [
        { text: '«Вы дежурили у сектора Г в ночь с 7 на 8?»', next: 1, pressure: 0 },
        { text: '«Сколько человек в смене Б?»', next: 1, pressure: 0 },
        { text: '[Открыть папку с его именем]', next: 1, pressure: 1 },
      ]
    },
    {
      text: (p) => p < 3
        ? 'Да. Стандартная смена.'
        : 'Мы... нас было четверо. Потом двое. Власов сказал что двое на внутреннем объекте.',
      response: null,
      options: [
        { text: '«Что значит — внутренний объект?»', next: 2, pressure: 1 },
        { text: '[Молчать]', next: 2, pressure: -1 },
        { text: '«Имена двоих.»', next: 2, pressure: 2 },
      ]
    },
    {
      text: (p) => p > 4
        ? 'Рамина Азимова. И... Соколов. Я не знаю что с ними стало.'
        : 'Они просто... ушли. Наверное перевод. Бывает.',
      response: null,
      options: [
        { text: '[Завершить допрос]', next: null, pressure: 0, end: true },
      ]
    }
  ];

  function renderInterrogation(subject, script) {
    const layer = document.getElementById('minigame-layer');
    let step = 0;

    const container = document.createElement('div');
    container.style.cssText = `
      display:flex; flex-direction:column; height:100%;
      font-family:'Cormorant Garamond',serif; padding:0; background:#020204;
    `;

    container.innerHTML = `
      <div style="padding:1rem 2rem;border-bottom:1px solid rgba(200,192,176,0.1);
        font-family:'Share Tech Mono',monospace; font-size:clamp(0.6rem,0.9vw,0.75rem);
        color:rgba(200,192,176,0.4); letter-spacing:.2em; text-transform:uppercase;
        display:flex; justify-content:space-between; align-items:center;">
        <span>ДОПРОС // ${subject.name.toUpperCase()}</span>
        <span style="color:rgba(136,120,104,0.5)">${subject.role}</span>
      </div>
      <div id="inq-log" style="flex:1; overflow-y:auto; padding:2rem; display:flex; flex-direction:column; gap:1rem;"></div>
      <div id="inq-options" style="padding:1.5rem 2rem; border-top:1px solid rgba(200,192,176,0.1); display:flex; flex-direction:column; gap:.6rem;"></div>
      <div id="inq-pressure-bar" style="height:2px; background:rgba(200,192,176,0.05); position:relative;">
        <div id="inq-pressure-fill" style="height:100%; width:0%; background:rgba(200,100,80,0.4); transition:width .6s ease;"></div>
      </div>
    `;

    layer.appendChild(container);

    function addLog(text, isPlayer) {
      const log = document.getElementById('inq-log');
      const el = document.createElement('div');
      el.style.cssText = `
        font-size:clamp(0.85rem,1.4vw,1.1rem); line-height:1.6;
        color: ${isPlayer ? 'rgba(200,192,176,0.9)' : 'rgba(136,120,104,0.8)'};
        padding-left: ${isPlayer ? '0' : '1.5rem'};
        border-left: ${isPlayer ? 'none' : '2px solid rgba(136,120,104,0.2)'};
      `;
      el.textContent = text;
      log.appendChild(el);
      log.scrollTop = log.scrollHeight;
    }

    function updatePressure() {
      const pct = Math.min(100, pressure * 10);
      const fill = document.getElementById('inq-pressure-fill');
      if (fill) fill.style.width = pct + '%';
    }

    function renderStep() {
      const node = script[step];
      if (!node) return endGame();

      const textVal = typeof node.text === 'function' ? node.text(pressure) : node.text;
      addLog(textVal, false);
      if (node.response) setTimeout(() => addLog(node.response, false), 600);

      const optionsEl = document.getElementById('inq-options');
      optionsEl.innerHTML = '';

      setTimeout(() => {
        node.options.forEach(opt => {
          const btn = document.createElement('button');
          btn.style.cssText = `
            font-family:'Share Tech Mono',monospace; font-size:clamp(0.6rem,0.9vw,0.75rem);
            padding:.5em 1em; background:transparent; border:1px solid rgba(200,192,176,0.15);
            color:rgba(200,192,176,0.7); cursor:pointer; text-align:left; letter-spacing:.05em;
            transition:border-color .2s, color .2s;
          `;
          btn.textContent = opt.text;
          btn.addEventListener('mouseenter', () => { btn.style.borderColor = 'rgba(200,192,176,0.4)'; btn.style.color = 'rgba(200,192,176,1)'; });
          btn.addEventListener('mouseleave', () => { btn.style.borderColor = 'rgba(200,192,176,0.15)'; btn.style.color = 'rgba(200,192,176,0.7)'; });
          btn.addEventListener('click', () => {
            optionsEl.innerHTML = '';
            addLog(opt.text, true);
            pressure = Math.max(0, Math.min(10, pressure + (opt.pressure || 0)));
            updatePressure();
            if (opt.setFlag && window._vnEngine) window._vnEngine.state.flags[opt.setFlag] = true;
            if (opt.end) { setTimeout(endGame, 800); return; }
            step = opt.next || step + 1;
            setTimeout(renderStep, 500);
          });
          optionsEl.appendChild(btn);
        });
      }, node.response ? 1000 : 400);
    }

    function endGame() {
      // Сохраняем результат давления и добавляем к скверне
      if (window._vnEngine) {
        window._vnEngine.state.variables['давление_допроса'] = pressure;
        // Конвертируем давление (0-10) в скверну (0-3 за допрос)
        const скверна_за_допрос = Math.floor(pressure / 3.5); // 0-2 давления = 0, 3-6 = 1, 7-10 = 2-3
        const текущая_скверна = window._vnEngine.state.variables['скверна'] || 0;
        window._vnEngine.state.variables['скверна'] = текущая_скверна + скверна_за_допрос;

        if (pressure >= 7) window._vnEngine.state.flags['допрос_жёсткий'] = true;
        if (pressure <= 2) window._vnEngine.state.flags['допрос_мягкий'] = true;
      }
      window.dispatchEvent(new CustomEvent('vn:minigameEnd', { detail: { returnNode } }));
    }

    renderStep();
    updatePressure();
  }
})();
