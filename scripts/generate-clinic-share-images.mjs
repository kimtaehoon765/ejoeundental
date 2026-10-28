import fs from 'node:fs';
import path from 'node:path';
import {deflateSync} from 'node:zlib';
// Original schematic clinic topic art, not patient photographs or anatomical instruction.
// PNG output needs no external package, network, font or image service.
const W=1200,H=630;
function artwork(kind){
 const px=Buffer.alloc(W*H*4),bg=kind==='implant'?[243,249,243]:[249,245,239];
 for(let y=0;y<H;y++)for(let x=0;x<W;x++){
  const i=(y*W+x)*4,t=x/W*.3+y/H*.7;
  px[i]=Math.round(bg[0]-t*12);px[i+1]=Math.round(bg[1]-t*13);
  px[i+2]=Math.round(bg[2]-t*9);px[i+3]=255;
 }
 const paint=(x,y,c)=>{x|=0;y|=0;if(x<0||y<0||x>=W||y>=H)return;
  const i=(y*W+x)*4,a=(c[3]??255)/255;
  for(let k=0;k<3;k++)px[i+k]=Math.round(px[i+k]*(1-a)+c[k]*a);
 };
 const ellipse=(cx,cy,rx,ry,c)=>{for(let y=Math.max(0,Math.floor(cy-ry));y<=Math.min(H-1,cy+ry);y++)
  for(let x=Math.max(0,Math.floor(cx-rx));x<=Math.min(W-1,cx+rx);x++)
   if(((x-cx)/rx)**2+((y-cy)/ry)**2<=1)paint(x,y,c);};
 const rect=(x,y,w,h,c)=>{for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++)paint(xx,yy,c);};
 const stroke=(ax,ay,bx,by,w,c)=>{const vx=bx-ax,vy=by-ay,l=vx*vx+vy*vy||1;
  for(let y=Math.max(0,Math.floor(Math.min(ay,by)-w));y<Math.min(H,Math.ceil(Math.max(ay,by)+w));y++)
   for(let x=Math.max(0,Math.floor(Math.min(ax,bx)-w));x<Math.min(W,Math.ceil(Math.max(ax,bx)+w));x++){
    const t=Math.max(0,Math.min(1,((x-ax)*vx+(y-ay)*vy)/l));
    if((x-ax-t*vx)**2+(y-ay-t*vy)**2<=(w/2)**2)paint(x,y,c);
   }};
 const poly=(p,c)=>{const lo=Math.max(0,Math.floor(Math.min(...p.map(q=>q[1]))));
  const hi=Math.min(H-1,Math.ceil(Math.max(...p.map(q=>q[1]))));
  for(let y=lo;y<=hi;y++){let xs=[];
   for(let i=0;i<p.length;i++){let a=p[i],b=p[(i+1)%p.length];
    if((a[1]<=y&&b[1]>y)||(b[1]<=y&&a[1]>y))
     xs.push(a[0]+(y-a[1])*(b[0]-a[0])/(b[1]-a[1]));
   }xs.sort((a,b)=>a-b);
   for(let k=0;k+1<xs.length;k+=2)
    for(let x=Math.max(0,Math.ceil(xs[k]));x<=Math.min(W-1,Math.floor(xs[k+1]));x++)paint(x,y,c);
  }};
 ellipse(908,306,275,260,[255,255,255,100]);ellipse(1140,82,310,132,[135,180,172,64]);
 ellipse(370,572,540,105,[202,189,173,45]);
 const ink=[36,83,67];
 const glyph=(char,x)=>{const y=52,s=1.55,L=(a,b,c,d,w=2.5)=>stroke(x+a*s,y+b*s,x+c*s,y+d*s,w*s,ink);
  const O=(cx,cy,r)=>{for(let j=0;j<48;j++){const a=j*Math.PI/24,b=(j+1)*Math.PI/24;
   L(cx+r*Math.cos(a),cy+r*Math.sin(a),cx+r*Math.cos(b),cy+r*Math.sin(b),2.6);}};
  if(char==='이'){O(9,13,7);L(24,4,24,29);}
  if(char==='조'){L(3,5,23,5);L(13,7,3,21);L(13,7,23,21);L(13,21,13,28);L(3,28,24,28);}
  if(char==='은'){O(14,11,8);L(3,29,26,29);}
  if(char==='치'){L(5,4,18,4);L(3,10,20,10);L(12,12,3,26);L(12,12,20,26);L(27,4,27,29);}
  if(char==='과'){L(3,5,18,5);L(18,5,18,17);L(3,27,20,27);L(11,19,11,27);L(27,5,27,29);L(22,17,30,17);}
 };
 [...'이조은치과'].forEach((g,i)=>glyph(g,74+i*51));
 stroke(74,124,350,124,3,[129,169,143]);
 rect(75,182,10,174,[76,126,101]);rect(104,186,247,8,[144,169,151,150]);
 rect(104,216,191,6,[144,169,151,125]);rect(104,238,219,6,[144,169,151,90]);
 if(kind==='implant'){
  ellipse(866,488,225,77,[233,191,181]);ellipse(866,527,222,43,[221,173,161]);
  rect(816,356,100,170,[157,175,174]);
  poly([[816,516],[916,516],[891,558],[840,558]],[138,161,160]);
  for(let i=0;i<7;i++)stroke(810,391+i*19,916,406+i*19,8,[215,225,216]);
  poly([[758,246],[786,208],[846,192],[905,214],[950,251],[956,300],
    [928,365],[906,393],[804,393],[780,366],[750,302]],[253,250,240]);
  ellipse(840,245,71,21,[255,255,255,120]);
  stroke(803,393,920,393,12,[188,205,192]);
 }else{
  ellipse(862,461,270,83,[226,180,180]);ellipse(862,498,275,46,[206,149,150]);
  for(let i=0;i<4;i++){const x=690+i*108;
   poly([[x-49,333],[x-39,301],[x-19,290],[x+20,290],[x+40,305],
    [x+49,337],[x+44,400],[x+27,430],[x-25,430],[x-46,407]],[255,252,244]);
   ellipse(x-15,324,19,7,[255,255,255,140]);
   stroke(x-40,387,x+41,387,2,[233,219,206]);
  }
 }
 stroke(74,532,168,532,5,[60,107,88]);ellipse(184,532,7,7,[175,134,94]);
 const raw=Buffer.alloc(H*(1+4*W));
 for(let y=0;y<H;y++){raw[y*(1+4*W)]=0;px.copy(raw,y*(1+4*W)+1,y*W*4,(y+1)*W*4);}
 let table=new Uint32Array(256);
 for(let i=0;i<256;i++){let c=i;for(let j=0;j<8;j++)c=c&1?0xedb88320^(c>>>1):c>>>1;table[i]=c>>>0;}
 const chunk=(tag,data)=>{const b=Buffer.from(tag),h=Buffer.alloc(4),r=Buffer.alloc(4);
  h.writeUInt32BE(data.length);let crc=0xffffffff;
  for(let x of Buffer.concat([b,data]))crc=table[(crc^x)&255]^(crc>>>8);
  r.writeUInt32BE((crc^0xffffffff)>>>0);return Buffer.concat([h,b,data,r]);};
 const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(W,0);ihdr.writeUInt32BE(H,4);ihdr[8]=8;ihdr[9]=6;
 return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),
  chunk('IHDR',ihdr),chunk('IDAT',deflateSync(raw,{level:8})),chunk('IEND',Buffer.alloc(0))]);
}
export function generateClinicShareImages(output){
 const folder=path.join(output,'assets','clinical-share');fs.mkdirSync(folder,{recursive:true});
 const sizes={};
 for(const name of ['implant','denture']){const png=artwork(name);
  if(png.length>=2_000_000)throw new Error('Oversized social picture '+name);
  fs.writeFileSync(path.join(folder,name+'.png'),png);sizes[name]=png.length;
 }
 return sizes;
}
