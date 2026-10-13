// 픽셀 튼튼몬 그림 (64×44 캔버스). 게임 상태는 받기만 하고 고치지 않는다.
import { TYPES, stageOf, clamp } from './game.js';

const INK = [38, 51, 31], BG = [185, 201, 160];
const mix = (a, b, k) => a.map((v, i) => v + (b[i] - v) * k);

/** pet = {type,xp,hp,alive,stats,height} · t = 시각(ms) · preview = 만들기 전 미리보기 · cheer = 기뻐하는 중 */
export function draw(ctx, pet, t, { preview = false, cheer = false } = {}) {
  const px = (x, y, c) => { ctx.fillStyle = `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`; ctx.fillRect(x | 0, y | 0, 1, 1); };
  ctx.fillStyle = `rgb(${BG})`; ctx.fillRect(0, 0, 64, 44);
  for (let x = 0; x < 64; x += 2) px(x, 41, mix(BG, INK, .25)); // ground
  const st=stageOf(pet.xp);const hp=pet.hp;
  const base=TYPES[pet.type].c;const weak=clamp((50-hp)/50,0,1);
  const col=mix(base,[150,150,140],weak*.75);const dark=mix(col,INK,.55);
  
  if(!pet.alive){ // ghost floating
    const y=18+Math.sin(t/600)*2;
    for(let dy=-7;dy<=7;dy++)for(let dx=-7;dx<=7;dx++){if(dx*dx+dy*dy<=49&&!(dy>4&&(dx+Math.floor(t/200))%3===0))px(32+dx,y+dy,mix(BG,[245,245,240],.7))}
    [[29,y-1],[35,y-1]].forEach(([x,yy])=>{px(x-1,yy-1,INK);px(x+1,yy+1,INK);px(x+1,yy-1,INK);px(x-1,yy+1,INK);px(x,yy,INK)});
    for(let i=0;i<4;i++){const sy=(t/60+i*11)%40;px(10+i*14,40-sy,mix(BG,INK,.4))}
    return;
  }
  if(st===0){ // egg
    const wob=Math.sin(t/(preview?400:250))*(1+(pet.xp>8?1:0));
    const cx=32+wob*.6,cy=27;
    for(let dy=-11;dy<=11;dy++)for(let dx=-9;dx<=9;dx++){const k=(dx*dx)/(81*(dy<0?0.8:1))+(dy*dy)/121;if(k<=1){const edge=k>.82;px(cx+dx,cy+dy,edge?dark:mix(col,[255,255,255],.35))}}
    for(let i=-6;i<=6;i+=3)px(cx+i,cy-1+((i/3)%2?1:0),dark); // zigzag band
    [[-4,5],[3,6],[0,-6]].forEach(([dx,dy])=>{px(cx+dx,cy+dy,col);px(cx+dx+1,cy+dy,col)});
    return;
  }
  const sizes=[0,7,9,11,13,15];const r=sizes[st]*(0.92+clamp((pet.height-150)/40,0,1)*0.16);
  const speed=200+weak*500;const amp=(cheer?4:1.6)*(1-weak*.8);
  const bounce=Math.abs(Math.sin(t/speed))*amp;
  const cx=32,cy=40-r-1-bounce;
  const squash=1+(cheer?Math.sin(t/90)*.05:0);
  // shadow
  for(let dx=-r+2;dx<=r-2;dx++)px(cx+dx,41,mix(BG,INK,.35));
  // feet
  const fy=40-bounce*.3;[-r*.45,r*.45].forEach(o=>{for(let i=-1;i<=1;i++)px(cx+o+i,fy,dark)});
  // arms (thickness by strength)
  const arm=pet.stats.strength>90?2:1;const armUp=cheer||hp>85;
  [-1,1].forEach(s=>{for(let i=0;i<3;i++)for(let a=0;a<arm;a++){const ax=cx+s*(r+i);const ay=armUp?cy-2-i:cy+2+i*(weak>0.5?1:0.4);px(ax,ay+a,dark)}
    if(pet.stats.strength>110){px(cx+s*(r+1),cy-4,dark);px(cx+s*(r+2),cy-4,dark)}});
  // body
  for(let dy=-r;dy<=r;dy++)for(let dx=-r;dx<=r;dx++){const k=(dx*dx)/(r*r*squash)+(dy*dy)/(r*r/squash);if(k<=1){const shade=dy>r*.45||k>.86;px(cx+dx,cy+dy,shade?mix(col,INK,.28):(dx<-r*.3&&dy<-r*.3?mix(col,[255,255,255],.35):col))}}
  // belly
  for(let dy=Math.ceil(r*.1);dy<=r*.7;dy++)for(let dx=-r*.45;dx<=r*.45;dx++){if(dx*dx/(r*r*.2)+(dy-r*.4)**2/(r*r*.12)<=1)px(cx+dx,cy+dy,mix(col,[255,250,235],.55))}
  // flex: antenna wiggle
  if(pet.stats.flex>70){const w=Math.round(Math.sin(t/180));for(let i=1;i<=3;i++)px(cx+w*(i>1?1:0),cy-r-i,dark);px(cx+w,cy-r-4,[255,212,71])}
  // power: spikes
  if(pet.stats.power>80)for(let i=-2;i<=2;i+=2){px(cx+i-3,cy-r+1,dark);px(cx+i-3,cy-r,dark)}
  // headband (cardio or champion)
  if(pet.stats.cardio>85||st===5){for(let dx=-r+1;dx<=r-1;dx++)px(cx+dx,cy-r*.45,[226,58,64]);px(cx+r,cy-r*.45+1,[226,58,64]);px(cx+r+1,cy-r*.45+2,[226,58,64])}
  // face
  const ey=cy-r*.15,ex=Math.max(2,Math.round(r*.38));const blink=(t%3200)<130;
  [-1,1].forEach(s=>{const x=cx+s*ex;
    if(weak>.5||blink){px(x-1,ey,INK);px(x,ey,INK);px(x+1,ey,INK)}
    else{px(x,ey,INK);px(x,ey-1,INK);if(st>=3){px(x+1,ey,INK);px(x+1,ey-1,INK)}px(x,ey-1,[255,255,255])}});
  const my=ey+Math.max(2,Math.round(r*.3));
  if(hp>60||cheer){px(cx-1,my,INK);px(cx,my+1,INK);px(cx+1,my,INK);if(cheer)px(cx,my,INK)}
  else if(hp>30){px(cx-1,my,INK);px(cx,my,INK);px(cx+1,my,INK)}
  else{px(cx-1,my+1,INK);px(cx,my,INK);px(cx+1,my+1,INK)}
  // cheeks
  if(hp>50){px(cx-ex-1,my-1,[240,120,120]);px(cx+ex+1,my-1,[240,120,120])}
  // sweat when weak
  if(weak>.4){const sy=(t/120)%6;px(cx+r-1,cy-r+2+sy,[90,150,230]);px(cx+r-1,cy-r+3+sy,[90,150,230])}
  // sparkles
  if(hp>85||st===5||cheer){for(let i=0;i<3;i++){const a=t/500+i*2.1;const sx=cx+Math.cos(a)*(r+6),sy=cy+Math.sin(a)*(r*.6)-2;if((t/150+i)%4<3){px(sx,sy,[255,255,255]);px(sx+1,sy,mix(BG,[255,255,255],.5));px(sx-1,sy,mix(BG,[255,255,255],.5));px(sx,sy+1,mix(BG,[255,255,255],.5));px(sx,sy-1,mix(BG,[255,255,255],.5))}}}
  // champion crown
  if(st===5){const y=cy-r-3;[[-2,0],[0,-1],[2,0]].forEach(([dx,dy])=>{px(cx+dx,y+dy,[255,212,71])});for(let dx=-2;dx<=2;dx++)px(cx+dx,y+1,[255,212,71])}
}
