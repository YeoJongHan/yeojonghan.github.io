(() => {
  'use strict';

  const canvas = document.querySelector('#line-field');
  const context = canvas.getContext('2d');
  if (!context) return;

  const scene = document.querySelector('.scene');
  const root = document.documentElement;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const pointer = { x: 0, y: 0, strength: 0 };
  const target = { x: 0, y: 0, strength: 0 };
  let width = 0;
  let height = 0;
  let frame = 0;
  let ripples = [];

  function scheduleDraw() {
    if (!frame && !document.hidden) frame = requestAnimationFrame(draw);
  }

  function resize() {
    const bounds = scene.getBoundingClientRect();
    width = bounds.width;
    height = bounds.height;
    const density = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(width * density);
    canvas.height = Math.round(height * density);
    context.setTransform(density, 0, 0, density, 0, 0);
    if (!target.strength) {
      pointer.x = target.x = width * 0.75;
      pointer.y = target.y = height * 0.35;
    }
    scheduleDraw();
  }

  function draw(timestamp) {
    frame = 0;
    const still = reducedMotion.matches;
    pointer.x += (target.x - pointer.x) * 0.15;
    pointer.y += (target.y - pointer.y) * 0.15;
    pointer.strength += (target.strength - pointer.strength) * 0.12;
    ripples = still ? [] : ripples.filter(ripple => timestamp - ripple.start < 1200);

    context.clearRect(0, 0, width, height);
    context.lineWidth = 0.7;
    const spacing = width < 600 ? 30 : 38;
    const radius = Math.min(width * 0.45, 220);

    // A quiet field of lines. Only user input moves it; there is no idle loop.
    for (let column = -2; column <= Math.ceil(width / spacing) + 2; column++) {
      context.beginPath();
      context.strokeStyle = `rgba(225,225,225,${0.075 + (column % 5 + 5) % 5 * 0.006})`;
      let firstPoint = true;
      for (let y = -30; y <= height + 30; y += 14) {
        let x = column * spacing + y * 0.09 + Math.sin(y / 240 + column * 0.16 ) * 11;
        if (!still) {
          const dx = x - pointer.x;
          const dy = y - pointer.y;
          const distance = Math.hypot(dx, dy);
          x += dx / Math.max(1, distance) * Math.exp(-(distance * distance) / (radius * radius)) * 78 * pointer.strength;

          for (const ripple of ripples) {
            const age = timestamp - ripple.start;
            const rx = x - ripple.x;
            const ry = y - ripple.y;
            const distanceFromTap = Math.hypot(rx, ry);
            const wave = Math.exp(-Math.pow((distanceFromTap - age * 0.45) / 55, 2));
            x += rx / Math.max(1, distanceFromTap) * wave * 24 * (1 - age / 1200);
          }
        }
        if (firstPoint) context.moveTo(x, y);
        else context.lineTo(x, y);
        firstPoint = false;
      }
      context.stroke();
    }

    if (!still) {
      scene.style.setProperty('--light-x', `${pointer.x}px`);
      scene.style.setProperty('--light-y', `${pointer.y}px`);
    }
    const settling = Math.abs(target.x - pointer.x) + Math.abs(target.y - pointer.y) > 0.5
      || Math.abs(target.strength - pointer.strength) > 0.002;
    if (!still && (settling || ripples.length)) scheduleDraw();
  }

  function setPointer(event) {
    const bounds = scene.getBoundingClientRect();
    target.x = event.clientX - bounds.left;
    target.y = event.clientY - bounds.top;
  }

  scene.addEventListener('pointermove', event => {
    if (reducedMotion.matches || event.pointerType === 'touch') return;
    setPointer(event);
    target.strength = 1;
    scheduleDraw();
  }, { passive: true });

  scene.addEventListener('pointerleave', () => {
    target.strength = 0;
    scheduleDraw();
  }, { passive: true });

  scene.addEventListener('pointerdown', event => {
    if (reducedMotion.matches || event.target.closest('a, button, .pet-roller') || (event.pointerType === 'mouse' && event.button !== 0)) return;
    setPointer(event);
    ripples.push({ x: target.x, y: target.y, start: performance.now() });
    ripples = ripples.slice(-3);
    scheduleDraw();
  }, { passive: true });

  window.addEventListener('resize', resize, { passive: true });
  // The game changes the scene's height on phones without a window resize.
  if ('ResizeObserver' in window) new ResizeObserver(resize).observe(scene);
  reducedMotion.addEventListener('change', () => {
    target.strength = pointer.strength = 0;
    ripples = [];
    resize();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      cancelAnimationFrame(frame);
      frame = 0;
      ripples = [];
    } else scheduleDraw();
  });

  root.classList.add('has-field');
  resize();
})();
