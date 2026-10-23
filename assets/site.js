// Preserve the three patient-education links in the initial HTML.
// Published journal cards are rendered during the static build, not fetched
// and swapped into the page after a mobile visitor starts reading.
const set=(id,value)=>{
 const el=document.getElementById(id);
 if(el&&(typeof value==='string'||typeof value==='number'))el.textContent=String(value);
};
(async()=>{
 let settings={};
 try{
  const response=await fetch('/content/site.json');
  if(!response.ok)throw new Error('Site config HTTP '+response.status);
  const data=await response.json();
  if(!data||typeof data!=='object'||Array.isArray(data))throw new Error('Invalid site settings');
  settings=data;
 }catch(error){
  console.warn('Using static clinic contact details because site settings did not load:',error);
 }
 ['address','phone'].forEach(key=>set(key,settings[key]));
 set('footer_address',settings.address);
 for(let i=1;i<=3;i++){
  const link=document.getElementById('blog'+i);
  if(!link)continue;
  const url=settings['blog'+i]||link.getAttribute('href');
  let parsed;
  try{parsed=new URL(url,location.origin)}catch{}
  if(parsed?.protocol==='https:'&&!parsed.username&&!parsed.password&&
    (parsed.hostname==='naver.com'||parsed.hostname.endsWith('.naver.com'))){
   link.href=parsed.href;
   link.hidden=false;
  }else{
   link.removeAttribute('href');
   link.hidden=true;
  }
 }
})();
