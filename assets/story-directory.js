/* Progressive enhancement for every published dental story.
 * Without JavaScript the search form continues to work at /search.html.
 * With JavaScript it instantly searches headline/summary cards. On demand it
 * fetches a compact JSON corpus to search each complete published article.
 * Never request owner-only materials or unpublished draft content. */
(() => {
  'use strict';
  const directory = document.getElementById('story-directory');
  const form = document.querySelector('form.directory-search');
  const field = document.getElementById('stories-q');
  if (!directory || !form || !field) return;

  const sections = [...directory.querySelectorAll('.story-topic')];
  const jumpLinks = [...directory.querySelectorAll('.topic-jump a[href^="#topic-"]')];
  const items = sections.map(section => ({
    section, cards: [...section.querySelectorAll('a.story-card')]
  }));
  if (!items.length || items.some(item => !item.cards.length)) return;
  const total = items.reduce((count, item) => count + item.cards.length, 0);
  const norm = value => String(value || '')
    .normalize('NFKC').toLocaleLowerCase('ko-KR')
    .replace(/[^\p{L}\p{N}]/gu, '');
  const termsOf = value => String(value || '')
    .normalize('NFKC').toLocaleLowerCase('ko-KR')
    .split(/[^\p{L}\p{N}]+/u).filter(Boolean);

  const searchable = new Map();
  const cardSlug = new Map();
  const publishedSlugs = new Set();
  for (const item of items) {
    for (const card of item.cards) {
      searchable.set(card, norm(card.textContent));
      const slug = String(card.getAttribute('href') || '')
        .match(/^\/stories\/([a-zA-Z0-9_-]+)\/$/)?.[1] || '';
      cardSlug.set(card, slug);
      if (slug) publishedSlugs.add(slug);
    }
  }

  const label = form.querySelector('label[for="stories-q"]');
  if (label) label.textContent = '홈페이지 글 ' + total + '편에서 제목·본문 찾기';
  field.placeholder = '예: 치주낭, 재신경치료 포스트, 보험 진료';

  const reset = document.createElement('button');
  reset.type = 'button';
  reset.className = 'story-filter-reset';
  reset.textContent = '전체 보기';
  reset.hidden = true;

  const status = document.createElement('p');
  status.className = 'story-filter-status';
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  status.textContent = '전체 ' + total + '편 · 주제별로 골라 읽을 수 있습니다.';

  const submit = form.querySelector('button[type="submit"]');
  if (submit) {
    submit.textContent = '목록에서 찾기';
    submit.insertAdjacentElement('afterend', reset);
  } else form.append(reset);
  form.insertAdjacentElement('afterend', status);

  let corpusState = 'idle'; // idle | loading | ready | error
  let corpus = new Map();
  let corpusOriginal = new Map();
  const snippets = new Map();
  const excerptFor = (body,query,terms) => {
    const paragraphs = String(body || '').split(/\n+/)
      .map(part => part.replace(/^■\s*/, '').trim())
      .filter(part => part.length > 24 && !part.startsWith('※'));
    if (!paragraphs.length) return '';
    const exact = paragraphs.find(part => norm(part).includes(query));
    const any = paragraphs.find(part => terms.some(term => norm(part).includes(term)));
    const target = exact || any;
    if (!target) return '';
    const clean = target.replace(/\s+/g,' ');
    const normalizedFirst = terms[0] || query;
    // Keep the excerpt short and close to the medical term without editing the article.
    const from = clean.toLocaleLowerCase('ko-KR').indexOf(normalizedFirst);
    const start = from > 65 ? Math.max(0,from - 36) : 0;
    const text = clean.slice(start,start + 130).trim();
    return (start ? '…' : '') + text + (start + 130 < clean.length ? '…' : '');
  };
  async function loadCorpus() {
    if (corpusState !== 'idle' || typeof fetch !== 'function') return;
    const source = form.getAttribute('data-search-index');
    if (!/^\/content\/story-search-text\.json\?v=[a-f0-9]{12}$/.test(source || '')) {
      corpusState = 'error';
      return;
    }
    corpusState = 'loading';
    try {
      const response = await fetch(source, { credentials: 'same-origin' });
      if (!response.ok) throw new Error('Search corpus unavailable');
      const data = await response.json();
      if (data?.version !== 1 || !Array.isArray(data.entries) ||
          data.entries.length !== publishedSlugs.size) {
        throw new Error('Search corpus version/count mismatch');
      }
      const next = new Map();
      const raw = new Map();
      for (const entry of data.entries) {
        if (!entry || !publishedSlugs.has(entry.slug) ||
            typeof entry.body !== 'string' || next.has(entry.slug)) {
          throw new Error('Invalid, extra or repeated article');
        }
        next.set(entry.slug, norm(entry.body));
        raw.set(entry.slug, entry.body);
      }
      if (next.size !== publishedSlugs.size) throw new Error('Missing article body');
      corpus = next;
      corpusOriginal = raw;
      corpusState = 'ready';
    } catch (_) {
      // A flaky mobile connection should not hide the immediate title results.
      corpusState = 'error';
    }
    filter();
  }

  function filter() {
    const query = norm(field.value);
    const terms = termsOf(field.value).map(norm);
    reset.hidden = !query;
    let visible = 0;
    for (const item of items) {
      let within = 0;
      for (const card of item.cards) {
        const summaryText = searchable.get(card);
        const bodyText = corpusState === 'ready'
          ? (corpus.get(cardSlug.get(card)) || '') : '';
        const combined = summaryText + bodyText;
        const matches = text => text.includes(query) ||
          (terms.length > 1 && terms.every(term => text.includes(term)));
        const matched = !query || matches(combined);
        card.hidden = !matched;
        const bodyOnlyMatch = Boolean(query && matched && !matches(summaryText) &&
          bodyText && matches(bodyText));
        let snippet = snippets.get(card);
        if (bodyOnlyMatch && !snippet) {
          snippet = document.createElement('p');
          snippet.className = 'story-match-excerpt';
          card.append(snippet);
          snippets.set(card,snippet);
        }
        if (snippet) {
          snippet.hidden = !bodyOnlyMatch;
          if (bodyOnlyMatch) {
            const passage=excerptFor(corpusOriginal.get(cardSlug.get(card)),query,terms);
            snippet.textContent=passage ? '본문 내용: '+passage : '';
            snippet.hidden=!passage;
          }
        }
        if (matched) within++;
      }
      item.section.hidden = within === 0;
      visible += within;
    }
    for (const link of jumpLinks) {
      const target = document.getElementById(link.getAttribute('href').slice(1));
      link.hidden = Boolean(query) && Boolean(target?.hidden);
    }
    if (!query) {
      status.textContent = '전체 ' + total + '편 · 주제별로 골라 읽을 수 있습니다.';
    } else {
      const note = corpusState === 'loading' ? ' · 본문을 불러오는 중입니다.'
        : corpusState === 'error' ? ' · 본문 연결이 어려워 제목·요약만 검색했습니다.'
        : '';
      status.textContent = (visible
        ? '검색 결과 ' + visible + '편 · 제목을 누르면 홈페이지 글이 열립니다.'
        : '일치하는 글이 없습니다. 검색어를 바꾸거나 전체 보기를 눌러 주세요.') + note;
    }
  }

  const search = () => {
    // Show instant results without waiting for the full text to load.
    if (norm(field.value) && corpusState === 'idle') {
      loadCorpus();
    }
    filter();
  };
  form.addEventListener('submit', event => {
    event.preventDefault();
    search();
  });
  field.addEventListener('input', search);
  reset.addEventListener('click', () => {
    field.value = '';
    filter();
    field.focus();
  });
})();