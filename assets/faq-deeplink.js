/* Expand the existing FAQ question when a reader follows a quick-link or
   arrives at the question's URL. Native <details> remain usable without JS. */
(function(){
  function questionForHash(hash){
    if(!hash || hash.charAt(0)!=='#')return null;
    var id;
    try{id=decodeURIComponent(hash.slice(1));}catch(_){return null;}
    var target=document.getElementById(id);
    return target&&target.matches('#faq .faq-list > details[id]')?target:null;
  }
  function openHashQuestion(){
    var question=questionForHash(window.location.hash);
    if(question)question.open=true;
  }
  document.addEventListener('click',function(event){
    var link=event.target.closest('#faq .faq-quick-links a[href^="#"]');
    if(!link)return;
    var question=questionForHash(link.getAttribute('href'));
    if(question)question.open=true;
  });
  window.addEventListener('hashchange',openHashQuestion);
  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',openHashQuestion,{once:true});
  }else{
    openHashQuestion();
  }
})();
