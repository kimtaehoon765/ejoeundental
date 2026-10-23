/* One-time, patient-directed FAQ anchors: no cookies, tracking or requests.
 * Existing <details> remain keyboard-usable with JavaScript disabled.
 */
(function(){
 'use strict';
 const faq=document.querySelector('#faq .faq-list');
 if(!faq)return;
 function reveal(){
  let id;
  try{id=decodeURIComponent(String(window.location.hash||'').slice(1));}catch(_){return;}
  if(!/^faq-[a-z0-9-]+$/.test(id))return;
  const question=document.getElementById(id);
  if(!question||question.tagName!=='DETAILS'||!faq.contains(question))return;
  question.open=true;
  if(typeof window.requestAnimationFrame==='function'&&typeof question.scrollIntoView==='function'){
   window.requestAnimationFrame(()=>question.scrollIntoView({block:'start'}));
  }
 }
 window.addEventListener('hashchange',reveal);
 reveal();
})();
