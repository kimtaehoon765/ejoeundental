// Offline smoke test for the owner-only bundle. No paid services required.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
const root=process.cwd();
execFileSync(process.execPath,['scripts/build-owner-library.mjs'],{cwd:root,stdio:'inherit'});
const out=path.join(root,'.private-dist');
const entries=JSON.parse(fs.readFileSync(path.join(out,'search-index.json'),'utf8'));
assert.equal(entries.length,20,'20 owner-only references must be included');
assert.equal(new Set(entries.map(x=>x.name)).size,20,'duplicate documents');
for(const item of entries){
 assert.ok(item.title.length>0,'missing title: '+item.name);
 assert.ok(item.body.length>50,'missing body: '+item.name);
 assert.ok(fs.existsSync(path.join(out,item.name)),'missing output: '+item.name);
 assert.ok(!/<script\\b/i.test(item.body),'script source leaked into index: '+item.name);
}
const home=fs.readFileSync(path.join(out,'index.html'),'utf8');
assert.match(home,/search-index\\.json/,'search index must be loaded');
assert.match(home,/자료 본문 검색/,'full text search field missing');
const robots=fs.readFileSync(path.join(out,'robots.txt'),'utf8');
assert.match(robots,/User-agent: \\*\\nDisallow: \\/\\n/,'robots format broken');
const headers=fs.readFileSync(path.join(out,'_headers'),'utf8');
assert.match(headers,/\\n  X-Robots-Tag:/,'header format broken');
console.log('Owner library offline smoke tests passed (20 pages, index, links, robots, headers).');
console.log('IMPORTANT: These tests DO NOT verify authentication or deployment privacy.');
