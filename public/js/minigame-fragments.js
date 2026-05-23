// Мини-игра «Фрагменты» — расставь события в хронологическом порядке
(function() {
  let returnNode = null;

  window.addEventListener('vn:startMinigame', (e) => {
    if (e.detail.game !== 'fragments') return;
    returnNode = e.detail.returnNode;
    startFragments();
  });

  const fragments = [
    { id: 1, text: '2019 — Строители обнаруживают полость на глубине 400м. Работы остановлены.', order: 1 },
    { id: 2, text: 'Первый научный состав прибывает на объект. 12 человек. Руководитель — Власов.', order: 2 },
    { id: 3, text: 'Инцидент в секторе Б. Трое исследователей перестают выходить на связь. Найдены через 6 часов — живы, но не реагируют на речь.', order: 3 },
    { id: 4, text: 'Михаил разрабатывает «процедуру контакта». Первый успешный сеанс с субъектом. Записи засекречены.', order: 4 },
    { id: 5, text: 'Лаборатория синтезирует патоген из образцов глубинного слоя. Кодовое название — «Литораль».', order: 5 },
    { id: 6, text: 'Рамина — первый доброволец. Процедура проходит штатно. Через 48 часов начинает петь.', order: 6 },
    { id: 7, text: 'Образец отправлен на поверхность. Курьер не доезжает. Машина найдена пустой на трассе М-7.', order: 7 }
  ];

  const bonusFragment = { id: 8, text: 'За окном — берёзы. Кто-то помнит берёзы. Кто-то помнит, как было — до глубины. До всего.', order: 8 };

  function startFragments() {
    const layer = document.getElementById('minigame-layer');
    layer.innerHTML = '';
    layer.classList.remove('hidden');

    const container = document.createElement('div');
    container.className = 'fragments-game';
    container.style.background = 'var(--bg, #020204)';

    const shuffled = [...fragments].sort(() => Math.random() - 0.5);

    container.innerHTML = `
      <div class="fragments-header">ФРАГМЕНТЫ</div>
      <div class="fragments-instruction">Расставьте события в хронологическом порядке. Перетащите фрагменты.</div>
      <div class="fragments-list" id="fragments-list"></div>
      <div class="fragments-controls">
        <span class="fragments-errors" id="fragments-errors">Ошибки: 0</span>
        <button class="fragments-btn" id="fragments-check">Проверить порядок</button>
      </div>
    `;
    layer.appendChild(container);

    const list = document.getElementById('fragments-list');
    let errors = 0;
    let attempts = 0;

    shuffled.forEach(f => {
      const el = document.createElement('div');
      el.className = 'fragment-item';
      el.draggable = true;
      el.dataset.id = f.id;
      el.dataset.order = f.order;
      el.textContent = f.text;
      list.appendChild(el);
    });

    // Drag and drop
    let draggedEl = null;

    list.addEventListener('dragstart', (e) => {
      if (!e.target.classList.contains('fragment-item')) return;
      draggedEl = e.target;
      e.target.classList.add('fragment-dragging');
      e.dataTransfer.effectAllowed = 'move';
    });

    list.addEventListener('dragend', (e) => {
      if (draggedEl) draggedEl.classList.remove('fragment-dragging');
      draggedEl = null;
      document.querySelectorAll('.fragment-item').forEach(el => el.classList.remove('fragment-over'));
    });

    list.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      const target = e.target.closest('.fragment-item');
      if (target && target !== draggedEl) {
        document.querySelectorAll('.fragment-item').forEach(el => el.classList.remove('fragment-over'));
        target.classList.add('fragment-over');
      }
    });

    list.addEventListener('drop', (e) => {
      e.preventDefault();
      const target = e.target.closest('.fragment-item');
      if (target && target !== draggedEl && draggedEl) {
        const items = [...list.querySelectorAll('.fragment-item')];
        const dragIdx = items.indexOf(draggedEl);
        const dropIdx = items.indexOf(target);
        if (dragIdx < dropIdx) {
          target.after(draggedEl);
        } else {
          target.before(draggedEl);
        }
      }
      document.querySelectorAll('.fragment-item').forEach(el => el.classList.remove('fragment-over'));
    });

    // Touch support
    let touchStartY = 0;
    let touchEl = null;
    let placeholder = null;

    list.addEventListener('touchstart', (e) => {
      const target = e.target.closest('.fragment-item');
      if (!target) return;
      touchEl = target;
      touchStartY = e.touches[0].clientY;
      target.classList.add('fragment-dragging');
    }, { passive: true });

    list.addEventListener('touchmove', (e) => {
      if (!touchEl) return;
      e.preventDefault();
      const touch = e.touches[0];
      const elemBelow = document.elementFromPoint(touch.clientX, touch.clientY);
      const target = elemBelow ? elemBelow.closest('.fragment-item') : null;
      document.querySelectorAll('.fragment-item').forEach(el => el.classList.remove('fragment-over'));
      if (target && target !== touchEl) {
        target.classList.add('fragment-over');
      }
    }, { passive: false });

    list.addEventListener('touchend', (e) => {
      if (!touchEl) return;
      const touch = e.changedTouches[0];
      const elemBelow = document.elementFromPoint(touch.clientX, touch.clientY);
      const target = elemBelow ? elemBelow.closest('.fragment-item') : null;
      if (target && target !== touchEl) {
        const items = [...list.querySelectorAll('.fragment-item')];
        const dragIdx = items.indexOf(touchEl);
        const dropIdx = items.indexOf(target);
        if (dragIdx < dropIdx) {
          target.after(touchEl);
        } else {
          target.before(touchEl);
        }
      }
      touchEl.classList.remove('fragment-dragging');
      document.querySelectorAll('.fragment-item').forEach(el => el.classList.remove('fragment-over'));
      touchEl = null;
    });

    // Check button
    document.getElementById('fragments-check').addEventListener('click', () => {
      attempts++;
      const items = [...list.querySelectorAll('.fragment-item')];
      const currentOrder = items.map(el => parseInt(el.dataset.order));
      let correct = true;
      let wrongCount = 0;

      items.forEach((el, i) => {
        const expected = i + 1;
        const actual = parseInt(el.dataset.order);
        if (actual === expected) {
          el.classList.add('fragment-correct');
          el.classList.remove('fragment-wrong');
        } else {
          el.classList.remove('fragment-correct');
          el.classList.add('fragment-wrong');
          correct = false;
          wrongCount++;
        }
      });

      if (!correct) {
        errors += wrongCount;
        document.getElementById('fragments-errors').textContent = 'Ошибки: ' + errors;
        setTimeout(() => {
          items.forEach(el => el.classList.remove('fragment-wrong'));
        }, 1500);
      } else {
        onSuccess();
      }
    });

    function onSuccess() {
      const errEl = document.getElementById('fragments-errors');
      const btn = document.getElementById('fragments-check');
      btn.disabled = true;

      // Calculate clarity based on errors
      let clarity = 3;
      if (errors === 0 && attempts === 1) clarity = 3;
      else if (errors <= 3) clarity = 2;
      else if (errors <= 7) clarity = 1;
      else clarity = 0;

      window._vnEngine.state.variables['ясность'] = clarity;

      if (errors === 0 && attempts === 1) {
        // Perfect — show bonus fragment
        window._vnEngine.state.flags['нашёл_восьмой_фрагмент'] = true;
        errEl.textContent = 'Идеально. Найден скрытый фрагмент.';

        setTimeout(() => {
          const bonus = document.createElement('div');
          bonus.className = 'fragment-item fragment-bonus';
          bonus.textContent = bonusFragment.text;
          list.appendChild(bonus);

          setTimeout(() => endMinigame(), 3000);
        }, 1500);
      } else {
        errEl.textContent = 'Порядок верный. Ясность: ' + clarity + '/3';
        setTimeout(() => endMinigame(), 2000);
      }
    }
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