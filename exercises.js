// Biblioteca de ejercicios. Cada línea: nombre|grupo|secundarios|tipo|equipos|posiciones|agarres|clave técnica
// tipo: C = compuesto, A = aislado, u = admite versión unilateral. Las variantes salen de equipo × posición × agarre.
const EQUIPOS={B:'Barra',M:'Mancuernas',K:'Kettlebell',P:'Polea',Q:'Máquina',S:'Multipower',C:'Peso corporal',W:'Con lastre',G:'Goma elástica',Z:'Barra Z',T:'TRX / anillas',L:'Landmine',D:'Disco',X:'Barra hexagonal'};
const TECNICAS=[['Normal',''],['Con pausa','1–2 s parado en el punto más difícil del recorrido.'],['Tempo lento','Bajada de 3–4 s, subida controlada.'],['Explosivo','Subida lo más rápida posible, bajada controlada.'],['Parciales','Solo la mitad del recorrido donde más tensión hay.'],['1 y ½','Una repetición completa más media repetición cuentan como una.'],['Isométrico','Mantén la posición sin moverte el tiempo marcado.'],['Drop set','Al llegar al fallo, baja el peso un 20–30 % y sigue sin descansar.'],['Rest-pause','Al fallo, descansa 15–20 s y saca más repeticiones con el mismo peso.'],['Al fallo','Hasta no poder completar otra repetición con buena técnica.']];
const RAW=`
Press de banca|Pecho|Tríceps, deltoides anterior|C|B,M,S,Q,G|Plano,Inclinado 30°,Inclinado 45°,Declinado|Agarre medio,Agarre ancho,Agarre cerrado,Agarre inverso|Escápulas juntas y abajo, pies firmes. Baja controlado al pecho y empuja sin despegar los glúteos.
Aperturas|Pecho|Deltoides anterior|Au|M,P,Q,G,T|Plano,Inclinado,Declinado,De pie|Neutro,Supino|Codos ligeramente flexionados y fijos. Abre hasta notar estiramiento y cierra como abrazando.
Cruce de poleas|Pecho|Deltoides anterior|Au|P,G|Polea alta,Polea media,Polea baja|Neutro,Supino|Un paso adelante, torso algo inclinado. Junta las manos delante sin doblar más los codos.
Flexiones|Pecho|Tríceps, core|C|C,W,T,G|Suelo,Pies elevados,Manos elevadas,De rodillas|Medio,Ancho,Diamante,Puños,Arquero|Cuerpo en tabla de talones a cabeza. Pecho casi al suelo, codos a unos 45° del torso.
Fondos en paralelas|Pecho|Tríceps, deltoides anterior|C|C,W,Q,T|Torso inclinado (pecho),Torso vertical (tríceps)|-|Baja hasta que el hombro quede a la altura del codo. No encojas los hombros.
Pullover|Pecho|Dorsal, serrato|A|M,B,Z,P,Q|Tumbado a lo largo del banco,Cruzado en el banco,De pie en polea|Neutro,Prono|Brazos casi rectos. Lleva el peso tras la cabeza sin arquear la zona lumbar.
Press de pecho en máquina|Pecho|Tríceps|Cu|Q|Horizontal,Inclinado,Declinado|Prono,Neutro|Ajusta el asiento para que los agarres queden a media altura del pecho.
Contractora (peck deck)|Pecho|Deltoides anterior|Au|Q|Sentado|Manos en agarres,Antebrazos en almohadillas|Espalda pegada al respaldo. Cierra apretando el pecho un segundo.
Press landmine|Pecho|Hombro, tríceps|Cu|L|De pie,Media rodilla,De rodillas|Una mano,Dos manos|Empuja en diagonal hacia arriba y adelante. Costillas abajo.
Press con disco (Svend)|Pecho|Deltoides anterior|A|D,M|De pie,Tumbado|-|Aprieta el disco entre las palmas todo el recorrido mientras extiendes los brazos.
Dominadas|Espalda|Bíceps, antebrazo|C|C,W,G,Q|Colgado|Prono ancho,Prono medio,Supino,Neutro,Mixto,Con toalla|Empieza desde colgado completo. Lleva el pecho a la barra bajando las escápulas.
Jalón al pecho|Espalda|Bíceps|Cu|P,Q,G|Sentado,De rodillas|Prono ancho,Prono medio,Supino,Neutro estrecho,Tras nuca|Pecho arriba, tira con los codos hacia las costillas. No te balancees.
Remo con barra|Espalda|Bíceps, lumbar|C|B,S,X|Torso a 45°,Pendlay (torso paralelo),Yates (torso alto)|Prono,Supino|Espalda neutra, bisagra de cadera. Barra al ombligo y pausa arriba.
Remo con mancuerna|Espalda|Bíceps, deltoides posterior|Cu|M,K|Apoyado en banco,Pecho en banco inclinado,De pie inclinado|Neutro,Prono|Codo cerca del cuerpo hacia la cadera. No gires el torso.
Remo sentado en polea|Espalda|Bíceps|Cu|P,Q,G|Sentado|Neutro estrecho,Prono ancho,Supino,Cuerda|Tronco quieto. Junta las escápulas al final y estira al volver.
Remo en T|Espalda|Bíceps, lumbar|C|L,Q|Inclinado de pie,Pecho apoyado|Neutro,Prono ancho|Cadera atrás y espalda recta. Lleva el agarre al abdomen.
Remo en máquina|Espalda|Bíceps|Cu|Q|Pecho apoyado|Neutro,Prono,Alto (a la cara),Bajo (a la cadera)|Pecho contra la almohadilla. Tira con los codos, no con las manos.
Remo invertido|Espalda|Bíceps, core|C|C,T,S|Pies en el suelo,Pies elevados|Prono,Supino,Neutro|Cuerpo recto como una tabla. Pecho a la barra.
Pulldown con brazos rectos|Espalda|Tríceps (cabeza larga)|A|P,G|De pie,Torso inclinado|Barra recta,Cuerda|Brazos casi rectos. Lleva la barra a los muslos en arco.
Peso muerto|Espalda|Glúteo, isquios, trapecio|C|B,X,M,K,S|Convencional,Sumo,Desde bloques (rack pull),Con déficit|Prono,Mixto,Gancho,Con straps|Barra pegada a las tibias, espalda neutra. Empuja el suelo y bloquea con glúteo.
Hiperextensiones|Espalda|Glúteo, isquios|A|C,D,B,G|Banco a 45°,Banco romano 90°,Suelo (superman)|Manos al pecho,Manos tras la nuca|Sube hasta alinear el cuerpo, sin hiperextender la zona lumbar.
Encogimientos de hombros|Espalda|Trapecio|A|B,M,X,S,Q,P|De pie,Pecho en banco inclinado|Prono,Neutro,Barra por detrás|Sube los hombros hacia las orejas sin rotarlos. Pausa arriba.
Press militar|Hombro|Tríceps, core|C|B,M,K,S,Q,G|De pie,Sentado con respaldo,Sentado en el suelo (Z press)|Prono,Neutro,Tras nuca|Glúteo y abdomen apretados. Empuja vertical y mete la cabeza al pasar la barra.
Press Arnold|Hombro|Tríceps|C|M,K|Sentado,De pie|-|Empieza con palmas hacia ti y rota mientras subes.
Elevaciones laterales|Hombro|Trapecio|Au|M,P,Q,G,D|De pie,Sentado,Inclinado de lado,Tumbado de lado|Prono,Neutro,Pulgar arriba|Codos algo flexionados. Sube hasta la altura del hombro guiando con el codo.
Elevaciones frontales|Hombro|Pecho superior|Au|M,B,D,P,G,Z|De pie,Sentado,Pecho en banco inclinado|Prono,Neutro,Supino|Sube hasta la altura de los ojos sin balancear el torso.
Pájaros (deltoides posterior)|Hombro|Trapecio medio, romboides|Au|M,P,Q,G|De pie inclinado,Sentado inclinado,Pecho en banco inclinado,Contractora inversa|Neutro,Prono|Abre los brazos hacia fuera sin tirar con la espalda.
Face pull|Hombro|Manguito rotador, trapecio|A|P,G,T|Polea alta,Polea media,De rodillas|Cuerda,Agarre martillo|Tira hacia la cara separando las manos, codos altos.
Remo al mentón|Hombro|Trapecio|C|B,Z,M,P,K|De pie|Estrecho,Ancho|Codos por encima de las manos. Sube solo hasta el pecho si molesta el hombro.
Rotación externa de hombro|Hombro|Manguito rotador|Au|P,G,M|De pie con codo pegado,Codo elevado a 90°,Tumbado de lado|-|Peso muy ligero. Gira el antebrazo hacia fuera sin mover el codo.
Push press|Hombro|Piernas, tríceps|C|B,M,K|De pie|Prono,Neutro|Pequeña flexión de rodillas y empuja usando el impulso de las piernas.
Flexiones en pica y pino|Hombro|Tríceps|C|C|Pica en el suelo,Pica con pies elevados,Pino contra la pared|Medio,Ancho|Cadera alta, la cabeza baja por delante de las manos.
Curl de bíceps|Bíceps|Antebrazo|Au|B,Z,M,P,G,K|De pie,Sentado,Banco inclinado,Alterno|Supino,Supino ancho,Supino estrecho|Codos pegados al cuerpo. Sube sin balanceo y baja lento.
Curl martillo|Bíceps|Braquial, braquiorradial|Au|M,P,K,G|De pie,Sentado,Cruzado al pecho|Neutro,Cuerda|Pulgares arriba todo el recorrido.
Curl predicador (Scott)|Bíceps|Braquial|Au|Z,B,M,Q,P|Banco Scott|Supino,Neutro,Prono|Axilas contra la almohadilla. No bloquees el codo de golpe al bajar.
Curl concentrado|Bíceps||Au|M,P,K|Sentado con codo en el muslo,De pie inclinado|Supino|Solo se mueve el antebrazo. Aprieta arriba.
Curl araña|Bíceps||A|Z,B,M|Pecho en banco inclinado|Supino,Supino estrecho|Brazos colgando verticales, codos quietos.
Curl bayesian|Bíceps||Au|P|De espaldas a la polea|Supino|Brazo por detrás del cuerpo al inicio para estirar el bíceps.
Curl en polea alta|Bíceps||Au|P|De pie entre dos poleas|Supino|Brazos en cruz, lleva las manos hacia las orejas.
Curl Zottman|Bíceps|Antebrazo|A|M|De pie,Sentado|-|Sube en supino, gira arriba y baja en prono.
Extensión de tríceps en polea|Tríceps||Au|P,G|De pie|Cuerda,Barra recta,Barra en V,Agarre supino|Codos pegados al cuerpo. Extiende del todo y vuelve hasta 90°.
Press francés|Tríceps||A|Z,B,M,P|Tumbado plano,Inclinado,Declinado|Prono,Neutro|Codos apuntando al techo. Baja a la frente o tras la cabeza.
Extensión de tríceps sobre la cabeza|Tríceps||Au|M,Z,P,G,K|De pie,Sentado|Una mancuerna a dos manos,Cuerda,Barra|Codos cerca de las orejas. Estira bien abajo.
Press de banca cerrado|Tríceps|Pecho|C|B,S,M|Plano,Inclinado|Cerrado,Neutro|Manos al ancho de hombros, codos cerca del torso.
Patada de tríceps|Tríceps||Au|M,P,G|De pie inclinado,Apoyado en banco|Neutro,Supino|Brazo paralelo al suelo y quieto. Extiende del todo.
Fondos entre bancos|Tríceps|Pecho, hombro|C|C,D|Pies en el suelo,Pies elevados|-|Espalda cerca del banco. Baja hasta 90° de codo.
Press JM|Tríceps|Pecho|C|B,S|Plano|Cerrado|Mezcla de press cerrado y press francés: la barra baja hacia el cuello.
Extensión de tríceps en máquina|Tríceps||Au|Q|Sentado|-|Codos apoyados y alineados con el eje de la máquina.
Curl de muñeca|Antebrazo||Au|B,M,P,Z|Antebrazos sobre el banco,De pie tras la espalda|Supino (flexores),Prono (extensores)|Solo se mueve la muñeca, recorrido completo.
Curl inverso|Antebrazo|Braquial|A|B,Z,M,P|De pie,Banco Scott|Prono|Muñecas rectas, codos pegados.
Paseo del granjero|Antebrazo|Trapecio, core|C|M,K,X|Caminando,Estático|Dos manos,Una mano (maleta)|Hombros atrás, pasos cortos, sin inclinarte.
Colgarse de la barra|Antebrazo|Dorsal|Au|C,W|Pasivo,Activo (escápulas abajo)|Prono,Supino,Con toalla|Aguanta por tiempo. Cuenta segundos en lugar de repeticiones.
Sentadilla|Cuádriceps|Glúteo, core|C|B,S,M,K,C,G|Barra alta,Barra baja,Frontal,Goblet,Zercher,Al cajón|Pies al ancho de hombros,Pies juntos,Sumo|Rodillas en la línea de los pies, pecho arriba. Baja al menos a paralelo.
Prensa de piernas|Cuádriceps|Glúteo|Cu|Q|Inclinada 45°,Horizontal,Vertical|Pies bajos (cuádriceps),Pies altos (glúteo),Pies anchos,Pies juntos|No despegues la zona lumbar del respaldo ni bloquees las rodillas.
Sentadilla hack|Cuádriceps|Glúteo|C|Q,B|En máquina,Inversa (de cara),Barra tras las piernas|Pies bajos,Pies altos|Espalda pegada, baja profundo y controlado.
Sentadilla búlgara|Cuádriceps|Glúteo|C|M,B,K,S,C|Torso erguido (cuádriceps),Torso inclinado (glúteo)|Pie trasero en banco,Pie trasero en TRX|El peso va en la pierna de delante. Baja vertical.
Zancadas|Cuádriceps|Glúteo, isquios|C|M,B,K,C,S|Adelante,Atrás,Caminando,Lateral,Cruzada (curtsy)|Paso corto,Paso largo|La rodilla trasera casi toca el suelo, torso estable.
Extensión de cuádriceps|Cuádriceps||Au|Q,G,P|Sentado|Puntas neutras,Puntas hacia fuera,Puntas hacia dentro|Extiende del todo, pausa arriba y baja lento.
Subida al cajón (step-up)|Cuádriceps|Glúteo|C|M,B,K,C|Frontal,Lateral|Cajón bajo,Cajón alto|Empuja solo con la pierna de arriba, sin impulso de la de abajo.
Sentadilla sissy|Cuádriceps||A|C,Q,D|Libre con apoyo,En banco sissy|-|Rodillas adelante, cadera extendida, talones arriba.
Sentadilla a una pierna (pistol)|Cuádriceps|Glúteo, equilibrio|C|C,K,T|Libre,Asistida con TRX,Al cajón|-|Brazos al frente como contrapeso. Baja controlado.
Sentadilla pendular y con cinturón|Cuádriceps|Glúteo|C|Q|Pendular,Con cinturón (belt squat)|Pies bajos,Pies altos|Sin carga en la columna: permite ir muy profundo.
Sentadilla isométrica en pared|Cuádriceps||A|C,D,M|Rodillas a 90°|-|Espalda contra la pared. Aguanta por tiempo.
Peso muerto rumano|Isquios|Glúteo, lumbar|Cu|B,M,K,S,X,P|Dos piernas,A una pierna,Piernas rígidas|Prono,Mixto,Con straps|Cadera atrás, rodillas apenas flexionadas. Baja hasta notar estiramiento.
Curl femoral|Isquios|Gemelo|Au|Q,G,P|Tumbado,Sentado,De pie|Puntas neutras,Puntas flexionadas|Cadera pegada a la almohadilla. Baja en 2–3 s.
Curl nórdico|Isquios||C|C,G|Pies anclados,Asistido con goma|-|Cuerpo recto de rodillas a cabeza. Frena la caída todo lo posible.
Buenos días|Isquios|Glúteo, lumbar|C|B,S,G|De pie,Sentado|-|Bisagra de cadera con la barra en la espalda. Espalda neutra.
Curl femoral deslizante|Isquios|Glúteo|Cu|C,T|Con fitball,Con deslizadores,Con TRX|-|Cadera arriba todo el recorrido mientras recoges los talones.
Hip thrust|Glúteo|Isquios|Cu|B,Q,M,S,G,C|Espalda en banco,En máquina,Pies elevados|Pies al ancho de caderas,Pies anchos,Con goma en las rodillas|Barbilla al pecho. Sube hasta alinear tronco y muslos, pausa arriba.
Puente de glúteo|Glúteo|Isquios|Cu|C,B,M,G|Suelo,Pies elevados|-|Empuja con los talones. No arquees la zona lumbar.
Patada de glúteo|Glúteo||A|P,Q,G,C|En cuadrupedia,De pie,En máquina|-|Extiende la cadera sin arquear la espalda.
Abducción de cadera|Glúteo|Glúteo medio|Au|Q,P,G,C|Sentado,Sentado inclinado adelante,De pie,Tumbado de lado|-|Abre sin impulso y vuelve lento.
Pull-through en polea|Glúteo|Isquios|C|P,G|De espaldas a la polea|Cuerda|Bisagra de cadera. Termina apretando el glúteo, no tirando con los brazos.
Balanceo con kettlebell (swing)|Glúteo|Isquios, core|C|K,M|Ruso (a la altura de los ojos),Americano (sobre la cabeza)|Dos manos,Una mano|El impulso sale de la cadera. Los brazos solo guían.
Aducción de cadera|Aductores||Au|Q,P,G|Sentado,De pie|-|Cierra controlado y abre hasta notar estiramiento.
Plancha Copenhague|Aductores|Core|A|C|Rodilla apoyada,Pie apoyado|-|Plancha lateral con la pierna de arriba sobre el banco.
Zancada cosaca|Aductores|Cuádriceps, glúteo|C|C,K,M|De lado a lado|-|Baja sobre una pierna con la otra estirada y el talón apoyado.
Elevación de talones de pie|Gemelo|Sóleo|Au|Q,S,M,B,C|En máquina,En escalón,En prensa|Puntas neutras,Puntas hacia fuera,Puntas hacia dentro|Recorrido completo: estira abajo y pausa arriba.
Elevación de talones sentado|Gemelo|Sóleo|A|Q,M,B|Sentado|-|Rodillas a 90°. Trabaja sobre todo el sóleo.
Elevación de talones tipo burro|Gemelo||A|Q,C|Torso inclinado|-|Cadera flexionada para estirar más el gemelo.
Elevación de puntas (tibial)|Gemelo|Tibial anterior|A|C,K,G,Q|Espalda en la pared,Sentado|-|Sube las puntas de los pies manteniendo los talones apoyados.
Plancha|Core|Hombro, glúteo|A|C,D|Frontal sobre antebrazos,Frontal con brazos estirados,Lateral,Pies elevados,RKC (máxima tensión)|-|Cuerpo en línea recta, glúteo y abdomen apretados. Aguanta por tiempo.
Crunch abdominal|Core||A|C,P,Q,D|Suelo,Banco declinado,Fitball,De rodillas en polea|Manos al pecho,Manos tras la nuca|Enrolla la columna acercando costillas a pelvis. No tires del cuello.
Elevación de piernas|Core|Flexores de cadera|A|C,M|Colgado,En silla romana,Tumbado,En banco|Rodillas flexionadas,Piernas rectas,Pies a la barra|Sin balanceo. Bascula la pelvis al final.
Rueda abdominal|Core|Dorsal|C|C,B|De rodillas,De pie|-|Abdomen apretado. Llega solo hasta donde no se hunda la zona lumbar.
Giro ruso|Core|Oblicuos|A|C,D,M,K|Pies en el suelo,Pies elevados|-|Gira el tronco, no solo los brazos.
Leñador (woodchop)|Core|Oblicuos|Au|P,G,M,D|De arriba abajo,De abajo arriba,Horizontal|-|Gira desde la cadera y el tronco con los brazos casi rectos.
Press Pallof|Core|Oblicuos|Au|P,G|De pie,Media rodilla,De rodillas|-|Extiende los brazos al frente y resiste la rotación.
Dead bug|Core||A|C,M,G|Tumbado boca arriba|-|Zona lumbar pegada al suelo. Brazo y pierna contrarios se alejan.
Bird dog|Core|Lumbar, glúteo|A|C|En cuadrupedia|-|Extiende brazo y pierna contrarios sin girar la cadera.
Bicicleta abdominal|Core|Oblicuos|A|C|Tumbado boca arriba|-|Codo hacia la rodilla contraria, sin prisa.
Hollow body|Core||A|C|Mantenido,Con balanceo|-|Zona lumbar pegada al suelo, brazos y piernas estirados.
Inclinación lateral|Core|Oblicuos|Au|M,K,P,D|De pie,Banco a 45°|-|Baja de lado sin inclinarte adelante ni atrás.
Dragon flag|Core||C|C|En banco|Rodillas flexionadas,Piernas rectas|Cuerpo rígido apoyado solo en los hombros. Baja muy lento.
Escaladores (mountain climbers)|Core|Cardio|C|C,T|Manos en el suelo,Manos elevadas|-|Cadera baja y estable, rodillas al pecho alternando.
Burpees|Cuerpo completo|Cardio|C|C,W|Estándar,Sin flexión,Con salto al cajón|-|Ritmo constante. Cae suave y mantén el abdomen firme.
Cargada (clean)|Cuerpo completo|Trapecio, piernas|C|B,M,K|De potencia,Completa,Colgante|-|Extiende cadera con fuerza y recibe con codos altos.
Arrancada (snatch)|Cuerpo completo|Hombro, piernas|C|B,M,K|De potencia,Completa,Colgante|-|La barra sube pegada al cuerpo y se recibe con brazos bloqueados.
Thruster|Cuerpo completo|Cuádriceps, hombro|C|B,M,K|De pie|-|Sentadilla frontal y, al subir, press sobre la cabeza en un solo gesto.
Levantamiento turco|Cuerpo completo|Hombro, core|C|K,M|Completo,Medio (hasta sentado)|-|Brazo vertical y mirada al peso en todo momento.
Salto al cajón|Cuerpo completo|Cuádriceps, gemelo|C|C,W|Cajón bajo,Cajón alto,Sentado previo|-|Aterriza suave con las rodillas flexionadas. Baja andando.
Trineo|Cuerpo completo|Piernas, cardio|C|Q|Empuje,Arrastre hacia delante,Arrastre hacia atrás|-|Torso inclinado y pasos potentes. Se mide por metros.
Cuerdas de batalla|Cuerpo completo|Hombro, cardio|C|C|Ondas alternas,Ondas simultáneas,Golpes al suelo|-|Rodillas flexionadas, tronco firme. Se mide por tiempo.
Lanzamiento de balón medicinal|Cuerpo completo|Core, hombro|C|D|Contra el suelo (slam),Contra la pared (wall ball),Lateral|-|Usa todo el cuerpo: cadera, tronco y brazos.
Comba|Cardio|Gemelo|C|C|Salto simple,Alterno,Dobles|-|Saltos bajos, las muñecas hacen el giro.
Remo en máquina (ergómetro)|Cardio|Espalda, piernas|C|Q|Ritmo continuo,Intervalos|-|Orden: piernas, tronco, brazos. Al volver, al revés.
Carrera en cinta|Cardio|Piernas|C|Q|Llano,Con pendiente,Intervalos|-|Se mide por tiempo o distancia.
Bicicleta estática|Cardio|Piernas|C|Q|Ritmo continuo,Intervalos,Bici de aire (assault)|-|Ajusta el sillín a la altura de la cadera.
Elíptica|Cardio|Piernas|C|Q|Ritmo continuo,Intervalos|-|Se mide por tiempo.
Escaladora|Cardio|Glúteo, piernas|C|Q|Ritmo continuo,Intervalos|-|No te cuelgues de los agarres.
`;
const slug=s=>s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const EJERCICIOS=RAW.trim().split('\n').map(l=>{const [n,g,sec,t,eq,pos,ag,cue]=l.split('|');return {id:slug(n),n,g,sec,comp:t[0]==='C',uni:t.includes('u'),eq:eq.split(',').map(c=>EQUIPOS[c]),pos:pos.split(','),ag:ag==='-'?['Estándar']:ag.split(','),cue};});
const GRUPOS=[...new Set(EJERCICIOS.map(e=>e.g))];
