const cards = [...document.querySelectorAll('.game-media')];
const motion = matchMedia('(prefers-reduced-motion: reduce)');
const toggle = document.querySelector('.motion-toggle');
const visible = new Set();
const active = new Set();
const failed = new WeakSet();
let paused = motion.matches;

function updatePlayback() {
  const enabled = !paused && !document.hidden;
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

function setPaused(value) {
  paused = value;
  document.body.classList.toggle('motion-paused', paused);
  toggle.textContent = paused ? '播放動畫' : '暫停動畫';
  updatePlayback();
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

toggle.hidden = false;
toggle.addEventListener('click', () => setPaused(!paused));
motion.addEventListener('change', event => setPaused(event.matches));
document.addEventListener('visibilitychange', updatePlayback);
setPaused(paused);
