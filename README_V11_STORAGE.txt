RVN Event Manager V11.0 – Dateispeicher

Neu:
- Firebase Storage für Einladungsplakat, Paddock-/Lageplan und weitere Infoanzeige
- Upload direkt im Adminbereich
- JPG, PNG, WEBP oder PDF bis 10 MB
- Archivmodus zeigt öffentlich nur das neutrale Grundgerüst
- Beim Vorbereiten einer neuen Veranstaltung können Medienverknüpfungen zurückgesetzt werden
- Dateien bleiben als Archiv im Storage erhalten, auch wenn die Verknüpfung entfernt wird

WICHTIG – einmalige Einrichtung in Firebase:
1. Firebase-Projekt auf Blaze (Pay as you go) umstellen. Cloud Storage ist seit 03.02.2026 nur damit nutzbar.
2. Firebase Console > Storage > Jetzt starten > Bucket anlegen.
3. Im Reiter Storage > Regeln den Inhalt aus storage.rules einfügen und veröffentlichen.
4. Firestore-Regeln aus firestore.rules separat im Firestore-Regelbereich veröffentlichen.
5. Projektdateien mit GitHub Desktop committen und pushen.

Sicherheit:
Der bestehende Adminzugang ist nur ein lokales Webseitenpasswort und keine Firebase Authentication. Deshalb kann Storage den Admin technisch noch nicht sicher erkennen. Die beigefügten Storage-Regeln sind eine zeitlich begrenzte Übergangslösung mit Dateityp- und Größenprüfung. Für die dauerhafte Version sollte Firebase Authentication für den Admin ergänzt werden.
