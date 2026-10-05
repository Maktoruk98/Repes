// Repes: guarda la app en el dispositivo para que abra sin conexión.
// No hay número de versión que tocar. Cada vez que la app se abre con conexión, descarga en segundo plano
// lo que haya publicado y lo deja listo para la siguiente apertura. Si falla algún archivo, no cambia nada.
const C='repes-app';
const A=['./','./index.html','./app.js','./exercises.js','./manifest.webmanifest','./icon-180.png','./icon-512.png'];
const BASE=new URL('./',self.location).pathname;
const igual=(a,b)=>{if(a.byteLength!==b.byteLength)return false;const x=new Uint8Array(a),y=new Uint8Array(b);for(let i=0;i<x.length;i++)if(x[i]!==y[i])return false;return true;};
let enCurso=null;
function descargar(){return enCurso||(enCurso=bajar().finally(()=>{enCurso=null;}));}
async function bajar(){
  const tmp=await caches.open(C+'-tmp');
  try{
    await tmp.addAll(A.map(u=>new Request(u,{cache:'no-cache'})));
    const c=await caches.open(C);let cambio=false;
    for(const u of A){
      const nuevo=await tmp.match(u);if(!nuevo)continue;
      const viejo=await c.match(u);
      if(viejo&&!igual(await viejo.arrayBuffer(),await nuevo.clone().arrayBuffer()))cambio=true;
      await c.put(u,nuevo);
    }
    return cambio;
  }finally{await caches.delete(C+'-tmp');}
}
self.addEventListener('install',e=>{e.waitUntil(descargar().then(()=>self.skipWaiting()));});
// Solo borra cachés antiguas de Repes: en el mismo dominio pueden vivir otras apps.
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k.startsWith('repes-')&&k!==C&&k!==C+'-tmp').map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',e=>{
  const r=e.request;if(r.method!=='GET')return;
  const u=new URL(r.url);if(u.origin!==self.location.origin||!u.pathname.startsWith(BASE))return;
  e.respondWith(caches.open(C).then(c=>c.match(r,{ignoreSearch:true})).then(hit=>hit||fetch(r).catch(()=>caches.open(C).then(c=>c.match('./index.html')))));
  if(r.mode==='navigate')e.waitUntil(descargar().then(cambio=>cambio?self.clients.matchAll().then(cs=>cs.forEach(cl=>cl.postMessage({tipo:'actualizada'}))):null).catch(()=>{}));
});
