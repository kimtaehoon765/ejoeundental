(() => {
  const dialog=document.getElementById('gallery-dialog');
  const picture=document.getElementById('gallery-dialog-image');
  const caption=document.getElementById('gallery-dialog-title');
  const close=document.getElementById('gallery-close');
  if(!dialog || !picture || !caption || !close || typeof dialog.showModal!=='function') return;
  document.documentElement.classList.add('gallery-js');
  let opener=null;
  for(const button of document.querySelectorAll('.gallery-zoom')){
    button.addEventListener('click',()=>{
      opener=button;
      picture.src=button.dataset.image || '';
      picture.alt=button.dataset.alt || '이조은치과 창작 그림';
      caption.textContent=button.dataset.title || '그림 감상';
      dialog.showModal();
      close.focus();
    });
  }
  close.addEventListener('click',()=>dialog.close());
  dialog.addEventListener('click',event=>{
    if(event.target===dialog) dialog.close();
  });
  dialog.addEventListener('close',()=>{
    if(opener) opener.focus();
  });
})();