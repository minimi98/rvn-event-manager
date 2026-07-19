RVN EVENT MANAGER – VERSION 10.1

Fehlerbehebung gegenüber V10:
- ES-Module mit Versionskennung versehen, damit Browser und Service Worker keine gemischten V9/V10-Dateien laden.
- Export pageView in views.js geprüft.
- Service Worker auf Cache rvn-v10-1 aktualisiert.
- Alte Caches werden beim Aktivieren gelöscht.
- chrome-extension-Anfragen werden nicht mehr vom Service Worker verarbeitet.
- Service Worker wird mit updateViaCache: none registriert und sofort aktualisiert.

Installation:
1. Den Inhalt dieses Ordners in das frisch geklonte GitHub-Repository kopieren.
2. Vorhandene Dateien ersetzen.
3. In GitHub Desktop committen und pushen.
4. Die Webseite einmal mit Strg+Umschalt+R neu laden.

Firebase-/Firestore-Daten werden durch das Ersetzen der Projektdateien nicht gelöscht.
