// Naver's real clinic booking URL must be confirmed by the clinic owner.
// Until then, point to a clearly labeled Naver SEARCH, never a fabricated
// booking page or a different practice. Safe to use in a production build.
const query='이조은치과의원 인천부평 네이버 예약';
export const bookingAction=raw=>{
 const value=String(raw||'').trim();
 if(!value)return {
  url:'https://search.naver.com/search.naver?query='+encodeURIComponent(query),
  label:'네이버에서 예약 찾기 ↗',
  aria:'네이버 검색에서 이조은치과의원 인천부평의 예약 메뉴 찾기, 새 창 열림',
  direct:false
 };
 let u;
 try{u=new URL(value);}catch{throw new Error('Invalid clinic Naver booking URL');}
 if(u.protocol!=='https:'||
    !['booking.naver.com','m.booking.naver.com'].includes(u.hostname)||
    !/^\/booking\/\d+\/bizes\/\d+(?:\/.*)?$/.test(u.pathname)||
    u.username||u.password)
  throw new Error('Refusing unverified or non-Naver booking URL');
 return {
  url:u.href,
  label:'네이버 예약하기 ↗',
  aria:'이조은치과 공식 네이버 예약 페이지 새 창 열림',
  direct:true
 };
};
