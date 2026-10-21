// Cloudflare Pages advanced-mode Worker for the SEPARATE owner library project.
// Required secret: OWNER_PASSWORD (set with wrangler pages secret put OWNER_PASSWORD).
// Required plain variable: OWNER_USERNAME (optional, defaults to owner).
// IMPORTANT: Bind static files via env.ASSETS (Cloudflare Pages automatically provides this).
const unauthorized=()=>new Response('Authentication required',{status:401,headers:{'WWW-Authenticate':'Basic realm="Owner Library", charset="UTF-8"','Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow, noarchive'}});
const denied=()=>new Response('Owner library is not configured',{status:503,headers:{'Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow, noarchive'}});
function safeEqual(a,b){if(a.length!==b.length)return false;let diff=0;for(let i=0;i<a.length;i++)diff|=a.charCodeAt(i)^b.charCodeAt(i);return diff===0}
export default {
 async fetch(request,env){
  // Never serve ANY asset without a configured server-side secret.
  if(!env.OWNER_PASSWORD || env.OWNER_PASSWORD.length<16 || !env.ASSETS)return denied();
  const auth=request.headers.get('Authorization')||'';
  if(!auth.startsWith('Basic '))return unauthorized();
  let raw;
  try{raw=atob(auth.slice(6).trim())}catch{return unauthorized()}
  const colon=raw.indexOf(':');
  if(colon<0)return unauthorized();
  const username=raw.slice(0,colon),password=raw.slice(colon+1);
  if(!safeEqual(username,env.OWNER_USERNAME||'owner') || !safeEqual(password,env.OWNER_PASSWORD))return unauthorized();
  const response=await env.ASSETS.fetch(request);
  const headers=new Headers(response.headers);
  headers.set('Cache-Control','private, no-store');
  headers.set('X-Robots-Tag','noindex, nofollow, noarchive');
  headers.set('X-Content-Type-Options','nosniff');
  return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
 }
};
