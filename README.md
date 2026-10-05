# Repes

App para controlar la rutina de gimnasio desde el iPhone, sin conexión: contador de repeticiones, biblioteca de ejercicios con variantes, rutinas e historial.

## Instalarla en el iPhone

1. Abre la dirección de GitHub Pages de este repositorio en **Safari**.
2. Compartir > **Añadir a pantalla de inicio**.
3. Ábrela una vez con conexión desde el icono. Desde entonces funciona sin internet.

Los datos (series y rutinas) se guardan solo en el iPhone. En Historial hay un botón para exportar una copia.
Úsala siempre desde el icono: lo que guardes en una pestaña de Safari no aparece en la app instalada.

## Cómo se actualiza

No hay ningún paso manual ni número de versión que cambiar.

1. Cualquier cambio que llegue a la rama `main` lo publica GitHub Pages en un par de minutos.
2. La próxima vez que abras la app con conexión, descarga los cambios en segundo plano y avisa.
3. Al cerrarla y volver a abrirla ya ves la versión nueva. En Historial aparece la fecha de la versión publicada.

## Archivos

| Archivo | Qué es |
|---|---|
| `index.html` | Pantalla y estilos |
| `exercises.js` | Biblioteca de ejercicios (una línea por ejercicio) |
| `app.js` | Lógica: contador, rutinas, historial |
| `sw.js` | Guardado sin conexión y actualización automática |
| `manifest.webmanifest`, `icon-*.png` | Nombre e icono en la pantalla de inicio |
