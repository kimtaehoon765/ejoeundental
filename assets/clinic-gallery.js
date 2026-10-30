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
  const original=document.getElementById('gallery-dialog-original');
  const description=document.getElementById('gallery-dialog-description');
  const loadStatus=document.getElementById('gallery-dialog-loading');
  const artworks=[...document.querySelectorAll('.gallery-zoom')];
  const roomButtons=[...document.querySelectorAll('.gallery-dialog-room')];
  if(!dialog || !picture || !caption || !close || !prev || !next ||
     !position || !original || !description || !artworks.length ||
     typeof dialog.showModal!=='function') return;
  document.documentElement.classList.add('gallery-js');
  let opener=null;
  let currentIndex=0;

  function announceLoad(message) {
    if(!loadStatus)return;
    loadStatus.textContent=message;
    loadStatus.hidden=!message;
  }

  // The modal starts without an image src, avoiding a hidden eager request.
  // Only the user-selected painting is loaded; artwork links still work
  // without JavaScript thanks to the direct original-image anchors.
  picture.addEventListener('load',()=>announceLoad(''));
  picture.addEventListener('error',()=>{
    announceLoad('그림을 표시하지 못했습니다. 확대창을 닫고 원본 보기 링크를 이용해 주세요.');
  });

  function showArtwork(index) {
    currentIndex=(index+artworks.length)%artworks.length;
    const button=artworks[currentIndex];
    const sourceImage=button.dataset.image || '';
    // Only permit artworks in the public /assets directory. The original
    // link and displayed painting always belong to the selected button.
    const safeImage=/^\/assets\/[a-z0-9-]+\.(?:svg|webp|png|jpe?g)$/.test(sourceImage);
    picture.src=button.dataset.image || '';
    picture.alt=button.dataset.alt || '이조은치과 창작 그림';
    announceLoad(picture.complete && picture.naturalWidth>0?'':'그림을 불러오는 중입니다.');
    caption.textContent=button.dataset.title || '그림 감상';
    const artCaption=button.closest('.gallery-piece')?.querySelector('figcaption>p') ||
      button.closest('.gallery-patient-studies__piece')?.querySelector('figcaption>p') ||
      button.closest('.gallery-watercolor-card')?.querySelector('.gallery-note--watercolor>span>span:last-child');
    description.textContent=artCaption?.textContent?.trim() || button.dataset.alt || '';
    original.hidden=!safeImage;
    if(safeImage){
      original.setAttribute('href',sourceImage);
      original.setAttribute('aria-label',caption.textContent+' 원본 그림을 새 창에서 보기');
    }else{
      original.removeAttribute('href');
      original.removeAttribute('aria-label');
    }
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
    // The three exhibition shortcuts always reflect the painting currently
    // on display, including when the user swipes or uses arrow keys.
    roomButtons.forEach(roomButton=>{
      roomButton.setAttribute('aria-current',String(roomButton.dataset.room===room));
    });
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
  roomButtons.forEach(roomButton=>{
    roomButton.addEventListener('click',()=>{
      if(!dialog.open)return;
      const first=artworks.findIndex(item=>
        item.closest('section[id]')?.id===roomButton.dataset.room);
      if(first>=0)showArtwork(first);
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
  picture.addEventListener('touchmove',event=>{
    // If a second finger joins the gesture, never interpret it as navigation.
    if(event.touches.length!==1)touchStart=null;
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
    announceLoad('');
    if(opener?.isConnected) opener.focus();
  });
})();
