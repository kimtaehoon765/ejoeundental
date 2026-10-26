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

test('owner-confirmed clinic booking ID appears as an actual direct booking link throughout published site',()=>{
 const url='https://booking.naver.com/booking/13/bizes/1162931';
 const clinic=JSON.parse(readFileSync('content/site.json','utf8'));
 assert.equal(clinic.naver_booking_url,url,'owner-provided official booking URL must be retained exactly');
 const direct=bookingAction(clinic.naver_booking_url);
 assert.equal(direct.url,url);
 assert.equal(direct.direct,true,'booking button must not be a search fallback');
 assert.equal(direct.label,'네이버 예약하기 ↗');
 assert.equal(direct.aria,'이조은치과 공식 네이버 예약 페이지 새 창 열림');

 const homepage=readFileSync('dist/index.html','utf8');
 const actions=homepage.match(/<nav class="mobile-booking-actions"[^>]*>([\s\S]*?)<\/nav>/)?.[1]||'';
 assert.ok(actions.includes('href="'+url+'"'));
 assert.ok(actions.includes(direct.label));
 assert.ok(actions.includes('target="_blank" rel="noopener noreferrer"'));
 assert.ok(!actions.includes('search.naver.com/search.naver'),'booking is now a direct link, not a search result');

 const search=readFileSync('dist/search.html','utf8');
 assert.ok(search.includes('data-booking-url="'+url+'"'));
 assert.ok(search.includes('data-booking-label="'+direct.label+'"'));
});
