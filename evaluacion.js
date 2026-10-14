// Generador de rutinas a partir de la evaluación. Reglas generales de entrenamiento, sin conexión.
var EV_ZONAS={
 hombro:['press-de-banca','aperturas','flexiones','fondos-en-paralelas','pullover','press-de-pecho-en-maquina','press-landmine','press-militar','press-arnold','elevaciones-laterales','elevaciones-frontales','remo-al-menton','push-press','flexiones-en-pica-y-pino','fondos-entre-bancos','press-de-banca-cerrado','press-jm','extension-de-triceps-sobre-la-cabeza','arrancada-snatch','thruster','levantamiento-turco','lanzamiento-de-balon-medicinal','dominadas'],
 rodilla:['sentadilla','prensa-de-piernas','sentadilla-hack','sentadilla-bulgara','zancadas','extension-de-cuadriceps','subida-al-cajon-step-up','sentadilla-sissy','sentadilla-a-una-pierna-pistol','sentadilla-pendular-y-con-cinturon','sentadilla-isometrica-en-pared','curl-nordico','zancada-cosaca','burpees','thruster','salto-al-cajon','comba','carrera-en-cinta','escaladora','trineo','cargada-clean','arrancada-snatch'],
 lumbar:['remo-con-barra','remo-en-t','peso-muerto','hiperextensiones','buenos-dias','peso-muerto-rumano','balanceo-con-kettlebell-swing','sentadilla','cargada-clean','arrancada-snatch','remo-en-maquina-ergometro','rueda-abdominal','elevacion-de-piernas','dragon-flag','giro-ruso','trineo'],
 muneca:['flexiones','fondos-en-paralelas','fondos-entre-bancos','curl-de-muneca','curl-inverso','flexiones-en-pica-y-pino','plancha','burpees','escaladores-mountain-climbers','curl-zottman','cargada-clean','arrancada-snatch','bird-dog','patada-de-gluteo']
};
// Zonas a fortalecer: grupos que reciben más trabajo. Una zona no puede estar a la vez en evitar y en fortalecer.
var EV_FORTALECE={hombro:['Hombro'],rodilla:['Cuádriceps','Isquios'],lumbar:['Core','Glúteo'],muneca:['Antebrazo']};
var EV_AVANZADOS=['cargada-clean','arrancada-snatch','levantamiento-turco','dragon-flag','sentadilla-a-una-pierna-pistol','curl-nordico','flexiones-en-pica-y-pino','push-press','press-jm','thruster','sentadilla-sissy'];
var EV_EQUIPO={gym:null,mancuernas:['Mancuernas','Peso corporal'],corporal:['Peso corporal'],gomas:['Goma elástica','Peso corporal']};
var EV_PLANTILLAS={
 cc:{n:'Cuerpo completo',g:['Cuádriceps','Pecho','Espalda','Isquios','Hombro','Core','Glúteo','Bíceps','Tríceps','Gemelo']},
 torso:{n:'Torso',g:['Pecho','Espalda','Hombro','Pecho','Espalda','Bíceps','Tríceps','Hombro']},
 pierna:{n:'Pierna',g:['Cuádriceps','Isquios','Glúteo','Cuádriceps','Gemelo','Core','Aductores','Isquios']},
 empuje:{n:'Empuje',g:['Pecho','Hombro','Pecho','Tríceps','Hombro','Tríceps','Pecho','Core']},
 tiron:{n:'Tirón',g:['Espalda','Espalda','Hombro','Bíceps','Espalda','Bíceps','Antebrazo','Core']}
};
var EV_REPARTO={2:['cc','cc'],3:['cc','cc','cc'],4:['torso','pierna','torso','pierna'],5:['empuje','tiron','pierna','torso','pierna'],6:['empuje','tiron','pierna','empuje','tiron','pierna']};
var EV_CARGA={fuerza:{c:[3,4,5],rc:5,i:3,ri:8,d:180},musculo:{c:[3,3,4],rc:8,i:[2,3,3],ri:12,d:90},resist:{c:[2,3,3],rc:15,i:[2,3,3],ri:15,d:45},grasa:{c:[3,3,4],rc:12,i:[3,3,3],ri:12,d:60},salud:{c:[2,3,3],rc:10,i:[2,3,3],ri:10,d:90}};
function evGenerar(r,lib){
  var permitido=EV_EQUIPO[r.equipo];
  var zonas={};(r.evitar||[]).forEach(function(z){(EV_ZONAS[z]||[]).forEach(function(id){zonas[id]=1;});});
  function equipoDe(e){if(!permitido){if(r.exp===0){var f=['Máquina','Polea'].filter(function(q){return e.eq.indexOf(q)>=0;});if(f.length)return f[0];}return e.eq[0];}var pref=['Mancuernas','Goma elástica','Peso corporal'];for(var i=0;i<pref.length;i++)if(permitido.indexOf(pref[i])>=0&&e.eq.indexOf(pref[i])>=0)return pref[i];return null;}
  function vale(e){var q=equipoDe(e);return !zonas[e.id]&&q&&!(r.exp<2&&EV_AVANZADOS.indexOf(e.id)>=0)&&!(r.exp===0&&q==='Peso corporal'&&['dominadas','fondos-en-paralelas'].indexOf(e.id)>=0);}
  var n={30:4,45:5,60:6,90:8}[r.min]||5;if(r.exp===0)n=Math.min(n,6);
  var carga=EV_CARGA[r.obj]||EV_CARGA.salud,usos={},rutinas=[],sinCardio=false;
  var fort=[];(r.fortalecer||[]).forEach(function(z){(EV_FORTALECE[z]||[]).forEach(function(g){if(fort.indexOf(g)<0)fort.push(g);});});
  var pri=(r.prioridad||[]).concat(fort.filter(function(g){return (r.prioridad||[]).indexOf(g)<0;}));
  (EV_REPARTO[r.dias]||EV_REPARTO[3]).forEach(function(tipo,d){
    var pl=EV_PLANTILLAS[tipo],slots=pl.g.slice();
    var prim=slots.slice(0,n),resto=slots.slice(n);
    // Un grupo a fortalecer que se quedaba fuera del día entra en lugar del último no prioritario.
    fort.forEach(function(g){var k=resto.indexOf(g);if(prim.indexOf(g)>=0||k<0)return;for(var j=prim.length-1;j>=0;j--){if(pri.indexOf(prim[j])<0){resto.splice(k,1);resto.unshift(prim[j]);prim[j]=g;break;}}});
    pri.forEach(function(g){var k=prim.indexOf(g);if(k<0)return;for(var j=prim.length-1;j>=0;j--){if(pri.indexOf(prim[j])<0){resto.unshift(prim.splice(j,1)[0]);break;}}prim.splice(prim.indexOf(g)+1,0,g);});slots=prim.concat(resto);
    var vuelta=usos[tipo]||0;usos[tipo]=vuelta+1;
    var usados={},vistos={},items=[];
    slots.forEach(function(g){if(items.length>=n)return;
      var primero=!vistos[g];vistos[g]=1;
      var cand=lib.filter(function(e){return e.g===g&&vale(e)&&!usados[e.id];});
      if(!cand.length)return;
      var prefiere=function(e){if(tipo==='tiron'&&g==='Hombro')return ['face-pull','pajaros-deltoides-posterior'].indexOf(e.id)>=0?0:1;return (primero?e.comp:!e.comp)?0:1;};
      cand.sort(function(a,b){return prefiere(a)-prefiere(b);});
      var buenos=cand.filter(function(e){return prefiere(e)===0;});if(!buenos.length)buenos=cand;
      var e=buenos[vuelta%buenos.length];usados[e.id]=1;
      var comp=e.comp&&g!=='Core',series=comp?carga.c:carga.i;series=Array.isArray(series)?series[r.exp]:series;
      items.push({ex:e.id,n:e.n,v:equipoDe(e)+' · '+e.pos[0],series:series,reps:g==='Core'?Math.max(12,carga.ri):comp?carga.rc:carga.ri});
    });
    if(r.cardio&&r.cardio!=='no'){var mins=r.cardio==='si'?20:10;var cardio=lib.filter(function(e){return e.g==='Cardio'&&vale(e);});
      var pref=cardio.filter(function(e){return e.id==='bicicleta-estatica'||e.id==='eliptica';});var c=(pref.length?pref:cardio)[0];
      if(!c)sinCardio=true;if(c)items.push({ex:c.id,n:c.n,v:equipoDe(c)+' · '+c.pos[0]+' · '+mins+' min',series:1,reps:mins,min:true});}
    rutinas.push({n:'Evaluación · Día '+String.fromCharCode(65+d)+' · '+pl.n,items:items});
  });
  return {rutinas:rutinas,descanso:carga.d,sinCardio:sinCardio};
}
if(typeof module!=='undefined')module.exports={evGenerar:evGenerar,EV_ZONAS:EV_ZONAS,EV_FORTALECE:EV_FORTALECE,EV_AVANZADOS:EV_AVANZADOS};
