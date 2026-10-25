import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {bookingAction} from './naver-booking-link.mjs';

test('an unavailable real booking URL links to transparently labeled Naver search',()=>{
 const action=bookingAction('');
 assert.equal(action.direct,false);
 assert.equal(new URL(action.url).hostname,'search.naver.com');
 assert.match(new URL(action.url).searchParams.get('query'),/이조은치과의원/);
 assert.match(action.label,/찾기/);
 assert.doesNotMatch(action.label,/예약하기/);
});

test('only real-shaped official Naver booking URLs become direct booking buttons',()=>{
 const url='https://booking.naver.com/booking/13/bizes/12345?theme=place';
 const action=bookingAction(url);
 assert.equal(action.url,url);
 assert.equal(action.direct,true);
 assert.match(action.label,/예약하기/);
 for(const unsafe of [
  'http://booking.naver.com/booking/13/bizes/12345',
  'https://evil.example/booking/13/bizes/12345',
  'https://booking.naver.com.evil.example/booking/13/bizes/12345',
  'https://booking.naver.com/my',
  'https://booking.naver.com@evil.example/booking/13/bizes/12345',
  'javascript:alert(1)'
 ]){
  assert.throws(()=>bookingAction(unsafe),'unsafe URL must never become a CTA: '+unsafe);
 }
});

test('mobile homepage offers accessible phone and honest Naver booking fallback',()=>{
 const html=readFileSync('dist/index.html','utf8');
 const config=JSON.parse(readFileSync('content/site.json','utf8'));
 const action=bookingAction(config.naver_booking_url);
 const css=readFileSync('dist/assets/home-enhancements.css','utf8');
 assert.doesNotMatch(html,/BUILD_NAVER_BOOKING_MOBILE/);
 const widget=html.match(/<nav class="mobile-booking-actions"[^>]*>([\s\S]*?)<\/nav>/)?.[0]||'';
 assert.ok(widget,'mobile bottom booking action nav missing');
 assert.match(widget,/href="tel:0325132875"/);
 const safeHref=action.url.replace(/&/g,'&amp;');
 assert.ok(widget.includes('href="'+safeHref+'"'),'booking CTA destination must match validated config');
 assert.ok(widget.includes('aria-label="'+action.aria+'"'));
 assert.ok(widget.includes('rel="noopener noreferrer"'));
 assert.ok(widget.includes(action.label),'label must distinguish direct booking from search');
 assert.match(css,/body\.home-page \.mobile-booking-actions\s*\{[\s\S]*?position:fixed;/);
 assert.match(css,/safe-area-inset-bottom/);
 assert.match(css,/body\.home-page\.music-reopen|body\.home-page \.music-reopen/);
});
