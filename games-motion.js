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
