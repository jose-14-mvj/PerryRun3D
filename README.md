# 🦆 Perry Runner 3D · Portal

Portal web del videojuego **Perry Runner 3D** (endless runner 3D hecho en Unity). Proyecto de **Game Development · Unidad 2** — equipo **Los Pato Locos**.

▶️ **Jugar online:** https://jose-14-mvj.github.io/PERRYRUN/

## ✨ Qué incluye el portal

| Sección | Interactividad |
|---|---|
| **Inicio** | Arte con parallax 3D al mover el mouse, partículas que reaccionan al cursor, texto que se escribe, contadores animados |
| **Historia** | Línea de 4 pasos con imágenes, autoplay, botones anterior/siguiente |
| **Personaje** | Pines clicables (sombrero, pico, chaqueta, cola, patas) y las 4 animaciones de Perry |
| **Mecánicas** | Teclas que se iluminan al presionarlas, **demo automática de Perry** (corre, salta y se desliza solo, en pseudo-3D), tarjetas que se voltean |
| **Datos** | Simulador de partida, gráfica velocidad–tiempo arrastrable, anillos animados |
| **Galería** | Filtros, lightbox con flechas del teclado y gesto de deslizar |
| **Jugar** | Cabina con portada animada que carga tu build de Unity WebGL (`juego/`), pantalla completa y atajos de teclado |
| **Logros** | 8 logros que se guardan en el navegador |

## 📁 Estructura
```
PERRYRUN/
├── index.html
├── css/styles.css        Estilos
├── js/main.js            Interacciones del portal
├── js/demo.js            Demo automática de Perry (Canvas 2D, funciona en cualquier equipo)
├── assets/               Imágenes
└── juego/                Build WebGL de Unity (index.html, Build/, TemplateData/)
```

## ▶️ Probar en tu computadora
```
python -m http.server 8000
```
y abre http://localhost:8000

## 🚀 Publicar el build de Unity
1. Unity: **File → Build Profiles → Web → Build** (con *Compression Format = Disabled*).
2. Copia `index.html`, `Build/` y `TemplateData/` dentro de `juego/`.
3. `git add . && git commit -m "Actualizar" && git push`

Al pulsar **JUGAR**, el portal carga `juego/index.html` dentro de la cabina. Si todavía no existe, muestra un aviso con lo que falta.

## 👥 Equipo
**Los Pato Locos** — Mijhail Alvaro Vichini Fernandez · Mario Macuchapi Villa
