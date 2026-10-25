(function(){
'use strict';
const $=s=>document.querySelector(s),$$=s=>Array.from(document.querySelectorAll(s));
const R=(a,b)=>a+Math.random()*(b-a),RI=(a,b)=>Math.floor(R(a,b+1)),P=a=>a[RI(0,a.length-1)];
const hex=n=>Array.from({length:n},()=>RI(0,15).toString(16)).join('');
const pad=(n,l)=>String(n).padStart(l||2,'0');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const PALS={green:['#3dff86','#1c8a4a','#0f4a26'],amber:['#ffb627','#a06c0c','#523a08'],cyan:['#38e1ff','#1a8aa0','#0d4552'],red:['#ff4757','#a02633','#521319']};
let C={fg:PALS.green[0],dim:PALS.green[1],line:PALS.green[2]};
let speed=3,auto=false,mode='typer',gen=0;
const stage=$('#stage');

function setPal(n){
  const p=PALS[n];C={fg:p[0],dim:p[1],line:p[2]};
  const s=document.documentElement.style;s.setProperty('--fg',p[0]);s.setProperty('--dim',p[1]);s.setProperty('--line',p[2]);
  $('#pal').textContent='Color: '+n;
}

/* canvas helpers */
const cvs=[];
function fit(cv){
  const d=Math.min(2,window.devicePixelRatio||1),w=cv.clientWidth,h=cv.clientHeight;
  if(!w||!h)return;
  cv.width=Math.round(w*d);cv.height=Math.round(h*d);cv._w=w;cv._h=h;
  cv.getContext('2d').setTransform(d,0,0,d,0,0);
  if(cv._onfit)cv._onfit();
}
function reg(cv){cvs.push(cv);return cv.getContext('2d');}
function Log(el,max){
  const L=[];
  return{push(c,t){L.push('<div class="l-'+c+'">'+t+'</div>');if(L.length>max)L.shift();el.innerHTML=L.join('');el.scrollTop=el.scrollHeight;},clear(){L.length=0;el.innerHTML='';}};
}
function popup(kind){
  const p=$('#popup');p.className='popup '+kind;p.textContent=kind==='ok'?'ACCESS GRANTED':'ACCESS DENIED';p.hidden=false;
  clearTimeout(popup.t);popup.t=setTimeout(function(){p.hidden=true;},2600);
}
function bar(p,n){n=n||20;const f=Math.round(p/100*n);return '['+'█'.repeat(f)+'░'.repeat(n-f)+'] '+p+'%';}

/* ---------- 1. Hacker Typer ---------- */
const CODE=[
'#include <stdio.h>',
'#include <sys/socket.h>',
'#include <netinet/in.h>',
'',
'typedef struct { int fd; uint32_t key[8]; } link_t;',
'',
'static int bypass_firewall(link_t *n, uint8_t *pkt) {',
'    for (int i = 0; i < 256; i++) {',
'        n->key[i % 8] ^= (pkt[i] << 3) | (pkt[i] >> 5);',
'        if (verify_checksum(pkt, i) != 0x7F) continue;',
'        route_packet(n, pkt + i, 0xDEADBEEF);',
'    }',
'    return handshake(n->fd, n->key);',
'}',
'',
'int main(int argc, char **argv) {',
'    link_t node = {0};',
'    node.fd = socket(AF_INET, SOCK_STREAM, 0);',
'    while (!decrypt_block(&node, buffer, 4096)) {',
'        rotate_keys(&node);',
'        sync_clock(node.fd);',
'    }',
'    puts("[+] tunnel established");',
'    return elevate(node.fd, ROOT);',
'}',
'',
'def crack(hashes, wordlist):',
'    found = {}',
'    for h in hashes:',
'        for w in wordlist:',
'            if sha512(w + salt(h)) == h:',
'                found[h] = w',
'                break',
'    return found',
'',
'async function relay(nodes) {',
'  const mesh = await Promise.all(nodes.map(n => connect(n.ip, n.port)));',
'  mesh.forEach((s, i) => s.send(encrypt(payload[i], key.rotate(i))));',
'  return mesh.filter(s => s.alive).length;',
'}',
'',
'sudo ./scan --range 10.0.0.0/8 --stealth --depth 7',
'iptables -A INPUT -s 0.0.0.0/0 -j ACCEPT',
'ssh -D 9050 -N relay@' + '10.' + '13.37.4',
''
].join('\n');
const OUT=[
()=>['info','scanning subnet 10.'+RI(0,255)+'.'+RI(0,255)+'.0/24 ...'],
()=>['ok','host 10.'+RI(0,255)+'.'+RI(0,255)+'.'+RI(1,254)+' responded ('+RI(4,90)+'ms)'],
()=>['warn','firewall rule '+hex(4)+' detected, rerouting'],
()=>['ok','packet buffer 0x'+hex(8)+' allocated'],
()=>['info','decrypting block '+RI(1,512)+'/512'],
()=>['ok','key schedule verified ['+hex(16)+']'],
()=>['err','connection reset by peer, retry '+RI(1,3)+'/3'],
()=>['ok','privilege level raised: uid=0(root)'],
()=>['info','uploading '+P(['kernel.ko','shadow.bin','relay.so','core.dll'])+' ... '+RI(10,99)+'%'],
()=>['ok','tunnel established via '+P(['TOR','VPN-7','PROXY-3','NODE-ECHO'])]
];
const codeEl=$('#code'),outEl=$('#out');
let buf='',pos=0,lines=0,outL=[],prog=null;
function renderOut(){
  outEl.innerHTML=outL.map(function(l){return '<div class="l-'+l.c+'">'+l.t+'</div>';}).join('');
  outEl.scrollTop=outEl.scrollHeight;
}
function addOut(c,t){const l={c:c,t:t};outL.push(l);if(outL.length>70)outL.shift();return l;}
function emitOut(){
  if(prog){
    prog.p=Math.min(100,prog.p+RI(6,18));
    prog.l.t=prog.n+' '+bar(prog.p);
    if(prog.p>=100){prog.l.c='ok';prog=null;}
  }else if(Math.random()<.3){
    const n=P(['injecting payload','dumping memory','cracking hash','syncing nodes','mapping topology']);
    prog={n:n,p:0,l:addOut('warn',n+' '+bar(0))};
  }else{
    const r=P(OUT)();addOut(r[0],'> '+r[1]);
  }
  renderOut();
}
function typeChars(n){
  let chunk='';
  for(let i=0;i<n;i++){
    const ch=CODE[pos%CODE.length];pos++;chunk+=ch;
    if(ch==='\n'){lines++;if(lines%4===0)emitOut();}
  }
  buf=(buf+chunk).slice(-3500);
  codeEl.textContent=buf;
}
async function runBurst(){
  addOut('l-dim'.slice(2),'$ ./breach.sh --target '+hex(6));renderOut();
  for(let i=0;i<9;i++){await sleep(110);const r=P(OUT)();addOut(r[0],'> '+r[1]);renderOut();}
  addOut('ok','> done. exit code 0');renderOut();
}
document.addEventListener('keydown',function(e){
  if(mode!=='typer')return;
  const t=e.target;if(t&&(t.tagName==='INPUT'||t.tagName==='SELECT'))return;
  if(e.key==='Alt'){e.preventDefault();popup('ok');return;}
  if(e.key==='Tab'){e.preventDefault();popup('no');return;}
  if(e.key==='Escape'){$('#popup').hidden=true;return;}
  if(['Shift','Control','Meta','CapsLock','F5','F11','F12'].indexOf(e.key)>-1||e.ctrlKey||e.metaKey)return;
  e.preventDefault();
  if(e.key==='Enter'){runBurst();return;}
  typeChars(speed+RI(0,2));
});
stage.addEventListener('pointerdown',function(e){
  if(mode!=='typer'||e.target.closest('button'))return;
  typeChars(speed*2+RI(0,3));
});
setInterval(function(){if(auto&&mode==='typer')typeChars(speed+RI(0,2));},70);

/* ---------- 2. CMatrix ---------- */
const KANA='ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ0123456789Z:.=*+-<>';
const MC={green:'#2bff6f',red:'#ff3b4e',blue:'#38b6ff',rainbow:'rainbow'};
let mcol='green',mcols=[];
const cvM=$('#cvM'),xM=reg(cvM);
function mkCols(w,fs){return Array.from({length:Math.floor(w/fs)+1},function(){return{y:RI(-40,0),s:R(.4,1)};});}
cvM._onfit=function(){mcols=mkCols(cvM._w,16);xM.fillStyle='#000';xM.fillRect(0,0,cvM._w,cvM._h);};
function matrixStep(x,w,h,fs,cols,color){
  x.fillStyle='rgba(0,0,0,.1)';x.fillRect(0,0,w,h);
  x.font=fs+'px monospace';
  cols.forEach(function(c,i){
    const px=i*fs,py=c.y*fs;
    x.fillStyle=color==='rainbow'?'hsl('+((i*11+Date.now()/25)%360)+',90%,55%)':color;
    x.fillText(KANA[RI(0,KANA.length-1)],px,py-fs);
    x.fillStyle='#e8fff0';x.fillText(KANA[RI(0,KANA.length-1)],px,py);
    if(Math.random()<c.s*(0.35+speed/6))c.y++;
    if(py>h&&Math.random()>.97){c.y=RI(-20,0);c.s=R(.4,1);}
  });
}
$$('.mtools button').forEach(function(b){b.addEventListener('click',function(){
  mcol=b.dataset.c;$$('.mtools button').forEach(function(o){o.classList.toggle('on',o===b);});
});});

/* ---------- 3. Satellite ---------- */
const rad=Math.PI/180;
const LAND=[[45,-100,24],[-15,-60,18],[50,15,14],[5,20,24],[50,90,32],[22,78,9],[-25,135,12],[62,-45,8]];
const dots=[];
LAND.forEach(function(l){for(let i=0;i<170;i++){const a=R(0,6.283),d=Math.sqrt(Math.random())*l[2];dots.push([l[0]+Math.sin(a)*d,l[1]+Math.cos(a)*d*1.3]);}});
function proj(la,lo,rot){const p=la*rad,l=(lo+rot)*rad;return[Math.cos(p)*Math.sin(l),Math.sin(p),Math.cos(p)*Math.cos(l)];}
function globe(x,cx,cy,Rr,rot,ds){
  x.lineWidth=1;x.strokeStyle=C.line;
  function path(pts){
    x.beginPath();let pen=false;
    pts.forEach(function(q){const v=proj(q[0],q[1],rot);if(v[2]>0){const X=cx+v[0]*Rr,Y=cy-v[1]*Rr;if(pen)x.lineTo(X,Y);else x.moveTo(X,Y);pen=true;}else pen=false;});
    x.stroke();
  }
  for(let la=-60;la<=60;la+=30){const a=[];for(let lo=0;lo<=360;lo+=6)a.push([la,lo]);path(a);}
  for(let lo=0;lo<360;lo+=30){const a=[];for(let la=-90;la<=90;la+=6)a.push([la,lo]);path(a);}
  x.beginPath();x.arc(cx,cy,Rr,0,6.283);x.stroke();
  x.fillStyle=C.fg;
  dots.forEach(function(d){const v=proj(d[0],d[1],rot);if(v[2]>.05)x.fillRect(cx+v[0]*Rr-ds/2,cy-v[1]*Rr-ds/2,ds,ds);});
}
const cvS=$('#cvS'),xS=reg(cvS),slog=Log($('#satlog'),40);
const sats=[{n:'SAT-07',inc:.5,om:.3,a:0,v:.011,r:1.38},{n:'SAT-12',inc:1.0,om:-.7,a:2,v:.008,r:1.55},{n:'SAT-31',inc:.2,om:1.2,a:4,v:.014,r:1.27}];
let tgt={la:34,lo:71},rot=-71,lastT=0,lastLog=0,lastSw=0;
function satPos(s){
  const x=s.r*Math.cos(s.a),y0=s.r*Math.sin(s.a),y=y0*Math.sin(s.inc),z=y0*Math.cos(s.inc);
  return[x*Math.cos(s.om)+z*Math.sin(s.om),y,-x*Math.sin(s.om)+z*Math.cos(s.om)];
}
const SLOG=[
()=>['ok','SAT-'+P(['07','12','31'])+' handshake ok'],
()=>['info','downlink '+R(1,9).toFixed(1)+' GB/s'],
()=>['info','triangulating '+tgt.la.toFixed(2)+'N '+tgt.lo.toFixed(2)+'E'],
()=>['warn','signal jitter '+RI(2,40)+' ms'],
()=>['ok','packet stream locked ['+hex(8)+']'],
()=>['dim','ephemeris update '+pad(RI(0,23))+':'+pad(RI(0,59))+':'+pad(RI(0,59))+'Z'],
()=>['info','thermal imaging pass '+RI(1,40)+' complete'],
()=>['err','uplink collision, retransmitting']
];
function sFrame(t){
  const w=cvS._w,h=cvS._h;if(!w)return;
  const x=xS,cx=w/2,cy=h/2,Rr=Math.min(w,h)*.32;
  x.fillStyle='#000';x.fillRect(0,0,w,h);
  if(t-lastSw>11000){lastSw=t;const L=P(LAND);tgt={la:L[0]+R(-8,8),lo:L[1]+R(-12,12)};slog.push('warn','NEW TARGET ACQUIRED '+tgt.la.toFixed(3)+'N '+tgt.lo.toFixed(3)+'E');}
  rot+=((-tgt.lo)-rot)*.012;
  globe(x,cx,cy,Rr,rot,2);
  let front=null;
  sats.forEach(function(s){
    s.a+=s.v*(0.5+speed/4);
    x.strokeStyle=C.line;x.beginPath();
    for(let k=0;k<=60;k++){const q={r:s.r,inc:s.inc,om:s.om,a:k/60*6.283},p=satPos(q);const X=cx+p[0]*Rr,Y=cy-p[1]*Rr;if(k)x.lineTo(X,Y);else x.moveTo(X,Y);}
    x.stroke();
    const p=satPos(s),X=cx+p[0]*Rr,Y=cy-p[1]*Rr;
    if(p[2]<0&&Math.hypot(p[0],p[1])<1)return;
    x.fillStyle=C.fg;x.shadowColor=C.fg;x.shadowBlur=10;x.fillRect(X-3,Y-3,6,6);x.shadowBlur=0;
    x.font='10px "Share Tech Mono",monospace';x.fillText(s.n+' '+Math.round(s.r*6371-6371)+'km',X+8,Y-6);
    if(p[2]>0&&(!front||p[2]>front.p[2]))front={p:p,X:X,Y:Y};
  });
  const tv=proj(tgt.la,tgt.lo,rot);
  if(tv[2]>0){
    const X=cx+tv[0]*Rr,Y=cy-tv[1]*Rr,pu=(t/600)%1;
    x.strokeStyle=C.fg;x.strokeRect(X-9,Y-9,18,18);
    x.globalAlpha=1-pu;x.beginPath();x.arc(X,Y,6+pu*30,0,6.283);x.stroke();x.globalAlpha=1;
    if(front){x.setLineDash([4,4]);x.lineDashOffset=-t/40;x.beginPath();x.moveTo(X,Y);x.lineTo(front.X,front.Y);x.stroke();x.setLineDash([]);}
  }
  x.fillStyle=C.fg;x.font='12px "Share Tech Mono",monospace';
  x.fillText('ORBITAL UPLINK // GEO-SYNC',12,20);
  x.fillStyle=C.dim;x.fillText('LAT '+tgt.la.toFixed(4)+'  LON '+tgt.lo.toFixed(4),12,36);
  x.fillText('FREQ '+(11.2+Math.sin(t/900)*.3).toFixed(3)+' GHz',12,52);
  for(let i=0;i<8;i++){const hh=4+((Math.sin(t/300+i)+1)*5);x.fillStyle=i<6?C.fg:C.line;x.fillRect(12+i*8,h-14-hh,5,hh);}
  if(t-lastLog>700*3/speed){lastLog=t;const r=P(SLOG)();slog.push(r[0],r[1]);}
}

/* ---------- 4. Agent data ---------- */
const FN=['Adrian','Mira','Cole','Ines','Tobias','Lena','Rafe','Selin','Viktor','Noor','Dante','Anya','Hugo','Zara','Marek','Elif'];
const LN=['Hale','Voss','Kerr','Brandt','Okoye','Sato','Marlow','Duran','Petrov','Lund','Reyes','Khan','Moreau','Ivers'];
const CODEN=['FALCON','VIPER','NOMAD','GHOST','RAVEN','CIPHER','ORCA','MANTIS','SABLE','ECHO','TALON','ONYX'];
const CITY=['Lisbon','Oslo','Nairobi','Singapore','Montevideo','Istanbul','Reykjavik','Lima','Vienna','Seoul','Cairo','Tallinn'];
const STAT=['ACTIVE','DEEP COVER','ACTIVE','UNKNOWN','ON MISSION'];
const aglist=$('#aglist'),agrec=$('#agrec'),cvA=$('#cvA'),xA=reg(cvA);
let ids=[],agi=0,face={match:0,id:'',name:''};
function makeAgent(){
  const id='AGT-'+RI(1000,9999),cn=P(CODEN);
  return{id:id,rows:[['Codename',cn],['Name',P(FN)+' '+P(LN)],['Born',pad(RI(1,28))+'.'+pad(RI(1,12))+'.'+RI(1968,1994)],['Last seen',P(CITY)+', '+pad(RI(0,23))+':'+pad(RI(0,59))],['Clearance','LEVEL '+RI(3,9)],['Status',P(STAT)],['Languages',P(['EN, RU, DE','EN, AR, FR','EN, ZH, JA','EN, ES, PT'])],['Missions',String(RI(7,64))],['Case file','#'+hex(8).toUpperCase()],['Known assets','[[REDACTED]]']]};
}
function renderList(){
  aglist.innerHTML=ids.map(function(a,i){return '<div class="'+(i===agi?'cur':'')+'">'+a+'<br>'+(i===agi?'■ OPEN':'□ LOCKED')+'</div>';}).join('');
}
async function agentRun(g){
  ids=Array.from({length:7},function(){return 'AGT-'+RI(1000,9999);});
  while(g===gen){
    const a=makeAgent();agi=(agi+1)%ids.length;ids[agi]=a.id;renderList();
    face.match=0;face.id=a.id;face.name='';
    agrec.innerHTML='<div class="l-info">QUERYING DATABASE ...</div>';await sleep(1300);if(g!==gen)return;
    agrec.innerHTML='';
    for(const r of a.rows){
      const row=document.createElement('div');row.className='r';
      const k=document.createElement('span');k.className='k';k.textContent=r[0];
      const v=document.createElement('span');v.className='v';
      row.appendChild(k);row.appendChild(v);agrec.appendChild(row);
      if(r[0]==='Codename')face.name=r[1];
      if(r[1].indexOf('[[')===0){v.className='v red';v.textContent='██████████';await sleep(500);continue;}
      for(let i=1;i<=r[1].length;i++){v.textContent=r[1].slice(0,i);await sleep(24*3/speed);if(g!==gen)return;}
      await sleep(120);
    }
    const st=document.createElement('div');st.className='stamp';st.textContent='CLASSIFIED';agrec.appendChild(st);
    await sleep(3800/(speed/3));
  }
}
function aFrame(t){
  const w=cvA._w,h=cvA._h;if(!w)return;
  const x=xA;x.fillStyle='#000';x.fillRect(0,0,w,h);
  const cx=w/2,top=h*.1,fw=Math.min(w*.8,h*.62),fh=fw*1.15,sc=((t/1400)%1);
  const hx=cx,hy=top+fh*.3,hw=fw*.24,hh=fw*.32,sy=top+fh*.58;
  const scanY=top+sc*fh;
  face.match=Math.min(97.3,face.match+.6);
  for(let gy=top;gy<top+fh;gy+=7)for(let gx=cx-fw/2;gx<cx+fw/2;gx+=7){
    const head=Math.pow((gx-hx)/hw,2)+Math.pow((gy-hy)/hh,2)<1;
    const sh=gy>sy&&Math.pow((gx-cx)/(fw*.48),2)+Math.pow((gy-(sy+fh*.5))/(fh*.5),2)<1;
    if(!head&&!sh)continue;
    const near=Math.max(0,1-Math.abs(gy-scanY)/40);
    x.globalAlpha=.18+.8*near;x.fillStyle=C.fg;x.fillRect(gx,gy,3,3);
  }
  x.globalAlpha=1;
  x.strokeStyle=C.fg;x.beginPath();x.moveTo(cx-fw/2,scanY);x.lineTo(cx+fw/2,scanY);x.stroke();
  const b=14,L=cx-fw/2,Rg=cx+fw/2,T=top,B=top+fh;
  x.beginPath();[[L,T,1,1],[Rg,T,-1,1],[L,B,1,-1],[Rg,B,-1,-1]].forEach(function(c){x.moveTo(c[0]+c[2]*b,c[1]);x.lineTo(c[0],c[1]);x.lineTo(c[0],c[1]+c[3]*b);});x.stroke();
  x.fillStyle=C.fg;x.font='13px "Share Tech Mono",monospace';
  x.fillText('FACE MATCH '+face.match.toFixed(1)+'%',L,B+22);
  x.fillStyle=C.dim;x.fillText(face.id+'  '+face.name,L,B+40);
}

/* ---------- 5. Phone breach (simulation) ---------- */
const STEPS=[['Scanning network'],['Locating device'],['Injecting payload'],['Bypassing lock screen'],['Extracting data']];
const pst=$('#pst'),pban=$('#pban'),plock=$('#plock'),pins=$$('#ppin i'),ptarget=$('#ptarget');
function counters(on){['aM','aC','aP','aL'].forEach(function(id){$('#'+id).textContent=on?'':'0';});}
async function phoneRun(g){
  while(g===gen){
    pban.textContent='';plock.textContent='LOCKED';plock.className='pl';
    pins.forEach(function(i){i.textContent='*';});counters(false);
    pst.innerHTML=STEPS.map(function(s){return '<div class="st"><span>'+s[0]+'</span><div class="bar2"><i></i></div><span>waiting</span></div>';}).join('');
    const rows=$$('#pst .st');
    for(let n=0;n<STEPS.length;n++){
      const r=rows[n],fill=r.querySelector('i'),lab=r.lastElementChild;
      r.className='st run';
      const dur=3200*3/speed,t0=performance.now();
      let fixed=0;
      if(n===3){plock.textContent='BYPASSING';plock.className='pl mid';}
      while(true){
        const p=Math.min(1,(performance.now()-t0)/dur);
        fill.style.width=(p*100)+'%';
        lab.textContent=n===1?(p>.5?(R(20,40)).toFixed(3)+'N':'tracing'):Math.round(p*100)+'%';
        if(n===3){const f=Math.floor(p*4.2);while(fixed<f&&fixed<4){pins[fixed].textContent=RI(0,9);fixed++;}for(let i=fixed;i<4;i++)pins[i].textContent=RI(0,9);}
        if(n===4){['aM','aC','aP','aL'].forEach(function(id,k){$('#'+id).textContent=Math.round(p*[4812,931,2204,15390][k]);});}
        if(p>=1)break;
        await sleep(50);if(g!==gen)return;
      }
      r.className='st done';lab.textContent='done';
    }
    plock.textContent='UNLOCKED';plock.className='pl open';
    pban.textContent='DEVICE COMPROMISED // '+(ptarget.value||'TARGET').toUpperCase();
    await sleep(5500);
  }
}

/* ---------- 6. Hollywood ---------- */
const hg=$('#hgrid'),panels=[];
function frameBox(x,w,h,title){x.fillStyle='#000';x.fillRect(0,0,w,h);x.fillStyle=C.dim;x.font='10px "Share Tech Mono",monospace';x.fillText(title,6,12);}
const HP=[
function(p,x,w,h){const s=p.st;if(!s.cols)s.cols=mkCols(w,12);matrixStep(x,w,h,12,s.cols,MC.green);},
function(p,x,w,h,t){const s=p.st;s.l=s.l||[];if(t-(s.t||0)>110){s.t=t;let a='';for(let i=0;i<8;i++)a+=hex(2)+' ';s.l.push(hex(8).toUpperCase()+'  '+a+' '+Array.from({length:8},function(){return String.fromCharCode(RI(33,120));}).join(''));if(s.l.length>40)s.l.shift();}frameBox(x,w,h,'MEMORY DUMP');x.fillStyle=C.fg;x.font='10px "Share Tech Mono",monospace';s.l.slice(-Math.floor((h-20)/11)).forEach(function(l,i){x.fillText(l,6,26+i*11);});},
function(p,x,w,h,t){frameBox(x,w,h,'SIGNAL');[0,1,2].forEach(function(k){x.strokeStyle=k?C.dim:C.fg;x.beginPath();for(let i=0;i<=w;i+=3){const y=h/2+Math.sin(i/(14+k*9)+t/(160+k*70))*(h*.28)*Math.sin(i/70+t/900+k)+R(-2,2);if(i)x.lineTo(i,y);else x.moveTo(i,y);}x.stroke();});},
function(p,x,w,h,t){frameBox(x,w,h,'RADAR');const s=p.st;s.b=s.b||[];if(Math.random()<.05)s.b.push({a:R(0,6.283),r:R(.2,.9),l:1});const cx=w/2,cy=h/2+4,r=Math.min(w,h)*.4;x.strokeStyle=C.line;[.33,.66,1].forEach(function(k){x.beginPath();x.arc(cx,cy,r*k,0,6.283);x.stroke();});const a=t/500;for(let i=0;i<14;i++){x.globalAlpha=1-i/14;x.strokeStyle=C.fg;x.beginPath();x.moveTo(cx,cy);x.lineTo(cx+Math.cos(a-i*.05)*r,cy+Math.sin(a-i*.05)*r);x.stroke();}x.globalAlpha=1;s.b=s.b.filter(function(b){b.l-=.008;return b.l>0;});s.b.forEach(function(b){x.globalAlpha=b.l;x.fillStyle=C.fg;x.fillRect(cx+Math.cos(b.a)*r*b.r-2,cy+Math.sin(b.a)*r*b.r-2,5,5);});x.globalAlpha=1;},
function(p,x,w,h){frameBox(x,w,h,'CPU CORES');const s=p.st;s.v=s.v||Array.from({length:10},function(){return Math.random();});const bw=(w-16)/s.v.length;s.v=s.v.map(function(v){return Math.max(.05,Math.min(1,v+R(-.08,.08)));});s.v.forEach(function(v,i){x.fillStyle=v>.85?'#ff4757':C.fg;x.fillRect(8+i*bw,h-8-v*(h-30),bw-4,v*(h-30));});},
function(p,x,w,h,t){frameBox(x,w,h,'GLOBAL TRACE');globe(x,w/2,h/2+4,Math.min(w,h)*.36,-t/60,1.5);},
function(p,x,w,h){frameBox(x,w,h,'TASKS');const s=p.st;s.p=s.p||['DECRYPT','UPLOAD','BYPASS','SCAN','TRACE'].map(function(n){return{n:n,v:R(0,100)};});s.p.forEach(function(q,i){q.v+=R(.2,1.2);if(q.v>100)q.v=0;const y=26+i*((h-34)/5);x.fillStyle=C.dim;x.fillText(q.n,8,y);x.strokeStyle=C.line;x.strokeRect(70,y-9,w-80,9);x.fillStyle=C.fg;x.fillRect(70,y-9,(w-80)*q.v/100,9);});},
function(p,x,w,h,t){frameBox(x,w,h,'NETWORK');const s=p.st;s.n=s.n||Array.from({length:14},function(){return{x:R(.08,.92),y:R(.2,.92),dx:R(-.0004,.0004),dy:R(-.0004,.0004)};});s.n.forEach(function(n){n.x+=n.dx;n.y+=n.dy;if(n.x<.05||n.x>.95)n.dx*=-1;if(n.y<.15||n.y>.95)n.dy*=-1;});x.strokeStyle=C.line;s.n.forEach(function(a,i){s.n.forEach(function(b,j){if(j>i&&Math.hypot((a.x-b.x)*w,(a.y-b.y)*h)<w*.35){x.beginPath();x.moveTo(a.x*w,a.y*h);x.lineTo(b.x*w,b.y*h);x.stroke();}});});s.n.forEach(function(n,i){x.fillStyle=(Math.floor(t/400)%14===i)?'#fff':C.fg;x.fillRect(n.x*w-2,n.y*h-2,5,5);});},
function(p,x,w,h,t){const s=p.st;s.l=s.l||[];if(t-(s.t||0)>140){s.t=t;s.l.push(P(['>> ACCESSING','>> DECRYPTING','>> BYPASSING','>> ROUTING','>> UPLOADING','>> OVERRIDE'])+' '+hex(RI(6,12)).toUpperCase()+(Math.random()<.2?'  [OK]':''));if(s.l.length>40)s.l.shift();}frameBox(x,w,h,'COMMAND STREAM');x.fillStyle=C.fg;x.font='11px "Share Tech Mono",monospace';s.l.slice(-Math.floor((h-20)/12)).forEach(function(l,i){x.fillText(l,6,28+i*12);});}
];
HP.forEach(function(fn){const cv=document.createElement('canvas');hg.appendChild(cv);panels.push({cv:cv,x:reg(cv),fn:fn,st:{}});cv._onfit=function(){panels.forEach(function(q){if(q.cv===cv)q.st={};});};});
let lastPop=0;
function hFrame(t){
  panels.forEach(function(p){const w=p.cv._w,h=p.cv._h;if(w)p.fn(p,p.x,w,h,t);});
  if(t-lastPop>9000){lastPop=t;popup(Math.random()<.5?'ok':'no');}
}

/* ---------- loop & wiring ---------- */
let accM=0,prevT=0;
function frame(t){
  const dt=t-prevT;prevT=t;
  if(mode==='matrix'){accM+=dt;if(accM>42){accM=0;const col=MC[mcol];matrixStep(xM,cvM._w,cvM._h,16,mcols,col);}}
  else if(mode==='sat')sFrame(t);
  else if(mode==='agent')aFrame(t);
  else if(mode==='holly')hFrame(t);
  requestAnimationFrame(frame);
}
function setMode(m){
  mode=m;const g=++gen;
  $$('.scr').forEach(function(s){s.classList.toggle('on',s.id===m);});
  $$('#modes button').forEach(function(b){b.classList.toggle('on',b.dataset.mode===m);});
  $('#popup').hidden=true;
  cvs.forEach(fit);
  if(m==='agent')agentRun(g);
  if(m==='phone')phoneRun(g);
  if(m==='sat'){lastSw=performance.now();}
}
$$('#modes button').forEach(function(b){b.addEventListener('click',function(){setMode(b.dataset.mode);});});
$('#speed').addEventListener('input',function(e){speed=+e.target.value;});
$('#auto').addEventListener('click',function(e){auto=!auto;e.target.textContent='Auto: '+(auto?'on':'off');e.target.classList.toggle('on',auto);if(auto&&mode!=='typer')setMode('typer');});
$('#pal').addEventListener('click',function(){const k=Object.keys(PALS);const n=k[(k.indexOf(Object.keys(PALS).find(function(q){return PALS[q][0]===C.fg;}))+1)%k.length];setPal(n);});
$('#granted').addEventListener('click',function(){popup('ok');});
$('#denied').addEventListener('click',function(){popup('no');});
$('#fs').addEventListener('click',function(){
  try{if(document.fullscreenElement)document.exitFullscreen();else (stage.requestFullscreen?stage.requestFullscreen():Promise.reject()).catch(function(){});}catch(e){}
});
new ResizeObserver(function(){cvs.forEach(fit);}).observe(stage);
setPal('green');
typeChars(260);
cvs.forEach(fit);
requestAnimationFrame(frame);
})();
