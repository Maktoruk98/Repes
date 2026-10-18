'use strict';
const $=(s,r=document)=>r.querySelector(s);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm=s=>s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
const KEY='repes.v1';
let mem={sets:[],rutinas:[],cfg:{descanso:90}};
const st={perfil:null,ult:{},ev:null,s:null,cl:{txt:'',res:null},tab:'entrenar',ex:null,vari:'',det:null,sel:{eq:0,pos:0,ag:0,uni:false,tec:0},reps:0,kg:20,obj:10,modo:'manual',q:'',grupo:'',equipo:'',restEnd:0,tempo:3,sens:1.3,run:false,cola:null,colaI:0};
const BYID={};EJERCICIOS.forEach(e=>BYID[e.id]=e);

// Repara lo que falte en datos antiguos o importados sin tocar lo demás.
function sana(){['rutinas','comidas','agua','pesos'].forEach(k=>{if(!Array.isArray(mem[k]))mem[k]=[];});mem.cfg=Object.assign({descanso:90},mem.cfg);if(!(mem.cfg.descanso>0))mem.cfg.descanso=90;}
function load(){try{const d=JSON.parse(localStorage.getItem(KEY));if(d&&Array.isArray(d.sets))mem=Object.assign(mem,d);}catch(e){}sana();snap=JSON.stringify(mem);}
function save(){marca();try{const j=JSON.stringify(mem);localStorage.setItem(KEY,j);snap=j;}catch(e){toast('No se pudo guardar en este dispositivo');}sySoon();}

/* ---------- Sincronización entre dispositivos ---------- */
// Al guardar se compara con lo último guardado: lo cambiado lleva la hora en `u` y lo borrado deja una marca
// en `mem.del`, para que la mezcla con el otro dispositivo sepa qué es más nuevo y qué no debe volver.
let snap=null;
const sinU=x=>JSON.stringify(Object.assign({},x,{u:0}));
function marca(){
  if(!snap)return;let v;try{v=JSON.parse(snap);}catch(e){return;}const t=Date.now();
  const lista=(k,id)=>{const o=new Map((v[k]||[]).map(x=>[String(x[id]),x])),n=new Set();
    (mem[k]||[]).forEach(x=>{const c=String(x[id]);n.add(c);const a=o.get(c);if(a&&sinU(a)!==sinU(x))x.u=t;});
    o.forEach((x,c)=>{if(!n.has(c)){mem.del=mem.del||{};mem.del[k+':'+c]=t;}});};
  SY_LISTAS.forEach(l=>lista(l[0],l[1]));
  SY_OBJ.forEach(k=>{if(mem[k]&&(v[k]?sinU(v[k])!==sinU(mem[k]):k!=='cfg'))mem[k].u=t;});
}
// Listas que se mezclan elemento a elemento (con su campo identificador) y ajustes que se mezclan enteros.
const SY_LISTAS=[['sets','t'],['rutinas','id'],['comidas','t'],['agua','d'],['pesos','t']],SY_OBJ=['cfg','ncfg'];
// Mezcla lo local (a) con lo de la nube (b). Con la misma hora gana la nube: así un dispositivo recién unido
// no pisa los ajustes del que ya tenía datos.
function mezcla(a,b){
  const del=Object.assign({},b.del);Object.keys(a.del||{}).forEach(k=>{del[k]=Math.max(del[k]||0,a.del[k]);});
  const lista=(k,id)=>{const m=new Map();(a[k]||[]).concat(b[k]||[]).forEach(x=>{const c=String(x[id]);if(del[k+':'+c])return;const y=m.get(c);if(!y||(x.u||0)>=(y.u||0))m.set(c,x);});return [...m.values()].sort((x,y)=>typeof x[id]==='string'?x[id].localeCompare(y[id]):x[id]-y[id]);};
  const r=Object.assign({},b,a,{del});
  SY_LISTAS.forEach(l=>{r[l[0]]=lista(l[0],l[1]);});
  SY_OBJ.forEach(k=>{const o=((a[k]&&a[k].u)||0)>((b[k]&&b[k].u)||0)?a[k]:(b[k]||a[k]);if(o)r[k]=o;else delete r[k];});
  const ev=a.ev&&b.ev?(a.ev.t>b.ev.t?a.ev:b.ev):(a.ev||b.ev);if(ev)r.ev=ev;else delete r.ev;
  return JSON.parse(JSON.stringify(r));
}
const SYNC_URL=typeof location!=='undefined'&&/^(localhost|127\.0\.0\.1)$/.test(location.hostname)?'http://127.0.0.1:8787':'https://repes.maktoruk98.workers.dev';
const SK='repes.sync';
let sy={code:'',ult:0,err:'',ocupado:false,otra:false,timer:0};
function syLoad(){try{const d=JSON.parse(localStorage.getItem(SK));if(d&&d.code)sy.code=d.code,sy.ult=d.ult||0;}catch(e){}}
function sySave(){try{if(sy.code)localStorage.setItem(SK,JSON.stringify({code:sy.code,ult:sy.ult}));else localStorage.removeItem(SK);}catch(e){}}
function sySoon(){if(!sy.code)return;clearTimeout(sy.timer);sy.timer=setTimeout(sincroniza,2500);}
async function sincroniza(unir){
  if(!sy.code)return false;if(sy.ocupado){sy.otra=true;return false;}
  if(typeof navigator.onLine==='boolean'&&!navigator.onLine){sy.err='Sin conexión: se sincronizará al volver';pintaSync();return false;}
  sy.ocupado=true;pintaSync();let ok=false;
  try{
    for(let intento=0;intento<4&&!ok;intento++){
      const g=await fetch(SYNC_URL+'/doc',{headers:{'x-repes-code':sy.code},cache:'no-store'});
      if(!g.ok)throw new Error('servidor '+g.status);
      const rem=await g.json();
      if(unir&&!rem.data){sy.code='';throw new Error('Ese código no existe. Revísalo en el otro dispositivo');}
      const m=rem.data?mezcla(mem,rem.data):JSON.parse(JSON.stringify(mem)),mj=JSON.stringify(m);
      if(mj!==JSON.stringify(mem)){mem=m;sana();try{localStorage.setItem(KEY,JSON.stringify(mem));}catch(e){}snap=JSON.stringify(mem);if(!st.s)render();}
      if(rem.data&&mj===JSON.stringify(rem.data)){ok=true;break;}
      const p=await fetch(SYNC_URL+'/doc',{method:'PUT',headers:{'content-type':'application/json','x-repes-code':sy.code},body:JSON.stringify({ver:rem.ver,data:mem})});
      if(p.status===409)continue;
      if(!p.ok)throw new Error('servidor '+p.status);
      ok=true;
    }
    if(!ok)throw new Error('no se pudo, se reintentará');
    sy.ult=Date.now();sy.err='';
  }catch(e){sy.err=e.message==='Failed to fetch'?'Sin conexión con el servidor':e.message;}
  finally{sy.ocupado=false;sySave();pintaSync();if(sy.otra){sy.otra=false;sySoon();}}
  return ok;
}
function nuevoCodigo(){const A='ABCDEFGHIJKLMNOPQRSTUVWXYZ234567',b=new Uint8Array(16);crypto.getRandomValues(b);return [...b].map(x=>A[x%32]).join('');}
const verCodigo=c=>c.replace(/(.{4})(?=.)/g,'$1-');
function vSync(){
  if(!sy.code)return `<h3>Sincronización</h3><div class="mut">Para ver los mismos datos en el iPhone y en el ordenador. Actívala en un dispositivo y une el otro con el código que te dé.</div><button class="btn sm" data-act="syNuevo">Activar en este dispositivo</button>
    <input class="inp" id="syCod" autocomplete="off" autocapitalize="characters" placeholder="Código del otro dispositivo"><button class="btn sm ghost" data-act="syUnir">Unir con este código</button><div class="mut" id="syEst">${esc(sy.err)}</div>`;
  return `<h3>Sincronización</h3><div class="sel">${verCodigo(sy.code)}</div><div class="mut">Usa este código para unir tu otro dispositivo. Guárdalo: con él se recuperan tus datos.</div><div class="mut" id="syEst">${esc(syEstado())}</div>
    <div class="row"><button class="btn sm" data-act="syYa">Sincronizar ahora</button><button class="btn sm ghost" data-act="syCopia">Copiar código</button><button class="btn sm ghost" data-act="delSync">Desactivar</button></div>`;
}
function syEstado(){return sy.ocupado?'Sincronizando…':sy.err?sy.err:sy.ult?'Sincronizado: '+new Date(sy.ult).toLocaleString('es-ES',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}):'Pendiente';}
function pintaSync(){const e=typeof document!=='undefined'&&document.getElementById?document.getElementById('syEst'):null;if(e)e.textContent=sy.code?syEstado():sy.err;}
const dia=t=>new Date(t).toDateString();
const fechaLarga=t=>new Date(t).toLocaleDateString('es-ES',{weekday:'long',day:'numeric',month:'long'});
const mmss=s=>Math.floor(s/60)+':'+String(s%60).padStart(2,'0');
const nVar=e=>e.eq.length*e.pos.length*e.ag.length*(e.uni?2:1);
function varLabel(e,sel){const p=[e.eq[sel.eq],e.pos[sel.pos]];if(e.ag[sel.ag]!=='Estándar')p.push(e.ag[sel.ag]);if(sel.uni)p.push('Unilateral');if(sel.tec)p.push(TECNICAS[sel.tec][0]);return p.join(' · ');}
function ultima(id){const prev=mem.sets.filter(s=>s.ex===id&&dia(s.t)!==dia(Date.now()));if(!prev.length)return '';const d=dia(prev[prev.length-1].t);const ss=prev.filter(s=>dia(s.t)===d);return new Date(ss[0].t).toLocaleDateString('es-ES',{day:'numeric',month:'short'})+': '+ss.map(s=>s.kg+'×'+s.reps).join(', ');}

/* ---------- Sonido, pantalla encendida, avisos ---------- */
let ac,wl,toastId;
function beep(){fx('cuenta');}
async function wake(){try{if('wakeLock' in navigator&&(!wl||wl.released))wl=await navigator.wakeLock.request('screen');}catch(e){}}
function toast(m,ms){const t=$('#toast');if(!t)return;t.textContent=m;t.classList.add('on');clearTimeout(toastId);toastId=setTimeout(()=>t.classList.remove('on'),ms||2200);}

/* ---------- Sonidos de la interfaz ---------- */
// Al bloquear el iPhone, Safari deja el audio «interrupted» (no «suspended»): hay que reanudarlo en cualquier estado.
function audio(){if(ac&&ac.state==='closed')ac=null;ac=ac||new (window.AudioContext||window.webkitAudioContext)();if(ac.state!=='running')try{ac.resume().catch(()=>{});}catch(e){}return ac;}
// Con un toque del usuario, un audio que no responde se sustituye por uno nuevo, que iOS sí deja sonar.
function despierta(gesto){if(!ac||ac.state==='running')return;if(gesto){try{ac.close();}catch(e){}ac=null;fxBus=null;}try{audio();}catch(e){}}
// Sonidos de equipo de contraespionaje: relés, conmutadores, teletipo, sellos y cerrojos. Secos, en una sala pequeña.
let fxBus=null,snd=null;
function bus(){const a=audio();if(fxBus&&snd&&snd.ac===a)return fxBus;
  const comp=a.createDynamicsCompressor();comp.threshold.value=-10;comp.ratio.value=3;comp.connect(a.destination);fxBus=a.createGain();fxBus.gain.value=.9;fxBus.connect(comp);
  const n=Math.floor(a.sampleRate*.4),b=a.createBuffer(2,n,a.sampleRate);for(let ch=0;ch<2;ch++){const d=b.getChannelData(ch);for(let i=0;i<n;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/n,6);}
  const sala=a.createConvolver();sala.buffer=b;const sg=a.createGain();sg.gain.value=.18;sala.connect(sg);sg.connect(comp);
  const rb=a.createBuffer(1,a.sampleRate,a.sampleRate),rd=rb.getChannelData(0);for(let j=0;j<rd.length;j++)rd[j]=Math.random()*2-1;
  snd={ac:a,sala,ruido:rb};return fxBus;}
function sSale(n,envio){n.connect(fxBus);const s=ac.createGain();s.gain.value=envio==null?1:envio;n.connect(s);s.connect(snd.sala);}
function sClic(t,f,q,dur,v){const src=ac.createBufferSource(),bp=ac.createBiquadFilter(),g=ac.createGain();src.buffer=snd.ruido;bp.type='bandpass';bp.frequency.value=f;bp.Q.value=q;g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(v,t+.0006);g.gain.exponentialRampToValueAtTime(.0001,t+dur);src.connect(bp);bp.connect(g);sSale(g);src.start(t,Math.random()*.5);src.stop(t+dur+.01);}
function sGolpe(t,f,dur,v){const o=ac.createOscillator(),g=ac.createGain();o.frequency.setValueAtTime(f,t);o.frequency.exponentialRampToValueAtTime(f*.5,t+dur);g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(v,t+.002);g.gain.exponentialRampToValueAtTime(.0001,t+dur);o.connect(g);sSale(g,.6);o.start(t);o.stop(t+dur+.01);}
function sTono(t,f,dur,v,tipo,corte){const o=ac.createOscillator(),g=ac.createGain(),lp=ac.createBiquadFilter();o.type=tipo||'sine';o.frequency.value=f;lp.type='lowpass';lp.frequency.value=corte||8000;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(v,t+.003);g.gain.setValueAtTime(v,t+dur-.006);g.gain.linearRampToValueAtTime(0,t+dur);o.connect(lp);lp.connect(g);sSale(g,.5);o.start(t);o.stop(t+dur+.01);}
const FX={
  tap:t=>{sClic(t,3000,6,.012,.5);sClic(t,800,3,.006,.25);},
  sel:t=>{sClic(t,2500,8,.008,.4);sClic(t+.035,2200,8,.008,.3);},
  nav:t=>{sClic(t,1800,4,.01,.45);sGolpe(t,150,.05,.25);},
  baja:t=>{sGolpe(t,95,.12,.45);sClic(t,600,2,.012,.25);},
  cuenta:t=>{sClic(t,4200,12,.01,.35);},
  exc:t=>{sGolpe(t,120,.16,.25);},
  con:t=>{sClic(t,2600,5,.01,.55);sGolpe(t,180,.07,.4);},
  rep:t=>{sClic(t,3500,10,.006,.45);},
  fin:t=>{sTono(t,1630,.012,.2);sClic(t,1630,30,.35,.3);sClic(t,2570,40,.25,.18);},
  ok:t=>{sClic(t,2800,6,.008,.4);sClic(t+.04,2600,6,.008,.35);sClic(t+.08,2900,6,.008,.35);sGolpe(t+.08,140,.06,.3);},
  meta:t=>{sGolpe(t,75,.2,.65);sClic(t,500,1,.04,.35);},
  verif:t=>{for(let i=0;i<7;i++)sClic(t+i*.032+Math.random()*.01,1600+Math.random()*1600,6,.007,.32);},
  concedido:t=>{sClic(t,2200,6,.01,.45);sClic(t+.13,2000,6,.01,.45);sGolpe(t+.3,62,.35,.75);sClic(t+.3,400,1.5,.05,.35);},
  denegado:t=>{sTono(t,118,.36,.3,'square',700);},
  letra:t=>{sClic(t,3200,6,.005,.22);},
  agente:t=>{sClic(t,1800+Math.random()*900,5,.004,.2);}
};
function fx(n){try{bus();const f=FX[n];if(f)f(ac.currentTime+.005);}catch(e){}}
function fxDe(b){const a=b.dataset.act;if(a==='rep'||a==='guardar'||a==='evGuardar'||a==='sRep'||a==='sHecha'||a==='nPon'||a==='nMano'||a==='nPesar')return;fx(b.closest('nav')||a==='ver'||a==='volver'||a==='perfil'||a==='salir'?'nav':b.classList.contains('chip')||b.closest('.seg')?'sel':a.indexOf('del')===0?'baja':'tap');}

/* ---------- Pantalla de acceso ---------- */
// Es un adorno, no una protección: el código está a la vista en este archivo.
const CODIGO='0000';
const AGENTE='Sable Cazador';
const agente=()=>String(mem.cfg.agente||'').trim().slice(0,24)||AGENTE;
const VOZ='./voz-acceso.mp3';
let voz=null;
function cargarVoz(){if(!location.protocol.startsWith('http'))return;fetch(VOZ).then(r=>r.ok?r.arrayBuffer():null).then(b=>{if(!b)return;ac=ac||new (window.AudioContext||window.webkitAudioContext)();return new Promise((ok,no)=>ac.decodeAudioData(b,ok,no));}).then(buf=>{voz=buf||null;}).catch(()=>{});}
// Estilo «Acción Nocturna»: globo con un punto por agente, PIN en círculos y teclado redondo.
const AC_CIUDADES=[[51.51,-0.13],[43.30,5.37],[-34.60,-58.38],[35.68,139.69],[40.71,-74.00],[30.04,31.24],[55.76,37.62],[-33.87,151.21],[-33.92,18.42],[41.01,28.98],[-22.91,-43.17],[1.35,103.82],[64.15,-21.94],[19.43,-99.13],[19.08,72.88],[38.72,-9.14]];
const AC_SALIDA={peter:0,gym:1,eval:2,nutri:3};       // Londres, Marsella, Buenos Aires, Tokio
function acceso(){
  const el=document.createElement('div');el.id='acceso';el.className='pide';
  el.innerHTML=`<canvas class="ac-ruido"></canvas>
    <div class="ac-cab"><svg class="ac-marco" viewBox="0 0 400 100" preserveAspectRatio="none" aria-hidden="true"><path d="M0 22 L18 0 H210 L232 12 H400"/></svg>
      <svg class="ac-logo" viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="21"/><ellipse cx="32" cy="32" rx="9" ry="21" opacity=".6"/><path d="M11 32h42M14 22h36M14 42h36" opacity=".5"/><path class="ac-estrella" d="M32 2 L35 29 L62 32 L35 35 L32 62 L29 35 L2 32 L29 29 Z"/><circle cx="32" cy="32" r="2.5" class="ac-punto"/></svg>
      <div class="ac-ag"><b>ACCIÓN</b><span>NOCTURNA</span><small>RED DE OPERACIONES</small></div>
      <div class="ac-yo"><small>AGENTE</small><b>${esc(agente().toUpperCase())}</b></div></div>
    <div class="ac-zona"><div class="ac-coord">41.5381° N<br>2.4447° E</div><div class="ac-sats">SAT-1<br>SAT-2<br>SAT-3<br>SAT-4<i></i></div><canvas class="ac-globo"></canvas><span class="ac-esq i"></span><span class="ac-esq d"></span></div>
    <div class="ac-tit">INTRODUCE TU PIN</div><div class="ac-sub">ACCESO RESTRINGIDO</div>
    <div class="ac-pin">${'<i></i>'.repeat(CODIGO.length)}</div>
    <div class="ac-tec">${[1,2,3,4,5,6,7,8,9].map(k=>`<button data-k="${k}">${k}</button>`).join('')}<button data-k="0" class="b0">0</button><button data-k="⌫" class="bx" aria-label="Borrar">⌫</button></div>
    <div class="ac-pie"><div>v3.7.4<br>INTERFAZ SEGURA</div><div class="ac-rojo">///</div></div>`;
  document.body.appendChild(el);
  const tit=el.querySelector('.ac-tit'),sub=el.querySelector('.ac-sub'),globo=acGlobo(el.querySelector('.ac-globo'));acRuido(el.querySelector('.ac-ruido'));
  let cod='',bloq=false;const nom=agente().toUpperCase();
  const pinta=()=>el.querySelectorAll('.ac-pin i').forEach((c,i)=>c.classList.toggle('on',i<cod.length));
  const estado=(cls,t,s)=>{el.className=cls;tit.textContent=t;sub.textContent=s;};
  el.addEventListener('click',e=>{const b=e.target.closest('[data-k]');if(!b||bloq)return;fx('tap');if(b.dataset.k==='⌫')cod=cod.slice(0,-1);else if(cod.length<CODIGO.length)cod+=b.dataset.k;pinta();if(cod.length===CODIGO.length)comprobar();});
  function comprobar(){bloq=true;estado('verif','VERIFICANDO','ENLACE SATELITAL');fx('verif');globo.rapido(true);setTimeout(()=>{globo.rapido(false);if(cod===CODIGO)concedido();else denegado();},1500);}
  function concedido(){estado('ok','ACCESO CONCEDIDO','');fx('concedido');let espera=1200+nom.length*70+1400;
    if(voz){try{const s=ac.createBufferSource();s.buffer=voz;s.connect(ac.destination);s.start(ac.currentTime+0.35);espera=Math.max(espera,(voz.duration+0.9)*1000);}catch(e){}}
    setTimeout(bienvenida,1200);
    setTimeout(()=>{el.classList.add('fuera');setTimeout(()=>{globo.parar();el.remove();},600);},espera);}
  function bienvenida(){estado('ok bien','','BIENVENIDO');let i=0;const id=setInterval(()=>{const c=nom.charAt(i++);tit.textContent=nom.slice(0,i);if(c!==' ')fx('letra');if(i>=nom.length)clearInterval(id);},70);}
  function denegado(){estado('no','ACCESO DENEGADO','CÓDIGO INCORRECTO');fx('denegado');setTimeout(()=>{cod='';pinta();bloq=false;estado('pide','INTRODUCE TU PIN','ACCESO RESTRINGIDO');},1600);}
}
// Fondo de puntos tenues, fijo.
function acRuido(c){const x=c.getContext('2d'),dpr=Math.min(2,devicePixelRatio||1);c.width=c.clientWidth*dpr;c.height=c.clientHeight*dpr;let s=7;const r=()=>(s=(s*16807)%2147483647)/2147483647;
  for(let i=0;i<260;i++){x.fillStyle=`rgba(74,168,255,${r()*.35})`;x.fillRect(r()*c.width,r()*c.height,dpr,dpr);}}
// Globo de puntos en proyección ortográfica con órbita y un punto por agente. Cada 20–45 s un agente viaja a otra ciudad.
function acGlobo(c){
  const x=c.getContext('2d'),dpr=Math.min(2,devicePixelRatio||1),D=Math.PI/180,quieto=typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches;
  let rot=-5*D,t=0,giro=0.0016,vivo=true,viajeId=0;
  const tierra=[];(typeof MAPA!=='undefined'?MAPA:[]).forEach(f=>{for(let i=2;i<f.length;i+=2)for(let k=f[i];k<f[i]+f[i+1];k++)tierra.push([f[0]*D,(-180+k*f[1]+f[1]/2)*D]);});
  const usadas=[];const agentes=Object.keys(PERFILES).map(k=>{let ci=AC_SALIDA[k];if(ci===undefined||usadas.includes(ci))ci=AC_CIUDADES.findIndex((_,i)=>!usadas.includes(i));usadas.push(ci);
    const p=PERFILES[k].ag.split(' ');return {n:(p[0][0]+'. '+p.slice(1).join(' ')).toUpperCase(),c:ci};});
  const vec=(la,lo)=>[Math.cos(la)*Math.cos(lo),Math.sin(la),Math.cos(la)*Math.sin(lo)];
  function pos(a){const [la,lo]=AC_CIUDADES[a.c];if(!a.v)return [la*D,lo*D];
    const f=Math.min(1,(performance.now()-a.v.t0)/4500),e=f<.5?2*f*f:1-Math.pow(-2*f+2,2)/2,p=vec(a.v.de[0]*D,a.v.de[1]*D),q=vec(la*D,lo*D);
    const om=Math.acos(Math.max(-1,Math.min(1,p[0]*q[0]+p[1]*q[1]+p[2]*q[2]))),s=Math.sin(om)||1,k1=Math.sin((1-e)*om)/s,k2=Math.sin(e*om)/s,v=p.map((y,i)=>k1*y+k2*q[i]);
    if(f>=1)a.v=null;return [Math.asin(Math.max(-1,Math.min(1,v[1]))),Math.atan2(v[2],v[0])];}
  function viaja(){if(!vivo)return;const a=agentes[Math.floor(Math.random()*agentes.length)],libres=AC_CIUDADES.map((_,i)=>i).filter(i=>!agentes.some(y=>y.c===i));
    a.v={de:AC_CIUDADES[a.c],t0:performance.now()};a.c=libres[Math.floor(Math.random()*libres.length)];viajeId=setTimeout(viaja,20000+Math.random()*25000);}
  viajeId=setTimeout(viaja,15000);
  function proy(la,lo,R,cx,cy,tl){const l=lo+rot,X=Math.cos(la)*Math.sin(l),Y=Math.sin(la),Z=Math.cos(la)*Math.cos(l);return [cx+X*R,cy-(Y*Math.cos(tl)-Z*Math.sin(tl))*R,Y*Math.sin(tl)+Z*Math.cos(tl)];}
  function frame(){
    if(!vivo)return;
    const W=c.clientWidth,H=c.clientHeight;if(!W||!H){requestAnimationFrame(frame);return;}
    if(c.width!==Math.round(W*dpr)){c.width=Math.round(W*dpr);c.height=Math.round(H*dpr);}
    x.setTransform(dpr,0,0,dpr,0,0);x.clearRect(0,0,W,H);
    const cx=W/2,cy=H/2,R=Math.min(W,H)*0.39,tl=18*D;
    let g=x.createRadialGradient(cx,cy,R*.6,cx,cy,R*1.35);g.addColorStop(0,'rgba(74,168,255,.10)');g.addColorStop(1,'rgba(74,168,255,0)');x.fillStyle=g;x.fillRect(0,0,W,H);
    g=x.createRadialGradient(cx-R*.35,cy-R*.4,R*.1,cx,cy,R);g.addColorStop(0,'rgba(40,110,190,.55)');g.addColorStop(.7,'rgba(10,40,80,.55)');g.addColorStop(1,'rgba(4,16,34,.9)');
    x.beginPath();x.arc(cx,cy,R,0,7);x.fillStyle=g;x.fill();
    const orb=(a0,a1)=>{x.beginPath();x.ellipse(cx,cy+R*.05,R*1.42,R*.36,-6*D,a0,a1);x.strokeStyle='rgba(120,190,255,.55)';x.lineWidth=1;x.stroke();};
    orb(Math.PI,2*Math.PI);
    x.save();x.beginPath();x.arc(cx,cy,R,0,7);x.clip();x.lineWidth=.6;x.strokeStyle='rgba(110,180,255,.28)';
    const linea=pts=>{x.beginPath();let on=false;pts.forEach(p=>{if(p[2]>0){on?x.lineTo(p[0],p[1]):x.moveTo(p[0],p[1]);on=true;}else on=false;});x.stroke();};
    for(let la=-60;la<=60;la+=30){const p=[];for(let lo=-180;lo<=180;lo+=4)p.push(proy(la*D,lo*D,R,cx,cy,tl));linea(p);}
    for(let lo=-180;lo<180;lo+=30){const p=[];for(let la=-90;la<=90;la+=4)p.push(proy(la*D,lo*D,R,cx,cy,tl));linea(p);}
    const tp=Math.max(1,R/120);tierra.forEach(([la,lo])=>{const p=proy(la,lo,R,cx,cy,tl);if(p[2]>.02){x.fillStyle=`rgba(125,195,255,${.18+.62*p[2]})`;x.fillRect(p[0]-tp/2,p[1]-tp/2,tp,tp);}});
    x.restore();
    x.font='600 7px ui-monospace,Menlo,Consolas,monospace';
    agentes.forEach((a,i)=>{const ll=pos(a),p=proy(ll[0],ll[1],R,cx,cy,tl);if(p[2]<=0)return;const al=Math.min(1,p[2]*1.6),pul=(t*.9+i*.25)%1;
      x.fillStyle=`rgba(230,245,255,${al})`;x.shadowColor='#4aa8ff';x.shadowBlur=10;x.beginPath();x.arc(p[0],p[1],2.4,0,7);x.fill();x.shadowBlur=0;
      x.strokeStyle=`rgba(120,200,255,${al*(1-pul)})`;x.lineWidth=1;x.beginPath();x.arc(p[0],p[1],3+pul*9,0,7);x.stroke();
      if(p[2]>.35){const s=i%2?1:-1;x.strokeStyle=`rgba(120,200,255,${al*.6})`;x.beginPath();x.moveTo(p[0]+3,p[1]+3*s);x.lineTo(p[0]+10,p[1]+12*s);x.lineTo(p[0]+14,p[1]+12*s);x.stroke();
        x.fillStyle=`rgba(200,230,255,${al*.9})`;x.fillText(a.n,p[0]+16,p[1]+12*s+2.5);}});
    x.beginPath();x.arc(cx,cy,R,0,7);x.strokeStyle='rgba(120,195,255,.75)';x.lineWidth=1.2;x.shadowColor='rgba(74,168,255,.9)';x.shadowBlur=14;x.stroke();x.shadowBlur=0;
    x.strokeStyle='rgba(150,205,255,.5)';x.lineWidth=.8;x.beginPath();x.moveTo(cx,cy-R*1.08);x.lineTo(cx,cy+R*1.08);x.stroke();
    orb(0,Math.PI);
    const an=t*.6,co=Math.cos(-6*D),si=Math.sin(-6*D),sx=cx+Math.cos(an)*R*1.42*co-Math.sin(an)*R*.36*si,sy=cy+R*.05+Math.cos(an)*R*1.42*si+Math.sin(an)*R*.36*co;
    x.fillStyle='#dff0ff';x.shadowColor='#4aa8ff';x.shadowBlur=10;x.beginPath();x.arc(sx,sy,2.2,0,7);x.fill();x.shadowBlur=0;
    if(!quieto){rot+=giro;t+=.016;}
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  return {rapido:on=>{giro=on?0.02:0.0016;},parar:()=>{vivo=false;clearTimeout(viajeId);}};
}

/* ---------- Contador ---------- */
let tempoId=0,sen=null;
function upd(){const c=$('#cnt');if(c)c.textContent=st.reps;const b=$('#big');if(b)b.classList.toggle('done',st.reps>=st.obj);}
function addRep(){st.reps++;upd();fx(st.reps===st.obj?'meta':'rep');wake();}
function onMotion(e){const a=e.accelerationIncludingGravity;if(!a||a.x==null||!sen)return;const m=Math.hypot(a.x,a.y,a.z);sen.base+=(m-sen.base)*0.02;sen.f+=((m-sen.base)-sen.f)*0.2;const now=Date.now();if(sen.fase===0&&sen.f>st.sens)sen.fase=1;else if(sen.fase===1&&sen.f<-st.sens){sen.fase=0;if(now-sen.last>700){sen.last=now;addRep();}}}
async function sensorOn(){if(typeof DeviceMotionEvent==='undefined'){toast('Este dispositivo no ofrece sensor de movimiento');return false;}try{if(typeof DeviceMotionEvent.requestPermission==='function'){const r=await DeviceMotionEvent.requestPermission();if(r!=='granted'){toast('Permiso de movimiento denegado');return false;}}}catch(e){toast('No se pudo activar el sensor');return false;}sen={base:9.8,f:0,fase:0,last:0};window.addEventListener('devicemotion',onMotion);return true;}
async function arrancar(){wake();beep(660,0.05);if(st.modo==='tempo'){st.run=true;tempoId=setInterval(()=>{addRep();if(st.reps>=st.obj)parar();},st.tempo*1000);}else if(st.modo==='sensor'){if(!(await sensorOn()))return;st.run=true;}render();}
function parar(){if(tempoId){clearInterval(tempoId);tempoId=0;}window.removeEventListener('devicemotion',onMotion);sen=null;const was=st.run;st.run=false;if(was)render();}
function elegir(e,label,obj,keep){if(!e)return;parar();if(!keep)st.cola=null;st.ex=e;st.vari=label;st.reps=0;if(obj)st.obj=obj;const prev=mem.sets.filter(s=>s.ex===e.id);if(prev.length)st.kg=prev[prev.length-1].kg;st.tab='entrenar';st.det=null;render();window.scrollTo(0,0);}
function cargarCola(){const it=st.cola[st.colaI];elegir(BYID[it.ex],it.v,it.reps,true);}
setInterval(()=>{if(!st.restEnd)return;const left=Math.ceil((st.restEnd-Date.now())/1000);if(left<=0){st.restEnd=0;fx('fin');if(st.tab==='entrenar')render();return;}const el=$('#rest');if(el)el.textContent=mmss(left);},250);

/* ---------- Vistas ---------- */
function vEntrenar(){
  if(!st.ex)return `<div class="card center"><div class="sello">Clasificado</div><h2>Elige un ejercicio</h2><p class="mut">Objetivo: <span class="tach">xxxxxxxxxxxx</span></p><p class="mut">Abre la biblioteca, escoge la variante y vuelve aquí para contar repeticiones.</p><button class="btn" data-act="tab" data-v="biblioteca">Abrir biblioteca</button></div>`;
  const hoy=mem.sets.filter(s=>s.ex===st.ex.id&&dia(s.t)===dia(Date.now()));
  const ult=ultima(st.ex.id);
  const it=st.cola?st.cola[st.colaI]:null;
  const left=st.restEnd?Math.max(0,Math.ceil((st.restEnd-Date.now())/1000)):0;
  return `<div class="card">
    ${it?`<div class="tag">Rutina · ejercicio ${st.colaI+1} de ${st.cola.length} · objetivo ${evPlan(it)}</div>`:''}
    <div class="mut">${esc(st.ex.g)}</div><h2>${esc(st.ex.n)}</h2><div class="mut">${esc(st.vari)}</div>
    ${ult?`<div class="mut">Última vez — ${esc(ult)}</div>`:''}</div>
  <div class="seg">${[['manual','Manual'],['tempo','Tempo'],['sensor','Sensor']].map(m=>`<button data-act="modo" data-v="${m[0]}" class="${st.modo===m[0]?'on':''}">${m[1]}</button>`).join('')}</div>
  <button id="big" data-act="rep" class="big ${st.reps>=st.obj?'done':''}"><span id="cnt">${st.reps}</span><small>de ${st.obj} · toca para sumar</small></button>
  <div class="row c"><button class="btn sm ghost" data-act="menos">−1</button><button class="btn sm ghost" data-act="cero">A cero</button>${st.modo!=='manual'?`<button class="btn sm" data-act="auto">${st.run?'Parar':'Empezar'}</button>`:''}</div>
  ${st.modo==='tempo'?`<div class="card"><div class="row sb"><span>Segundos por repetición</span><span class="row"><button class="x" data-act="tempo" data-v="-0.5">−</button><b>${st.tempo}</b><button class="x" data-act="tempo" data-v="0.5">+</button></span></div><div class="mut">Suena un pitido y suma una repetición a ese ritmo hasta llegar al objetivo.</div></div>`:''}
  ${st.modo==='sensor'?`<div class="card"><div class="row sb"><span>Sensibilidad</span><span class="chips">${[[0.8,'Alta'],[1.3,'Media'],[2,'Baja']].map(s=>`<button class="chip ${st.sens===s[0]?'on':''}" data-act="sens" data-v="${s[0]}">${s[1]}</button>`).join('')}</span></div><div class="mut">Experimental: usa el acelerómetro del iPhone. Llévalo sujeto a la parte del cuerpo o al peso que se mueve. Revisa la cuenta antes de guardar.</div></div>`:''}
  <div class="card"><div class="row sb"><span>Peso (kg)</span><span class="row"><button class="x" data-act="kg" data-v="-2.5">−</button><input class="inp n" type="number" inputmode="decimal" step="0.5" value="${st.kg}" data-in="kgv"><button class="x" data-act="kg" data-v="2.5">+</button></span></div>
    <div class="row sb"><span>Objetivo de repeticiones</span><span class="row"><button class="x" data-act="obj" data-v="-1">−</button><b>${st.obj}</b><button class="x" data-act="obj" data-v="1">+</button></span></div></div>
  <button class="btn" data-act="guardar">Guardar serie</button>
  ${it?`<button class="btn ghost" data-act="sig">${st.colaI<st.cola.length-1?'Siguiente ejercicio ▶':'Terminar rutina'}</button>`:''}
  <div class="card"><div class="row sb"><span>Descanso</span><span id="rest" class="rest">${left?mmss(left):'—'}</span></div>
    <div class="chips">${[45,60,90,120,180].map(s=>`<button class="chip ${mem.cfg.descanso===s?'on':''}" data-act="descanso" data-v="${s}">${s<60?s+' s':mmss(s)}</button>`).join('')}${left?`<button class="chip" data-act="saltar">Saltar</button>`:''}</div></div>
  <div class="card"><h3>Series de hoy</h3>${hoy.length?hoy.map((s,i)=>`<div class="li"><div>Serie ${i+1}<div class="mut">${esc(s.v)}</div></div><div class="r">${s.kg} kg × ${s.reps}</div></div>`).join(''):'<div class="mut">Todavía ninguna.</div>'}</div>`;
}
function filtrados(){const q=norm(st.q.trim());return EJERCICIOS.filter(e=>(!st.grupo||e.g===st.grupo)&&(!st.equipo||e.eq.includes(st.equipo))&&(!q||norm(e.n+' '+e.g+' '+e.sec+' '+e.pos.join(' ')).includes(q)));}
function listaHTML(){const l=filtrados();const tot=l.reduce((a,e)=>a+nVar(e),0);return `<div class="mut pad">${l.length} ejercicios · ${tot} variantes</div>`+l.map(e=>`<button class="li link" data-act="ver" data-v="${e.id}"><div><b>${esc(e.n)}</b><div class="mut">${esc(e.g)}${e.sec?' · '+esc(e.sec):''}</div></div><div class="r mut">${nVar(e)} ›</div></button>`).join('');}
function vBiblioteca(){
  if(st.det)return vDetalle();
  return `<input class="inp" type="search" placeholder="Buscar ejercicio o músculo…" value="${esc(st.q)}" data-in="q">
  <div class="chips scroll">${['',...GRUPOS].map(g=>`<button class="chip ${st.grupo===g?'on':''}" data-act="grupo" data-v="${esc(g)}">${g||'Todos'}</button>`).join('')}</div>
  <select class="inp" data-in="equipo"><option value="">Cualquier equipo</option>${Object.values(EQUIPOS).map(x=>`<option ${st.equipo===x?'selected':''}>${esc(x)}</option>`).join('')}</select>
  <div id="lista" class="card nopad">${listaHTML()}</div>`;
}
function vDetalle(){
  const e=st.det;const chips=(k,arr)=>arr.map((x,i)=>`<button class="chip ${st.sel[k]===i?'on':''}" data-act="sel" data-v="${k}:${i}">${esc(x)}</button>`).join('');
  const ss=mem.sets.filter(s=>s.ex===e.id);const best=ss.reduce((m,s)=>Math.max(m,s.kg*(1+s.reps/30)),0);
  return `<button class="back" data-act="volver">‹ Biblioteca</button>
  <div class="card"><div class="mut">${esc(e.g)} · ${e.comp?'Compuesto':'Aislado'}</div><h2>${esc(e.n)}</h2>${e.sec?`<div class="mut">También trabaja: ${esc(e.sec)}</div>`:''}<p>${esc(e.cue)}</p><div class="tag">${nVar(e)} variantes · ${TECNICAS.length} técnicas de ejecución</div></div>
  <div class="card"><h3>Equipo</h3><div class="chips">${chips('eq',e.eq)}</div><h3>Posición</h3><div class="chips">${chips('pos',e.pos)}</div>
    ${e.ag.length>1?`<h3>Agarre o detalle</h3><div class="chips">${chips('ag',e.ag)}</div>`:''}
    ${e.uni?`<h3>Lados</h3><div class="chips"><button class="chip ${st.sel.uni?'':'on'}" data-act="uni" data-v="0">Bilateral</button><button class="chip ${st.sel.uni?'on':''}" data-act="uni" data-v="1">Unilateral</button></div>`:''}
    <h3>Técnica</h3><div class="chips">${chips('tec',TECNICAS.map(t=>t[0]))}</div>${st.sel.tec?`<div class="mut">${esc(TECNICAS[st.sel.tec][1])}</div>`:''}
    <div class="sel">${esc(varLabel(e,st.sel))}</div></div>
  <div class="card"><h3>Añadir a una rutina</h3>${mem.rutinas.length?`<select id="rsel" class="inp">${mem.rutinas.map(r=>`<option value="${r.id}">${esc(r.n)}</option>`).join('')}</select><div class="row"><input id="rser" class="inp n" type="number" inputmode="numeric" value="3"><span>series ×</span><input id="rrep" class="inp n" type="number" inputmode="numeric" value="10"><span>reps</span><button class="btn sm" data-act="addRut">Añadir</button></div>`:'<div class="mut">Crea primero una rutina en la pestaña Rutinas.</div>'}</div>
  <div class="card"><h3>Tu historial</h3>${ss.length?`<div class="mut">Mejor 1RM estimado: ${best.toFixed(1)} kg</div>`+ss.slice(-6).reverse().map(s=>`<div class="li"><div>${new Date(s.t).toLocaleDateString('es-ES',{day:'numeric',month:'short'})}<div class="mut">${esc(s.v)}</div></div><div class="r">${s.kg} kg × ${s.reps}</div></div>`).join(''):'<div class="mut">Sin registros todavía.</div>'}</div>`;
}
function vRutinas(){
  return `<div class="card"><h2>Rutinas</h2><div class="row"><input id="rnom" class="inp" placeholder="Nombre de la rutina"><button class="btn sm" data-act="nuevaRut">Crear</button></div><div class="mut">Los ejercicios se añaden desde su ficha en la biblioteca. Marca en cada rutina los días en que toca: ${esc(PERFILES.peter.ag)} te esperará ese día.</div></div>`+
  mem.rutinas.map(r=>`<div class="card"><div class="row sb"><h3>${esc(r.n)}</h3><button class="x" data-act="delRut" data-v="${r.id}">✕</button></div><div class="chips">${[1,2,3,4,5,6,0].map(d=>`<button class="chip ${(r.dias||[]).includes(d)?'on':''}" data-act="rutDia" data-v="${r.id}:${d}" aria-label="${DIAS_N[d]}">${DIAS[d]}</button>`).join('')}</div>${r.items.length?r.items.map((it,i)=>`<div class="li"><div><b>${esc(BYID[it.ex]?BYID[it.ex].n:it.ex)}</b><div class="mut">${esc(it.v)}</div></div><div class="r">${evPlan(it)}</div><button class="x" data-act="delItem" data-v="${r.id}:${i}">✕</button></div>`).join(''):'<div class="mut">Vacía.</div>'}</div>`).join('');
}
function vHistorial(){
  const days={};mem.sets.forEach(s=>{(days[dia(s.t)]=days[dia(s.t)]||[]).push(s);});
  const keys=Object.keys(days).sort((a,b)=>new Date(b)-new Date(a));
  return `<div class="card"><h2>Historial</h2><div class="mut">${keys.length} ${keys.length===1?'día':'días'} · ${mem.sets.length} ${mem.sets.length===1?'serie':'series'}</div><div class="row"><button class="btn sm" data-act="exportar">Exportar copia</button><button class="btn sm ghost" data-act="importar">Importar copia</button><input type="file" id="imp" accept="application/json,.json" hidden></div><div class="mut">${sy.code?'Los datos se sincronizan con tus otros dispositivos.':'Los datos solo viven en este dispositivo.'} Exporta una copia de vez en cuando.</div><div class="mut" id="ver"></div><h3>Nombre de agente</h3><input class="inp" data-in="agente" maxlength="24" autocomplete="off" placeholder="${esc(AGENTE)}" value="${esc(mem.cfg.agente||'')}"><div class="mut">Es el nombre del saludo al entrar. Se guarda con el resto de tus datos.</div>${vSync()}</div>`+
  (keys.length?keys.map(k=>{const ss=days[k];const vol=ss.reduce((a,s)=>a+s.kg*s.reps,0);return `<div class="card"><h3>${fechaLarga(ss[0].t)}</h3><div class="mut">${ss.length} series · ${Math.round(vol)} kg de volumen</div>${ss.map(s=>`<div class="li"><div><b>${esc(s.n)}</b><div class="mut">${esc(s.v)}</div></div><div class="r">${s.kg} kg × ${s.reps}</div><button class="x" data-act="delSet" data-v="${s.t}">✕</button></div>`).join('')}</div>`;}).join(''):'<div class="card mut">Aún no hay series guardadas.</div>');
}
function verVersion(){if(typeof caches==='undefined')return;Promise.all(['./index.html','./app.js','./exercises.js'].map(u=>caches.match(u))).then(rs=>{const t=Math.max(0,...rs.map(r=>r?Date.parse(r.headers.get('last-modified')||'')||0:0));const el=$('#ver');if(t&&el)el.textContent='Versión publicada el '+new Date(t).toLocaleString('es-ES',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'});}).catch(()=>{});}

/* ---------- Evaluación ---------- */
// `m`: admite varias respuestas. `x`: lista de la que se quita una zona al marcarla aquí.
const EV_ZONAS_OP=[['hombro','Hombro'],['rodilla','Rodilla'],['lumbar','Zona lumbar'],['muneca','Muñeca']];
const EV_P=[
  {k:'obj',q:'¿Cuál es tu objetivo?',o:[['fuerza','Fuerza'],['musculo','Ganar músculo'],['resist','Resistencia'],['grasa','Perder grasa'],['salud','Salud general']]},
  {k:'exp',q:'¿Cuánto llevas entrenando?',o:[[0,'Menos de 6 meses'],[1,'De 6 meses a 2 años'],[2,'Más de 2 años']]},
  {k:'dias',q:'¿Cuántos días por semana?',o:[[2,'2'],[3,'3'],[4,'4'],[5,'5'],[6,'6']]},
  {k:'min',q:'¿Cuánto dura cada sesión?',o:[[30,'30 min'],[45,'45 min'],[60,'60 min'],[90,'90 min']]},
  {k:'equipo',q:'¿Con qué equipo cuentas?',o:[['gym','Gimnasio completo'],['mancuernas','Mancuernas en casa'],['corporal','Solo peso corporal'],['gomas','Gomas elásticas']]},
  {k:'evitar',m:1,x:'fortalecer',q:'¿Alguna zona que debas evitar?',a:'Opcional. Se quitan los ejercicios que la cargan.',o:EV_ZONAS_OP},
  {k:'fortalecer',m:1,x:'evitar',q:'¿Alguna zona que quieras fortalecer?',a:'Opcional. Tendrá más trabajo de los músculos que la sostienen.',o:EV_ZONAS_OP},
  {k:'prioridad',m:1,q:'¿Algún músculo a priorizar?',a:'Opcional. Tendrá un ejercicio más los días que toque.',o:['Pecho','Espalda','Hombro','Bíceps','Tríceps','Cuádriceps','Isquios','Glúteo','Gemelo','Core'].map(g=>[g,g])},
  {k:'cardio',q:'¿Añadimos cardio al final?',o:[['no','No'],['poco','Un poco (10 min)'],['si','Sí (20 min)']]}];
const EV_NOM={fuerza:'Fuerza',musculo:'Ganar músculo',resist:'Resistencia',grasa:'Perder grasa',salud:'Salud general'};
const evPlan=it=>it.min?it.reps+' min':it.series+'×'+it.reps;
function vEvaluacion(){
  const ev=st.ev;
  if(!ev){const u=mem.ev;return `<div class="card"><h2>Evaluación</h2><p class="mut">${EV_P.length} preguntas sobre tu objetivo, tu experiencia y tu tiempo. Con las respuestas se prepara una rutina por días.</p>${u?`<div class="sel">Última: ${new Date(u.t).toLocaleDateString('es-ES',{day:'numeric',month:'long'})} · ${esc(EV_NOM[u.r.obj]||'')} · ${esc(u.r.dias)} días por semana</div>`:''}<button class="btn" data-act="evIni">${u?'Repetir evaluación':'Empezar evaluación'}</button></div>`;}
  if(ev.res){const d=ev.res.descanso;return `<div class="card"><div class="tag">Evaluación completada</div><h2>Tu rutina</h2><div class="mut">${esc(EV_NOM[ev.r.obj])} · ${ev.res.rutinas.length} días · descanso entre series ${d<60?d+' s':mmss(d)}</div>${ev.res.sinCardio?'<div class="mut">No hay cardio compatible con tu equipo y tus zonas a evitar.</div>':''}</div>`+
    ev.res.rutinas.map(r=>`<div class="card"><h3>${esc(r.n.replace('Evaluación · ',''))}</h3>${r.items.length?r.items.map(it=>`<div class="li"><div><b>${esc(it.n)}</b><div class="mut">${esc(it.v)}</div></div><div class="r">${evPlan(it)}</div></div>`).join(''):'<div class="mut">Sin ejercicios compatibles.</div>'}</div>`).join('')+
    `<button class="btn" data-act="evGuardar">Guardar en Rutinas</button><button class="btn ghost" data-act="evIni">Repetir evaluación</button><div class="mut">Al guardar se sustituyen las rutinas de una evaluación anterior y se ajusta el descanso. Las rutinas que hayas creado tú no se tocan.</div><div class="mut">¿Quieres una rutina más completa con tus notas? La evaluación ya está en la pestaña Claude.</div>`;}
  const p=EV_P[ev.i];
  return `<div class="card"><div class="tag">Pregunta ${ev.i+1} de ${EV_P.length}</div><div class="bar"><i style="width:${(ev.i+1)/EV_P.length*100}%"></i></div><h2>${p.q}</h2>${p.a?`<div class="mut">${p.a}</div>`:''}
    <div class="chips col">${p.o.map((o,j)=>`<button class="chip ${(p.m?ev.r[p.k].includes(o[0]):ev.r[p.k]===o[0])?'on':''}" data-act="evOp" data-v="${j}">${esc(o[1])}</button>`).join('')}</div>
    ${ev.abiertas[p.k]||ev.r.notas[p.k]?`<h3>Cuéntame más</h3><textarea class="inp" rows="3" maxlength="1000" data-in="evNota" placeholder="Cuéntalo con tus palabras">${esc(ev.r.notas[p.k]||'')}</textarea><div class="mut">La nota no cambia la rutina que prepara la app: va en el MD para Claude.</div>`:'<button class="btn sm ghost" data-act="evNota">Cuéntame más</button>'}
    <div class="row sb"><button class="btn sm ghost" data-act="evAtras">Atrás</button><button class="btn sm" data-act="evSig">${ev.i<EV_P.length-1?'Siguiente':'Generar rutina'}</button></div></div>`;
}

/* ---------- Claude: intercambio por MD ---------- */
// Pablo prepara un MD con la evaluación, las notas y el formato de respuesta. Claude contesta con un bloque
// REPES-RUTINA … FIN-RUTINA que la app lee, revisa y guarda en Rutinas.
const evResp=(p,r)=>{const v=r[p.k],et=x=>{const o=p.o.find(o=>o[0]===x);return o?o[1]:String(x);};return p.m?(v&&v.length?v.map(et).join(', '):'Ninguna'):v===undefined?'Sin responder':et(v);};
function mdEval(){
  const u=mem.ev,r=u.r,notas=r.notas||{},gen=evGenerar(r,EJERCICIOS);
  const L=[`# Evaluación de Repes · ${new Date(u.t).toLocaleDateString('es-ES',{day:'numeric',month:'long',year:'numeric'})}`,'',
    '> Para Claude: soy Larry y uso Repes, mi app de gimnasio. Prepárame una rutina más completa que la que propone la app, teniendo en cuenta mis respuestas y, sobre todo, mis notas. Responde en el formato del final para que la app pueda leerla.','','## Mis respuestas'];
  EV_P.forEach(p=>{L.push(`- **${p.q}** ${evResp(p,r)}`);if(notas[p.k])L.push('  - Nota: '+notas[p.k].replace(/\s*\n\s*/g,' '));});
  L.push('',`## Rutina que propone la app (descanso ${gen.descanso} s)`);
  gen.rutinas.forEach(rt=>{L.push('### '+rt.n.replace('Evaluación · ',''));rt.items.forEach(it=>L.push(`- ${it.n} | ${it.v} | ${it.min?it.reps+'min':it.series+'x'+it.reps}`));});
  L.push('','## Formato de la respuesta (obligatorio)','Explica lo que quieras fuera del bloque, pero la rutina va entre las líneas REPES-RUTINA y FIN-RUTINA, así:','','```','REPES-RUTINA','DESCANSO: 90','## Lunes · Torso A','- Press de banca | Barra · Plano | 4x8','- Plancha | Peso corporal · Frontal | 3x30s','- Bicicleta estática | Máquina · Ritmo continuo | 20min','## Miércoles · Pierna A','- Sentadilla | Barra · De pie | 4x6','FIN-RUTINA','```','',
    'Reglas:','- Una línea `## Día · Nombre` por rutina. Días posibles: lunes, martes, miércoles, jueves, viernes, sábado, domingo. Cada día solo puede tener una rutina.',
    '- Una línea por ejercicio: `- Nombre exacto | Equipo · posición o detalle | series x repeticiones`. Para lo que va por tiempo: `3x30s`. Para cardio: `20min`.',
    '- Usa solo ejercicios de la lista siguiente, con el nombre exacto, y uno de sus equipos.','- DESCANSO son los segundos entre series (opcional).','','## Ejercicios disponibles');
  GRUPOS.forEach(g=>L.push(`- **${g}:** `+EJERCICIOS.filter(e=>e.g===g).map(e=>`${e.n} (${e.eq.join(', ')})`).join('; ')));
  return L.join('\n')+'\n';
}
const DIA_N=n=>norm(n).replace(/[^a-z]/g,'');
function leeRespuesta(txt){
  const ls=String(txt).split(/\r?\n/).map(l=>l.trim());
  // Se usa el último bloque: si se pega también el ejemplo de las instrucciones, manda la respuesta.
  let a=-1;ls.forEach((l,i)=>{if(/^REPES-RUTINA\b/i.test(l.replace(/^`+\s*/,'')))a=i;});const b=ls.findIndex((l,i)=>i>a&&/FIN-RUTINA/i.test(l));
  const cuerpo=a>=0?ls.slice(a+1,b>a?b:undefined):ls;
  const out={rutinas:[],descanso:0,avisos:[]},porNombre={},usados={};
  const clave=s=>norm(s).replace(/[^a-z0-9]/g,''),sinPar=s=>clave(String(s).replace(/\([^)]*\)/g,''));
  EJERCICIOS.forEach(e=>{porNombre[clave(e.n)]=e;porNombre[sinPar(e.n)]=porNombre[sinPar(e.n)]||e;porNombre[e.id.replace(/-/g,'')]=e;});
  let cur=null;
  cuerpo.forEach(l=>{
    let m;
    if((m=l.match(/^descanso\s*:?\s*(\d+)/i))){const d=Number(m[1]);if(d>=15&&d<=600)out.descanso=d;else out.avisos.push('Descanso de '+d+' s fuera de rango: no se cambia.');return;}
    if((m=l.match(/^#{2,3}\s*(.+)$/))){const partes=m[1].split(/\s*[·|:—–-]\s*/),dias=[];let i=0;
      for(;i<partes.length;i++){const ds=partes[i].split(/\s*(?:,|\by\b|\/)\s*/).map(x=>DIAS_N.map(DIA_N).indexOf(DIA_N(x)));if(ds.length&&ds.every(d=>d>=0))ds.forEach(d=>dias.push(d));else break;}
      const nombre=partes.slice(i).join(' · ')||m[1];
      const libres=dias.filter(d=>{if(usados[d]){out.avisos.push(`El ${DIAS_N[d]} ya tenía rutina: «${nombre}» no se asigna a ese día.`);return false;}usados[d]=1;return true;});
      cur={n:nombre.slice(0,60),dias:libres,items:[]};out.rutinas.push(cur);return;}
    if((m=l.match(/^[-*•]\s*(.+)$/))&&cur){const p=m[1].split('|').map(x=>x.trim().replace(/\*\*/g,''));
      const e=porNombre[clave(p[0])]||porNombre[sinPar(p[0])];
      if(!e){out.avisos.push(`«${p[0]}» no está en la biblioteca: no se añade.`);return;}
      const plan=(p[p.length-1]||'').toLowerCase().replace(/\s/g,'');let q;const it={ex:e.id,v:''};
      if((q=plan.match(/^(\d+)min/))){it.series=1;it.reps=Math.min(120,Math.max(1,+q[1]));it.min=true;}
      else if((q=plan.match(/^(\d+)[x×](\d+)/))){it.series=Math.min(10,Math.max(1,+q[1]));it.reps=Math.min(100,Math.max(1,+q[2]));}
      else{out.avisos.push(`«${e.n}»: no entiendo «${p[p.length-1]||''}», se pone 3x10.`);it.series=3;it.reps=10;}
      const v=p.length>2?p[1]:'',eq=e.eq.find(x=>norm(v).startsWith(norm(x)));
      if(v&&!eq)out.avisos.push(`«${e.n}»: el equipo «${v}» no le corresponde, se usa ${e.eq[0]}.`);
      it.v=(eq?v:e.eq[0]+' · '+e.pos[0]).slice(0,80);cur.items.push(it);}
  });
  out.rutinas=out.rutinas.filter(r=>r.items.length);
  if(!out.rutinas.length)out.error=a<0?'No encuentro el bloque REPES-RUTINA en lo que has pegado.':'El bloque no tiene ninguna rutina con ejercicios que la app conozca.';
  return out;
}
function vClaude(){
  if(!mem.ev||!mem.ev.r)return `<div class="card"><h2>Claude</h2><p class="mut">Primero haz la evaluación en la pestaña Evaluar.</p></div>`;
  const u=mem.ev,nn=Object.keys(u.r.notas||{}).length,c=st.cl,res=c.res;
  return `<div class="card"><h2>Enviar a Claude</h2><p class="mut">Evaluación del ${new Date(u.t).toLocaleDateString('es-ES',{day:'numeric',month:'long'})} · ${esc(EV_NOM[u.r.obj]||'')} · ${nn?nn+(nn===1?' nota':' notas'):'sin notas'}. Cópiala y pégasela a Claude: lleva tus respuestas, tus notas y las instrucciones para que conteste en el formato de la app.</p>
    <div class="row"><button class="btn sm" data-act="clCopia">Copiar para Claude</button>${typeof navigator!=='undefined'&&navigator.share?'<button class="btn sm ghost" data-act="clComparte">Compartir</button>':''}<button class="btn sm ghost" data-act="clBaja">Descargar .md</button></div></div>
  <div class="card"><h2>Respuesta de Claude</h2><textarea class="inp" rows="6" data-in="clRes" placeholder="Pega aquí la respuesta completa de Claude">${esc(c.txt)}</textarea><button class="btn" data-act="clLee">Leer respuesta</button>
    ${res&&res.error?`<div class="mut warn">${esc(res.error)}</div>`:''}</div>`+
  (res&&!res.error?`<div class="card"><div class="tag">Revisa antes de guardar</div><h3>${res.rutinas.length} ${res.rutinas.length===1?'rutina':'rutinas'}${res.descanso?' · descanso '+(res.descanso<60?res.descanso+' s':mmss(res.descanso)):''}</h3>${res.avisos.map(a=>`<div class="mut warn">${esc(a)}</div>`).join('')}</div>`+
    res.rutinas.map(r=>`<div class="card"><h3>${esc(r.n)}</h3><div class="mut">${r.dias.length?r.dias.map(d=>DIAS_N[d]).join(', '):'Sin día: se asignará al guardar'}</div>${r.items.map(it=>`<div class="li"><div><b>${esc(BYID[it.ex].n)}</b><div class="mut">${esc(it.v)}</div></div><div class="r">${it.min?it.reps+' min':it.series+'×'+it.reps}</div></div>`).join('')}</div>`).join('')+
    `<button class="btn" data-act="clGuarda">Guardar en Rutinas</button><button class="btn ghost" data-act="clFuera">Descartar</button><div class="mut">Sustituye las rutinas de la evaluación anterior. Las que hayas creado tú no se tocan.</div>`:'');
}

/* ---------- Alimentación (Diane Far) ---------- */
// Comidas, agua y pesos van en listas propias de `mem` para que se sincronicen y se exporten con lo demás.
// Los días son fechas locales (AAAA-MM-DD), no UTC, para que lo apuntado a las 00:30 cuente en el día correcto.
const COMIDAS=[['desayuno','Desayuno'],['almuerzo','Almuerzo'],['comida','Comida'],['merienda','Merienda'],['cena','Cena']];
const NCFG={kcal:2100,p:189,g:69,h:181,vasos:8,horas:{desayuno:'08:00',almuerzo:'11:30',comida:'13:30',merienda:'16:00',cena:'19:00'}};
const RECETAS=[
  {id:'pollo-arroz',n:'Pollo + arroz + brócoli',kcal:376,p:48,g:9,h:42,ing:'200 g jamoncitos · 70 g arroz · 150 g brócoli · cebolla'},
  {id:'huevos-pan',n:'Huevos + pan + espinacas',kcal:365,p:20,g:16,h:28,ing:'3 huevos · 2 rebanadas de pan · 80 g espinacas'},
  {id:'lentejas',n:'Lentejas + tomate + pollo',kcal:340,p:32,g:8,h:28,ing:'150 g lentejas · 100 g tomate · 100 g pollo'},
  {id:'garbanzos',n:'Garbanzos + calabacín',kcal:242,p:10,g:7,h:32,ing:'150 g garbanzos · 200 g calabacín · cebolla'},
  {id:'caballa',n:'Caballa + pan + tomate',kcal:350,p:28,g:12,h:26,ing:'2 latas de caballa · 2 rebanadas de pan · 80 g tomate'}];
const pad2=n=>String(n).padStart(2,'0');
const fechaD=(t=Date.now())=>{const d=new Date(t);return d.getFullYear()+'-'+pad2(d.getMonth()+1)+'-'+pad2(d.getDate());};
const dDate=d=>new Date(d+'T12:00:00');
const nc=()=>Object.assign({},NCFG,mem.ncfg,{horas:Object.assign({},NCFG.horas,mem.ncfg&&mem.ncfg.horas)});
const nNum=v=>{const n=parseFloat(String(v).replace(',','.'));return isNaN(n)?0:Math.max(0,n);};
const r1=n=>Math.round(n*10)/10;
const nDia=()=>st.nd||fechaD();
function nCab(titulo){const d=nDia(),hoy=fechaD();
  return `<div class="row sb dia"><button class="x" data-act="nDia" data-v="-1" aria-label="Día anterior">‹</button><div><div class="mut">${dDate(d).toLocaleDateString('es-ES',{weekday:'long',day:'numeric',month:'long'})}</div><h2>${d===hoy?titulo:'Otro día'}</h2></div><button class="x" data-act="nDia" data-v="1" ${d>=hoy?'disabled':''} aria-label="Día siguiente">›</button></div>${d===hoy?'':'<button class="chip" data-act="nHoyDia">Volver a hoy</button>'}`;}
function vNHoy(){
  const c=nc(),d=nDia(),cs=mem.comidas.filter(x=>x.d===d),tot=cs.reduce((a,x)=>({kcal:a.kcal+x.kcal,p:a.p+x.p,g:a.g+x.g,h:a.h+x.h}),{kcal:0,p:0,g:0,h:0});
  const mac=(n,a,b)=>`<div class="mac"><div class="row sb"><span>${n}</span><span>${r1(a)} <span class="mut">de ${b} g</span></span></div><div class="bar m${a>b*1.05?' pasa':''}"><i style="width:${Math.min(100,a/b*100)}%"></i></div></div>`;
  const quedan=Math.round(c.kcal-tot.kcal),qp=Math.round(c.p-tot.p);
  return `<div class="card">${nCab('Hoy')}
    <div class="aro${tot.kcal>c.kcal*1.05?' pasa':''}" style="--p:${Math.min(100,tot.kcal/c.kcal*100)}"><b>${Math.round(tot.kcal)}</b><small>de ${c.kcal} kcal</small></div>
    ${mac('Proteína',tot.p,c.p)}${mac('Grasa',tot.g,c.g)}${mac('Hidratos',tot.h,c.h)}
    <div class="mut">${quedan>=0?`Te quedan ${quedan} kcal`:`Te has pasado ${-quedan} kcal`}${qp>0?` y ${qp} g de proteína`:' · proteína cubierta'}.</div></div>`+
  COMIDAS.map(([k,n])=>{const l=cs.filter(x=>x.c===k),ab=st.nabre===k;
    return `<div class="card"><div class="row sb"><div><div class="hora">${esc(c.horas[k])}</div><h3>${n}</h3></div><button class="x" data-act="nAbre" data-v="${k}" aria-label="Apuntar en ${n}">${ab?'−':'+'}</button></div>
      ${l.length?l.map(x=>`<div class="li"><div><b>${esc(x.n)}</b><div class="mut">P ${r1(x.p)} · G ${r1(x.g)} · H ${r1(x.h)}</div></div><div class="r">${Math.round(x.kcal)} kcal</div><button class="x" data-act="delComida" data-v="${x.t}">✕</button></div>`).join(''):'<div class="mut">Sin apuntar.</div>'}
      ${ab?`<h3>De tus recetas</h3><div class="chips">${RECETAS.map((r,i)=>`<button class="chip" data-act="nPon" data-v="${k}:${i}">${esc(r.n)}</button>`).join('')}</div>
        <h3>A mano</h3><input class="inp" id="nmN" maxlength="60" placeholder="Qué has comido"><div class="row"><input class="inp n" id="nmK" inputmode="decimal" placeholder="kcal"><input class="inp n" id="nmP" inputmode="decimal" placeholder="P (g)"><input class="inp n" id="nmG" inputmode="decimal" placeholder="G (g)"><input class="inp n" id="nmH" inputmode="decimal" placeholder="H (g)"></div><button class="btn" data-act="nMano" data-v="${k}">Apuntar</button>`:''}</div>`;}).join('')+
  `<div class="card">${st.nobj?`<h3>Objetivos diarios</h3>${[['kcal','Calorías (kcal)'],['p','Proteína (g)'],['g','Grasa (g)'],['h','Hidratos (g)'],['vasos','Vasos de agua']].map(([k,n])=>`<div class="row sb"><span>${n}</span><input class="inp n" inputmode="numeric" data-in="nObj" data-k="${k}" value="${c[k]}"></div>`).join('')}
      <div class="mut">Con esos macros salen ${Math.round(c.p*4+c.g*9+c.h*4)} kcal.</div><h3>Horarios</h3>${COMIDAS.map(([k,n])=>`<div class="row sb"><span>${n}</span><input class="inp n" type="time" data-in="nHora" data-k="${k}" value="${esc(c.horas[k])}"></div>`).join('')}
      <button class="btn ghost" data-act="nObjAbre">Cerrar</button>`:'<button class="btn ghost" data-act="nObjAbre">Objetivos y horarios</button>'}</div>`;
}
function vAgua(){
  const c=nc(),e=mem.agua.find(x=>x.d===nDia()),v=e?e.v:0;
  return `<div class="card center">${nCab('Agua')}<div class="aro" style="--p:${Math.min(100,v/c.vasos*100)}"><b>${v}</b><small>de ${c.vasos} vasos</small></div>
    <div class="mut">${String(r1(v*0.25)).replace('.',',')} litros · vasos de 250 ml</div>
    <div class="vasos">${Array.from({length:Math.max(c.vasos,v)},(_,i)=>`<button class="vaso ${i<v?'on':''}" data-act="nVaso" data-v="${i}" aria-label="Vaso ${i+1}"></button>`).join('')}</div>
    <button class="btn" data-act="nAgua" data-v="1">+ 1 vaso</button><button class="btn ghost" data-act="nAgua" data-v="-1">Quitar uno</button></div>`;
}
function grafPeso(ps){
  if(ps.length<2)return '<div class="mut">La gráfica aparece con dos pesos apuntados.</div>';
  const v=ps.map(p=>p.kg),mn=Math.min(...v)-0.5,mx=Math.max(...v)+0.5,W=320,H=150,px=i=>30+i*(W-45)/(v.length-1),py=k=>12+(mx-k)/(mx-mn)*(H-36);
  const et=i=>dDate(ps[i].d).toLocaleDateString('es-ES',{day:'numeric',month:'short'}),cada=Math.ceil(ps.length/5);
  return `<svg class="graf" viewBox="0 0 ${W} ${H}" role="img" aria-label="Gráfica de peso">${[mx,(mx+mn)/2,mn].map(k=>`<line x1="30" x2="${W-10}" y1="${py(k)}" y2="${py(k)}" class="gl"/><text x="0" y="${py(k)+3}">${r1(k)}</text>`).join('')}
    <polyline points="${v.map((k,i)=>px(i).toFixed(1)+','+py(k).toFixed(1)).join(' ')}" class="gp"/>${v.map((k,i)=>`<circle cx="${px(i)}" cy="${py(k)}" r="3.5" class="gc"/>${i%cada===0||i===v.length-1?`<text x="${px(i)}" y="${H-4}" text-anchor="middle">${et(i)}</text>`:''}`).join('')}</svg>`;
}
function vPeso(){
  const ps=mem.pesos.slice().sort((a,b)=>a.d.localeCompare(b.d)||a.t-b.t),ult=ps.slice(-20);
  const dif=ps.length>1?r1(ps[ps.length-1].kg-ps[0].kg):0;
  return `<div class="card"><h2>Peso</h2><div class="row"><input class="inp n" id="pK" inputmode="decimal" placeholder="kg"><input class="inp" id="pD" type="date" value="${fechaD()}" max="${fechaD()}"></div><input class="inp" id="pN" maxlength="80" placeholder="Nota (opcional)"><button class="btn" data-act="nPesar">Guardar peso</button></div>
  <div class="card"><h3>Tendencia</h3>${grafPeso(ult)}${ps.length>1?`<div class="mut">${dif>0?'+':''}${String(dif).replace('.',',')} kg desde el ${dDate(ps[0].d).toLocaleDateString('es-ES',{day:'numeric',month:'long'})}.</div>`:''}</div>
  <div class="card"><h3>Registros</h3>${ps.length?ps.slice().reverse().map(p=>`<div class="li"><div>${dDate(p.d).toLocaleDateString('es-ES',{day:'numeric',month:'short',year:'numeric'})}${p.nota?`<div class="mut">${esc(p.nota)}</div>`:''}</div><div class="r">${String(p.kg).replace('.',',')} kg</div><button class="x" data-act="delPeso" data-v="${p.t}">✕</button></div>`).join(''):'<div class="mut">Todavía ninguno.</div>'}
    ${st.nimp?`<h3>Pegar pesos</h3><textarea class="inp" id="pImp" rows="5" placeholder="Una línea por peso: 01/10/2026 86,4"></textarea><button class="btn sm" data-act="nImpPesos">Añadir estos pesos</button>`:'<button class="btn sm ghost" data-act="nImpAbre">Pegar pesos de otra app</button>'}</div>`;
}
function vRecetas(){return RECETAS.map(r=>`<div class="card"><div class="row sb"><h3>${esc(r.n)}</h3><span class="tag">${r.kcal} kcal</span></div><div>P ${r.p} g · G ${r.g} g · H ${r.h} g</div><div class="mut">${esc(r.ing)}</div></div>`).join('')+'<div class="mut pad">Para apuntar una receta, toca + en la comida que toque, en Hoy.</div>';}
const idLibre=lista=>{let t=Date.now();while(lista.some(x=>x.t===t))t++;return t;};
function nApunta(c,o){const t=idLibre(mem.comidas);mem.comidas.push(Object.assign({t,d:nDia(),c},o));save();st.nabre=null;fx('ok');render();}
function nAguaPon(v){const d=nDia();let e=mem.agua.find(x=>x.d===d);if(!e){e={d,v:0};mem.agua.push(e);}e.v=Math.max(0,Math.min(20,v));save();render();}
// Lee líneas con una fecha (01/10/2026, 1-10-26 o 2026-10-01) y un peso entre 30 y 300 kg.
function leePesos(txt){const out=[];String(txt).split(/\r?\n/).forEach(l=>{let m,d;
  if((m=l.match(/(\d{4})-(\d{1,2})-(\d{1,2})/)))d=[+m[1],+m[2],+m[3]];else if((m=l.match(/(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})/)))d=[+m[3]<100?2000+ +m[3]:+m[3],+m[2],+m[1]];
  if(!d||d[1]<1||d[1]>12||d[2]<1||d[2]>31)return;const resto=l.replace(m[0],' '),k=(resto.match(/\d{2,3}(?:[.,]\d+)?/)||[])[0];if(!k)return;const kg=nNum(k);if(kg<30||kg>300)return;
  out.push({d:d[0]+'-'+pad2(d[1])+'-'+pad2(d[2]),kg:r1(kg)});});return out;}

/* ---------- Entrenador ---------- */
// Lleva la rutina del día de principio a fin: preparación, repeticiones con ritmo, series y descanso.
const DIAS=['D','L','M','X','J','V','S'],DIAS_N=['domingo','lunes','martes','miércoles','jueves','viernes','sábado'];
const EV_DIAS={2:[1,4],3:[1,3,5],4:[1,2,4,5],5:[1,2,3,4,5],6:[1,2,3,4,5,6]};
// Segundos de [fase lenta, fase de fuerza] según objetivo y tipo (c: compuesto, a: aislado). No hay un ritmo óptimo
// demostrado por ejercicio: la evidencia respalda repeticiones de 2 a 8 s con la fase lenta controlada.
const TEMPO={fuerza:{c:[2,1],a:[2,1]},musculo:{c:[3,1],a:[3,2]},resist:{c:[2,1],a:[2,1]},grasa:{c:[2,1],a:[2,2]},salud:{c:[3,2],a:[3,2]}};
const T_PREP=5,T_AGUANTE=30;
// Se hacen aguantando o por tiempo, no por repeticiones.
const T_ISO=['plancha','plancha-copenhague','sentadilla-isometrica-en-pared','hollow-body','colgarse-de-la-barra','paseo-del-granjero','trineo','cuerdas-de-batalla'];
// Explosivos o complejos: marcarles un ritmo lento sería un error. Se cuentan a mano.
const T_LIBRE=['burpees','cargada-clean','arrancada-snatch','thruster','levantamiento-turco','salto-al-cajon','lanzamiento-de-balon-medicinal','balanceo-con-kettlebell-swing','push-press','escaladores-mountain-climbers','bicicleta-abdominal','giro-ruso'];
// Empiezan por la fase lenta (se baja primero). El resto empieza por la de fuerza.
const T_EXC=['press-de-banca','aperturas','flexiones','fondos-en-paralelas','pullover','press-de-banca-cerrado','press-frances','press-jm','fondos-entre-bancos','flexiones-en-pica-y-pino','sentadilla','prensa-de-piernas','sentadilla-hack','sentadilla-bulgara','zancadas','sentadilla-sissy','sentadilla-a-una-pierna-pistol','sentadilla-pendular-y-con-cinturon','zancada-cosaca','peso-muerto-rumano','buenos-dias','curl-nordico','hiperextensiones','rueda-abdominal','dragon-flag'];
function plan(it){
  const e=BYID[it.ex];
  if(it.min||(e&&e.g==='Cardio'))return {tipo:'cardio',seg:it.reps*60,series:1};
  if(T_ISO.includes(it.ex))return {tipo:'iso',seg:T_AGUANTE,series:it.series};
  if(!e||T_LIBRE.includes(it.ex))return {tipo:'libre',series:it.series,reps:it.reps};
  const t=(TEMPO[mem.ev&&mem.ev.r&&mem.ev.r.obj]||TEMPO.musculo)[e.comp?'c':'a'];
  return {tipo:'tempo',series:it.series,reps:it.reps,exc:t[0],con:t[1],fases:T_EXC.includes(it.ex)?['exc','con']:['con','exc']};
}
function planTxt(it){const p=plan(it);return p.tipo==='cardio'?it.reps+' min':p.tipo==='iso'?p.series+'×'+p.seg+' s':p.series+'×'+p.reps;}
const rutHoy=()=>mem.rutinas.find(r=>(r.dias||[]).includes(new Date().getDay()));
function sFase(f,seg){const s=st.s;s.fase=f;s.t0=Date.now();s.dur=seg*1000;s.bip=0;render();}
function sEjercicio(){const s=st.s,it=s.items[s.i];s.p=plan(it);s.serie=1;const prev=mem.sets.filter(x=>x.ex===it.ex);s.kg=prev.length?prev[prev.length-1].kg:0;}
function sSerie(){const s=st.s,p=s.p;s.rep=0;s.f=0;wake();
  if(p.tipo==='libre')sFase('libre',0);
  else if(p.tipo==='tempo'){fx(p.fases[0]);sFase(p.fases[0],p[p.fases[0]]);}
  else{fx('con');sFase('aguanta',p.seg);}}
function sFinSerie(reps){const s=st.s,it=s.items[s.i],e=BYID[it.ex],p=s.p;
  s.ult={t:Date.now(),ex:it.ex,n:e?e.n:it.ex,v:it.v+(p.tipo==='iso'?' · '+p.seg+' s':''),reps,kg:s.kg};s.ultTipo=p.tipo;s.hechas++;mem.sets.push(s.ult);
  if(s.serie<p.series)s.serie++;
  else if(s.i<s.items.length-1){s.i++;sEjercicio();}
  else{s.fin=Date.now();const r=rut(s.rid);if(r)r.ult=s.fin;save();fx('meta');render();return;}
  save();fx('ok');sFase('descanso',mem.cfg.descanso);}
function sTick(){
  const s=st.s;if(!s||s.fin||s.pausa||s.fase==='libre')return;
  const left=s.t0+s.dur-Date.now();
  if(left>0){const seg=Math.ceil(left/1000),n=$('#sNum'),b=$('#sBar');if(b)b.style.width=Math.min(100,(1-left/s.dur)*100)+'%';
    if(n&&s.fase!=='exc'&&s.fase!=='con')n.textContent=seg>=60?mmss(seg):seg;
    if((s.fase==='prep'||s.fase==='descanso')&&seg<=3&&s.bip!==seg){s.bip=seg;fx('cuenta');}
    return;}
  if(s.fase==='prep')sSerie();
  else if(s.fase==='descanso'){fx('fin');sFase('prep',T_PREP);}
  else if(s.fase==='aguanta')sFinSerie(s.p.tipo==='cardio'?s.items[s.i].reps:s.p.seg);
  else{const p=s.p;if(++s.f>=2){s.f=0;if(++s.rep>=p.reps){sFinSerie(p.reps);return;}}
    const f=p.fases[s.f];fx(f);s.fase=f;s.t0=Math.max(s.t0+s.dur,Date.now()-500);s.dur=p[f]*1000;render();}
}
setInterval(sTick,100);
function vHoy(){
  const s=st.s;
  if(!s){
    const r=rutHoy(),hoy=new Date().getDay(),otras=mem.rutinas.filter(x=>x!==r&&x.items.length);
    let prox='';for(let k=1;k<7&&!prox;k++){const d=(hoy+k)%7,x=mem.rutinas.find(y=>(y.dias||[]).includes(d));if(x)prox=(k===1?'mañana':'el '+DIAS_N[d])+' · '+x.n;}
    return `<div class="card"><div class="mut">${fechaLarga(Date.now())}</div><h2>${r?'Hoy toca':'Hoy, descanso'}</h2>${r?`<h3>${esc(r.n)}</h3>${r.ult&&dia(r.ult)===dia(Date.now())?'<div class="tag">Completada hoy</div>':''}
      ${r.items.length?r.items.map(it=>`<div class="li"><div><b>${esc(BYID[it.ex]?BYID[it.ex].n:it.ex)}</b><div class="mut">${esc(it.v)}</div></div><div class="r">${planTxt(it)}</div></div>`).join('')+`<button class="btn" data-act="sIni" data-v="${r.id}">Empezar entrenamiento</button>`:'<div class="mut">Esta rutina está vacía.</div>'}`
      :`<p class="mut">${mem.rutinas.length?'No hay rutina asignada a hoy.'+(prox?' Próxima: '+esc(prox)+'.':''):'Todavía no hay rutinas. '+esc(PERFILES.eval.ag)+' te prepara una con la Evaluación, y '+esc(PERFILES.gym.ag)+' las guarda y las modifica.'}</p>`}</div>`+
      (otras.length?`<div class="card"><h3>Otra rutina</h3><select id="sOtra" class="inp">${otras.map(x=>`<option value="${x.id}">${esc(x.n)}</option>`).join('')}</select><button class="btn ghost" data-act="sIni">Empezar esta</button></div>`:'');
  }
  if(s.fin)return `<div class="card center"><div class="tag">Entrenamiento completado</div><h2>${esc(s.n)}</h2><p class="mut">${s.hechas} series · ${Math.max(1,Math.round((s.fin-s.ini)/60000))} min</p><button class="btn" data-act="sCerrar">Cerrar</button></div>`;
  const it=s.items[s.i],e=BYID[it.ex],p=s.p,f=s.fase,reloj=f!=='exc'&&f!=='con'&&f!=='libre',left=Math.max(0,Math.ceil((s.pausa||s.t0+s.dur-Date.now())/1000));
  const rot={prep:'Prepárate',exc:'Controla',con:'Fuerza',aguanta:p.tipo==='cardio'?'En marcha':'Aguanta',descanso:'Descanso',libre:'A tu ritmo'}[f];
  return `<div class="card"><div class="tag">Ejercicio ${s.i+1} de ${s.items.length} · serie ${s.serie} de ${p.series}</div><div class="mut">${f==='descanso'?'A continuación':esc(e?e.g:'')}</div><h2>${esc(e?e.n:it.ex)}</h2><div class="mut">${esc(it.v)} · ${planTxt(it)}</div>
    ${p.tipo==='cardio'?'':`<div class="row sb"><span>Peso (kg)</span><span class="row"><button class="x" data-act="sKg" data-v="-2.5">−</button><b>${s.kg}</b><button class="x" data-act="sKg" data-v="2.5">+</button></span></div>`}</div>
  <div class="fase ${f}">${s.pausa?'En pausa':rot}</div>
  <${f==='libre'?'button data-act="sRep"':'div'} id="big" class="big${reloj?' t':''}"><span id="sNum">${reloj?(left>=60?mmss(left):left):s.rep}</span><small>${reloj?(f==='prep'?'empieza la serie':f==='descanso'?'para la siguiente':'segundos'):'de '+p.reps+(f==='libre'?' · toca para sumar':f==='exc'?' · '+p.exc+' s lento':' · '+p.con+' s')}</small></${f==='libre'?'button':'div'}>
  <div class="bar"><i id="sBar" style="width:0"></i></div>
  ${f==='libre'?'<button class="btn" data-act="sHecha">Serie hecha</button>':''}
  ${f==='descanso'&&s.ult&&(s.ultTipo==='tempo'||s.ultTipo==='libre')?`<div class="card"><div class="row sb"><span>Repeticiones guardadas</span><span class="row"><button class="x" data-act="sReps" data-v="-1">−</button><b>${s.ult.reps}</b><button class="x" data-act="sReps" data-v="1">+</button></span></div><div class="mut">Corrígelo si no completaste la serie.</div></div>`:''}
  <div class="row c"><button class="btn sm" data-act="sPausa">${s.pausa?'Seguir':'Pausa'}</button><button class="btn sm ghost${s.conf>Date.now()?' warn':''}" data-act="sFin">${s.conf>Date.now()?'¿Seguro?':'Terminar'}</button></div>`;
}
const VIEWS={entrenar:vEntrenar,biblioteca:vBiblioteca,rutinas:vRutinas,historial:vHistorial,evaluacion:vEvaluacion,claude:vClaude,hoy:vHoy,nhoy:vNHoy,agua:vAgua,peso:vPeso,recetas:vRecetas};

/* ---------- Perfiles ---------- */
// Cada perfil abre sus propias pestañas. Sin `tabs`, el expediente aún no está disponible.
// Las siluetas son provisionales, a la espera de las imágenes definitivas.
const SIL={
  h:'<path class="pelo" d="M32 38Q32 16 50 16Q68 16 68 38Q61 27 50 28Q39 27 32 38Z"/><ellipse cx="50" cy="41" rx="17" ry="21"/><path d="M42 60L41 71Q18 77 11 94L9 120M58 60L59 71Q82 77 89 94L91 120M41 71Q50 80 59 71"/>',
  p:'<path class="pelo" d="M32 40Q29 18 47 15Q67 12 69 37Q59 24 45 27Q37 29 32 40Z"/><ellipse cx="50" cy="41" rx="17" ry="21"/><path d="M36 39h11v7h-11zM53 39h11v7h-11zM47 42h6M42 60L41 71Q18 77 11 94L9 120M58 60L59 71Q82 77 89 94L91 120M41 71Q50 80 59 71"/>',
  n:'<path class="pelo" d="M50 16Q29 16 30 44Q30 56 34 63L41 60Q36 50 37 43Q41 30 50 30Q59 30 63 43Q64 50 59 60L66 63Q70 56 70 44Q71 16 50 16Z"/><ellipse cx="50" cy="43" rx="14.5" ry="19"/><path d="M44 61L43 73Q27 79 21 95L19 120M56 61L57 73Q73 79 79 95L81 120M43 73Q50 81 57 73"/>',
  m:'<path class="pelo" d="M50 17Q27 17 28 46Q28 70 21 88L38 84Q34 62 36 45Q40 30 50 30Q60 30 64 45Q66 62 62 84L79 88Q72 70 72 46Q73 17 50 17Z"/><ellipse cx="50" cy="43" rx="14.5" ry="19"/><path d="M44 61L43 73Q27 79 21 95L19 120M56 61L57 73Q73 79 79 95L81 120M43 73Q50 81 57 73"/>'};
const PERFILES={
  peter:{ag:'Peter Sutherland',s:'h',tabs:[['hoy','Hoy']]},
  gym:{ag:'Mercedes Dantés',s:'n',tabs:[['biblioteca','Biblioteca'],['rutinas','Rutinas'],['historial','Historial']]},
  eval:{ag:'Pablo Lopez',s:'p',tabs:[['evaluacion','Evaluar'],['claude','Claude']]},
  nutri:{ag:'Diane Far',s:'m',tabs:[['nhoy','Hoy'],['agua','Agua'],['peso','Peso'],['recetas','Recetas']]}};
function vExpedientes(){return `<div class="rejilla">${Object.keys(PERFILES).map(k=>{const p=PERFILES[k];return `<button class="card perfil ${p.tabs?'':'off'}" data-act="perfil" data-v="${k}"><div class="foto"><svg viewBox="0 0 100 120" aria-hidden="true">${SIL[p.s]}</svg></div><b>${esc(p.ag)}</b></button>`;}).join('')}</div>`;}
function render(){
  const p=PERFILES[st.perfil];
  $('#exp').innerHTML=p?`<button class="back" data-act="salir">‹ Expedientes</button><span>${esc(p.ag)}</span>`:'<span>Expediente RP-110</span><span>Agente <span class="tach">xxxxxxxx</span></span>';
  $('#nav').innerHTML=p&&p.tabs.length>1?p.tabs.map(t=>`<button data-act="tab" data-v="${t[0]}" class="${st.tab===t[0]?'on':''}">${t[1]}</button>`).join(''):'';
  $('#view').innerHTML=p?VIEWS[st.tab]():vExpedientes();
  if(p&&st.tab==='historial')verVersion();
}

/* ---------- Acciones ---------- */
const rut=id=>mem.rutinas.find(r=>String(r.id)===String(id));
function seguro(b,txt){if(b.dataset.ok)return true;const t=b.textContent;b.dataset.ok='1';b.textContent=txt||'¿Borrar?';b.classList.add('warn');setTimeout(()=>{delete b.dataset.ok;b.textContent=t;b.classList.remove('warn');},2500);return false;}
const ACT={
  perfil(v){const p=PERFILES[v];if(!p.tabs){toast('Expediente en preparación');return;}st.perfil=v;st.tab=st.ult[v]||p.tabs[0][0];render();window.scrollTo(0,0);},
  sIni(v){const r=rut(v||($('#sOtra')||{}).value);if(!r||!r.items.length)return;st.s={rid:r.id,n:r.n,items:r.items,i:0,ini:Date.now(),hechas:0,pausa:0,conf:0,fin:0};sEjercicio();wake();sFase('prep',T_PREP);window.scrollTo(0,0);},
  sRep(){const s=st.s;if(!s||s.fase!=='libre')return;s.rep++;if(s.rep>=s.p.reps)sFinSerie(s.rep);else{fx('rep');const n=$('#sNum');if(n)n.textContent=s.rep;}},
  sHecha(){const s=st.s;if(!s||s.fase!=='libre')return;if(!s.rep){toast('Cuenta al menos una repetición');return;}sFinSerie(s.rep);},
  sPausa(){const s=st.s;if(!s||s.fin)return;if(s.pausa){s.t0=Date.now()-(s.dur-s.pausa);s.pausa=0;wake();}else s.pausa=Math.max(1,s.t0+s.dur-Date.now());render();},
  sKg(v){const s=st.s;s.kg=Math.max(0,Math.round((s.kg+Number(v))*100)/100);render();},
  sReps(v){const s=st.s;if(!s.ult)return;s.ult.reps=Math.max(1,s.ult.reps+Number(v));save();render();},
  sFin(){const s=st.s;if(s.conf>Date.now()){st.s=null;render();toast('Entrenamiento terminado. Las series hechas están guardadas',3500);}else{s.conf=Date.now()+3000;render();}},
  sCerrar(){st.s=null;render();window.scrollTo(0,0);},
  clCopia(){try{navigator.clipboard.writeText(mdEval()).then(()=>toast('Copiado. Pégaselo a Claude'),()=>toast('No se pudo copiar: usa Descargar'));}catch(e){toast('No se pudo copiar: usa Descargar');}},
  clComparte(){navigator.share({title:'Evaluación de Repes',text:mdEval()}).catch(()=>{});},
  clBaja(){try{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([mdEval()],{type:'text/markdown'}));a.download='evaluacion-repes-'+new Date().toISOString().slice(0,10)+'.md';document.body.appendChild(a);a.click();a.remove();}catch(e){toast('No se pudo descargar');}},
  clLee(){st.cl.res=leeRespuesta(st.cl.txt);render();},
  clFuera(){st.cl={txt:'',res:null};render();window.scrollTo(0,0);},
  clGuarda(){const res=st.cl.res;if(!res||res.error)return;const t=Date.now(),libres=EV_DIAS[res.rutinas.length]||[],ocup=new Set(res.rutinas.flatMap(r=>r.dias).concat(mem.rutinas.filter(r=>!r.ev).flatMap(r=>r.dias||[])));
    const pool=libres.concat([1,2,3,4,5,6,0]).filter((d,i,a)=>a.indexOf(d)===i&&!ocup.has(d));
    const nuevas=res.rutinas.map((r,i)=>({id:t+i,n:r.n,ev:1,dias:r.dias.length?r.dias:(pool.length?[pool.shift()]:[]),items:r.items}));
    const ds=nuevas.flatMap(r=>r.dias);
    mem.rutinas=mem.rutinas.filter(r=>!r.ev).map(r=>r.dias?Object.assign(r,{dias:r.dias.filter(d=>!ds.includes(d))}):r).concat(nuevas);
    if(res.descanso)mem.cfg.descanso=res.descanso;save();st.cl={txt:'',res:null};fx('ok');render();window.scrollTo(0,0);toast('Rutinas de Claude guardadas. Están en '+PERFILES.gym.ag+' › Rutinas',4500);},
  nDia(v){const d=dDate(nDia());d.setDate(d.getDate()+Number(v));const s=fechaD(d.getTime());if(s>fechaD())return;st.nd=s===fechaD()?null:s;st.nabre=null;render();},
  nHoyDia(){st.nd=null;st.nabre=null;render();},
  nAbre(v){st.nabre=st.nabre===v?null:v;render();},
  nPon(v){const p=v.split(':'),r=RECETAS[Number(p[1])];if(r)nApunta(p[0],{n:r.n,kcal:r.kcal,p:r.p,g:r.g,h:r.h,rec:r.id});},
  nMano(v){const n=($('#nmN').value||'').trim().slice(0,60),k=nNum($('#nmK').value);if(!n||!k){toast('Pon al menos qué has comido y las kcal');return;}
    nApunta(v,{n,kcal:r1(k),p:r1(nNum($('#nmP').value)),g:r1(nNum($('#nmG').value)),h:r1(nNum($('#nmH').value))});},
  delComida(v,b){if(!seguro(b))return;mem.comidas=mem.comidas.filter(x=>String(x.t)!==String(v));save();render();},
  nObjAbre(){st.nobj=!st.nobj;render();},
  nVaso(v){const e=mem.agua.find(x=>x.d===nDia()),n=Number(v)+1;nAguaPon(e&&e.v===n?n-1:n);},
  nAgua(v){const e=mem.agua.find(x=>x.d===nDia());nAguaPon((e?e.v:0)+Number(v));},
  nPesar(){const k=nNum($('#pK').value),d=$('#pD').value||fechaD();if(k<30||k>300){toast('Escribe el peso en kg');return;}if(d>fechaD()){toast('Esa fecha aún no ha llegado');return;}
    mem.pesos.push({t:idLibre(mem.pesos),d,kg:r1(k),nota:($('#pN').value||'').trim().slice(0,80)});save();fx('ok');render();},
  delPeso(v,b){if(!seguro(b))return;mem.pesos=mem.pesos.filter(x=>String(x.t)!==String(v));save();render();},
  nImpAbre(){st.nimp=1;render();},
  nImpPesos(){const ps=leePesos(($('#pImp')||{}).value);let n=0;ps.forEach(p=>{if(!mem.pesos.some(x=>x.d===p.d&&x.kg===p.kg)){mem.pesos.push({t:idLibre(mem.pesos),d:p.d,kg:p.kg,nota:''});n++;}});
    if(!ps.length){toast('No encuentro fechas con pesos en lo que has pegado');return;}save();st.nimp=0;render();toast(n+(n===1?' peso añadido':' pesos añadidos')+(ps.length>n?' ('+(ps.length-n)+' ya estaban)':''));},
  syNuevo(){sy.code=nuevoCodigo();sy.err='';sy.ult=0;sySave();render();sincroniza().then(ok=>{if(ok)toast('Sincronización activada');});},
  syUnir(){const c=(($('#syCod')||{}).value||'').toUpperCase().replace(/0/g,'O').replace(/1/g,'I').replace(/8/g,'B').replace(/[^A-Z2-7]/g,'');
    if(c.length!==16){sy.err='El código tiene 16 caracteres';pintaSync();return;}
    sy.code=c;sy.err='';sySave();render();sincroniza(true).then(ok=>{render();if(ok)toast('Dispositivo unido');});},
  syYa(){sincroniza();},
  syCopia(){try{navigator.clipboard.writeText(verCodigo(sy.code)).then(()=>toast('Código copiado'),()=>toast('No se pudo copiar'));}catch(e){toast('No se pudo copiar');}},
  delSync(v,b){if(!seguro(b,'¿Seguro?'))return;sy.code='';sy.err='';sy.ult=0;sySave();render();toast('Sincronización desactivada en este dispositivo');},
  rutDia(v){const p=v.split(':'),r=rut(p[0]),d=Number(p[1]);if(!r)return;if((r.dias||[]).includes(d))r.dias=r.dias.filter(x=>x!==d);else{mem.rutinas.forEach(x=>{if(x.dias)x.dias=x.dias.filter(y=>y!==d);});r.dias=(r.dias||[]).concat(d);}save();render();},
  salir(){if(st.s&&!st.s.fin){toast('Termina o completa el entrenamiento antes de salir');return;}if(st.perfil)st.ult[st.perfil]=st.tab;st.perfil=null;st.det=null;render();window.scrollTo(0,0);},
  evIni(){st.ev={i:0,r:{evitar:[],fortalecer:[],prioridad:[],notas:{}},abiertas:{},res:null};render();window.scrollTo(0,0);},
  evNota(){const ev=st.ev;ev.abiertas[EV_P[ev.i].k]=1;render();const t=$('textarea[data-in="evNota"]');if(t)t.focus();},
  evOp(v){const ev=st.ev,p=EV_P[ev.i],x=p.o[Number(v)][0];if(p.m){const a=ev.r[p.k],k=a.indexOf(x);if(k>=0)a.splice(k,1);else{a.push(x);if(p.x)ev.r[p.x]=ev.r[p.x].filter(z=>z!==x);}}else ev.r[p.k]=x;render();},
  evAtras(){if(st.ev.i)st.ev.i--;else st.ev=null;render();},
  evSig(){const ev=st.ev,p=EV_P[ev.i];if(!p.m&&ev.r[p.k]===undefined){toast('Elige una opción');return;}const n=ev.r.notas;Object.keys(n).forEach(k=>{n[k]=n[k].trim();if(!n[k])delete n[k];});
    if(ev.i<EV_P.length-1)ev.i++;else{ev.res=evGenerar(ev.r,EJERCICIOS);mem.ev={t:Date.now(),r:JSON.parse(JSON.stringify(ev.r))};save();}render();window.scrollTo(0,0);},
  evGuardar(){const ev=st.ev;if(!ev||!ev.res)return;const t=Date.now();
    const ds=EV_DIAS[ev.res.rutinas.length]||[];
    mem.rutinas=mem.rutinas.filter(r=>!r.ev).map(r=>r.dias?Object.assign(r,{dias:r.dias.filter(d=>!ds.includes(d))}):r).concat(ev.res.rutinas.map((r,i)=>({id:t+i,n:r.n,ev:1,dias:ds[i]===undefined?[]:[ds[i]],items:r.items.map(it=>{const o={ex:it.ex,v:it.v,series:it.series,reps:it.reps};if(it.min)o.min=true;return o;})})));
    mem.ev={t,r:ev.r};mem.cfg.descanso=ev.res.descanso;save();st.ev=null;fx('ok');render();window.scrollTo(0,0);toast('Rutinas guardadas con sus días. Están en '+PERFILES.gym.ag+' › Rutinas',4500);},
  tab(v){st.tab=v;st.det=null;render();window.scrollTo(0,0);},
  rep(){addRep();},
  menos(){st.reps=Math.max(0,st.reps-1);upd();},
  cero(){st.reps=0;upd();},
  modo(v){parar();st.modo=v;render();},
  kg(v){st.kg=Math.max(0,Math.round((st.kg+Number(v))*100)/100);render();},
  obj(v){st.obj=Math.max(1,st.obj+Number(v));render();},
  tempo(v){st.tempo=Math.max(1,Math.round((st.tempo+Number(v))*10)/10);if(st.run)parar();else render();},
  sens(v){st.sens=Number(v);render();},
  auto(){if(st.run)parar();else arrancar();},
  guardar(){if(!st.reps){toast('Cuenta al menos una repetición');return;}parar();mem.sets.push({t:Date.now(),ex:st.ex.id,n:st.ex.n,v:st.vari,reps:st.reps,kg:st.kg});save();st.reps=0;st.restEnd=Date.now()+mem.cfg.descanso*1000;fx('ok');render();},
  descanso(v){mem.cfg.descanso=Number(v);save();if(st.restEnd)st.restEnd=Date.now()+mem.cfg.descanso*1000;render();},
  saltar(){st.restEnd=0;render();},
  sig(){if(st.colaI<st.cola.length-1){st.colaI++;st.restEnd=0;cargarCola();}else{st.cola=null;st.ex=null;st.restEnd=0;render();toast('Rutina terminada');}},
  grupo(v){st.grupo=v;render();},
  ver(v){st.det=BYID[v];st.sel={eq:0,pos:0,ag:0,uni:false,tec:0};render();window.scrollTo(0,0);},
  volver(){st.det=null;render();},
  sel(v){const p=v.split(':');st.sel[p[0]]=Number(p[1]);render();},
  uni(v){st.sel.uni=v==='1';render();},
  entrenar(){elegir(st.det,varLabel(st.det,st.sel));},
  addRut(){const r=rut($('#rsel').value);if(!r)return;r.items.push({ex:st.det.id,v:varLabel(st.det,st.sel),series:Math.max(1,parseInt($('#rser').value)||3),reps:Math.max(1,parseInt($('#rrep').value)||10)});save();toast('Añadido a '+r.n);},
  nuevaRut(){const n=$('#rnom').value.trim();if(!n){toast('Ponle un nombre');return;}mem.rutinas.push({id:Date.now(),n,items:[]});save();render();},
  delRut(v,b){if(!seguro(b))return;mem.rutinas=mem.rutinas.filter(r=>String(r.id)!==String(v));save();render();},
  delItem(v){const p=v.split(':');const r=rut(p[0]);if(!r)return;r.items.splice(Number(p[1]),1);save();render();},
  playItem(v){const p=v.split(':');const r=rut(p[0]);if(!r)return;const it=r.items[Number(p[1])];elegir(BYID[it.ex],it.v,it.reps);},
  empezar(v){const r=rut(v);if(!r||!r.items.length)return;st.cola=r.items;st.colaI=0;cargarCola();},
  delSet(v,b){if(!seguro(b))return;mem.sets=mem.sets.filter(s=>String(s.t)!==String(v));save();render();},
  exportar(){try{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(mem,null,1)],{type:'application/json'}));a.download='repes-copia-'+new Date().toISOString().slice(0,10)+'.json';document.body.appendChild(a);a.click();a.remove();}catch(e){toast('No se pudo exportar');}},
  importar(){$('#imp').click();}
};
function init(){
  load();
  document.addEventListener('click',e=>{const b=e.target.closest('[data-act]');if(!b)return;const f=ACT[b.dataset.act];if(f){fxDe(b);f(b.dataset.v,b);}});
  document.addEventListener('input',e=>{const k=e.target.dataset?e.target.dataset.in:null;if(!k)return;if(k==='q'){st.q=e.target.value;$('#lista').innerHTML=listaHTML();}else if(k==='equipo'){st.equipo=e.target.value;$('#lista').innerHTML=listaHTML();}else if(k==='agente'){mem.cfg.agente=e.target.value.slice(0,24);save();}else if(k==='evNota'&&st.ev){st.ev.r.notas[EV_P[st.ev.i].k]=e.target.value.slice(0,1000);}else if(k==='clRes'){st.cl.txt=e.target.value;st.cl.res=null;}
    else if(k==='nObj'){const n=Math.round(nNum(e.target.value));if(n>0){mem.ncfg=nc();mem.ncfg[e.target.dataset.k]=n;save();}}
    else if(k==='nHora'){if(/^\d{2}:\d{2}$/.test(e.target.value)){mem.ncfg=nc();mem.ncfg.horas[e.target.dataset.k]=e.target.value;save();}}else if(k==='kgv'){const n=parseFloat(String(e.target.value).replace(',','.'));if(!isNaN(n))st.kg=Math.max(0,n);}});
  document.addEventListener('change',e=>{if(e.target.id!=='imp'||!e.target.files[0])return;const fr=new FileReader();fr.onload=()=>{try{const d=JSON.parse(fr.result);if(!Array.isArray(d.sets))throw 0;mem=Object.assign({sets:[],rutinas:[],cfg:{descanso:90}},d);sana();snap=null;save();render();toast(sy.code?'Copia importada. Se juntará con lo sincronizado':'Copia importada');}catch(x){toast('Ese archivo no es una copia válida');}};fr.readAsText(e.target.files[0]);});
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState!=='visible')return;despierta(false);if(st.s||st.tab==='entrenar'&&st.ex)wake();
    setTimeout(()=>{if(st.s&&!st.s.fin&&ac&&ac.state!=='running')toast('Toca la pantalla para recuperar el sonido',5000);},700);});
  document.addEventListener('pointerdown',()=>despierta(true),true);
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')sincroniza();});
  window.addEventListener('online',()=>sincroniza());
  syLoad();if(sy.code)sincroniza();
  if('serviceWorker' in navigator&&location.protocol.startsWith('http')){navigator.serviceWorker.register('./sw.js').catch(()=>{});navigator.serviceWorker.addEventListener('message',e=>{if(e.data&&e.data.tipo==='actualizada')toast('Actualización descargada: cierra y abre la app para verla',6000);});}
  render();
  try{if(navigator.audioSession)navigator.audioSession.type='ambient';}catch(e){}
  acceso();cargarVoz();
}
if(typeof document!=='undefined'&&document.getElementById)init();
