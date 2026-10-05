'use strict';
const $=(s,r=document)=>r.querySelector(s);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm=s=>s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
const KEY='repes.v1';
let mem={sets:[],rutinas:[],cfg:{descanso:90}};
const st={tab:'entrenar',ex:null,vari:'',det:null,sel:{eq:0,pos:0,ag:0,uni:false,tec:0},reps:0,kg:20,obj:10,modo:'manual',q:'',grupo:'',equipo:'',restEnd:0,tempo:3,sens:1.3,run:false,cola:null,colaI:0};
const BYID={};EJERCICIOS.forEach(e=>BYID[e.id]=e);

function load(){try{const d=JSON.parse(localStorage.getItem(KEY));if(d&&Array.isArray(d.sets))mem=Object.assign(mem,d);}catch(e){}}
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

/* ---------- Contador ---------- */
let tempoId=0,sen=null;
function upd(){const c=$('#cnt');if(c)c.textContent=st.reps;const b=$('#big');if(b)b.classList.toggle('done',st.reps>=st.obj);}
function addRep(){st.reps++;upd();beep(st.reps===st.obj?1175:880,st.reps===st.obj?0.25:0.07);wake();}
function onMotion(e){const a=e.accelerationIncludingGravity;if(!a||a.x==null||!sen)return;const m=Math.hypot(a.x,a.y,a.z);sen.base+=(m-sen.base)*0.02;sen.f+=((m-sen.base)-sen.f)*0.2;const now=Date.now();if(sen.fase===0&&sen.f>st.sens)sen.fase=1;else if(sen.fase===1&&sen.f<-st.sens){sen.fase=0;if(now-sen.last>700){sen.last=now;addRep();}}}
async function sensorOn(){if(typeof DeviceMotionEvent==='undefined'){toast('Este dispositivo no ofrece sensor de movimiento');return false;}try{if(typeof DeviceMotionEvent.requestPermission==='function'){const r=await DeviceMotionEvent.requestPermission();if(r!=='granted'){toast('Permiso de movimiento denegado');return false;}}}catch(e){toast('No se pudo activar el sensor');return false;}sen={base:9.8,f:0,fase:0,last:0};window.addEventListener('devicemotion',onMotion);return true;}
async function arrancar(){wake();beep(660,0.05);if(st.modo==='tempo'){st.run=true;tempoId=setInterval(()=>{addRep();if(st.reps>=st.obj)parar();},st.tempo*1000);}else if(st.modo==='sensor'){if(!(await sensorOn()))return;st.run=true;}render();}
function parar(){if(tempoId){clearInterval(tempoId);tempoId=0;}window.removeEventListener('devicemotion',onMotion);sen=null;const was=st.run;st.run=false;if(was)render();}
function elegir(e,label,obj,keep){if(!e)return;parar();if(!keep)st.cola=null;st.ex=e;st.vari=label;st.reps=0;if(obj)st.obj=obj;const prev=mem.sets.filter(s=>s.ex===e.id);if(prev.length)st.kg=prev[prev.length-1].kg;st.tab='entrenar';st.det=null;render();window.scrollTo(0,0);}
function cargarCola(){const it=st.cola[st.colaI];elegir(BYID[it.ex],it.v,it.reps,true);}
setInterval(()=>{if(!st.restEnd)return;const left=Math.ceil((st.restEnd-Date.now())/1000);if(left<=0){st.restEnd=0;beep(880,0.15);setTimeout(()=>beep(880,0.15),250);setTimeout(()=>beep(1175,0.35),500);if(st.tab==='entrenar')render();return;}const el=$('#rest');if(el)el.textContent=mmss(left);},250);

/* ---------- Vistas ---------- */
function vEntrenar(){
  if(!st.ex)return `<div class="card center"><h2>Elige un ejercicio</h2><p class="mut">Abre la biblioteca, escoge la variante y vuelve aquí para contar repeticiones.</p><button class="btn" data-act="tab" data-v="biblioteca">Abrir biblioteca</button></div>`;
  const hoy=mem.sets.filter(s=>s.ex===st.ex.id&&dia(s.t)===dia(Date.now()));
  const ult=ultima(st.ex.id);
  const it=st.cola?st.cola[st.colaI]:null;
  const left=st.restEnd?Math.max(0,Math.ceil((st.restEnd-Date.now())/1000)):0;
  return `<div class="card">
    ${it?`<div class="tag">Rutina · ejercicio ${st.colaI+1} de ${st.cola.length} · objetivo ${it.series}×${it.reps}</div>`:''}
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
  return `<input class="inp" type="search" placeholder="Buscar ejercicio, músculo o posición…" value="${esc(st.q)}" data-in="q">
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
    <div class="sel">${esc(varLabel(e,st.sel))}</div><button class="btn" data-act="entrenar">Entrenar esta variante</button></div>
  <div class="card"><h3>Añadir a una rutina</h3>${mem.rutinas.length?`<select id="rsel" class="inp">${mem.rutinas.map(r=>`<option value="${r.id}">${esc(r.n)}</option>`).join('')}</select><div class="row"><input id="rser" class="inp n" type="number" inputmode="numeric" value="3"><span>series ×</span><input id="rrep" class="inp n" type="number" inputmode="numeric" value="10"><span>reps</span><button class="btn sm" data-act="addRut">Añadir</button></div>`:'<div class="mut">Crea primero una rutina en la pestaña Rutinas.</div>'}</div>
  <div class="card"><h3>Tu historial</h3>${ss.length?`<div class="mut">Mejor 1RM estimado: ${best.toFixed(1)} kg</div>`+ss.slice(-6).reverse().map(s=>`<div class="li"><div>${new Date(s.t).toLocaleDateString('es-ES',{day:'numeric',month:'short'})}<div class="mut">${esc(s.v)}</div></div><div class="r">${s.kg} kg × ${s.reps}</div></div>`).join(''):'<div class="mut">Sin registros todavía.</div>'}</div>`;
}
function vRutinas(){
  return `<div class="card"><h2>Rutinas</h2><div class="row"><input id="rnom" class="inp" placeholder="Nombre (p. ej. Empuje A)"><button class="btn sm" data-act="nuevaRut">Crear</button></div><div class="mut">Los ejercicios se añaden desde su ficha en la biblioteca.</div></div>`+
  mem.rutinas.map(r=>`<div class="card"><div class="row sb"><h3>${esc(r.n)}</h3><button class="x" data-act="delRut" data-v="${r.id}">✕</button></div>${r.items.length?r.items.map((it,i)=>`<div class="li"><div><b>${esc(BYID[it.ex]?BYID[it.ex].n:it.ex)}</b><div class="mut">${esc(it.v)}</div></div><div class="r">${it.series}×${it.reps}</div><button class="x" data-act="playItem" data-v="${r.id}:${i}">▶</button><button class="x" data-act="delItem" data-v="${r.id}:${i}">✕</button></div>`).join('')+`<button class="btn" data-act="empezar" data-v="${r.id}">Empezar rutina</button>`:'<div class="mut">Vacía.</div>'}</div>`).join('');
}
function vHistorial(){
  const days={};mem.sets.forEach(s=>{(days[dia(s.t)]=days[dia(s.t)]||[]).push(s);});
  const keys=Object.keys(days).sort((a,b)=>new Date(b)-new Date(a));
  return `<div class="card"><h2>Historial</h2><div class="mut">${keys.length} ${keys.length===1?'día':'días'} · ${mem.sets.length} ${mem.sets.length===1?'serie':'series'}</div><div class="row"><button class="btn sm" data-act="exportar">Exportar copia</button><button class="btn sm ghost" data-act="importar">Importar copia</button><input type="file" id="imp" accept="application/json,.json" hidden></div><div class="mut">Los datos solo viven en este iPhone. Exporta una copia de vez en cuando.</div><div class="mut" id="ver"></div></div>`+
  (keys.length?keys.map(k=>{const ss=days[k];const vol=ss.reduce((a,s)=>a+s.kg*s.reps,0);return `<div class="card"><h3>${fechaLarga(ss[0].t)}</h3><div class="mut">${ss.length} series · ${Math.round(vol)} kg de volumen</div>${ss.map(s=>`<div class="li"><div><b>${esc(s.n)}</b><div class="mut">${esc(s.v)}</div></div><div class="r">${s.kg} kg × ${s.reps}</div><button class="x" data-act="delSet" data-v="${s.t}">✕</button></div>`).join('')}</div>`;}).join(''):'<div class="card mut">Aún no hay series guardadas.</div>');
}
function verVersion(){if(typeof caches==='undefined')return;Promise.all(['./index.html','./app.js','./exercises.js'].map(u=>caches.match(u))).then(rs=>{const t=Math.max(0,...rs.map(r=>r?Date.parse(r.headers.get('last-modified')||'')||0:0));const el=$('#ver');if(t&&el)el.textContent='Versión publicada el '+new Date(t).toLocaleString('es-ES',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'});}).catch(()=>{});}
const VIEWS={entrenar:vEntrenar,biblioteca:vBiblioteca,rutinas:vRutinas,historial:vHistorial};
function render(){$('#view').innerHTML=VIEWS[st.tab]();document.querySelectorAll('nav button').forEach(b=>b.classList.toggle('on',b.dataset.v===st.tab));if(st.tab==='historial')verVersion();}

/* ---------- Acciones ---------- */
const rut=id=>mem.rutinas.find(r=>String(r.id)===String(id));
function seguro(b){if(b.dataset.ok)return true;const t=b.textContent;b.dataset.ok='1';b.textContent='¿Borrar?';b.classList.add('warn');setTimeout(()=>{delete b.dataset.ok;b.textContent=t;b.classList.remove('warn');},2500);return false;}
const ACT={
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
  guardar(){if(!st.reps){toast('Cuenta al menos una repetición');return;}parar();mem.sets.push({t:Date.now(),ex:st.ex.id,n:st.ex.n,v:st.vari,reps:st.reps,kg:st.kg});save();st.reps=0;st.restEnd=Date.now()+mem.cfg.descanso*1000;beep(660,0.12);render();},
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
  document.addEventListener('click',e=>{const b=e.target.closest('[data-act]');if(!b)return;const f=ACT[b.dataset.act];if(f)f(b.dataset.v,b);});
  document.addEventListener('input',e=>{const k=e.target.dataset?e.target.dataset.in:null;if(!k)return;if(k==='q'){st.q=e.target.value;$('#lista').innerHTML=listaHTML();}else if(k==='equipo'){st.equipo=e.target.value;$('#lista').innerHTML=listaHTML();}else if(k==='kgv'){const n=parseFloat(String(e.target.value).replace(',','.'));if(!isNaN(n))st.kg=Math.max(0,n);}});
  document.addEventListener('change',e=>{if(e.target.id!=='imp'||!e.target.files[0])return;const fr=new FileReader();fr.onload=()=>{try{const d=JSON.parse(fr.result);if(!Array.isArray(d.sets))throw 0;mem=Object.assign({sets:[],rutinas:[],cfg:{descanso:90}},d);save();render();toast('Copia importada');}catch(x){toast('Ese archivo no es una copia válida');}};fr.readAsText(e.target.files[0]);});
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&st.tab==='entrenar'&&st.ex)wake();});
  if('serviceWorker' in navigator&&location.protocol.startsWith('http')){navigator.serviceWorker.register('./sw.js').catch(()=>{});navigator.serviceWorker.addEventListener('message',e=>{if(e.data&&e.data.tipo==='actualizada')toast('Actualización descargada: cierra y abre la app para verla',6000);});}
  render();
}
if(typeof document!=='undefined'&&document.getElementById)init();
