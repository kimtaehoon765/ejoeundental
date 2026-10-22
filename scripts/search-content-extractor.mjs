// Extract clinical article text for on-site search without matching the same menu
// labels (e.g. "잇몸치료") on every unrelated page.
export function extractSearchText(input,{maxLength=24000}={}){
 const html=String(input||'');
 const body=html.match(/<main\b[^>]*>([\s\S]*?)<\/main\s*>/i)?.[1]||html;
 const visible=body
  .replace(/<!--[\s\S]*?-->/g,' ')
  .replace(/<(script|style|noscript|svg|template)\b[^>]*>[\s\S]*?<\/\1\s*>/gi,' ')
  .replace(/<(nav|form|footer)\b[^>]*>[\s\S]*?<\/\1\s*>/gi,' ')
  .replace(/<[^>]*>/g,' ')
  .replace(/&nbsp;|&#160;/gi,' ')
  .replace(/&amp;|&#38;/gi,'&')
  .replace(/&lt;|&#60;/gi,'<')
  .replace(/&gt;|&#62;/gi,'>')
  .replace(/&quot;|&#34;/gi,'"')
  .replace(/&#39;|&apos;/gi,"'")
  .replace(/\s+/g,' ')
  .trim();
 return visible.slice(0,maxLength);
}
