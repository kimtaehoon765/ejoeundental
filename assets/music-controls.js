const initializeMusicControls=()=>{
  const button=document.getElementById('piano-toggle');
  const audio=document.getElementById('piano-audio');
  const status=document.getElementById('piano-status');
  if(!button||!audio||!status)return;
  document.querySelectorAll('.pop-menu nav a').forEach(link=>{
    link.addEventListener('click',()=>audio.pause());
  });
  const randomPop=document.getElementById('random-pop');
  randomPop?.addEventListener('click',()=>{
    const links=[...document.querySelectorAll('.pop-menu nav a')];
    if(!links.length)return;
    let choices=links;
    try{
      const previous=sessionStorage.getItem('clinic-last-random-artist');
      if(links.length>1)choices=links.filter(link=>link.href!==previous);
    }catch{}
    const pick=choices[Math.floor(Math.random()*choices.length)];
    try{sessionStorage.setItem('clinic-last-random-artist',pick.href)}catch{}
    audio.pause();
    const fallback=document.getElementById('random-pop-fallback');
    if(fallback){
      fallback.href=pick.href;
      fallback.textContent='선택된 가수: '+pick.textContent.trim()+' — 유튜브 열기 ↗';
      fallback.hidden=false;
      fallback.focus();
    }
  });
  const player=document.querySelector('.piano-player');
  const reopen=document.getElementById('music-reopen');
  const mobileReopen=document.getElementById('music-header-button');
  const setPanelVisibility=(isOpen)=>{
    if(player)player.hidden=!isOpen;
    for(const trigger of [reopen,mobileReopen]){
      if(!trigger)continue;
      trigger.hidden=isOpen;
      trigger.setAttribute('aria-expanded',String(isOpen));
    }
  };
  const popMenu=document.querySelector('.pop-menu');
  const randomResult=document.getElementById('random-pop-fallback');
  popMenu?.addEventListener('toggle',()=>{
    if(!popMenu.open&&randomResult)randomResult.hidden=true;
  });
  const hide=document.getElementById('music-hide');
  hide?.addEventListener('click',()=>{
    audio.pause();
    if(popMenu)popMenu.open=false;
    if(randomResult)randomResult.hidden=true;
    setPanelVisibility(false);
    // Return focus to a visible control. The mobile shortcut is docked in
    // the header and intentionally hidden when the page has been scrolled.
    const onPhone=window.matchMedia('(max-width: 600px)').matches;
    const headerVisible=mobileReopen&&!mobileReopen.hidden&&getComputedStyle(mobileReopen).display!=='none';
    if(onPhone){
      if(headerVisible)mobileReopen.focus();
      else document.querySelector('header .nav .logo')?.focus();
    }else reopen?.focus();
  });
  reopen?.addEventListener('click',()=>{
    setPanelVisibility(true);
    button.focus();
  });
  // Music controls start minimized on every page load; no stale saved open state.
  setPanelVisibility(false);
  try{sessionStorage.removeItem('clinic-music-collapsed')}catch{}
  player?.addEventListener('keydown',event=>{
    if(event.key!=='Escape'||player.hidden)return;
    event.preventDefault();
    if(popMenu?.open){
      popMenu.open=false;
      popMenu.querySelector('summary')?.focus();
    }else{
      hide?.click();
    }
  });
  // Never continue playing music when the visitor leaves the page.
  window.addEventListener('pagehide',()=>audio.pause());
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden&&!audio.paused)audio.pause();
  });
  const volume=document.getElementById('piano-volume');
  const volumeValue=document.getElementById('piano-volume-value');
  const updateVolume=()=>{
    if(!volume)return;
    const level=Math.min(100,Math.max(0,Number(volume.value)||0));
    audio.volume=level/100;
    if(volumeValue)volumeValue.textContent=level+'%';
  };
  volume?.addEventListener('input',()=>{
    updateVolume();
    try{localStorage.setItem('clinic-piano-volume',volume.value)}catch{}
  });
  try{
    const saved=localStorage.getItem('clinic-piano-volume');
    if(saved!==null&&/^\d{1,3}$/.test(saved)&&Number(saved)<=100&&volume)volume.value=saved;
  }catch{}
  updateVolume();
  button.addEventListener('click',async()=>{
    if(!audio.paused){audio.pause();return}
    if(document.hidden)return;
    if(!audio.getAttribute('src')&&audio.dataset.src)audio.src=audio.dataset.src;
    status.textContent='음악 연결 중…';
    try{await audio.play()}catch{
      button.setAttribute('aria-pressed','false');
      button.textContent='♫ 다시 시도';
      status.textContent='음악을 재생할 수 없습니다. 음원 정보 링크를 확인해 주세요.';
    }
  });
  audio.addEventListener('play',()=>{button.textContent='♫ 음악 끄기';button.setAttribute('aria-pressed','true');status.textContent='쇼팽 · 녹턴'});
  audio.addEventListener('pause',()=>{
    button.textContent='♫ 피아노 음악 듣기';
    button.setAttribute('aria-pressed','false');
    if(audio.error){
      button.textContent='♫ 다시 시도';
      status.textContent='음원 연결에 실패했습니다. 음원 정보를 확인해 주세요.';
    }else{
      status.textContent='음악 꺼짐';
    }
  });
  audio.addEventListener('error',()=>{
    button.textContent='♫ 다시 시도';
    button.setAttribute('aria-pressed','false');
    status.textContent='음원 연결에 실패했습니다. 원본 음원 링크를 확인해 주세요.';
  });
  audio.addEventListener('waiting',()=>{if(!audio.paused)status.textContent='음악 불러오는 중…'});
  audio.addEventListener('playing',()=>{status.textContent='쇼팽 · 녹턴'});
};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initializeMusicControls,{once:true});
else initializeMusicControls();
