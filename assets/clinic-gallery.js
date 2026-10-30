/* Original four-art exhibition: progressive enhancement. Without dialog
 * support, each artwork still has its direct "원본 보기" link. */
(() => {
  const dialog=document.getElementById('gallery-dialog');
  const picture=document.getElementById('gallery-dialog-image');
  const caption=document.getElementById('gallery-dialog-title');
  const sectionLabel=document.getElementById('gallery-dialog-section');
  const close=document.getElementById('gallery-close');
  const prev=document.getElementById('gallery-prev');
  const next=document.getElementById('gallery-next');
  const position=document.getElementById('gallery-dialog-position');
  const related=document.getElementById('gallery-dialog-care');
  const artworks=[...document.querySelectorAll('.gallery-zoom')];
  if(!dialog || !picture || !caption || !close || !prev || !next ||
     !position || !artworks.length || typeof dialog.showModal!=='function') return;
  document.documentElement.classList.add('gallery-js');
  let opener=null;
  let currentIndex=0;

  function showArtwork(index) {
    currentIndex=(index+artworks.length)%artworks.length;
    const button=artworks[currentIndex];
    picture.src=button.dataset.image || '';
    picture.alt=button.dataset.alt || '이조은치과 창작 그림';
    caption.textContent=button.dataset.title || '그림 감상';
    // The gallery is three curated rooms, not one anonymous 23-image reel.
    // Derive labels from the actual section containing each artwork instead
    // of hard-coding index boundaries that may drift as the gallery grows.
    const room=button.closest('section[id]')?.id;
    const rooms={
      paintings:['제1전시실','풍경과 캐릭터'],
      education:['제2전시실','진료 수채화'],
      'patient-studies':['제3전시실','진료 준비 그림']
    };
    const roomData=rooms[room];
    if(sectionLabel){
      if(roomData){
        const inRoom=artworks.filter(item=>item.closest('section[id]')?.id===room);
        sectionLabel.textContent=roomData[0]+' · '+roomData[1]+' '+
          String(inRoom.indexOf(button)+1)+' / '+inRoom.length;
      }else{
        sectionLabel.textContent='이조은치과 · 창작 갤러리';
      }
    }
    // Patient-study paintings already link to their matching clinic guide.
    // Reuse that verified local link inside the lightbox; decorative landscape
    // paintings must not inherit a medical destination from the prior image.
    if(related){
      const guide=button.closest('.gallery-patient-studies__piece')
        ?.querySelector('.gallery-patient-studies__actions > a[href^="/"]') ||
        button.closest('.gallery-watercolor-card')
          ?.querySelector('.gallery-note--watercolor[href^="/"]');
      const href=guide?.getAttribute('href');
      const hasGuide=Boolean(href && /^\/[a-z0-9-]+\.html(?:#[-a-z0-9]+)?$/.test(href));
      related.hidden=!hasGuide;
      dialog.classList.toggle('gallery-dialog--care',hasGuide);
      if(hasGuide){
        related.setAttribute('href',href);
        related.textContent='관련 건강정보 읽기 →';
        related.setAttribute('aria-label',caption.textContent+' 관련 건강정보 읽기');
      }else{
        related.removeAttribute('href');
        related.removeAttribute('aria-label');
      }
    }
    position.textContent=String(currentIndex+1).padStart(2,'0')+
      ' / '+String(artworks.length).padStart(2,'0');
  }
  function moveArtwork(direction) {
    if(!dialog.open) return;
    showArtwork(currentIndex+direction);
  }
  artworks.forEach((button,index)=>{
    button.addEventListener('click',()=>{
      opener=button;
      showArtwork(index);
      dialog.showModal();
      close.focus();
    });
  });
  prev.addEventListener('click',()=>moveArtwork(-1));
  next.addEventListener('click',()=>moveArtwork(1));
  // Native <dialog> keeps focus inside; Escape and backdrop closing remain.
  dialog.addEventListener('keydown',event=>{
    if(!dialog.open || event.altKey || event.ctrlKey || event.metaKey) return;
    if(event.key==='ArrowLeft' || event.key==='ArrowRight'){
      event.preventDefault();
      moveArtwork(event.key==='ArrowLeft'?-1:1);
    }
  });
  // Swipe only when a one-finger gesture is clearly horizontal. Keep native
  // vertical scrolling and pinch/zoom intact; never preventDefault on touch.
  let touchStart=null;
  picture.addEventListener('touchstart',event=>{
    if(!dialog.open || event.touches.length!==1){touchStart=null;return;}
    touchStart={x:event.touches[0].clientX,y:event.touches[0].clientY};
  },{passive:true});
  picture.addEventListener('touchend',event=>{
    if(!dialog.open || !touchStart){touchStart=null;return;}
    const start=touchStart;
    touchStart=null;
    if(event.changedTouches.length!==1)return;
    const dx=event.changedTouches[0].clientX-start.x;
    const dy=event.changedTouches[0].clientY-start.y;
    if(Math.abs(dx)>=60 && Math.abs(dx)>Math.abs(dy)*1.5){
      moveArtwork(dx<0?1:-1);
    }
  },{passive:true});
  picture.addEventListener('touchcancel',()=>{touchStart=null;},{passive:true});
  close.addEventListener('click',()=>dialog.close());
  dialog.addEventListener('click',event=>{
    if(event.target===dialog) dialog.close();
  });
  dialog.addEventListener('close',()=>{
    if(opener?.isConnected) opener.focus();
  });
})();
