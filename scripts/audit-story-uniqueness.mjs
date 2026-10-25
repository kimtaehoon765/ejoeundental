// Prevent accidental republication of a prior patient education text.
// The clinic has many overlapping treatment topics; similarity alone is not
// proof of a duplicate, so near matches are review warnings, not hard errors.
import {readFileSync,readdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';

const normalizeText = value => String(value||'').normalize('NFKC').toLocaleLowerCase('ko-KR')
  .replace(/[\p{P}\p{S}\s]/gu,'');
const shingles = (text,size=13) => {
 const set=new Set();
 for(let i=0;i+size<=text.length;i++)set.add(text.slice(i,i+size));
 return set;
};
const similarity = (a,b) => {
 if(a===b)return 1;
 const x=shingles(a),y=shingles(b);
 if(!x.size||!y.size)return 0;
 let common=0;
 const smaller=x.size<=y.size?x:y,larger=x.size<=y.size?y:x;
 for(const fragment of smaller)if(larger.has(fragment))common++;
 return common/(x.size+y.size-common);
};
export function analyzePublishedStories(records) {
 const entries=records.filter(item=>item.published===true).map(item=>({
  slug:String(item.slug||''),title:String(item.title||''),
  source_url:String(item.source_url||''),text:normalizeText(item.body)
 }));
 const duplicates=[],nearMatches=[];
 const exactSource=new Map(),exactBody=new Map();
 for(const item of entries) {
  const source=item.source_url.trim();
  if(source) {
   if(exactSource.has(source))duplicates.push({first:exactSource.get(source),second:item.slug,reason:'reused verified source URL'});
   else exactSource.set(source,item.slug);
  }
  if(item.text.length>=250){
   if(exactBody.has(item.text))
    duplicates.push({first:exactBody.get(item.text),second:item.slug,reason:'same article body'});
   else exactBody.set(item.text,item.slug);
  }
 }
 // Compare the actual prose, not merely similar titles or common clinic terms.
 for(let i=0;i<entries.length;i++){
  const a=entries[i];
  if(a.text.length<350)continue;
  for(let j=i+1;j<entries.length;j++){
   const b=entries[j];
   if(b.text.length<350||a.text===b.text)continue;
   const ratio=Math.min(a.text.length,b.text.length)/Math.max(a.text.length,b.text.length);
   if(ratio<.76)continue;
   const score=similarity(a.text,b.text);
   if(score>=.78)nearMatches.push({first:a.slug,second:b.slug,score:+score.toFixed(3)});
  }
 }
 nearMatches.sort((a,b)=>b.score-a.score||a.first.localeCompare(b.first));
 return {published:entries.length,duplicates,nearMatches};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const folder=new URL('../content/posts/',import.meta.url);
 const rows=readdirSync(folder).filter(name=>name.endsWith('.json')).map(name=>({
  slug:name.slice(0,-5),
  ...JSON.parse(readFileSync(new URL(name,folder),'utf8'))
 }));
 const result=analyzePublishedStories(rows);
 console.log('[STORY UNIQUENESS] Checked',result.published,'published patient stories.');
 if(result.nearMatches.length){
  console.log('[STORY UNIQUENESS] Similar prose worth reviewing before publishing further posts:');
  for(const item of result.nearMatches.slice(0,8))
   console.log(' -',item.first,'~',item.second,'(Jaccard',item.score+')');
 }
 if(result.duplicates.length){
  for(const d of result.duplicates)console.error('[STORY UNIQUENESS] DUPLICATE:',d.first,'and',d.second,d.reason);
  process.exitCode=1;
 }else console.log('[STORY UNIQUENESS] No exact republications or reused original source URLs.');
}
