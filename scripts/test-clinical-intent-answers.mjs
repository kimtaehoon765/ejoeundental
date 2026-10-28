import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
const dist=f=>readFileSync('dist/'+f,'utf8');
const cases=[
 {file:'gum-treatment.html',id:'gum-clinical-decisions',label:'부평 잇몸치료',parts:['스케일링만으로 충분할까요?','잇몸치료는 누가 시행하나요?','건강보험은 어떻게 적용되나요?'],links:['/doctor.html','/gum-treatment-faq.html','/insured-care.html','/visit-guide.html']},
 {file:'retreatment.html',id:'retreatment-clinical-decisions',label:'인천·부평 재신경치료',parts:['재신경치료를 고려할 수 있나요?','발치가 필요한 경우는 언제인가요?','크라운·포스트가 있으면 어떻게 하나요?'],links:['/doctor.html','/root-canal-retreatment-faq.html','/tooth-preservation.html','/visit-guide.html']}
];
test('clinical answer stylesheet exists and is readable on mobile',()=>{
 assert.ok(existsSync('dist/assets/clinical-answer-strip.css'));
 const css=dist('assets/clinical-answer-strip.css');
 assert.match(css,/\.clinical-answer-strip \.clinical-answer-grid/);
 assert.match(css,/@media\(max-width:820px\)/);
 assert.match(css,/grid-template-columns:minmax\(0,1fr\)/);
 assert.match(css,/word-break:keep-all/);
 let depth=0;for(const c of css.replace(/\/\*[\s\S]*?\*\//g,'')){if(c==='{')depth++;if(c==='}')depth--;assert.ok(depth>=0)}
 assert.equal(depth,0);
});
for(const c of cases){
 test('patient-intent answer section is visible and attributable: '+c.file,()=>{
  const s=dist(c.file);
  const anchor='<section class="clinical-answer-strip" id="'+c.id+'"';
  assert.ok(s.includes(anchor),'missing clinical answer strip');
  assert.match(s,/href="\/assets\/clinical-answer-strip\.css\?v=/);
  const a=s.indexOf(anchor);
  const b=s.indexOf('</section>',a);
  const section=s.slice(a,b+10);
  const toc=s.indexOf('class="treatment-page-toc"');
  assert.ok(a>toc && a<toc+1800,'answers should follow the main patient navigation, before other medical prose');
  assert.ok(section.includes(c.label));
  assert.equal((section.match(/class="clinical-answer-card"/g)||[]).length,3);
  for(const part of c.parts)assert.ok(section.includes(part),'missing patient question: '+part);
  for(const link of c.links)assert.ok(section.includes('href="'+link+'"'),'missing grounded link '+link);
  assert.ok(section.includes('개별 검사')||section.includes('개별 검사에 따라'),'no medical uncertainty notice');
  assert.ok(s.includes('고려대학교 의학박사')&&s.includes('통합치의학과 전문의'));
  assert.ok(s.includes('href="https://booking.naver.com/booking/13/bizes/1162931"'),'booking missing');
  assert.ok(s.includes('href="tel:0325132875"'),'call missing');
 });
}