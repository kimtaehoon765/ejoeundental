import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {join} from 'node:path';

const profile=JSON.parse(readFileSync('content/site.json','utf8'));
const target=join('dist','clinic-contact.vcf');
const escapeVcard=s=>String(s).replace(/\\/g,'\\\\').replace(/\r?\n/g,'\\n').replace(/;/g,'\\;').replace(/,/g,'\\,');

test('clinic vCard is present, standard-formatted and generated from verified clinic details',()=>{
 assert.ok(existsSync(target),'contact card must be present in deployed build');
 const raw=readFileSync(target,'utf8');
 assert.match(raw,/^BEGIN:VCARD\r\nVERSION:3\.0\r\n/);
 assert.ok(raw.endsWith('END:VCARD\r\n'),'vCard must end with CRLF');
 assert.ok(!/(?<!\r)\n/.test(raw),'vCard must use CRLF lines');
 for(const line of raw.trimEnd().split('\r\n')){
  assert.ok(Buffer.byteLength(line,'utf8')<=75,'vCard folded line must be at most 75 UTF-8 bytes');
 }
 const unfolded=raw.replace(/\r\n /g,'');
 assert.ok(unfolded.includes('FN:이조은치과의원\r\n'),'patient should see the clinic name');
 assert.ok(unfolded.includes('ORG:이조은치과의원\r\n'),'contact should identify the organization');
 assert.ok(unfolded.includes('TEL;TYPE=WORK,VOICE:'+profile.phone+'\r\n'),
  'telephone number must match current clinic profile');
 assert.ok(unfolded.includes('ADR;TYPE=WORK:;;'+escapeVcard(profile.address)+';;;;대한민국\r\n'),
  'address must match verified public website and escape the comma');
 assert.ok(unfolded.includes('URL:https://ejoeundental.com/\r\n'),
  'contact must use the canonical clinic domain');
 assert.ok(!unfolded.includes('EMAIL:')&&!unfolded.includes('PHOTO:'),
  'do not fabricate an email or attach an unrelated picture');
});

test('contact download is clearly linked only from patient visit sections',()=>{
 const home=readFileSync('dist/index.html','utf8');
 const visit=readFileSync('dist/visit-guide.html','utf8');
 for(const [page,markup] of [['homepage',home],['visit guide',visit]]){
  assert.equal((markup.match(/href="\/clinic-contact\.vcf"/g)||[]).length,1,page+' must expose one clear download');
  assert.match(markup,/download="이조은치과_연락처\.vcf"/);
  assert.match(markup,/aria-label="[^"]*연락처[^"]*"/);
 }
 assert.match(visit,/금·토요일 진료 여부는 전화로 확인해 주세요/);
});
