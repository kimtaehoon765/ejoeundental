import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const home=readFileSync('dist/index.html','utf8');
const archive=readFileSync('dist/clinical-archive.html','utf8');
const head=home.slice(0,home.indexOf('</head>'));
const journal=home.match(/<section class="section light" id="stories">([\s\S]*?)<\/section>/)?.[1] || '';
const gallery=home.match(/<section class="section light gallery-home-preview"([\s\S]*?)<\/section>/)?.[1] || '';
const ownerLinks=[...journal.matchAll(/href="(https:\/\/blog\.naver\.com\/[a-zA-Z0-9_-]+\/[0-9]+)"/g)].map(m=>m[1]);

test('Homepage keeps its original 647 blog URLs crawlable after compact curation',()=>{
  assert.ok(journal.includes('class="journal-deep-library"'), 'reading-room details must be present');
  assert.ok(journal.includes('class="journal-salon-new__grid"'), 'four highlighted clinical topics remain visible');
  assert.equal(ownerLinks.length,647,'all original blog links remain in HTML');
  assert.equal(new Set(ownerLinks).size,647,'no duplicate blog URLs');
  for(const link of ownerLinks) assert.ok(archive.includes(link),'original article missing from grouped archive: '+link);
  assert.ok(journal.includes('href="/clinical-archive.html#archive-blog-posts"'));
  assert.ok(journal.includes('href="/stories.html"'));
  assert.ok(gallery.includes('class="gallery-more-room"'));
  assert.ok(gallery.includes('href="/gallery.html"'));
});
test('Clinic local identity and indexing signals are unchanged by visual curation',()=>{
  for(const needle of [
    '<meta name="naver-site-verification"','<meta name="google-site-verification"',
    '<link rel="canonical" href="https://ejoeundental.com/">',
    '"@type":"Dentist"','"@type":"WebSite"',
    '청천동치과','부평치과','잇몸치료','재신경치료'
  ]) assert.ok(head.includes(needle),'indexing signal absent: '+needle);
  assert.ok(home.includes('class="mobile-booking-actions"'));
  assert.ok(home.includes('href="tel:0325132875"'));
  assert.ok(home.includes('ejoeun-gallery-cat-dentist-20261029.webp'));
});
