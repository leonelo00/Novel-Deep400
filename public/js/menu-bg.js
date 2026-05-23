(function() {
  const canvas = document.getElementById('menu-canvas');
  const ctx = canvas.getContext('2d');
  let W, H;

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
    if (menuImg) draw();
  }

  let menuImg = null;
  let animStarted = false;

  function startAnim() {
    if (animStarted) return;
    animStarted = true;
    resize();
    draw();
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    if (menuImg) {
      ctx.drawImage(menuImg, 0, 0, W, H);
      ctx.fillStyle = 'rgba(2,2,8,0.55)';
      ctx.fillRect(0, 0, W, H);
    } else {
      ctx.fillStyle = '#020208';
      ctx.fillRect(0, 0, W, H);
    }
  }

  const _img = new Image();
  _img.onload  = () => { menuImg = _img; startAnim(); };
  _img.onerror = () => { menuImg = null; startAnim(); };
  _img.src = '/assets/images/bg/menu_bg.png';

  if (_img.complete && _img.naturalWidth > 0) {
    menuImg = _img;
    startAnim();
  }

  window.addEventListener('resize', resize);
})();
