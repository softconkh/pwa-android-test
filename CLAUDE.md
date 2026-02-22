# PWA Playground

Interaktive Progressive Web App zum Erkunden und Testen moderner Browser-APIs.

## Tech Stack

- Vanilla HTML/CSS/JS — kein Framework, keine Build-Tools
- Einzige externe Dependency: [html5-qrcode](https://github.com/mebjas/html5-qrcode) via CDN
- Service Worker mit Cache-First-Strategie
- Dark Glassmorphism UI

## Dateistruktur

| Datei | Zweck |
|---|---|
| `index.html` | Hauptseite mit allen Feature-Karten |
| `style.css` | Styling (Dark Theme, Glassmorphism, Animationen) |
| `app.js` | Gesamte App-Logik für alle Features |
| `sw.js` | Service Worker (Caching, Offline-Support) |
| `manifest.json` | Web App Manifest (Installierbarkeit) |
| `icons/` | SVG + PNG Icons (192x192, 512x512) |

## Features / Browser-APIs

1. **QR-Code Scanner** — MediaDevices API + html5-qrcode
2. **Geolocation** — Geolocation API
3. **Device Motion** — DeviceOrientation + DeviceMotion API (3D-Würfel)
4. **Kamera & Foto** — getUserMedia + Canvas
5. **Vibration** — Vibration API (verschiedene Muster)
6. **Notifications** — Notification API via ServiceWorkerRegistration
7. **Share** — Web Share API
8. **Clipboard** — Clipboard API
9. **Speech** — SpeechSynthesis + SpeechRecognition
10. **Netzwerk-Status** — NetworkInformation API
11. **Battery Status** — Battery Status API
12. **Offline & Cache** — Service Worker + Cache API
13. **Device Info** — Navigator + Screen API

## Wichtige Hinweise

- **Pfade**: Alle Asset-Pfade in `sw.js` und `manifest.json` sind relativ (`./`), da die App in einem Unterverzeichnis liegt (`/pwa-android-test/`)
- **Notifications**: Auf Mobile Chrome funktioniert nur `ServiceWorkerRegistration.showNotification()`, nicht `new Notification()`
- **Device Motion**: Fallback-Kette: DeviceOrientation → DeviceMotion (Accelerometer) → Touch-Steuerung
- **Cache-Versionierung**: Bei Änderungen an `app.js` muss die Version im `<script>`-Tag (`app.js?v=X`) UND in `sw.js` (`ASSETS`-Array) hochgezählt werden, sowie `CACHE_NAME` aktualisiert werden
- **Icons**: PNG-Icons werden über `generate-icons.html` aus dem SVG erzeugt (einmalig im Browser öffnen)

## Lokale Entwicklung

- Läuft über Laragon: `http://pwa-android-test.test`
- Für Mobiltest via ngrok: `ngrok http 80` → HTTPS-URL am Handy öffnen
- HTTPS ist nötig für: Service Worker, Notifications, Kamera, Install-Prompt

## Git

- Autor: SOFTCON Digital Solutions Partner <agentur@softcon.at>
