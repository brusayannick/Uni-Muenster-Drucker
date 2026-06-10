# Print Map Münster

Interaktive Karte der Druckerstandorte in Münster — Leaflet-Frontend, Daten aus einer SQLite-Datenbank.

## Architektur

Die App läuft auf Vercel als **rein statische Seite**: Das Frontend lädt die Druckerdaten aus einer vorab erzeugten Datei (`public/data/printers.json`) und macht Filter, Suche und Statistik clientseitig. Es gibt im Produktivbetrieb **keinen Server und keine Datenbank** — daher auch keine Schreibfunktion live.

SQLite (`printers.db`) ist die lokale Datenquelle für die Pflege der Daten.

## Lokale Entwicklung

```bash
npm install
npm run dev        # Express-Server inkl. Schreib-API auf http://localhost:3000
```

Lokal läuft der volle Express-Server (`server.js`) mit Lese- und Schreib-Endpunkten gegen `printers.db`.

## Daten pflegen & veröffentlichen

1. Daten lokal ändern (über die lokale API, direkt in `printers.db` oder via `npm run seed` / `npm run geocode`).
2. Statische Datei neu erzeugen:
   ```bash
   npm run export   # schreibt public/data/printers.json
   ```
3. Committen und pushen — Vercel deployt automatisch.

> `export.js` exportiert standardmäßig **alle** Felder. Um sensible Felder (z. B. `email`, `contact_name`, `hostname`, `serial_number`) aus der öffentlichen Datei herauszuhalten, trage sie in `OMIT_FIELDS` in `export.js` ein und führe `npm run export` erneut aus.

## Deployment (Vercel)

Repo in Vercel importieren — `vercel.json` konfiguriert die Seite als statisch (`outputDirectory: public`). Kein Build-Schritt, keine Umgebungsvariablen nötig. Jeder Push auf `main` löst ein Redeploy aus.
