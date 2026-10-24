/* Progressive enhancement for the entire dental story directory.
 * With JavaScript disabled, the form still searches /search.html.
 * With JavaScript enabled, visitors filter every published story locally. */
(() => {
  'use strict';
  const directory = document.getElementById('story-directory');
  const form = document.querySelector('form.directory-search');
  const field = document.getElementById('stories-q');
  if (!directory || !form || !field) return;

  const sections = [...directory.querySelectorAll('.story-topic')];
  const jumpLinks = [...directory.querySelectorAll('.topic-jump a[href^="#topic-"]')];
  const items = sections.map(section => ({
    section,
    cards: [...section.querySelectorAll('a.story-card')]
  }));
  if (!items.length || items.some(item => !item.cards.length)) return;
  const total = items.reduce((count, item) => count + item.cards.length, 0);

  const norm = value => String(value || '')
    .normalize('NFKC').toLocaleLowerCase('ko-KR')
    .replace(/[^\p{L}\p{N}]/gu, '');
  const searchable = new Map();
  for (const item of items) {
    for (const card of item.cards) {
      searchable.set(card, norm(card.textContent));
    }
  }

  const label = form.querySelector('label[for="stories-q"]');
  if (label) label.textContent = '홈페이지 글 ' + total + '편에서 제목·내용 찾기';
  field.placeholder = '예: 잇몸 출혈, 재신경치료, 보험 진료';

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

  function filter() {
    const query = norm(field.value);
    reset.hidden = !query;
    let visible = 0;
    for (const item of items) {
      let within = 0;
      for (const card of item.cards) {
        const matched = !query || searchable.get(card).includes(query);
        card.hidden = !matched;
        if (matched) within++;
      }
      item.section.hidden = within === 0;
      visible += within;
    }
    for (const link of jumpLinks) {
      const target = document.getElementById(link.getAttribute('href').slice(1));
      link.hidden = Boolean(query) && Boolean(target?.hidden);
    }
    status.textContent = !query
      ? '전체 ' + total + '편 · 주제별로 골라 읽을 수 있습니다.'
      : visible
        ? '검색 결과 ' + visible + '편 · 제목을 누르면 홈페이지 글이 열립니다.'
        : '일치하는 글이 없습니다. 검색어를 바꾸거나 전체 보기를 눌러 주세요.';
  }

  form.addEventListener('submit', event => {
    event.preventDefault();
    filter();
  });
  field.addEventListener('input', filter);
  reset.addEventListener('click', () => {
    field.value = '';
    filter();
    field.focus();
  });
})();
