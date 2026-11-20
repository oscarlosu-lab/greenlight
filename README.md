# Greenlight — Windows Edition (`oscarlosu-lab/greenlight`)

> **[Leer en español (README_ES.md)](README_ES.md)**

[![Ko-fi](https://img.shields.io/badge/Ko--fi-Support%20Project-FF5E5B?style=flat-square&logo=ko-fi&logoColor=white)](https://ko-fi.com/oscarlosu)

**Greenlight** is an open-source client for **Xbox Cloud Gaming (xCloud)** and **Xbox Home Streaming (Remote Play)** built with TypeScript, Electron, and [`xbox-xcloud-player`](https://github.com/unknownskl/xbox-xcloud-player).

> [!IMPORTANT]
> **Windows-Only Maintained Fork (Ahead of Upstream `unknownskl/greenlight v2.4.2`)**
> This fork targets **Windows PC** exclusively and consolidates **~100 improvements** on top of upstream `v2.4.2` — including LAN streaming quality, codec resilience, security hardening, multi-account DPAPI encryption, and modern Electron 45. Releases and the built-in updater point directly to [`oscarlosu-lab/greenlight`](https://github.com/oscarlosu-lab/greenlight/releases).

_DISCLAIMER: Greenlight is not affiliated with Microsoft, Xbox, or Moonlight. All rights and trademarks belong to their respective owners._

---

## Ahead of Upstream (`v2.5.0` vs `unknownskl v2.4.2`)

| Area | What this fork adds over upstream `v2.4.2` |
|---|---|
| **LAN Quality & Codecs** | Private-IPv4 `host`-first UDP ICE sorting + TCP fallback, low-latency WebRTC receivers (`playoutDelayHint=0`, `contentHint='motion'`), **720p / 1080p / 1440p** selector, unlimited bitrate fix (`0` = no SDP cap), **H.264 / HEVC (`H.265`) / AV1** codec selector with H.264 High fallback + `video/rtx`/`red`/`ulpfec` preserved, **Clarity Boost** GPU sharpening, and Windows `ABOVE_NORMAL` stream priority. |
| **Auth & Security** | **Windows DPAPI (`safeStorage`)** token encryption (`enc:v1:`), automatic **401 token refresh** for streams and *My Consoles*, **Multi-Account** switcher, prefilled `?otc=` browser login, scannable **Microsoft QR login**, isolated **Multi-Instance** profiles (`--profile=<name>`), SonarCloud fixes, SHA-pinned CI workflows, and Express 5 Web UI fix. |
| **Input & Co-op** | `CompactGamepadDriver` (standard pads prioritized first, hotplug, vibration, clean loop stop), opt-in **Local Co-op** (up to 4 pads), opt-in **Touch Overlay** (*Standard / Racing / Minimal*), **Custom Button Remapping**, M&K mutual exclusivity + sensitivity slider + `Esc` = Xbox Home / `Shift+Esc` = `Esc`, gamepad UI navigation, and toolbar ARIA/keyboard focus. |
| **Streaming UX & Diagnostics** | Instant **PNG Screenshots** (`p` / camera button), **In-Game Text Entry & Dialogs** (`ShowVirtualKeyboard` / `ShowMessageDialog`), hide/show video toggle, on-demand `StreamDebug`, `stream-path.log` with 5 MB rotation, and **`chrome://gpu`** + **`chrome://webrtc-internals`** diagnostic windows. |
| **Audio, Library & i18n** | Live **Audio Output (`setSinkId`) & Microphone** selector, Console **Power On/Off/Refresh** buttons, resilient xCloud library with **Game Pass** filter + 250 ms debounce, opt-in **Discord Rich Presence**, **13 languages** (7 new locales + auto system language + translated native dialogs), and **Electron `45.3.4`**. |

See [CHANGELOG.md](CHANGELOG.md) for the full `v2.5.0` breakdown.

---

## Install (Windows)

- **Installer / Portable ZIP**: Download `Greenlight Setup 2.5.0.exe` or `Greenlight-2.5.0-win.zip` from [Releases](https://github.com/oscarlosu-lab/greenlight/releases).
- **Compile from source**: see [Local Development](#local-development).

---

## Keyboard & Stream Shortcuts

| Key / Shortcut | Action |
|---|---|
| `~` | Toggle on-demand Debug stats panel |
| `p` | Capture PNG screenshot to `Pictures\Greenlight` |
| `Esc` (M&K pointer lock) | Press Xbox Home (Nexus) button |
| `Shift + Esc` (M&K pointer lock) | Send `Esc` key to the game |
| `N`, `V`, `M`, `A/B/X/Y`, `[` `]`, `-` `=` | Default Keyboard-to-Gamepad bindings (configurable in *Settings → Input*) |

---

## Optional Launch Arguments

| Argument | Description |
|---|---|
| `--fullscreen` | Starts Greenlight in fullscreen mode |
| `--connect=<value>` | Auto-starts stream after auth (`F000000000000000` for console, `xcloud_<title>` for xCloud) |
| `--profile=<name>` | Launches an isolated concurrent instance (`userData` + encrypted `tokenstore` under `profiles/<name>`) |
| `--console=<id>` | Sets the target console ID for the instance window title and IPC |

---

## Local Development

### Requirements
- Node.js 24 (`node -v`)
- Yarn 1.22 (`yarn -v`)

### Steps
```bash
git clone https://github.com/oscarlosu-lab/greenlight.git
cd greenlight
yarn
yarn desktop dev
```

Run checks & production Windows build:
```bash
yarn desktop lint
yarn desktop typecheck
yarn desktop test:xcloud
yarn desktop test:sanitizers
yarn desktop build
```
