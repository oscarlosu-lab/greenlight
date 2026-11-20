# Changelog

## v2.5.1 (2026-11-21) — Hotfix
- **FPS & Metrics HUD visibility**: raised `#component_streamcomponent_fps_overlay` `z-index` to `100` (above `#streamComponent video` at `96`) and positioned at `top: 78px` below the stream toolbar so it is always visible when enabled.

## v2.5.0 (2026-11-20) — Windows Edition (Ahead of Upstream `v2.4.2`)

First consolidated Windows PC release of `oscarlosu-lab/greenlight`, integrating ~100 improvements on top of `unknownskl/greenlight` `v2.4.2` (`baa4072`) including LAN quality, codec resilience, security hardening, and Windows stability fixes.

### Streaming & LAN Image Quality
- **LAN Remote Play optimization**: private-IPv4 `host`-first UDP ICE sorting with TCP fallback, `playoutDelayHint = 0` / `jitterBufferTarget = 0`, `track.contentHint = 'motion'`, Windows process priority (`PRIORITY_ABOVE_NORMAL` during stream, restored to `PRIORITY_NORMAL` on exit), and `powerSaveBlocker`.
- **Video Codec Selection + Resilience**: choose `H.264` (default), `HEVC / H.265` (`WebRtcAllowH265Receive`), or `AV1` directly on the video transceiver (`applyVideoCodecPreferences`), always keeping H.264 High (`4d`) / Main (`42e`) / Baseline (`420`) fallback and `video/rtx`, `video/red`, `video/ulpfec` retransmission/FEC.
- **Bitrate & Resolution**: fixed bitrate ternary precedence (`0` = no SDP cap for both xCloud and xHome) and added **720p / 1080p / 1440p** stream resolution selector.
- **Clarity Boost (GPU SVG Sharpening)**: opt-in `0.0–1.0` real-time 3×3 unsharp-mask `feConvolveMatrix` video filter.
- **Stream Toolbar & Diagnostics**: on-demand `StreamDebug` stats, `stream-path.log` with 5 MB rotation and live codec/fps/loss/nack/bytes logging, PNG screenshot capture (`p` or camera button, validated PNG header + 32 MiB cap), hide/show video toggle, and sandboxed `chrome://gpu` & `chrome://webrtc-internals` windows in *Settings → Debug*.

### Auth, Security & Multi-Account
- **Windows DPAPI Token Encryption**: encrypts `user.tokenstore` and multi-account tokens via Electron `safeStorage` (`enc:v1:`), deferred safely until `app.whenReady()` with tolerant fallback (never crashes or overwrites unreadable tokens).
- **Auto-Refresh on 401**: automatic Xbox & Web API token refresh (`tokenrefresh.ts`) for streams and *My Consoles* (including power commands) + non-crashing Retry card when a session expires.
- **Multi-Account & Multi-Instance**: save and switch multiple Microsoft accounts, prefilled `?otc=` browser sign-in, scannable Microsoft QR login, and isolated concurrent instances via `--profile=<name>` / `--console=<id>` (rejecting path traversal and Windows reserved device names `CON`/`NUL`/etc.).
- **Security & Leak Hardening**: SonarCloud vulnerability/reliability fixes, all GitHub Actions pinned to 40-char SHAs, public `yarn.lock` registry URLs, sequential crypto IPC/WS IDs, Express 5 Web UI fix, and Jest Sanitizer leak fixes across 28 files.

### Input, Audio, UI & Localization
- **Gamepads & Local Co-op**: `CompactGamepadDriver` (standard controllers prioritized as Player 1, hotplug, vibration fix, clean 60 Hz loop stop), opt-in **Local Co-op** (up to 4 controllers), **Touch Overlay** opt-in (*Standard / Racing / Minimal* presets, suppressed when a physical pad is connected), and **Custom Gamepad Button Remapping**.
- **Mouse & Keyboard + Accessibility**: mutual exclusivity with Keyboard-to-Gamepad, mouse sensitivity slider (`1–100%`), hidden toolbar in pointer lock, `Esc` = Xbox Home / `Shift+Esc` = `Esc`, and ARIA/keyboard focus support on the stream toolbar.
- **In-Game Text Entry & Dialogs**: handles `ShowVirtualKeyboard` and `ShowMessageDialog` overlays with pointer-lock release.
- **Audio I/O**: live output (`setSinkId`) and microphone device selector with safe promise handling.
- **Consoles, xCloud, Discord & i18n**: Power On/Off/Refresh buttons on *My Consoles*, resilient xCloud library with Game Pass filter + 250 ms debounce, opt-in zero-dependency **Discord Rich Presence**, **13 languages** (7 new locales + `es-ES.json` with legacy `Greenlight_Spanish` migration + system language auto-detect + translated main-process dialogs).
- **Runtime**: updated Electron from `43.2.0` to `45.3.4` and pointed the built-in auto-updater to `oscarlosu-lab/greenlight`.
