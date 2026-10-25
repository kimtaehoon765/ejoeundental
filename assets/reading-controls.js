/* Local-only reading preference; no analytics, cookies or server submission. */
(function(){
 'use strict';
 const panel=document.querySelector('main.article .reading-controls')||
  document.querySelector('article.article .reading-controls');
 const article=panel?.closest('main.article')||panel?.closest('article.article');
 if(!panel||!article)return;
 const storageKey='ejoeundental-reading-size';
 const allowed=new Set(['normal','large','extra']);
 let initial='normal';
 try{
  const saved=window.localStorage.getItem(storageKey);
  if(allowed.has(saved))initial=saved;
 }catch(_){/* Private browsing may block storage; controls still work. */}
 const buttons=[...panel.querySelectorAll('button[data-reading-size]')];
 function apply(value){
  if(!allowed.has(value))return;
  if(value==='normal')article.removeAttribute('data-reading-size');
  else article.setAttribute('data-reading-size',value);
  buttons.forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.readingSize===value)));
 }
 apply(initial);
 buttons.forEach(button=>button.addEventListener('click',function(){
  const value=button.dataset.readingSize;
  apply(value);
  try{window.localStorage.setItem(storageKey,value)}catch(_){}
 }));
 panel.classList.add('is-ready');
})();
