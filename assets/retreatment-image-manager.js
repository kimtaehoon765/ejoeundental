/* Optional image overrides from Pages CMS. Embedded originals remain as fallback. */
(async function () {
  const keys = ['hero','reason1','reason2','reason3','reason4','step1','step2','step3','step4','closing'];
  const imgs = [...document.querySelectorAll('main img')];
  if (imgs.length !== keys.length) return;
  try {
    const response = await fetch('/assets/retreatment-images.json', {cache:'no-store'});
    if (!response.ok) return;
    const overrides = await response.json();
    for (let i=0;i<keys.length;i++) {
      const url = overrides[keys[i]];
      if (typeof url !== 'string' || !url.startsWith('/assets/cms-images/')) continue;
      const preload = new Image();
      preload.onload = () => { imgs[i].src = url; };
      preload.src = url;
    }
  } catch (error) { console.warn('Using original retreatment illustrations', error); }
})();
