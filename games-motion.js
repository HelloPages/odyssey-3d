const cards = [...document.querySelectorAll('.game-media')];
const motion = matchMedia('(prefers-reduced-motion: reduce)');
const visible = new Set();
const active = new Set();
const failed = new WeakSet();

function updatePlayback() {
  const enabled = !motion.matches && !document.hidden;
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
