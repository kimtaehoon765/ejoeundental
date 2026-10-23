/* User-initiated patient article sharing, no analytics or network requests.
 * Use the current canonical URL so preview and production remain distinct.
 */
(function(){
 'use strict';
 const nativeShare=typeof navigator!=='undefined'&&typeof navigator.share==='function';
 const canCopy=typeof navigator!=='undefined'&&!!navigator.clipboard&&typeof navigator.clipboard.writeText==='function';
 const canPrint=typeof window!=='undefined'&&typeof window.print==='function';
 if(!nativeShare&&!canCopy&&!canPrint)return;
 const link=document.querySelector('link[rel="canonical"]');
 if(!link)return;
 let pageUrl;
 try{
  pageUrl=new URL(link.href,document.baseURI);
  if(pageUrl.protocol!=='https:'||!['ejoeundental.com','ejoeundental.pages.dev'].includes(pageUrl.hostname))return;
 }catch(_){return;}
 for(const controls of document.querySelectorAll('.article-share-actions')){
  const status=controls.querySelector('.article-share-status');
  const shareButton=controls.querySelector('[data-article-action="share"]');
  const copyButton=controls.querySelector('[data-article-action="copy"]');
  const printButton=controls.querySelector('[data-article-action="print"]');
  if(!status||!shareButton||!copyButton||!printButton)continue;
  if(nativeShare){
   shareButton.hidden=false;
   shareButton.addEventListener('click',async()=>{
    shareButton.disabled=true;
    try{
     await navigator.share({title:document.title,url:pageUrl.href});
     status.textContent='공유 기능을 열었습니다.';
    }catch(error){
     status.textContent=error?.name==='AbortError'?'공유를 취소했습니다.':'공유 기능을 사용할 수 없습니다. 링크 복사를 이용해 주세요.';
    }finally{shareButton.disabled=false;}
   });
  }
  if(canCopy){
   copyButton.hidden=false;
   copyButton.addEventListener('click',async()=>{
    copyButton.disabled=true;
    try{
     await navigator.clipboard.writeText(pageUrl.href);
     status.textContent='건강정보 링크를 복사했습니다.';
    }catch(_){
     status.textContent='자동 복사가 차단되었습니다. 주소창의 링크를 직접 복사해 주세요.';
    }finally{copyButton.disabled=false;}
   });
  }
  if(canPrint){
   printButton.hidden=false;
   printButton.addEventListener('click',()=>{
    status.textContent='';
    window.print();
   });
  }
  controls.hidden=false;
 }
})();
