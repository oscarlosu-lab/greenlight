# Greenlight — Edición Windows (`oscarlosu-lab/greenlight`)

> **[Read in English (README.md)](README.md)** · **[Web Oficial (Diseño Xbox Gaming)](https://oscarlosu-lab.github.io/greenlight/)**

[![Release](https://img.shields.io/github/v/release/oscarlosu-lab/greenlight?style=flat-square&color=107c10&label=Release)](https://github.com/oscarlosu-lab/greenlight/releases/latest)
[![Downloads](https://img.shields.io/github/downloads/oscarlosu-lab/greenlight/total?style=flat-square&color=4ade80&label=Descargas)](https://github.com/oscarlosu-lab/greenlight/releases)
[![Platform](https://img.shields.io/badge/Plataforma-Windows%2010%20%2F%2011-0078D6?style=flat-square&logo=windows)](https://github.com/oscarlosu-lab/greenlight/releases/latest)
[![Electron](https://img.shields.io/badge/Electron-45.3.4-47848F?style=flat-square&logo=electron)](packages/desktop/package.json)
[![License](https://img.shields.io/github/license/oscarlosu-lab/greenlight?style=flat-square)](LICENSE)
[![Ko-fi](https://img.shields.io/badge/Ko--fi-Support%20Project-FF5E5B?style=flat-square&logo=ko-fi&logoColor=white)](https://ko-fi.com/oscarlosu)

**Greenlight Edición Windows** es el cliente open-source para **Xbox Cloud Gaming (xCloud)** y **Xbox Remote Play** en **Windows 10 / Windows 11** y consolas portátiles PC (**ASUS ROG Ally**, **Lenovo Legion Go**, **MSI Claw**), construido con TypeScript, Electron 45 y [`xbox-xcloud-player`](https://github.com/unknownskl/xbox-xcloud-player).

> [!IMPORTANT]
> **Fork mantenido exclusivamente para Windows PC (por delante del upstream `unknownskl/greenlight v2.4.2`)**
> Este repositorio está centrado en **Windows PC** y consolida **~100 mejoras** sobre `v2.4.2` — incluyendo **streaming 1440p**, selector **HEVC (H.265) / AV1**, **Clarity Boost**, calidad en red local (LAN), **contador real de FPS arrastrable**, multi-cuenta cifrada con **DPAPI**, **cooperativo local de 4 mandos** y **Electron 45**. Tanto las releases como el actualizador integrado apuntan a [`oscarlosu-lab/greenlight`](https://github.com/oscarlosu-lab/greenlight/releases).

_AVISO: Greenlight no está afiliado con Microsoft, Xbox ni Moonlight. Todas las marcas pertenecen a sus respectivos propietarios._

---

## Qué aporta frente al upstream (`v2.5.1` vs `unknownskl v2.4.2`)

| Área | Novedades sobre `unknownskl v2.4.2` |
|---|---|
| **Calidad LAN y Códecs** | Ruta ICE UDP `host`-first en IPv4 privada + respaldo TCP, receptores WebRTC de baja latencia (`playoutDelayHint=0`, `contentHint='motion'`), selector **720p / 1080p / 1440p**, fix de bitrate (`0` = sin tope SDP), selector **H.264 / HEVC (`H.265`) / AV1** con respaldo H.264 High y `video/rtx`/`red`/`ulpfec` intactos, **Clarity Boost** (nitidez GPU) y prioridad `ABOVE_NORMAL` en Windows. |
| **Auth y Seguridad** | Cifrado de tokens con **Windows DPAPI (`safeStorage`, `enc:v1:`)**, auto-refresh **401** automático en streams y *Mis Consolas*, **Multi-Cuenta**, login en navegador con `?otc=` prellenado, **código QR Microsoft**, **Multi-Instancia** aislada (`--profile=<nombre>`), fixes SonarCloud, Actions fijadas por SHA y Express 5 Web UI corregida. |
| **Entrada y Co-op** | `CompactGamepadDriver` (mandos estándar primero, hotplug, vibración, parada limpia del bucle 60 Hz), **Cooperativo Local** opt-in (hasta 4 mandos), **Touch Overlay** opt-in (*Estándar / Carreras / Mínimo*), **Remapeo personalizado de botones**, exclusividad Ratón/Teclado + sensibilidad + `Esc` = Home / `Shift+Esc` = `Esc`, navegación por mando y foco/ARIA en barra. |
| **UX de Stream y Diagnóstico** | **HUD FPS real arrastrable en verde 36px** (`<fps>FPS` por WebRTC `framesPerSecond`, `z-index: 100`, posición guardada), **Capturas PNG** instantáneas (`p` o botón cámara), **Chat / teclado virtual in-game** (`ShowVirtualKeyboard` / `ShowMessageDialog`), botón ocultar/mostrar vídeo, `StreamDebug` bajo demanda, `stream-path.log` con rotación 5 MB y ventanas **`chrome://gpu`** + **`chrome://webrtc-internals`**. |
| **Audio, Biblioteca e Idiomas** | Selector en vivo de **salida de audio (`setSinkId`) y micrófono**, botones **Encender / Apagar / Actualizar** consolas, biblioteca xCloud resiliente con filtro **Game Pass** y búsqueda con debounce, **Discord Rich Presence** opt-in, **13 idiomas** (7 nuevos + autodetección del sistema + diálogos nativos traducidos) y **Electron `45.3.4`**. |

Consulta [CHANGELOG.md](CHANGELOG.md) y [la web del proyecto](https://oscarlosu-lab.github.io/greenlight/) para el detalle completo.

---

## Instalación (Windows)

- **Instalador / ZIP portable**: Descarga `Greenlight Setup 2.5.1.exe` o `Greenlight-2.5.1-win.zip` en [Releases](https://github.com/oscarlosu-lab/greenlight/releases).
- **Compilar desde el código fuente**: consulta [Desarrollo local](#desarrollo-local).

---

## Atajos durante el stream

| Tecla / Atajo | Acción |
|---|---|
| `~` | Mostrar / ocultar panel de estadísticas de depuración |
| `p` | Guardar captura PNG en `Imágenes\Greenlight` |
| `Esc` (en pointer lock M&K) | Pulsar botón Xbox Home (Nexus) |
| `Shift + Esc` (en pointer lock M&K) | Enviar tecla `Esc` al juego |
| `N`, `V`, `M`, `A/B/X/Y`, `[` `]`, `-` `=` | Controles por defecto de Teclado a Mando (configurables en *Ajustes → Entrada*) |

---

## Argumentos opcionales de arranque

| Argumento | Descripción |
|---|---|
| `--fullscreen` | Inicia Greenlight en pantalla completa |
| `--connect=<valor>` | Inicia el stream tras autenticar (`F000000000000000` para consola, `xcloud_<título>` para xCloud) |
| `--profile=<nombre>` | Lanza una instancia simultánea aislada (`userData` + `tokenstore` cifrado en `profiles/<nombre>`) |
| `--console=<id>` | Asigna el ID de consola objetivo al título de la ventana y al IPC |

---

## Desarrollo local

### Requisitos
- Node.js 24 (`node -v`)
- Yarn 1.22 (`yarn -v`)

### Pasos
```bash
git clone https://github.com/oscarlosu-lab/greenlight.git
cd greenlight
yarn
yarn desktop dev
```

Verificación y build de producción en Windows:
```bash
yarn desktop lint
yarn desktop typecheck
yarn desktop test:xcloud
yarn desktop test:sanitizers
yarn desktop build
```
