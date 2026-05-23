// Мини-игра «Взлом архива» — терминал с 3 уровнями доступа
(function() {
  let returnNode = null;

  window.addEventListener('vn:startMinigame', (e) => {
    if (e.detail.game !== 'archive') return;
    returnNode = e.detail.returnNode;
    startArchive();
  });

  function startArchive() {
    const layer = document.getElementById('minigame-layer');
    layer.innerHTML = '';
    layer.classList.remove('hidden');

    const container = document.createElement('div');
    container.className = 'archive-game';
    container.style.background = 'var(--bg, #020204)';
    container.innerHTML = `
      <div class="archive-terminal">
        <div class="archive-header">
          <span class="archive-title">АРХИВ // ОБЪЕКТ «ЛИТОРАЛЬ»</span>
          <span class="archive-status" id="archive-status">УРОВЕНЬ 1</span>
        </div>
        <div class="archive-output" id="archive-output"></div>
        <div class="archive-input-line">
          <span class="archive-prompt">&gt;</span>
          <input type="text" class="archive-input" id="archive-input" autocomplete="off" spellcheck="false"/>
        </div>
      </div>
      <div class="archive-sidebar" id="archive-sidebar">
        <div class="archive-sidebar-title">УЛИКИ</div>
        <div class="archive-clues" id="archive-clues"></div>
      </div>
    `;
    layer.appendChild(container);

    initTerminal();
  }

  function initTerminal() {
    const output = document.getElementById('archive-output');
    const input = document.getElementById('archive-input');
    const status = document.getElementById('archive-status');
    const clues = document.getElementById('archive-clues');

    let level = 1;
    let filesFound = [];

    const files = {
      1: [
        { name: 'readme.txt', content: 'Архив создан 08.01.2029. Код первичного доступа — дата создания без точек.' },
        { name: 'manifest.log', content: 'Файлов в архиве: 347. Последнее обновление: 12.03.2031.' },
        { name: 'note_lena.txt', content: 'Если читаешь это — значит, добралась. Второй уровень: название объекта, латиницей, caps.' }
      ],
      2: [
        { name: 'protocol_17.txt', content: 'Протокол 17: Субъекты сектора Г демонстрируют синхронное поведение. Рекомендация — изоляция.' },
        { name: 'msg_mikhail.txt', content: 'Записка Михаила: «Они знают про этап два. Власов приказал зачистить архив. Я скопировал что успел.»' },
        { name: 'access_log.txt', content: 'Последний вход: Михаил К., 03.04.2031, 02:17. Третий уровень — код из финального отчёта, название агента заглавными буквами.(ПАТОГЕН)' }
      ],
      3: [
        { name: 'final_report.txt', content: 'Отчёт: Патоген «Литораль» — нейротропный агент. Этап 1: подавление воли. Этап 2: синхронизация. Этап 3: [ДАННЫЕ УДАЛЕНЫ]' },
        { name: 'subjects.csv', content: '23 субъекта. Сектор Г. Все — бывший персонал. Заражение: контакт с образцом при глубине >380м.' },
        { name: 'order_vlasov.txt', content: 'Приказ Власова: «Уничтожить все копии. Архив не существует. Литораль — закрыта.»' }
      ]
    };

    const passwords = {
      1: '08012029',
      2: 'LITORAL',
      3: 'ПАТОГЕН'
    };

    function print(text, cls) {
      const line = document.createElement('div');
      line.className = 'archive-line' + (cls ? ' ' + cls : '');
      line.textContent = text;
      output.appendChild(line);
      output.scrollTop = output.scrollHeight;
    }

    function printSystem(text) { print(text, 'archive-system'); }
    function printError(text) { print(text, 'archive-error'); }
    function printSuccess(text) { print(text, 'archive-success'); }

    function showClue(file) {
      const el = document.createElement('div');
      el.className = 'archive-clue-item';
      el.innerHTML = `<div class="archive-clue-name">${file.name}</div><div class="archive-clue-content">${file.content}</div>`;
      clues.appendChild(el);
    }

    function unlockLevel(lvl) {
      level = lvl;
      status.textContent = 'УРОВЕНЬ ' + lvl;
      printSuccess('--- ДОСТУП ПОЛУЧЕН: УРОВЕНЬ ' + lvl + ' ---');
      printSystem('Доступные файлы: ' + files[lvl].map(f => f.name).join(', '));
      printSystem('Команды: READ <файл> | UNLOCK <код> | COPY | DELETE');

      if (lvl === 2) {
        window._vnEngine.state.flags['нашли_записку_михаила'] = true;
      }
      if (lvl === 3) {
        window._vnEngine.state.flags['знает_про_этап_два'] = true;
      }
    }

    function handleCommand(cmd) {
      const trimmed = cmd.trim();
      const upper = trimmed.toUpperCase();
      print('> ' + trimmed);

      if (upper.startsWith('READ ')) {
        const fname = trimmed.substring(5).trim().toLowerCase();
        const file = files[level].find(f => f.name.toLowerCase() === fname);
        if (file) {
          print(file.content);
          if (!filesFound.includes(file.name)) {
            filesFound.push(file.name);
            showClue(file);
          }
        } else {
          printError('Файл не найден: ' + fname);
        }
      } else if (upper.startsWith('UNLOCK ')) {
        const code = trimmed.substring(7).trim();
        const nextLevel = level + 1;
        if (nextLevel > 3) {
          printError('Максимальный уровень доступа достигнут.');
        } else if (code === passwords[nextLevel] || code.toUpperCase() === passwords[nextLevel]) {
          unlockLevel(nextLevel);
        } else {
          printError('Неверный код доступа.');
        }
      } else if (upper === 'COPY') {
        if (level < 3) {
          printError('Недостаточно прав для копирования. Нужен уровень 3.');
        } else {
          startCopy();
        }
      } else if (upper === 'DELETE') {
        if (level < 3) {
          printError('Недостаточно прав для удаления.');
        } else {
          confirmDelete();
        }
      } else if (upper === 'HELP') {
        printSystem('READ <файл> — прочитать файл');
        printSystem('UNLOCK <код> — ввести код следующего уровня');
        printSystem('COPY — скопировать все данные (уровень 3)');
        printSystem('DELETE — удалить архив (уровень 3)');
      } else {
        printError('Неизвестная команда. Введите HELP.');
      }
    }

    function startCopy() {
      input.disabled = true;
      printSystem('Копирование данных...');
      let progress = 0;
      const bar = document.createElement('div');
      bar.className = 'archive-progress';
      bar.innerHTML = '<div class="archive-progress-bar" id="archive-pbar"></div><span class="archive-progress-text" id="archive-ptext">0%</span>';
      output.appendChild(bar);

      const interval = setInterval(() => {
        progress += Math.random() * 8 + 2;
        if (progress >= 100) {
          progress = 100;
          clearInterval(interval);
          document.getElementById('archive-pbar').style.width = '100%';
          document.getElementById('archive-ptext').textContent = '100%';
          printSuccess('Копирование завершено. 347 файлов сохранено.');
          window._vnEngine.state.flags['файлы_скопированы'] = true;
          setTimeout(() => endMinigame(), 2000);
        } else {
          document.getElementById('archive-pbar').style.width = progress + '%';
          document.getElementById('archive-ptext').textContent = Math.floor(progress) + '%';
        }
      }, 300);
    }

    function confirmDelete() {
      printError('ВНИМАНИЕ: Удаление необратимо. Введите DELETE CONFIRM для подтверждения.');
      const originalHandler = handleCommand;
      handleCommand = function(cmd) {
        if (cmd.trim().toUpperCase() === 'DELETE CONFIRM') {
          input.disabled = true;
          printError('УДАЛЕНИЕ АРХИВА...');
          let progress = 0;
          const bar = document.createElement('div');
          bar.className = 'archive-progress archive-progress-danger';
          bar.innerHTML = '<div class="archive-progress-bar archive-bar-danger" id="archive-pbar"></div><span class="archive-progress-text" id="archive-ptext">0%</span>';
          output.appendChild(bar);

          const interval = setInterval(() => {
            progress += Math.random() * 15 + 5;
            if (progress >= 100) {
              progress = 100;
              clearInterval(interval);
              document.getElementById('archive-pbar').style.width = '100%';
              document.getElementById('archive-ptext').textContent = '100%';
              printError('АРХИВ УНИЧТОЖЕН. ДАННЫЕ НЕ ПОДЛЕЖАТ ВОССТАНОВЛЕНИЮ.');
              window._vnEngine.state.flags['файлы_удалены'] = true;
              setTimeout(() => endMinigame(), 2500);
            } else {
              document.getElementById('archive-pbar').style.width = progress + '%';
              document.getElementById('archive-ptext').textContent = Math.floor(progress) + '%';
            }
          }, 200);
        } else {
          printSystem('Удаление отменено.');
          handleCommand = originalHandler;
          originalHandler(cmd);
        }
      };
    }

    // Init
    printSystem('СИСТЕМА АРХИВА «ЛИТОРАЛЬ» v2.4');
    printSystem('Подключение... OK');
    printSystem('');
    unlockLevel(1);

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && input.value.trim()) {
        handleCommand(input.value);
        input.value = '';
      }
    });

    input.focus();
  }

  function endMinigame() {
    const layer = document.getElementById('minigame-layer');
    layer.classList.add('hidden');
    layer.innerHTML = '';
    window.dispatchEvent(new CustomEvent('vn:minigameEnd', {
      detail: { returnNode: returnNode }
    }));
  }
})();