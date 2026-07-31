RVN Event Manager 10.13.0

- Aktuelle Veranstaltung wird einmalig archiviert.
- Helfer-, Stations-, Meldestellen- und Springerzugänge sind im Archivmodus deaktiviert.
- Admin behält vollständigen Zugriff.
- Admin kann Veranstaltung reaktivieren.
- Neue Veranstaltung kann mit wenigen Klicks vorbereitet werden.
- Stationen und Aufgaben bleiben als Vorlage erhalten.
- Teilnehmer, Punkte, Meldungen und Helfer können optional zurückgesetzt werden.
- Punktegrenze pro Station: maximal 200.
- Admin kann Punkte für jede Station manuell eintragen und korrigieren.
- firestore.rules enthält eine kompatible Übergangsregel bis 31.12.2027.

Hinweis: Ohne Firebase Authentication kann Firestore die Adminrolle nicht sicher erkennen. Die enthaltenen Regeln sind daher eine zeitlich begrenzte Übergangslösung.
