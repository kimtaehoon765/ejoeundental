/* Progressive enhancement for the public, owner-authored blog index.
 * Every original blog link and native <details> remains usable without JS. */
(() => {
  'use strict';
  const section = document.getElementById('archive-blog-posts');
  const collection = document.getElementById('archive-blog-collections');
  if (!section || !collection) return;
  const groups = [...collection.querySelectorAll('details.archive-blog-group')];
  if (groups.length === 0) return;

  const normalize = value => String(value || '')
    .toLocaleLowerCase('ko-KR').replace(/[^\p{L}\p{N}]/gu, '');
  // Patients often type two separate terms, such as "부평 잇몸치료".
  // Match both words even when the original blog title places them apart,
  // while preserving existing unspaced Korean phrase matches.
  const searchTerms = value => [...new Set(String(value || '')
    .split(/[\s,，、;；/!?()·.\-]+/u).map(normalize).filter(Boolean))];

  // Create controls only when scripting is available. Without JS the original
  // topic summaries and every source link stay fully accessible.
  const box = document.createElement('div');
  box.className = 'archive-search';
  box.setAttribute('role', 'search');
  box.setAttribute('aria-label', '원장 네이버 글 제목 찾기');
  const label = document.createElement('label');
  label.htmlFor = 'archive-post-search';
  label.textContent = '원장 글 제목·주제 찾기';
  const input = document.createElement('input');
  input.id = 'archive-post-search';
  input.type = 'search';
  input.placeholder = '예: 부평 잇몸치료, 산곡동 신경치료';
  input.autocomplete = 'off';
  input.setAttribute('aria-controls', 'archive-blog-collections');
  const clearButton = document.createElement('button');
  clearButton.type = 'button';
  clearButton.className = 'archive-search-clear';
  clearButton.textContent = '검색 초기화';
  clearButton.setAttribute('aria-label', '검색어를 지우고 전체 글 보기');
  clearButton.hidden = true;
  const status = document.createElement('p');
  status.className = 'archive-search-status';
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  status.textContent = '주제별 제목을 펼치거나 검색어를 입력해 보세요.';
  box.append(label, input, clearButton, status);
  section.insertBefore(box, collection);

  const groupsWithLinks = groups.map(group => ({
    group,
    topic: normalize(group.querySelector('summary strong')?.textContent),
    items: [...group.querySelectorAll('li')].map(li => ({
      li,
      title: normalize(li.querySelector('a')?.textContent)
    }))
  }));
  // Count published article links from the generated archive, never from
  // outdated text or a hard-coded total. New blog posts need no JS updates.
  const totalPosts = groupsWithLinks.reduce((count, { items }) => count + items.length, 0);
  box.setAttribute('aria-label', '원장 네이버 글 ' + totalPosts + '편 찾기');
  label.textContent = '원장 글 ' + totalPosts + '편에서 제목·주제 찾기';
  status.textContent = '전체 ' + totalPosts + '편 · 주제별 제목을 펼치거나 검색어를 입력해 보세요.';
  let openBeforeSearch = null;

  function filterPosts() {
    const query = normalize(input.value);
    const terms = searchTerms(input.value);
    clearButton.hidden = !query;
    if (!query) {
      for (const { group, items } of groupsWithLinks) {
        group.hidden = false;
        for (const { li } of items) li.hidden = false;
        if (openBeforeSearch) group.open = openBeforeSearch.get(group) === true;
      }
      openBeforeSearch = null;
      status.textContent = '전체 ' + totalPosts + '편 · 주제별 제목을 펼쳐 원문을 볼 수 있습니다.';
      return;
    }
    if (!openBeforeSearch) {
      openBeforeSearch = new Map(groups.map(group => [group, group.open]));
    }
    let found = 0;
    for (const { group, topic, items } of groupsWithLinks) {
      // An archive heading such as "잇몸치료" describes many different posts.
      // Prefer articles whose own titles match, rather than labeling every
      // article in that category as an exact search result. If no title
      // matches, the topic may still be opened as a broad navigation fallback.
      const titleMatches = items.map(({ title }) =>
        title.includes(query) ||
        (terms.length > 1 && terms.every(term =>
          title.includes(term) || topic.includes(term))));
      const anyTitleMatch = titleMatches.some(Boolean);
      const wholeTopicMatches = topic.includes(query);
      let inGroup = 0;
      for (const [index, { li }] of items.entries()) {
        const matched = titleMatches[index] || (!anyTitleMatch && wholeTopicMatches);
        li.hidden = !matched;
        if (matched) inGroup++;
      }
      group.hidden = inGroup === 0;
      group.open = inGroup > 0;
      found += inGroup;
    }
    status.textContent = found
      ? '원장 글 ' + found + '편을 찾았습니다. 제목을 누르면 네이버 원문이 열립니다.'
      : '일치하는 원장 글이 없습니다. 다른 검색어로 다시 찾아보세요.';
  }
  // A direct query link is shareable when first opened. Once the patient
  // edits or clears that query, remove its stale URL parameter without
  // navigating away, preserving unrelated parameters and the section anchor.
  function discardStaleQueryFromAddress() {
    const params = new URLSearchParams(window.location.search || '');
    if (!params.has('q')) return;
    params.delete('q');
    const remaining = params.toString();
    const target = (window.location.pathname || '/clinical-archive.html') +
      (remaining ? '?' + remaining : '') + (window.location.hash || '');
    window.history?.replaceState?.(null, '', target);
  }
  input.addEventListener('input', filterPosts);
  input.addEventListener('input', discardStaleQueryFromAddress);
  clearButton.addEventListener('click', () => {
    input.value = '';
    filterPosts();
    discardStaleQueryFromAddress();
    input.focus();
  });

  const allowed = new Set(groups.map(group => group.id));
  function openDeepLinkedTopic(isNavigation) {
    const id = window.location.hash.replace(/^#/, '');
    if (!allowed.has(id)) return;
    if (input.value) {
      input.value = '';
      filterPosts();
    }
    if (isNavigation) discardStaleQueryFromAddress();
    const group = document.getElementById(id);
    group.hidden = false;
    group.open = true;
    if (isNavigation) {
      group.scrollIntoView({ block: 'start' });
      group.querySelector('summary')?.focus({ preventScroll: true });
    }
  }
  // A homepage search arrives as /clinical-archive.html?q=...#archive-blog-posts.
  // Run the same accessible filter, preserving each article's original URL.
  // A direct topic deep link has priority and must always remain usable.
  const initialTopic = window.location.hash.replace(/^#/, '');
  if (allowed.has(initialTopic)) {
    openDeepLinkedTopic(false);
  } else {
    const startingQuery = new URLSearchParams(window.location.search || '').get('q');
    if (startingQuery && startingQuery.trim()) {
      input.value = startingQuery.trim().slice(0, 100);
      filterPosts();
    }
  }
  // Defer executes after the static HTML is parsed; hash changes continue to
  // reveal the original groups and reset filters when appropriate.
  window.addEventListener('hashchange', () => openDeepLinkedTopic(true));
})();