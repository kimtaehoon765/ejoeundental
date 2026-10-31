/* 이조은치과 — visit preparation, local-only checkbox summary.
   No persistence, network request, form submission or personal data capture. */
(()=>{
  'use strict';
  const section=document.getElementById('previsit-info');
  const panel=document.getElementById('previsit-progress');
  const count=document.getElementById('previsit-selected-count');
  const clear=document.getElementById('previsit-clear');
  if(!section||!panel||!count||!clear)return;
  const choices=Array.from(section.querySelectorAll('input[type="checkbox"]'));
  if(!choices.length)return;
  const update=()=>{
    const checked=choices.filter(input=>input.checked).length;
    count.textContent='선택한 준비 항목 '+checked+'개';
    clear.disabled=checked===0;
  };
  section.addEventListener('change',update);
  clear.addEventListener('click',()=>{
    for(const input of choices)input.checked=false;
    update();
    choices[0].focus();
  });
  panel.hidden=false;
  update();
})();
