'use strict';
const $=(s,r=document)=>r.querySelector(s);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm=s=>s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
const KEY='repes.v1';
let mem={sets:[],rutinas:[],cfg:{descanso:90}};
const st={perfil:null,ult:{},ev:null,s:null,tab:'entrenar',ex:null,vari:'',det:null,sel:{eq:0,pos:0,ag:0,uni:false,tec:0},reps:0,kg:20,obj:10,modo:'manual',q:'',grupo:'',equipo:'',restEnd:0,tempo:3,sens:1.3,run:false,cola:null,colaI:0};
const BYID={};EJERCICIOS.forEach(e=>BYID[e.id]=e);

// Repara lo que falte en datos antiguos o importados sin tocar lo demás.
function sana(){if(!Array.isArray(mem.rutinas))mem.rutinas=[];mem.cfg=Object.assign({descanso:90},mem.cfg);if(!(mem.cfg.descanso>0))mem.cfg.descanso=90;}
function load(){try{const d=JSON.parse(localStorage.getItem(KEY));if(d&&Array.isArray(d.sets))mem=Object.assign(mem,d);}catch(e){}sana();}
function save(){try{localStorage.setItem(KEY,JSON.stringify(mem));}catch(e){toast('No se pudo guardar en este dispositivo');}}
const dia=t=>new Date(t).toDateString();
const fechaLarga=t=>new Date(t).toLocaleDateString('es-ES',{weekday:'long',day:'numeric',month:'long'});
const mmss=s=>Math.floor(s/60)+':'+String(s%60).padStart(2,'0');
const nVar=e=>e.eq.length*e.pos.length*e.ag.length*(e.uni?2:1);
function varLabel(e,sel){const p=[e.eq[sel.eq],e.pos[sel.pos]];if(e.ag[sel.ag]!=='Estándar')p.push(e.ag[sel.ag]);if(sel.uni)p.push('Unilateral');if(sel.tec)p.push(TECNICAS[sel.tec][0]);return p.join(' · ');}
function ultima(id){const prev=mem.sets.filter(s=>s.ex===id&&dia(s.t)!==dia(Date.now()));if(!prev.length)return '';const d=dia(prev[prev.length-1].t);const ss=prev.filter(s=>dia(s.t)===d);return new Date(ss[0].t).toLocaleDateString('es-ES',{day:'numeric',month:'short'})+': '+ss.map(s=>s.kg+'×'+s.reps).join(', ');}

/* ---------- Sonido, pantalla encendida, avisos ---------- */
let ac,wl,toastId;
function beep(f,d){try{ac=ac||new (window.AudioContext||window.webkitAudioContext)();if(ac.state==='suspended')ac.resume();const o=ac.createOscillator(),g=ac.createGain();o.frequency.value=f||880;o.connect(g);g.connect(ac.destination);g.gain.setValueAtTime(0.25,ac.currentTime);g.gain.exponentialRampToValueAtTime(0.001,ac.currentTime+(d||0.08));o.start();o.stop(ac.currentTime+(d||0.08));}catch(e){}}
async function wake(){try{if('wakeLock' in navigator&&(!wl||wl.released))wl=await navigator.wakeLock.request('screen');}catch(e){}}
function toast(m,ms){const t=$('#toast');if(!t)return;t.textContent=m;t.classList.add('on');clearTimeout(toastId);toastId=setTimeout(()=>t.classList.remove('on'),ms||2200);}

/* ---------- Sonidos de la interfaz ---------- */
// Cada sonido es una lista de tonos: [frecuencia inicial, final, retraso, duración, volumen, forma de onda]
const FX={tap:[[1500,2300,0,0.05,0.09]],letra:[[1900,1900,0,0.035,0.07]],sel:[[1100,700,0,0.07,0.09,'triangle'],[2200,1400,0,0.05,0.03]],nav:[[520,1560,0,0.12,0.08],[780,2340,0.045,0.11,0.05]],baja:[[900,280,0,0.14,0.09,'triangle']],rep:[[880,1320,0,0.07,0.14],[1760,2640,0,0.05,0.04]],meta:[[880,880,0,0.09,0.13],[1320,1320,0.08,0.09,0.13],[1760,1760,0.16,0.2,0.14]],ok:[[660,660,0,0.09,0.12],[990,990,0.09,0.16,0.12]],con:[[660,1320,0,0.14,0.14],[1320,2640,0,0.1,0.04]],exc:[[1100,550,0,0.24,0.11,'triangle']]};
let fxBus=null;
function audio(){ac=ac||new (window.AudioContext||window.webkitAudioContext)();if(ac.state==='suspended')ac.resume();return ac;}
function bus(){if(fxBus)return fxBus;const a=audio();fxBus=a.createGain();fxBus.connect(a.destination);const d=a.createDelay(0.5),fb=a.createGain(),w=a.createGain();d.delayTime.value=0.085;fb.gain.value=0.28;w.gain.value=0.3;fxBus.connect(d);d.connect(fb);fb.connect(d);d.connect(w);w.connect(a.destination);return fxBus;}
function fx(n){try{bus();(FX[n]||[]).forEach(p=>{const o=ac.createOscillator(),g=ac.createGain(),t=ac.currentTime+p[2];o.type=p[5]||'sine';o.frequency.setValueAtTime(p[0],t);o.frequency.exponentialRampToValueAtTime(p[1],t+p[3]);g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(p[4],t+0.008);g.gain.exponentialRampToValueAtTime(0.0001,t+p[3]);o.connect(g);g.connect(fxBus);o.start(t);o.stop(t+p[3]+0.02);});}catch(e){}}
function fxDe(b){const a=b.dataset.act;if(a==='rep'||a==='guardar'||a==='evGuardar'||a==='sRep'||a==='sHecha')return;fx(b.closest('nav')||a==='ver'||a==='volver'||a==='perfil'||a==='salir'?'nav':b.classList.contains('chip')||b.closest('.seg')?'sel':a.indexOf('del')===0?'baja':'tap');}

/* ---------- Pantalla de acceso ---------- */
// Es un adorno, no una protección: el código está a la vista en este archivo.
const CODIGO='0000';
const AGENTE='Peter Sutherland';
const agente=()=>String(mem.cfg.agente||'').trim().slice(0,24)||AGENTE;
const VOZ='./voz-acceso.mp3';
let voz=null;
function cargarVoz(){if(!location.protocol.startsWith('http'))return;fetch(VOZ).then(r=>r.ok?r.arrayBuffer():null).then(b=>{if(!b)return;ac=ac||new (window.AudioContext||window.webkitAudioContext)();return new Promise((ok,no)=>ac.decodeAudioData(b,ok,no));}).then(buf=>{voz=buf||null;}).catch(()=>{});}
function acceso(){
  const el=document.createElement('div');el.id='acceso';el.className='pide';
  el.innerHTML='<div class="ac-aro"><svg viewBox="0 0 60 60" aria-hidden="true"><path d="M16 31l10 10 19-22"/></svg><b></b></div><div class="ac-tit">Verificación de credenciales</div><div class="ac-sub">Introduce tu código de acceso</div><div class="ac-cod">'+'<i></i>'.repeat(CODIGO.length)+'</div><div class="ac-tec">'+[1,2,3,4,5,6,7,8,9,'',0,'⌫'].map(k=>k===''?'<span></span>':'<button data-k="'+k+'"'+(k==='⌫'?' aria-label="Borrar"':'')+'>'+k+'</button>').join('')+'</div>';
  document.body.appendChild(el);
  const tit=el.querySelector('.ac-tit'),sub=el.querySelector('.ac-sub'),pct=el.querySelector('.ac-aro b');
  let cod='',bloq=false;const nom=agente();
  const pinta=()=>el.querySelectorAll('.ac-cod i').forEach((c,i)=>{c.classList.toggle('on',i<cod.length);c.textContent=i<cod.length?'•':'';});
  const estado=(cls,t,s)=>{el.className=cls;tit.textContent=t;sub.textContent=s;};
  el.addEventListener('click',e=>{const b=e.target.closest('[data-k]');if(!b||bloq)return;fx('tap');if(b.dataset.k==='⌫')cod=cod.slice(0,-1);else cod+=b.dataset.k;pinta();if(cod.length===CODIGO.length)comprobar();});
  function comprobar(){bloq=true;estado('verif','Autenticando','Comprobando credenciales');fx('nav');const pasos=['Comprobando credenciales','Verificando identidad','Descifrando expediente'],t0=Date.now();
    const id=setInterval(()=>{const f=Math.min(1,(Date.now()-t0)/1700);pct.textContent=Math.round(f*100)+'%';sub.textContent=pasos[Math.min(2,Math.floor(f*3))];if(f>=1){clearInterval(id);pct.textContent='';if(cod===CODIGO)concedido();else denegado();}},40);}
  function concedido(){estado('ok','Autenticación completada','Acceso concedido');fx('meta');let espera=1300+nom.length*70+1300;
    if(voz){try{const s=ac.createBufferSource();s.buffer=voz;s.connect(ac.destination);s.start(ac.currentTime+0.35);espera=Math.max(espera,(voz.duration+0.9)*1000);}catch(e){}}
    setTimeout(bienvenida,1300);
    setTimeout(()=>{el.classList.add('fuera');setTimeout(()=>el.remove(),600);},espera);}
  function bienvenida(){estado('bien','','Bienvenido');let i=0;const id=setInterval(()=>{const c=nom.charAt(i++);tit.textContent=nom.slice(0,i);if(c!==' ')fx('letra');if(i>=nom.length)clearInterval(id);},70);}
  function denegado(){estado('no','Acceso denegado','Código incorrecto');fx('baja');setTimeout(()=>{cod='';pinta();bloq=false;estado('pide','Verificación de credenciales','Introduce tu código de acceso');},1400);}
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
setInterval(()=>{if(!st.restEnd)return;const left=Math.ceil((st.restEnd-Date.now())/1000);if(left<=0){st.restEnd=0;beep(880,0.15);setTimeout(()=>beep(880,0.15),250);setTimeout(()=>beep(1175,0.35),500);if(st.tab==='entrenar')render();return;}const el=$('#rest');if(el)el.textContent=mmss(left);},250);

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
  return `<div class="card"><h2>Historial</h2><div class="mut">${keys.length} ${keys.length===1?'día':'días'} · ${mem.sets.length} ${mem.sets.length===1?'serie':'series'}</div><div class="row"><button class="btn sm" data-act="exportar">Exportar copia</button><button class="btn sm ghost" data-act="importar">Importar copia</button><input type="file" id="imp" accept="application/json,.json" hidden></div><div class="mut">Los datos solo viven en este iPhone. Exporta una copia de vez en cuando.</div><div class="mut" id="ver"></div><h3>Nombre de agente</h3><input class="inp" data-in="agente" maxlength="24" autocomplete="off" placeholder="${esc(AGENTE)}" value="${esc(mem.cfg.agente||'')}"><div class="mut">Es el nombre del saludo al entrar. Se guarda solo en este iPhone.</div></div>`+
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
    `<button class="btn" data-act="evGuardar">Guardar en Rutinas</button><button class="btn ghost" data-act="evIni">Repetir evaluación</button><div class="mut">Al guardar se sustituyen las rutinas de una evaluación anterior y se ajusta el descanso. Las rutinas que hayas creado tú no se tocan.</div>`;}
  const p=EV_P[ev.i];
  return `<div class="card"><div class="tag">Pregunta ${ev.i+1} de ${EV_P.length}</div><div class="bar"><i style="width:${(ev.i+1)/EV_P.length*100}%"></i></div><h2>${p.q}</h2>${p.a?`<div class="mut">${p.a}</div>`:''}
    <div class="chips col">${p.o.map((o,j)=>`<button class="chip ${(p.m?ev.r[p.k].includes(o[0]):ev.r[p.k]===o[0])?'on':''}" data-act="evOp" data-v="${j}">${esc(o[1])}</button>`).join('')}</div>
    <div class="row sb"><button class="btn sm ghost" data-act="evAtras">Atrás</button><button class="btn sm" data-act="evSig">${ev.i<EV_P.length-1?'Siguiente':'Generar rutina'}</button></div></div>`;
}

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
    if((s.fase==='prep'||s.fase==='descanso')&&seg<=3&&s.bip!==seg){s.bip=seg;beep(660,0.06);}
    return;}
  if(s.fase==='prep')sSerie();
  else if(s.fase==='descanso'){beep(1175,0.3);sFase('prep',T_PREP);}
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
const VIEWS={entrenar:vEntrenar,biblioteca:vBiblioteca,rutinas:vRutinas,historial:vHistorial,evaluacion:vEvaluacion,hoy:vHoy};

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
  eval:{ag:'Pablo Lopez',s:'p',tabs:[['evaluacion','Evaluación']]},
  nutri:{ag:'Diane Far',s:'m'}};
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
function seguro(b){if(b.dataset.ok)return true;const t=b.textContent;b.dataset.ok='1';b.textContent='¿Borrar?';b.classList.add('warn');setTimeout(()=>{delete b.dataset.ok;b.textContent=t;b.classList.remove('warn');},2500);return false;}
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
  rutDia(v){const p=v.split(':'),r=rut(p[0]),d=Number(p[1]);if(!r)return;if((r.dias||[]).includes(d))r.dias=r.dias.filter(x=>x!==d);else{mem.rutinas.forEach(x=>{if(x.dias)x.dias=x.dias.filter(y=>y!==d);});r.dias=(r.dias||[]).concat(d);}save();render();},
  salir(){if(st.s&&!st.s.fin){toast('Termina o completa el entrenamiento antes de salir');return;}if(st.perfil)st.ult[st.perfil]=st.tab;st.perfil=null;st.det=null;render();window.scrollTo(0,0);},
  evIni(){st.ev={i:0,r:{evitar:[],fortalecer:[],prioridad:[]},res:null};render();window.scrollTo(0,0);},
  evOp(v){const ev=st.ev,p=EV_P[ev.i],x=p.o[Number(v)][0];if(p.m){const a=ev.r[p.k],k=a.indexOf(x);if(k>=0)a.splice(k,1);else{a.push(x);if(p.x)ev.r[p.x]=ev.r[p.x].filter(z=>z!==x);}}else ev.r[p.k]=x;render();},
  evAtras(){if(st.ev.i)st.ev.i--;else st.ev=null;render();},
  evSig(){const ev=st.ev,p=EV_P[ev.i];if(!p.m&&ev.r[p.k]===undefined){toast('Elige una opción');return;}if(ev.i<EV_P.length-1)ev.i++;else ev.res=evGenerar(ev.r,EJERCICIOS);render();window.scrollTo(0,0);},
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
  document.addEventListener('input',e=>{const k=e.target.dataset?e.target.dataset.in:null;if(!k)return;if(k==='q'){st.q=e.target.value;$('#lista').innerHTML=listaHTML();}else if(k==='equipo'){st.equipo=e.target.value;$('#lista').innerHTML=listaHTML();}else if(k==='agente'){mem.cfg.agente=e.target.value.slice(0,24);save();}else if(k==='kgv'){const n=parseFloat(String(e.target.value).replace(',','.'));if(!isNaN(n))st.kg=Math.max(0,n);}});
  document.addEventListener('change',e=>{if(e.target.id!=='imp'||!e.target.files[0])return;const fr=new FileReader();fr.onload=()=>{try{const d=JSON.parse(fr.result);if(!Array.isArray(d.sets))throw 0;mem=Object.assign({sets:[],rutinas:[],cfg:{descanso:90}},d);sana();save();render();toast('Copia importada');}catch(x){toast('Ese archivo no es una copia válida');}};fr.readAsText(e.target.files[0]);});
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&(st.s||st.tab==='entrenar'&&st.ex))wake();});
  if('serviceWorker' in navigator&&location.protocol.startsWith('http')){navigator.serviceWorker.register('./sw.js').catch(()=>{});navigator.serviceWorker.addEventListener('message',e=>{if(e.data&&e.data.tipo==='actualizada')toast('Actualización descargada: cierra y abre la app para verla',6000);});}
  render();
  try{if(navigator.audioSession)navigator.audioSession.type='ambient';}catch(e){}
  acceso();cargarVoz();
}
if(typeof document!=='undefined'&&document.getElementById)init();
