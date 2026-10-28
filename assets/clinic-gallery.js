/* Original four-art exhibition: progressive enhancement. Without dialog
 * support, each artwork still has its direct "원본 보기" link. */
(() => {
  const dialog=document.getElementById('gallery-dialog');
  const picture=document.getElementById('gallery-dialog-image');
  const caption=document.getElementById('gallery-dialog-title');
  const close=document.getElementById('gallery-close');
  const prev=document.getElementById('gallery-prev');
  const next=document.getElementById('gallery-next');
  const position=document.getElementById('gallery-dialog-position');
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
  close.addEventListener('click',()=>dialog.close());
  dialog.addEventListener('click',event=>{
    if(event.target===dialog) dialog.close();
  });
  dialog.addEventListener('close',()=>{
    if(opener?.isConnected) opener.focus();
  });
})();
