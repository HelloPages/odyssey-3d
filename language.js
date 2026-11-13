(() => {
  const translations = JSON.parse(document.getElementById('page-languages').textContent);
  const locales = {tw: 'zh-Hant-TW', en: 'en', ko: 'ko'};
  const storageKey = 'odyssey3d-language';
  const valid = code => Object.hasOwn(locales, code);
  const url = new URL(location.href);
  const buttons = [...document.querySelectorAll('[data-language]')];
  const textNodes = [];
  const walker = document.createTreeWalker(document.documentElement, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (node.parentElement.closest('script, style, svg')) return NodeFilter.FILTER_REJECT;
      return Object.hasOwn(translations, node.data.trim()) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
    }
  });
  while (walker.nextNode()) {
    const node = walker.currentNode;
    textNodes.push([node, node.data, node.data.trim()]);
  }
  const attributes = [];
  for (const element of document.querySelectorAll('[aria-label], [alt], [title], meta[name="description"]')) {
    for (const attribute of ['aria-label', 'alt', 'title', 'content']) {
      const value = element.getAttribute(attribute);
      if (value && Object.hasOwn(translations, value)) attributes.push([element, attribute, value]);
    }
  }
  const englishSubtitles = [...document.querySelectorAll('.game-en')];
  const localLinks = [...document.querySelectorAll('a[href]')].filter(link => {
    const href = link.getAttribute('href');
    return /^(?:index|games|help|setup|qr)\.html(?:[?#]|$)/.test(href);
  });
  const qr = document.querySelector('[data-qr-localized]');

  function translate(key, code) {
    return code === 'tw' ? key : translations[key][code === 'en' ? 0 : 1];
  }

  function apply(code, persist) {
    document.documentElement.lang = locales[code];
    for (const [node, original, key] of textNodes) {
      node.data = code === 'tw' ? original : original.replace(key, () => translate(key, code));
    }
    for (const [element, attribute, original] of attributes) {
      element.setAttribute(attribute, translate(original, code));
    }
    for (const button of buttons) {
      button.setAttribute('aria-pressed', String(button.dataset.language === code));
    }
    for (const subtitle of englishSubtitles) {
      const heading = subtitle.previousElementSibling;
      subtitle.hidden = subtitle.textContent.trim() === heading.textContent.trim();
    }
    for (const link of localLinks) {
      const target = new URL(link.href);
      target.searchParams.set('lang', code);
      link.href = target.href;
    }
    if (qr) qr.src = 'assets/customer-games-qr-' + code + '.png';
    if (persist) {
      try { localStorage.setItem(storageKey, code); } catch {}
      url.searchParams.set('lang', code);
      history.replaceState(history.state, '', url);
    }
  }

  let saved;
  try { saved = localStorage.getItem(storageKey); } catch {}
  const requested = url.searchParams.get('lang');
  apply(valid(requested) ? requested : valid(saved) ? saved : 'tw', valid(requested));
  for (const button of buttons) {
    button.addEventListener('click', () => apply(button.dataset.language, true));
  }
  // A language picked on the QR page also applies when returning via browser history.
  window.addEventListener('pageshow', event => {
    if (!event.persisted) return;
    try {
      const current = localStorage.getItem(storageKey);
      if (valid(current)) apply(current, true);
    } catch {}
  });
})();
