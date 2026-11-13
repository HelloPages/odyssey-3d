const cards = [...document.querySelectorAll('.game-media')];
const motion = matchMedia('(prefers-reduced-motion: reduce)');
const visible = new Set();
const active = new Set();
const failed = new WeakSet();
let particleFrame = 0;
let particleLast = 0;
const particleLayers = new Map();

function updatePlayback() {
  const enabled = !motion.matches && !document.hidden;
  for (const card of cards) card.classList.toggle('particles-active', enabled && visible.has(card));
  refreshParticles(enabled);
  const next = new Set(enabled ? cards.filter(card => visible.has(card) && !failed.has(card)).slice(0, 3) : []);

  for (const card of active) {
    if (next.has(card)) continue;
    const video = card.querySelector('video');
    card.classList.remove('is-playing');
    video.pause();
    video.removeAttribute('src');
    video.load();
    active.delete(card);
  }

  for (const card of next) {
    if (active.has(card)) continue;
    const video = card.querySelector('video');
    active.add(card);
    video.src = video.dataset.src;
    video.play().catch(error => {
      if (error.name === 'AbortError' || !active.has(card)) return;
      failed.add(card);
      updatePlayback();
    });
  }
}

const observer = new IntersectionObserver(entries => {
  for (const entry of entries) {
    if (entry.intersectionRatio >= .28) visible.add(entry.target);
    else visible.delete(entry.target);
  }
  updatePlayback();
}, {threshold: .28});

for (const card of cards) {
  const video = card.querySelector('video');
  video.addEventListener('playing', () => {
    if (active.has(card)) card.classList.add('is-playing');
  });
  video.addEventListener('error', () => {
    if (!active.has(card)) return;
    failed.add(card);
    updatePlayback();
  });
  observer.observe(card);
}

motion.addEventListener('change', updatePlayback);
document.addEventListener('visibilitychange', updatePlayback);
const viewTimers = new Map();
const views = document.querySelectorAll('[data-view-shift]');

function stopView(view) {
  for (const timer of viewTimers.get(view) || []) clearTimeout(timer);
  viewTimers.delete(view);
  delete view.dataset.view;
}

function startView(view) {
  stopView(view);
  if (motion.matches || document.hidden) return;

  const hasVideo = view.classList.contains('game-media');
  const showCycle = () => {
    if (hasVideo) delete view.dataset.view;
    else view.dataset.view = 'base';
    viewTimers.set(view, [
      setTimeout(() => { view.dataset.view = 'base'; }, hasVideo ? 4800 : 0),
      setTimeout(() => { view.dataset.view = 'alternate'; }, hasVideo ? 6800 : 7200),
      setTimeout(showCycle, hasVideo ? 9500 : 11200),
    ]);
  };
  showCycle();
}

const visibleViews = new Set();
const viewObserver = new IntersectionObserver(entries => {
  for (const {target, isIntersecting} of entries) {
    if (isIntersecting) {
      visibleViews.add(target);
      startView(target);
    } else {
      visibleViews.delete(target);
      stopView(target);
    }
  }
}, {threshold: .35});

for (const view of views) {
  viewObserver.observe(view);
  view.addEventListener('pointermove', event => {
    if (event.pointerType !== 'mouse' || motion.matches) return;
    const bounds = view.getBoundingClientRect();
    const position = (event.clientX - bounds.left) / bounds.width;
    if (position > .43 && position < .57) return;
    const next = position < .5 ? 'base' : 'alternate';
    if (view.dataset.view === next && !viewTimers.has(view)) return;
    stopView(view);
    view.dataset.view = next;
  });
  view.addEventListener('pointerleave', () => {
    if (visibleViews.has(view)) startView(view);
  });
}

const refreshViews = () => {
  for (const view of visibleViews) startView(view);
};
motion.addEventListener('change', refreshViews);
document.addEventListener('visibilitychange', refreshViews);

// Each visible game has its own centre; no offscreen particle drawing.
function refreshParticles(enabled) {
  for (const [card, layer] of particleLayers) {
    if (enabled && visible.has(card)) continue;
    layer.canvas.remove();
    particleLayers.delete(card);
  }
  if (!enabled || !visible.size) {
    cancelAnimationFrame(particleFrame);
    particleFrame = 0;
    return;
  }
  if (!particleFrame) particleFrame = requestAnimationFrame(drawParticles);
}
function drawParticles(time) {
  particleFrame = 0;
  if (motion.matches || document.hidden || !visible.size) {
    refreshParticles(false);
    return;
  }
  if (time - particleLast >= 32) {
    particleLast = time;
    for (const card of visible) {
      let layer = particleLayers.get(card);
      if (!layer) {
        const canvas = document.createElement('canvas');
        canvas.className = 'game-sparks';
        canvas.setAttribute('aria-hidden', 'true');
        card.append(canvas);
        layer = {canvas, context: canvas.getContext('2d'), width: 0, height: 0};
        particleLayers.set(card, layer);
      }
      const width = card.clientWidth, height = card.clientHeight;
      if (!width || !height) continue;
      const ratio = Math.min(devicePixelRatio || 1, 1.5);
      const {canvas, context: ctx} = layer;
      if (width !== layer.width || height !== layer.height) {
        canvas.width = Math.round(width * ratio);
        canvas.height = Math.round(height * ratio);
        layer.width = width; layer.height = height;
        ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      }
      ctx.clearRect(0, 0, width, height);
      for (let i = 0; i < 192; i++) {
        const angle = i * 2.39996323;
        const seed = (Math.sin(i * 127.1 + 311.7) * 43758.5453 % 1 + 1) % 1;
        const phase = (time / (2300 + (i % 7) * 190) + seed) % 1;
        const distance = phase * phase;
        const x = width * .5 + Math.cos(angle) * width * .79 * distance;
        const y = height * .4 + Math.sin(angle) * height * .94 * distance;
        // The monitor bezel and stand occlude the rear particles.
        if (x>width*.12 && x<width*.88 && y>height*.05 && y<height*.75) continue;
        if (x>width*.4 && x<width*.63 && y>=height*.75) continue;
        const alpha = Math.min(1, phase * 8) * Math.min(1, (1 - phase) * 5);
        const size = .6 + distance * (i % 4 === 0 ? 2.3 : 1.4);
        ctx.fillStyle = `rgba(244,252,255,${alpha * .85})`;
        ctx.beginPath(); ctx.arc(x, y, size, 0, Math.PI * 2); ctx.fill();
        if (i % 4 === 0 && phase > .45) {
          ctx.strokeStyle = `rgba(220,245,255,${alpha * .25})`;
          ctx.lineWidth = .8;
          ctx.beginPath();ctx.moveTo(x,y);
          ctx.lineTo(x-Math.cos(angle)*distance*9,y-Math.sin(angle)*distance*9);ctx.stroke();
        }
      }
    }
  }
  particleFrame = requestAnimationFrame(drawParticles);
}
