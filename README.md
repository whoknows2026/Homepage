# Who Knows? — Band-Website

Statische, mobile-first Website für eine sechsköpfige Rock-/Blues-/Country-Band.
Kein Build-Schritt nötig — läuft direkt auf GitHub Pages. Gebaut mit Tailwind
CSS (CDN), Vanilla-JavaScript und Firebase für Admin-Login, Anfragen,
Bewertungen und Statistik. Farb- und Typografie-Konzept ist
an das Bandlogo angelehnt (gealtertes Papier, Tinten-Schwarz, Siegel-Rot,
Messing-Gold).

## Projektstruktur

```
├── index.html              Hauptseite (Hero, Band, Termine, Galerie, Player, Bewertungen, Buchungs-Modal)
├── admin.html               Admin-Login + Dashboard (Statistik, Buchungen, Bewertungen, Termine, Playlist)
├── robots.txt                schließt admin.html von Suchmaschinen aus, verweist auf sitemap.xml
├── sitemap.xml               Sitemap für Suchmaschinen (Adresse vor Livegang eintragen)
├── .nojekyll                verhindert, dass GitHub Pages Jekyll-Verarbeitung anwendet
├── assets/
│   ├── css/style.css        Design-Tokens (Farben/Fonts), Komponenten, Animationen
│   ├── js/
│   │   ├── main.js           Navigation, Player, Galerie/Lightbox, Termine, Formulare, Bewertungen
│   │   ├── admin.js           Dashboard-Logik (Login, Statistik, Listen, Freigabe/Löschen, CSV-Export)
│   │   ├── setlist.js         Admin → Setlisten (Editor, Repertoire, PDF-Export im Bühnen-Design)
│   │   └── firebase-config.js  <- HIER eure Firebase-Zugangsdaten eintragen (siehe Abschnitt 9)
│   ├── docs/
│   │   └── who-knows-presskit.pdf  Presse-/Booking-Info, verlinkt im Footer
│   ├── img/
│   │   ├── logo.png          Euer Band-Logo (bereits eingebunden)
│   │   ├── logo-badge.png     Quadratisch zugeschnittene Variante fürs runde Header-Badge
│   │   ├── logo-watermark*.png  Freigestellte Varianten (Hero-Wasserzeichen, Ladebildschirm)
│   │   ├── favicon*.png/.ico   Browser-Tab-Icons, aus dem Logo erzeugt
│   │   ├── apple-touch-icon.png  Icon fürs Speichern auf dem iPhone-Homescreen
│   │   ├── band/               Porträtfotos der Mitglieder (Marie fehlt noch)
│   │   ├── logos/               <- HIER Location-/Festival-Logos ablegen
│   │   ├── gallery/              4 echte Fotos bereits eingebunden, siehe Abschnitt 2
│   │   └── hero/                 Hintergrundfoto des Hero-Bereichs (hero-bg.jpg)
│   └── audio/                 <- HIER eure MP3-Dateien ablegen
```

## 1) Logo austauschen (optional)

Euer Logo ist bereits eingebunden — im Header als großes rundes Badge
(`assets/img/logo-badge.png`, 64×64 px) und zusätzlich groß im Hero-Bereich
(`assets/img/logo.png`). Wollt ihr später ein neues Logo einsetzen:

1. Neue Logo-Datei unter `assets/img/logo.png` ablegen (ersetzt die alte).
2. Für ein sauberes rundes Header-Badge zusätzlich einen quadratischen
   Ausschnitt als `assets/img/logo-badge.png` speichern (z. B. mit einem
   Bildbearbeitungsprogramm auf die Kreis-Mitte zuschneiden). Ist das Logo
   bereits quadratisch, könnt ihr dieselbe Datei für beide Pfade nutzen.
3. Größe des Header-Logos anpassen: in `index.html` im `<header>` beim
   `<img … alt="Who Knows? Logo" class="h-16 w-16 …">` die Werte `h-16 w-16`
   ändern (z. B. `h-20 w-20` für noch größer). Passt bei Bedarf auch die
   Höhe der Nav-Leiste an (`h-20` in der Zeile direkt darüber).

## 2) Bildergalerie befüllen

> **Einfacher geht es über den Admin-Bereich** — siehe Abschnitt 4c
> („Galerie & Videos pflegen"). Dort verwaltet ihr Bildunterschrift,
> Kachelgröße und Reihenfolge, ohne Code anzufassen. Der folgende Weg
> beschreibt die fest im HTML eingebauten Fotos, die angezeigt werden,
> solange im Admin-Bereich noch nichts gepflegt ist.

Vier eurer Fotos sind bereits fest eingebunden (Bühnenfotos + Bandfoto). So
tauscht ihr sie aus oder ergänzt weitere:

1. Fotos (JPG/WebP, idealerweise komprimiert) unter `assets/img/gallery/`
   ablegen.
2. In `index.html` im Abschnitt `<section id="galerie">` bei der passenden
   Kachel den Pfad in `data-img="assets/img/gallery/…"` **und** im
   `<img src="…">` darunter auf eure Datei anpassen, `data-caption="…"` mit
   einer Bildunterschrift versehen.
3. Für weitere Fotos einfach einen zusätzlichen
   `<button class="gallery-item" data-img="…" data-caption="…"><img src="…" alt="…" loading="lazy" /></button>`-Block
   nach dem bestehenden Muster ergänzen — die Lightbox (Klick zum Vergrößern,
   Pfeiltasten/Buttons zum Blättern) erkennt neue Kacheln automatisch.

Die letzten beiden Kacheln sind noch offene Platzhalter (Kamera-Symbol) für
eure nächsten Auftrittsfotos — Pfad und `<img>` nach demselben Muster
ergänzen, sobald ihr weitere Fotos habt.

> **Hinweis zu einem Upload:** Eine der fünf ursprünglich hochgeladenen
> Dateien kam beschädigt/unvollständig an und ließ sich nicht auslesen
> (vermutlich ein Übertragungsfehler beim Hochladen). Die vier anderen Fotos
> sind einwandfrei eingebunden. Falls ihr ein fünftes, eigenständiges Foto
> ergänzen wolltet, einfach erneut hochladen.

## 3) Bandfotos & Texte anpassen

Alle sechs Mitglieder-Karten befinden sich im Abschnitt `<section id="band">`
in `index.html`. Vier Mitglieder haben schon ein echtes Foto (Raffa, Tim,
Nik, Uli); Marie und Tobi sind noch Platzhalter.

Für ein neues oder fehlendes Foto:
1. Datei unter `assets/img/band/` ablegen (z. B. `marie.jpg`).
2. Beim jeweiligen Mitglied den Platzhalter-`<div class="member-photo">`
   durch folgendes ersetzen (Kommentar an der Stelle vorhanden):
   ```html
   <div class="member-photo w-full aspect-[4/5] rounded-md mb-5 overflow-hidden flex items-center justify-center">
     <img src="assets/img/band/marie.jpg" alt="Porträt von Marie" class="w-full h-full object-contain" />
   </div>
   ```
   Wichtig: `object-contain` (nicht `object-cover`) verwenden — dadurch wird
   das Foto nie beschnitten, die Person ist immer komplett zu sehen, auch
   bei sehr hochkantigen Fotos. Der dunkle Kachel-Hintergrund füllt dabei
   automatisch den Rand links/rechts bzw. oben/unten auf, alle Kacheln
   bleiben so gleich groß (Seitenverhältnis 4:5), unabhängig vom
   Seitenverhältnis des Originalfotos.
3. Name, Rolle und Text direkt im HTML anpassen.

Location-Logos funktionieren nach demselben Prinzip (Abschnitt „Schon
aufgetreten bei“). Die Bewertungen selbst sind komplett dynamisch — dort
gibt es nichts mehr manuell im HTML zu bearbeiten: Sobald jemand das
Bewertungsformular auf der Seite ausfüllt und ihr die Bewertung im
Admin-Bereich freigebt (siehe Abschnitt 9), erscheint sie automatisch bei
„Das sagt ihr über uns“. Ist noch keine einzige Bewertung freigegeben,
zeigt die Seite stattdessen automatisch den Hinweis, dass aktuell noch
keine Bewertungen vorhanden sind.

## Hero-Hintergrundbild & Logo-Wasserzeichen ändern

Der große Bühnenbereich ganz oben zeigt das Bandshooting-Foto (Hot Rod vor
der alten Fabrikhalle) als Hintergrund (`assets/img/hero/hero-bg.jpg`), mit
einem abgedunkelten Verlauf in den Marken-Farben darüber, damit der Text
lesbar bleibt. Oben rechts liegt zusätzlich eine freigestellte, halb-
transparente Version des Logos wie ein Bühnen-Stempel über dem Foto
(`assets/img/logo-watermark.png` — nur die Tinten-Zeichnung, ohne den
gealterten Papier-Hintergrund).

- **Anderes Hintergrundfoto verwenden:** neue Datei unter demselben Pfad
  `assets/img/hero/hero-bg.jpg` ablegen (mindestens 1600 px breit
  empfohlen), fertig.
- **Bildausschnitt anpassen:** in `index.html` beim Hero-`<img>` steuert
  `object-[center_18%]` (Tailwind-Klasse) welcher Bereich des Fotos
  bevorzugt sichtbar bleibt, wenn das Bild zugeschnitten wird — z. B. auf
  `object-[center_10%]` ändern, um mehr vom oberen Bildbereich zu zeigen.
- **Farbverlauf/Abdunklung anpassen:** in `assets/css/style.css` im
  Abschnitt „HERO“ die Klasse `.hero-overlay`.
- **Logo-Wasserzeichen anpassen:** beim zweiten `<img>` im Hero (kurz nach
  dem Hintergrundfoto) über `w-[…%]` die Größe und über `opacity-40` die
  Deckkraft ändern. Auf Smartphones ist es standardmäßig ausgeblendet
  (`hidden sm:block`), damit der Titel dort nicht zu voll wirkt — bei Bedarf
  einfach `hidden` aus der Klasse entfernen.
- **Neues Logo freistellen:** Falls ihr später ein neues Logo als
  Wasserzeichen nutzen wollt, braucht ihr eine Version mit transparentem
  Hintergrund (nur die Zeichnung, kein Papier/Rahmen). Das geht z. B. mit
  einem Bildbearbeitungsprogramm (Zauberstab-/Hintergrund-entfernen-
  Werkzeug) oder Online-Tools wie remove.bg — Ergebnis unter
  `assets/img/logo-watermark.png` ablegen.

## 4) Songs zum Player hinzufügen

**Sobald Firebase eingerichtet ist (Abschnitt 9), geht das bequem über den
Admin-Bereich** unter „Playlist“: Titel, Dauer und Dateiname eintragen,
fertig — erscheint automatisch auf der Seite. Die MP3-Datei selbst muss
trotzdem manuell hochgeladen werden (siehe Schritt 1 unten); der
Admin-Bereich kann auf einer GitHub-Pages-Seite keine Dateien annehmen,
nur die Titel-Liste verwalten.

Alternativ (oder ohne Firebase) direkt im Code:
1. MP3-Datei unter `assets/audio/` ablegen (z. B. `05-neuer-song.mp3`).
2. In `assets/js/main.js` im Array `playlist` einen neuen Eintrag ergänzen:
   ```js
   {
     title: "Neuer Song",
     duration: "3:30",
     src: "assets/audio/05-neuer-song.mp3",
   },
   ```
   Der Player baut die Track-Liste automatisch aus diesem Array auf — kein
   weiteres HTML nötig. Diese Liste ist außerdem der Startzustand, solange
   im Admin-Bereich noch keine eigene Playlist gepflegt wurde.

**Hinweis zu Dateigrößen:** GitHub (und GitHub Pages) begrenzen einzelne
Dateien auf 100 MB und empfehlen Repositories unter ~1 GB. MP3s in guter
Qualität (192–256 kbps) sind normalerweise unproblematisch. Bei vielen/langen
Tracks ggf. [Git LFS](https://git-lfs.com/) in Betracht ziehen oder die Songs
extern hosten (z. B. SoundCloud-Embed) statt lokal im Repo.

## 4b) Auftrittsorte pflegen ("Schon aufgetreten bei")

Sobald Firebase eingerichtet ist, verwaltet ihr diesen Bereich komplett
über den Admin-Bereich unter „Auftrittsorte“ — Name eingeben, auf
„Hinzufügen“ klicken, erscheint sofort auf der Homepage. Löschen funktioniert
per Klick auf das kleine „×“ neben dem Namen im Admin-Bereich. Ohne
Firebase-Konfiguration (oder solange dort noch kein einziger Ort gepflegt
wurde) bleiben die vier fest hinterlegten Beispiel-Orte im HTML sichtbar
(Abschnitt `<section id="venues-section">` in `index.html`, dort auch
manuell änderbar).

## 4c) Galerie & Videos pflegen

Beides liegt im Admin-Bereich unter **„Galerie & Videos"**.

**Live-Videos — funktioniert komplett über den Admin-Bereich:**
Einfach den YouTube-Link einfügen (alle gängigen Formate werden erkannt:
`youtube.com/watch?v=…`, `youtu.be/…`, Shorts-Links oder die Video-ID
allein), optional einen Titel dazu. Der Video-Bereich auf der Homepage
erscheint automatisch, sobald mindestens ein Video hinterlegt ist, und
verschwindet wieder, wenn ihr alle löscht. Eingebunden wird über
`youtube-nocookie.com`, damit YouTube erst beim Abspielen Cookies setzt —
**ergänzt die Datenschutzerklärung trotzdem um YouTube**, sobald ihr ein
Video einstellt.

**Galeriebilder — teilweise über den Admin-Bereich:**
Bildunterschrift, Kachelgröße, Reihenfolge und Löschen werden hier
verwaltet. Die Bild**datei** selbst kann eine reine GitHub-Pages-Seite
allerdings nicht entgegennehmen (dafür gäbe es keinen Server). Ihr habt
deshalb zwei Wege:

1. **Bild ins Repository legen** (`assets/img/gallery/`) und im
   Admin-Bereich nur den Pfad eintragen, z. B.
   `assets/img/gallery/mein-foto.jpg`
2. **Externe Bild-Adresse verwenden** — jede vollständige Adresse, die mit
   `https://` beginnt, funktioniert.

Sobald mindestens ein Bild im Admin-Bereich hinterlegt ist, ersetzt es die
fest im HTML eingebauten Beispiel-Fotos komplett. Solange dort nichts
gepflegt ist, bleiben die bisherigen vier Fotos sichtbar.

> **Warum kein echter Datei-Upload?** Dafür bräuchte es Firebase Storage,
> das seit Ende 2024 nur noch im kostenpflichtigen Blaze-Tarif (mit
> hinterlegter Kreditkarte) verfügbar ist. Falls ihr später doch darauf
> umsteigt, ließe sich ein echter Upload nachrüsten.

## 5) Termine pflegen (Header-Hinweis + Termine-Seite)

**Sobald Firebase eingerichtet ist (Abschnitt 9), geht das komplett über
den Admin-Bereich** unter „Termine": Datum, Location, Ort und Art eintragen
und auf „Termin hinzufügen" klicken — erscheint automatisch im
Header-Streifen und auf der Termine-Seite. Bestehende Termine lassen sich
dort direkt bearbeiten (Klick auf „Bearbeiten", Felder anpassen, „Speichern")
oder löschen — sowohl kommende als auch vergangene.

**Die sechs Termine, die vorher fest im Code standen** (Raffas Scheune, TSV
Neukirchen, Runde Ritzel, Noise Lab, Blue Knights), lassen sich per Klick auf
„Bestehende Beispiel-Termine importieren" oben im Termine-Bereich mit einem
Klick als echte, im Admin-Bereich verwaltbare Einträge anlegen — praktisch,
um sofort mit demselben Datenstand weiterzuarbeiten. Der Button prüft
Duplikate anhand von Datum + Location, mehrfaches Klicken legt also keine
doppelten Termine an.

Alternativ (oder ohne Firebase) direkt im Code:

1. In `assets/js/main.js` das Array `shows` öffnen (Abschnitt „3) TERMINE“).
2. Neuen Termin ergänzen:
   ```js
   {
     date: "2026-11-15",       // Format: JJJJ-MM-TT
     venue: "Kellerclub Backstage",
     city: "Musterstadt",
     type: "Clubshow",
   },
   ```
3. Speichern — fertig. Anhand des Datums wird automatisch entschieden:
   - Ist der Termin in der Zukunft, taucht er im Header-Streifen (falls es
     der nächste anstehende ist) und oben in „Kommende Auftritte“ auf.
   - Liegt das Datum in der Vergangenheit, erscheint er automatisch,
     gedämpft dargestellt, unter „Vergangene Auftritte“.

Diese Liste ist zugleich der Startzustand/Fallback, solange in Firestore
noch keine eigenen Termine gepflegt wurden bzw. solange Firebase nicht
konfiguriert ist. Sind gar keine kommenden Termine vorhanden, bleibt der
Header-Streifen automatisch ausgeblendet.

## 5b) Setlisten erstellen & als PDF exportieren

Im Admin-Bereich unter **„Setlisten"** (nur intern, nicht auf der Homepage
sichtbar):

- **Neue Setliste** anlegen oder links eine bestehende öffnen. Beim ersten
  Mal könnt ihr mit „Bisherige Setliste übernehmen" die alte PDF-Setliste
  (34 Songs) als Startpunkt einspielen.
- **Termin übernehmen** füllt Datum, Location und Stadt aus einem Termin
  unter „Termine" aus — oder die Felder direkt ausfüllen.
- **Songs hinzufügen**: Titel eintippen (Vorschläge kommen aus dem
  Repertoire), oder unter „Mehrere Songs auf einmal einfügen" eine ganze
  Liste einfügen (ein Song pro Zeile).
- **Abschnitte** („SET 1", „SET 2", „ZUGABE" …) trennen die Blöcke; der
  Name ist frei änderbar.
- **Sortieren**: am Griff links (⋮⋮) ziehen oder mit den Pfeilen
  verschieben. Nummern werden automatisch neu vergeben.
- **Notizen** je Song (Tonart, Capo, Einsätze …) erscheinen in der
  Notizspalte des PDFs. Kurz halten — zu lange Notizen werden im PDF
  abgeschnitten.
- Alles wird **automatisch gespeichert**. „Duplizieren" kopiert eine Liste
  als Vorlage für den nächsten Gig.
- **PDF exportieren** öffnet die Setliste im festen Bühnen-Design (A4).
  Dort „Drucken / Als PDF speichern" klicken und im Druckdialog „Als PDF
  speichern" wählen (Kopf-/Fußzeilen des Browsers ausschalten). Die
  Schriftgröße passt sich der Songanzahl an; bei sehr langen Listen geht es
  auf einer zweiten Seite weiter.
- Das **Repertoire** (unten im Bereich) sammelt alle Songs. Neue Titel aus
  Setlisten werden automatisch ergänzt.

Gleichzeitiges Bearbeiten **derselben** Setliste auf zwei Geräten
vermeiden — es gilt der zuletzt gespeicherte Stand.

## 6) Wie Buchungsanfragen bei euch ankommen

Anfragen werden **ausschließlich in der Datenbank gespeichert** und erscheinen
im Admin-Bereich unter „Buchungsanfragen“ — mit rotem Zähler in der
Menüleiste. Es gibt **keinen E-Mail-Versand und keinen externen Mail-Dienst**.
Schaut deshalb regelmäßig im Admin-Bereich vorbei. Antworten könnt ihr direkt
aus der Anfrage heraus: Die Knöpfe „Zusage“, „Absage“ und „Rückfrage“ öffnen
euer E-Mail-Programm mit fertigem Text. Wer später doch automatische
Benachrichtigungen per Mail möchte, kann das nachrüsten.

## 7) Rechtliche Seiten anpassen (Impressum, Datenschutz, AGB)

Ganz unten im Footer öffnen die drei Links **Impressum**,
**Datenschutzerklärung** und **AGB** jeweils ein Modal-Fenster mit dem
passenden Text (analog zum Buchungs-Modal — kein separater Seitenaufruf
nötig).

**Wichtig:** Die hinterlegten Texte sind ein Muster-Gerüst, keine fertige
Rechtsberatung. Bevor die Seite live geht:

1. In `assets/js/main.js` das Objekt `LEGAL_CONTENT` öffnen (Abschnitt „10)
   RECHTLICHES-MODAL“).
2. Alle `[Platzhalter in eckigen Klammern]` durch eure echten Angaben
   ersetzen (Name/Anschrift der verantwortlichen Person, Telefonnummer,
   ggf. USt-ID, eure tatsächlichen Stornierungs-/Zahlungskonditionen in den
   AGB usw.).
3. Die Datenschutzerklärung an die Dienste anpassen, die ihr tatsächlich
   nutzt — z. B. den Firebase-Absatz entfernen, falls ihr Abschnitt 9 nicht
   einrichtet.
4. Im Zweifel die Texte von einer Anwältin/einem Anwalt oder einem Dienst
   wie [eRecht24](https://www.e-recht24.de) prüfen lassen — ein Impressum
   ohne ladungsfähige Anschrift ist in Deutschland nicht rechtskonform.

## 7b) Rechtstexte aktuell halten

Impressum, Datenschutzerklärung und AGB stehen in `assets/js/main.js` im
Abschnitt „RECHTLICHES-MODAL“ und sind auf den tatsächlichen Funktionsumfang
der Seite abgestimmt (Hosting, Schriftarten, externe Bibliotheken, Firebase,
Besucherzähler, Bewertungen, YouTube, Instagram-Link).

- **Eure Angaben** (Name, Straße, PLZ/Ort der verantwortlichen Person) tragt
  ihr **einmal** oben in `LEGAL_OWNER` ein — sie erscheinen automatisch in
  Impressum *und* Datenschutzerklärung. Solange dort noch eckige Klammern
  stehen, ist das Impressum unvollständig.
- **`LEGAL_STAND`** (Datum „Stand: …“) nach jeder inhaltlichen Änderung
  aktualisieren.
- **Wann müssen die Texte angepasst werden?** Immer wenn ihr …
  - einen neuen externen Dienst einbindet (Karte, Video, Social-Plugin,
    Newsletter, Analyse, Chat),
  - ein Formular um Felder erweitert oder neue Daten speichert,
  - Firebase/Hosting wechselt oder einen E-Mail-Dienst einbindet,
  - Cookies oder Browser-Speicher neu nutzt,
  - die Rechtsform ändert (GbR, e. V. …: dann gehören Rechtsform und
    Vertretungsberechtigte ins Impressum) oder eine Umsatzsteuer-ID erhaltet
    (gehört dann ins Impressum, § 27a UStG).
- **Rechtsstand:** Das Impressum nennt § 5 DDG und § 18 Abs. 2 MStV (seit 2024
  an die Stelle von TMG und RStV getreten). Die frühere Verlinkung der
  EU-Streitschlichtungsplattform entfällt, weil die Plattform Mitte 2025
  eingestellt wurde.
- Die Texte sind sorgfältig erstellte Muster und **ersetzen keine
  Rechtsberatung** — im Zweifel von einer Anwältin/einem Anwalt oder einem
  Dienst wie eRecht24 prüfen lassen.

## 8) Auf GitHub Pages veröffentlichen

1. Neues GitHub-Repository anlegen und den kompletten Inhalt dieses Ordners
   hochladen (z. B. per `git init`, `git add .`, `git commit`, `git push`
   oder per Drag & Drop im Browser).
2. Im Repository unter **Settings → Pages**:
   - **Source**: „Deploy from a branch“
   - **Branch**: `main` (oder euer Standard-Branch), Ordner `/ (root)`
3. Nach ein bis zwei Minuten ist die Seite unter
   `https://<euer-github-nutzername>.github.io/<repo-name>/` erreichbar.
4. Die Datei `.nojekyll` ist bereits enthalten — sie verhindert, dass GitHub
   Pages die Seite fälschlich durch die Jekyll-Verarbeitung schickt.

## 9) Admin-Bereich, Bewertungen & Statistik einrichten (Firebase)

Drei neue Funktionen brauchen mehr als GitHub Pages alleine bieten kann,
weil Daten dauerhaft gespeichert und ein Login geprüft werden müssen:

- **Öffentliches Bewertungsformular** (im Bereich „Das sagt ihr über uns“) —
  jeder darf schreiben, neue Bewertungen erscheinen aber erst nach eurer
  Freigabe auf der Seite.
- **Admin-Login** (Button „Login“ oben rechts in der Navigation) mit eigener
  Seite `admin.html`.
- **Dashboard** nach dem Login: Besucherstatistik, alle Buchungsanfragen und
  Kontaktnachrichten, sowie die Freigabe/Löschung von Bewertungen.

Dafür wird [Firebase](https://firebase.google.com) genutzt (Google, kostenlose
Nutzung im „Spark“-Tarif reicht für eine Bandseite völlig aus). Ihr nutzt dabei
eure eigenen, kostenlosen Zugangsdaten — ohne dass ihr einen eigenen
Server betreiben müsst.

### 9.1 Firebase-Projekt anlegen

1. Auf https://console.firebase.google.com ein neues Projekt erstellen
   (Google-Analytics-Kopplung ist optional, könnt ihr deaktivieren).
2. Im Menü links **Build → Firestore Database** öffnen, „Datenbank
   erstellen“, Modus **Produktion** wählen, eine Region in eurer Nähe
   auswählen (z. B. `eur3 (europe-west)`).
3. Im Menü links **Build → Authentication** öffnen, „Los geht’s“, unter
   **Sign-in method** den Anbieter **E-Mail/Passwort** aktivieren.
4. Im Tab **Users** (Nutzer) auf „Nutzer hinzufügen“ klicken und **euren
   eigenen Admin-Zugang** (E-Mail + Passwort) manuell anlegen — das ist der
   Login, mit dem ihr euch später in `admin.html` anmeldet. Es gibt bewusst
   kein öffentliches Registrierungsformular auf der Website.
5. Zurück auf der Projekt-Übersicht (Zahnrad-Symbol → Projekteinstellungen)
   ganz unten bei „Meine Apps“ auf das Web-Symbol (`</>`) klicken, App einen
   Namen geben (z. B. „Who Knows Website“) und registrieren. Firebase zeigt
   euch danach ein Code-Snippet mit einem `firebaseConfig`-Objekt.

### 9.2 Zugangsdaten eintragen

Die Werte aus dem `firebaseConfig`-Objekt in **beide** Dateien, in denen sie
gebraucht werden, eintragen — praktischerweise gibt es nur eine zentrale
Stelle dafür:

```js
// assets/js/firebase-config.js
const FIREBASE_CONFIG = {
  apiKey: "…",
  authDomain: "….firebaseapp.com",
  projectId: "…",
  storageBucket: "….appspot.com",
  messagingSenderId: "…",
  appId: "…",
};
```

Diese eine Datei wird sowohl von `index.html` als auch von `admin.html`
eingebunden — ihr müsst die Werte also nur einmal eintragen.

### 9.3 Sicherheitsregeln einrichten (wichtig!)

Ohne diesen Schritt kann entweder niemand etwas schreiben/lesen, oder im
schlimmsten Fall jeder alles — daher nicht überspringen. In der Firebase
Console: **Firestore Database → Regeln** öffnen und den Inhalt durch
Folgendes ersetzen:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // ---- Hilfsfunktion für die Eingabe-Prüfung -------------------------------
    // Ein optionales Textfeld darf fehlen, muss aber – falls vorhanden – ein
    // Text mit höchstens "max" Zeichen sein.
    function optText(d, key, max) {
      return !(key in d) || (d[key] is string && d[key].size() <= max);
    }

    // Bewertungen: jeder darf eine neue (nicht freigegebene) Bewertung
    // anlegen — aber nur mit den vorgesehenen Feldern und begrenzten Längen.
    // Lesen dürfen alle nur freigegebene; Admins (eingeloggt) dürfen alles
    // lesen, ändern (freigeben, antworten) und löschen.
    match /reviews/{reviewId} {
      allow create: if request.resource.data.keys().hasOnly(['name','eventName','rating','comment','approved','createdAt'])
                    && request.resource.data.keys().hasAll(['name','rating','comment','approved'])
                    && request.resource.data.approved == false
                    && request.resource.data.name is string
                    && request.resource.data.name.size() > 0 && request.resource.data.name.size() <= 80
                    && optText(request.resource.data, 'eventName', 120)
                    && request.resource.data.rating is number
                    && request.resource.data.rating >= 1 && request.resource.data.rating <= 5
                    && request.resource.data.comment is string
                    && request.resource.data.comment.size() > 0 && request.resource.data.comment.size() <= 1500
                    && (!('createdAt' in request.resource.data) || request.resource.data.createdAt == request.time);
      allow read: if resource.data.approved == true || request.auth != null;
      // Admins dürfen alles (freigeben, antworten, löschen — und beim Einspielen
      // einer Sicherung auch Bewertungen neu anlegen).
      allow write: if request.auth != null;
    }

    // Buchungsanfragen: jeder darf eine anlegen (das ist das Absenden des
    // Formulars) — aber nur mit den Formularfeldern, mit sinnvollen
    // Mindest-/Höchstlängen und immer mit Status "neu". So kann niemand von
    // außen z. B. eine fertige "Zusage" oder riesige Datenmengen einschleusen.
    // Lesen/ändern/löschen dürfen nur Admins.
    match /bookings/{id} {
      allow create: if request.resource.data.keys().hasOnly(['from_name','company','from_email','phone','event_date','event_type','location','guests','set_length','budget','tech_requirements','message','status','createdAt'])
                    && request.resource.data.keys().hasAll(['from_name','from_email','event_date','location','status','createdAt'])
                    && request.resource.data.status == 'neu'
                    && request.resource.data.createdAt == request.time
                    && request.resource.data.from_name is string
                    && request.resource.data.from_name.size() > 0 && request.resource.data.from_name.size() <= 120
                    && request.resource.data.from_email is string
                    && request.resource.data.from_email.matches('.+@.+') && request.resource.data.from_email.size() <= 200
                    && request.resource.data.event_date is string
                    && request.resource.data.event_date.matches('[0-9]{4}-[0-9]{2}-[0-9]{2}')
                    && request.resource.data.location is string
                    && request.resource.data.location.size() > 0 && request.resource.data.location.size() <= 300
                    && optText(request.resource.data, 'company', 160)
                    && optText(request.resource.data, 'phone', 60)
                    && optText(request.resource.data, 'event_type', 60)
                    && optText(request.resource.data, 'guests', 20)
                    && optText(request.resource.data, 'set_length', 120)
                    && optText(request.resource.data, 'budget', 120)
                    && optText(request.resource.data, 'tech_requirements', 1500)
                    && optText(request.resource.data, 'message', 4000);
      // Admins dürfen alles lesen, ändern, löschen — und beim Einspielen einer
      // Sicherung auch Anfragen neu anlegen.
      allow read, write: if request.auth != null;
    }

    // Kontaktnachrichten: es gibt kein öffentliches Kontaktformular mehr
    // (Anfragen laufen über "bookings") — daher nur noch für Admins.
    match /contacts/{id} {
      allow read, write: if request.auth != null;
    }

    // Zähler: Besucher dürfen NUR hochzählen (um genau 1), nicht beliebige
    // Werte schreiben. Lesen und alles andere dürfen nur Admins.
    match /stats/{id} {
      allow read, write: if request.auth != null;

      // Gesamtzähler "visits"
      allow create: if id == 'visits'
                    && request.resource.data.keys().hasOnly(['count','lastVisitAt'])
                    && request.resource.data.count == 1;
      allow update: if id == 'visits'
                    && request.resource.data.keys().hasOnly(['count','lastVisitAt'])
                    && request.resource.data.count == resource.data.count + 1;

      // Tageszähler "day-JJJJ-MM-TT" (Aufrufe, geöffnete Buchungsfenster,
      // Instagram-Klicks): nur diese Zähler, je Aufruf höchstens +1.
      allow create: if id.matches('day-[0-9]{4}-[0-9]{2}-[0-9]{2}')
                    && request.resource.data.keys().hasOnly(['date','views','bookingOpen','instagram'])
                    && request.resource.data.date is string
                    && id == 'day-' + request.resource.data.date
                    && request.resource.data.get('views', 0) in [0, 1]
                    && request.resource.data.get('bookingOpen', 0) in [0, 1]
                    && request.resource.data.get('instagram', 0) in [0, 1];
      allow update: if id.matches('day-[0-9]{4}-[0-9]{2}-[0-9]{2}')
                    && request.resource.data.keys().hasOnly(['date','views','bookingOpen','instagram'])
                    && request.resource.data.date == resource.data.date
                    && (request.resource.data.get('views', 0) - resource.data.get('views', 0)) in [0, 1]
                    && (request.resource.data.get('bookingOpen', 0) - resource.data.get('bookingOpen', 0)) in [0, 1]
                    && (request.resource.data.get('instagram', 0) - resource.data.get('instagram', 0)) in [0, 1];
    }

    // Auftrittsorte ("Schon aufgetreten bei") & Playlist: von der Website
    // aus nur lesbar (öffentlich sichtbar), Hinzufügen/Löschen nur über
    // den Admin-Bereich (eingeloggt).
    match /venues/{id} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    match /songs/{id} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    match /shows/{id} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    match /gallery/{id} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    match /videos/{id} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    match /band/{id} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    // Häufige Fragen (FAQ): öffentlich lesbar, nur der Admin schreibt.
    match /faq/{id} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    // Einstellungen (z. B. Ankündigungs-Banner): öffentlich lesbar, nur der
    // Admin darf ändern.
    match /settings/{id} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    // Gesperrte Tage (Admin → Kalender): die Datumsangaben müssen öffentlich
    // lesbar sein, weil die Homepage damit Tage im Buchungsformular sperrt.
    // Der interne Sperrgrund liegt getrennt in "blockedNotes" und ist nur für
    // den eingeloggten Admin lesbar.
    match /blocked/{id} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    match /blockedNotes/{id} {
      allow read, write: if request.auth != null;
    }
    // Setlisten & Repertoire (Admin → Setlisten): nur intern, nur für
    // eingeloggte Admins lesbar und änderbar.
    match /setlists/{id} {
      allow read, write: if request.auth != null;
    }
    match /repertoire/{id} {
      allow read, write: if request.auth != null;
    }
  }
}
```

Danach auf **Veröffentlichen** klicken. Diese Regeln sorgen dafür, dass:
- Besucher Bewertungen, Buchungs- und Kontaktanfragen einreichen können,
- aber nur ihr (eingeloggt) sie lesen, freigeben oder löschen könnt,
- und der Besucherzähler zwar von außen hochgezählt, aber nicht ausgelesen
  werden kann.

> **Schon frühere Version eingerichtet?** Falls ihr die Firestore-Regeln
> schon einmal eingefügt habt (vor der Einführung der Admin-Bereiche
> „Auftrittsorte“, „Playlist“, „Termine“ oder „Setlisten“), müsst ihr die Regeln in der
> Firebase Console jetzt einmal aktualisieren — einfach den kompletten
> Block oben erneut hineinkopieren und veröffentlichen, er enthält alle
> `venues`/`songs`/`shows`/`gallery`/`videos`/`band`/`settings`/`blocked`/`blockedNotes`/`faq`/`setlists`/`repertoire`-Abschnitte sowie die strengeren Regeln für Anfragen, Bewertungen und Zähler bereits mit.

### 9.4 Admin-Bereich aufrufen

Nach dem Deployment erreicht ihr das Dashboard unter
`https://<euer-github-nutzername>.github.io/<repo-name>/admin.html` oder
über den „Login“-Link in der Hauptnavigation. Die Seite ist per
`robots.txt` und `<meta name="robots" content="noindex">` von Suchmaschinen
ausgeschlossen — das ersetzt aber keine echte Zugriffskontrolle, die
übernehmen Firebase Auth + die Sicherheitsregeln aus Schritt 9.3.

**Aufbau des Dashboards:** Links eine feste Sidebar (auf dem Smartphone eine
horizontale Leiste oben) mit allen Bereichen — Übersicht, Buchungsanfragen,
Bewertungen, Termine, Auftrittsorte, Playlist. Ein Klick blendet den
jeweiligen Bereich ein, der Rest bleibt ausgeblendet — kein langes Scrollen
mehr nötig. Buchungsanfragen und Bewertungen zeigen zusätzlich ein rotes
Zähler-Badge an ihrem Menüpunkt, sobald es dort etwas Neues/Offenes gibt
(ähnlich den Benachrichtigungs-Punkten in Microsoft Teams o. Ä.):
„Buchungsanfragen“ zählt Anfragen der letzten 48 Stunden, „Bewertungen“
zählt alle noch nicht freigegebenen Bewertungen.

Die Übersicht zeigt außerdem ein **„Neueste Aktivität“**-Feed, das die
letzten Buchungen und Bewertungen chronologisch zusammenfasst, sowie einen
**CSV-Export-Button** im Buchungsanfragen-Bereich, um alle Anfragen als
Tabelle (z. B. für Excel) herunterzuladen.

### 9.4b Die Admin-Funktionen im Überblick

**Buchungsanfragen: Status & interne Notiz.** Jede Anfrage hat unten eine
Status-Auswahl (*Neu → In Bearbeitung → Zugesagt / Abgesagt*) — die Farbe
zeigt auf einen Blick den Stand. Neue Anfragen starten automatisch mit
„Neu“. Dazu gibt es einen „Notiz“-Button für interne Vermerke (z. B.
„Rückruf Mittwoch, wollte 2×45 Min.“) — die sieht nur ihr im Admin-Bereich.
Das rote Zähler-Badge in der Sidebar und die Kachel „Offene Buchungs-
anfragen“ zählen alles, was noch *Neu* oder *In Bearbeitung* ist. Der
CSV-Export enthält Status und Notiz als Spalten. Ältere Anfragen ohne
Status gelten automatisch als „Neu“.

**Antwort auf Bewertungen.** Unter jeder Bewertung (wartend wie
veröffentlicht) gibt es den Button „Antworten“. Der Text erscheint auf der
Homepage direkt unter der Bewertung als „Antwort von Who Knows?“ — wie bei
Google-Rezensionen. Bearbeiten oder Leeren der Antwort ist jederzeit
möglich (leer speichern = Antwort verschwindet).

**Kalender (Sperrtage).** Eigener Menüpunkt mit Monatsansicht: Auftritte
(aus „Termine“), Buchungsanfragen (Punkt je Status am Veranstaltungsdatum)
und Sperren auf einen Blick. Klick auf einen Tag zeigt Details und sperrt/
gibt ihn frei; der Knopf „KW …“ links sperrt bzw. gibt eine **ganze Woche**
frei; unter „Zeitraum sperren“ lassen sich beliebig lange Zeiträume sperren
(z. B. Urlaub). Gibt man einen einzelnen Tag in der Mitte einer Sperre frei,
wird sie automatisch in zwei Teile geteilt. Sperren sind jederzeit
bearbeit- und löschbar. Im Buchungsformular der Homepage erscheinen gesperrte
Tage nur als „nicht verfügbar“ — der **Sperrgrund bleibt intern** (er liegt
in einer eigenen, nicht öffentlichen Collection). Auch alle Tage mit einem
Auftritt sind dort automatisch gesperrt.

**Ankündigungs-Banner.** Unter *Übersicht → Ankündigungs-Banner* Text
eintragen, Haken setzen, speichern: Oben auf der Homepage erscheint ein
roter Streifen, z. B. „Gig am 19.9. leider abgesagt“. Besucher können ihn
mit dem × für ihre Sitzung schließen; ändert ihr den Text, erscheint er
wieder. Haken entfernen = Banner weg.

**Band.** Eigener Menüpunkt zum Ändern von Name, Rolle, Text, Foto-Pfad und
Reihenfolge der Mitglieder (Bearbeiten direkt in der Zeile). **Wichtig:**
Sobald dort auch nur ein Mitglied steht, ersetzt die Liste die fest
eingebauten Karten komplett. Klickt deshalb zuerst einmal auf **„Bestehende
Mitglieder importieren“** — das übernimmt die sechs bisherigen Karten
inklusive Fotos mit einem Klick (Duplikate werden übersprungen). Der
einleitende Satz über der Liste („Sechs Persönlichkeiten, ein Sound …“)
steht fest im HTML und müsste bei einer anderen Besetzung dort angepasst
werden.

**Anfragen: Zusage trägt den Termin ein, Warnungen, Antworten.** Setzt ihr
eine Anfrage auf „Zugesagt“, passiert je nach Einstellung (Menü
„Einstellungen“ → „Zusagen und Termine“) Folgendes: **automatisch** wird der
Auftritt unter „Termine“ eingetragen (und ist damit auf der Homepage sichtbar
und im Buchungskalender gesperrt), **oder** ihr werdet **jedes Mal gefragt**,
**oder** es wird **nur der Tag gesperrt** (nicht öffentlich). Bei „Abgesagt“/
„Neu“/„In Bearbeitung“ oder beim Löschen der Anfrage wird der Eintrag bzw. die
Sperre wieder entfernt. War der Tag schon belegt, wird nichts doppelt
eingetragen und eine Warnung erscheint. Offene Anfragen zeigen außerdem eine
**Doppelbuchungs-Warnung** (Auftritt, Sperre oder Zusage am selben Tag) bzw.
einen Hinweis auf weitere Anfragen für den Tag. Die Knöpfe **Zusage / Absage /
Rückfrage** öffnen euer E-Mail-Programm mit fertigem Text (die Texte stehen
oben in `admin.js` bei `MAIL_TEMPLATES` und lassen sich anpassen). Die Liste
lässt sich nach Status filtern und nach Veranstaltungsdatum sortieren.

**Private Feiern.** Die Termine-Liste ist öffentlich — auch der Ort aus der
Anfrage. Bei privaten Feiern (Hochzeit, Geburtstag …) deshalb „Jedes Mal
nachfragen“ oder „Nur den Tag sperren“ wählen. Per Hand lässt sich ein privater
Tag auch im Kalender als gesperrter Tag mit Notiz eintragen — dann steht nichts
Privates öffentlich in der Datenbank.

**Einstellungen.** Name und Anschrift der verantwortlichen Person
(Impressum/Datenschutz), Kontakt-E-Mail, Instagram-Link sowie drei Texte der
Startseite lassen sich ohne Code ändern. Solange Name/Anschrift fehlen,
warnt die Übersicht. Leere Felder = Standardtext bleibt. Die **Datensicherung** hat einen eigenen Menüpunkt (siehe unten).

**Datensicherung (eigener Menüpunkt).** Hier lädt ihr alle Inhalte als eine
Datei herunter und könnt sie später wieder **einspielen**: Datei auswählen, die
Seite zeigt vorab, was darin steckt (z. B. „12 Anfragen, 4 Bewertungen“), ihr
wählt die Bereiche aus und bestätigt. Es wird **nichts gelöscht** — Einträge mit
gleicher Kennung werden durch die Version aus der Datei ersetzt, fehlende neu
angelegt, Zeitstempel bleiben echte Zeitstempel. Vor dem Einspielen kann die
Seite automatisch eine Sicherung des aktuellen Stands herunterladen (voreinge-
stellt). Die Statistik-Zähler sind beim Einspielen standardmäßig abgewählt, weil
sie sonst neuere Zählerstände überschreiben würden. **Nicht enthalten:** Admin-
Konten/Passwörter, Firestore-Regeln, Fotos, MP3s und der Seitencode. Firebase
macht im Gratis-Tarif keine automatischen Backups — bitte regelmäßig (z. B.
monatlich) sichern; die Datei enthält persönliche Daten aus Anfragen.

**Heute zu tun (Übersicht).** Eine Liste mit dem, was gerade ansteht: neue
Anfragen, Anfragen, die seit mehr als 3 Tagen **unbeantwortet** sind, Bewertungen
zur Freigabe, der nächste Auftritt und erledigte Anfragen zum Aufräumen. Ein
Klick springt direkt an die richtige Stelle (z. B. Anfragen mit dem passenden
Filter). „Unbeantwortet“ heißt: Status Neu/In Bearbeitung und noch keine Antwort
vermerkt. Eine Antwort wird vermerkt, sobald ihr in der Anfrage auf **Zusage /
Absage / Rückfrage** klickt oder sie mit **„Als beantwortet markieren“** (z. B.
nach einem Telefonat) abhakt. Es gibt dafür auch den Filter **„Überfällig“**.

**Benachrichtigungen.** Bei einer neuen Anfrage zeigt der Browser-Tab die Anzahl
an („(2) Admin-Bereich …“), im Fenster erscheint ein Hinweis, und auf Wunsch gibt
es einen leisen Signalton (Einstellung in der Übersicht, wird nur in diesem
Browser gemerkt) und eine Browser-Benachrichtigung. **Das funktioniert nur,
solange der Admin-Bereich in einem Browser-Tab geöffnet ist** (auch im
Hintergrund). Eine Meldung aufs Handy bei geschlossener Seite ist ohne
Server-Dienst nicht möglich (bei Firebase erst im kostenpflichtigen Tarif).

**Buchungsbestätigung.** Jede Anfrage hat einen Knopf **„Bestätigung (PDF)“**:
Er öffnet ein druckfertiges A4-Dokument mit Auftraggeber, Datum, Ort, Spielzeit,
Technik und Feldern für Gage, Anzahlung und Zahlungsart. Die gelb hinterlegten
Felder lassen sich vorher ausfüllen; „Drucken / Als PDF speichern“ öffnet den
Druckdialog des Browsers (dort „Als PDF speichern“ wählen). Der Text ist eine
**Vorlage** — bitte vor der ersten Verwendung rechtlich prüfen lassen. Er steht in
`admin.js` bei `buildConfirmationHtml()`.

**Alte Anfragen aufräumen.** Unter „Buchungsanfragen“ ganz unten (aufklappbar):
zeigt abgesagte, zugesagte-mit-vergangenem-Auftritt und nie entschiedene
Anfragen mit vergangenem Datum — wählbar ab „heute“, 30 Tagen, 90 Tagen, 6
Monaten oder 1 Jahr. Ihr wählt aus, was gelöscht wird; vorher kann die Seite die
Auswahl als Sicherungsdatei herunterladen (im Format der Datensicherung, also
wieder einspielbar). Termine unter „Termine“ bleiben erhalten. So hält ihr das
Löschversprechen der Datenschutzerklärung ein.

**Verlauf (Übersicht).** Aufrufe pro Tag (30-Tage-Diagramm), geöffnete
Buchungsfenster und Instagram-Klicks — anonyme Zahlen, nichts im Browser.

**FAQ.** Fragen/Antworten pflegen; auf der Startseite erscheint automatisch
ein aufklappbarer Bereich „Häufige Fragen“ (inkl. Suchmaschinen-Markup),
solange mindestens eine Frage existiert.

### 9.7 Sicherheit & Betrieb

- **Eigene Konten:** Legt für jedes Bandmitglied ein eigenes Konto an
  (Firebase Console → Authentication → Nutzer hinzufügen), mindestens zwei
  Personen. Ein gemeinsames Passwort ist die häufigste Schwachstelle.
- **Passwort vergessen?** Gibt es jetzt im Admin-Login: E-Mail eintragen,
  „Passwort vergessen?“ klicken, Link in der Mail nutzen. Zwei-Faktor-
  Anmeldung bietet Firebase nach meinem Kenntnisstand nur im kostenpflichtigen
  Tarif an.
- **Spam-Schutz Buchungsformular:** unsichtbares Feld + Zeit-Falle (weniger
  als 4 Sekunden bis zum Absenden = Bot, nichts wird gespeichert oder
  gesendet). Das stoppt Skripte, die das Formular auf der Seite bedienen.
- **Strengere Firestore-Regeln (Abschnitt 9.3):** Anfragen, Bewertungen und
  Zähler werden serverseitig geprüft (erlaubte Felder, Längen, Status „neu“,
  Zähler nur um 1 erhöhbar). Das ist der Schutz gegen Angriffe, die die Seite
  umgehen und direkt auf die Datenbank schreiben. **Nach dem Veröffentlichen
  der Regeln bitte einmal testen:** eine Testanfrage über das Buchungsformular
  senden (muss im Admin erscheinen) und eine Testbewertung abgeben. Funktioniert
  etwas nicht, zeigt die Firebase Console unter „Regeln“ → „Playground“ den Grund.
- **Später optional:** Firebase App Check (zusätzlicher Schutz gegen
  Missbrauch der Datenbank).

### 9.5 Was passiert ohne Firebase-Konfiguration?

Solange in `assets/js/firebase-config.js` noch die Platzhalter-Werte stehen,
funktioniert die restliche Seite ganz normal weiter (Player, Galerie usw.) — nur:
- das Buchungsformular meldet beim Absenden einen Fehler (Anfragen brauchen die Datenbank),
- das Bewertungsformular zeigt einen Hinweis und ist deaktiviert,
- `admin.html` zeigt einen Hinweis statt des Logins,
- der Besucherzähler läuft nicht mit.

### 9.6 API-Key zusätzlich absichern (bei öffentlichem GitHub-Repo)

GitHub warnt bei einem öffentlichen Repository automatisch, sobald es einen
Firebase-`apiKey` im Code erkennt ("secret detected"). **Das ist normal und
kein echtes Datenleck** — bei Firebase-Web-Apps ist der `apiKey` bewusst
kein Geheimnis, sondern nur eine Projekt-Kennung (Google bestätigt das
offiziell: https://firebase.google.com/docs/projects/api-keys). Die
eigentliche Absicherung eurer Daten läuft über die Firestore-Regeln aus
Abschnitt 9.3 und den Admin-Login aus Abschnitt 9.1 — **nicht** über
Geheimhaltung des Keys. Ein Key lässt sich in einer rein clientseitigen
Website (ohne eigenen Server) technisch auch gar nicht wirklich verstecken,
egal wie man ihn "verschlüsselt" oder umbenennt — er muss im Browser
ankommen, um zu funktionieren.

Trotzdem könnt ihr die Angriffsfläche mit zwei kostenlosen, offiziellen
Google-Bordmitteln zusätzlich einschränken:

**a) Den Key auf eure Domain beschränken**
1. In der [Google Cloud Console](https://console.cloud.google.com) das
   Firebase-Projekt auswählen → **APIs & Dienste → Anmeldedaten**.
2. Beim API-Key (meist "Browser key (auto created by Firebase)") auf
   bearbeiten (Stift-Symbol) klicken.
3. Unter **Anwendungseinschränkungen** → **HTTP-Verweis-URLs (Websites)**
   auswählen und eure echte Adresse eintragen, z. B.:
   `https://<euer-github-nutzername>.github.io/*`
4. Speichern. Der Key funktioniert danach nur noch, wenn die Anfrage von
   eurer eigenen Website kommt — selbst wenn jemand den Key aus dem
   Quelltext kopiert, kann er ihn nicht auf einer fremden Seite verwenden.

**b) Ein Budget-Limit einrichten (Sicherheitsnetz gegen Kostenmissbrauch)**
Auch wenn die Firestore-Regeln greifen, kann extremer Anfragen-Missbrauch
theoretisch Kosten verursachen, sobald ihr über den kostenlosen Spark-Tarif
hinauswachst. In der Google Cloud Console unter **Abrechnung → Budgets und
Warnungen** ein Budget (z. B. 1 €) mit E-Mail-Benachrichtigung einrichten —
kostet nichts, warnt euch aber rechtzeitig per E-Mail.

## 10) Vor dem Livegang: Adressen & Social-Links eintragen

Ein paar Stellen enthalten noch Platzhalter, die erst mit eurer echten
Web-Adresse bzw. euren Profilen funktionieren. Alle sind im Code mit `TODO`
markiert:

**a) Instagram** (`index.html`): Das Instagram-Icon sitzt in der Kopfzeile (am Desktop zwischen „Jetzt buchen“ und „Login“, auf Smartphone/Tablet direkt neben dem Burger-Menü) und ist bereits mit eurem Profil verlinkt. Weitere Kanäle gibt es bewusst nicht. Link ändern: in `index.html` nach `instagram.com` suchen (kommt dreimal vor: Desktop, Mobil und im unsichtbaren Suchmaschinen-Block `sameAs`) und alle Adressen anpassen.

**b) Link-Vorschau beim Teilen** (`index.html`, Abschnitt
„SOCIAL-VORSCHAU"): Damit beim Teilen in WhatsApp, Instagram, Facebook usw.
ein Vorschaubild mit Titel erscheint, müssen `og:url`, `og:image` und
`twitter:image` **vollständige** Adressen enthalten (mit `https://`), z. B.:
```
https://euer-github-nutzername.github.io/who-knows-website/
https://euer-github-nutzername.github.io/who-knows-website/assets/img/hero/hero-bg.jpg
```
Testen könnt ihr das anschließend z. B. mit
[opengraph.xyz](https://www.opengraph.xyz).

**c) Sitemap** (`sitemap.xml` und `robots.txt`): dieselbe Adresse eintragen.
Optional könnt ihr die Seite danach in der
[Google Search Console](https://search.google.com/search-console) anmelden,
damit sie schneller in den Suchergebnissen auftaucht.

**d) Presse-Kit-PDF** (`assets/docs/who-knows-presskit.pdf`): Enthält Bio,
Besetzung, technische Kurzübersicht und Kontakt — verlinkt im Footer als
„Bandinfo für Veranstalter". Im PDF steht noch ein Platzhalter für eure
Web-Adresse. Zum Ändern des PDFs: Die Datei einfach durch eine eigene
Version gleichen Namens ersetzen (z. B. aus Word als PDF exportiert).

**e) Live-Video** (`index.html`, Galerie-Bereich, Abschnitt „LIVE-VIDEO"):
Standardmäßig ausgeblendet. Zum Aktivieren: Video-ID im `<iframe>`
eintragen und die Klasse `hidden` beim Element mit der ID `video-block`
entfernen (genaue Schritte stehen als Kommentar direkt darüber). Denkt
daran, die Datenschutzerklärung um YouTube zu ergänzen, sobald ihr das
Video aktiviert.

## Technische Hinweise

- **Buchungsformular in drei Schritten:** Termin → Details → Kontakt, mit
  Fortschrittsbalken. Jeder Schritt wird einzeln geprüft, beim Absenden
  nochmals alle. Im Kalender sind **vergangene Tage, heute und alle Tage mit
  einem Eintrag unter Admin → Termine gesperrt** (frühestens ab morgen
  buchbar, bis 24 Monate im Voraus). Zusätzliche Sperren (Urlaub, Proben …) pflegt ihr im Admin unter **Kalender**. Das gewählte Datum steht in einem
  versteckten Feld (`event_date`, Format JJJJ-MM-TT); E-Mail-Versand und
  Admin-Bereich funktionieren damit unverändert. Bedienbar auch per Tastatur
  (Pfeiltasten, Bild auf/ab, Enter = „Weiter“).
- **Equalizer & Mini-Player:** Beim Abspielen tanzen Equalizer-Balken im
  Player und bei der aktuellen Zeile der Songliste. Sobald ein Song gestartet
  wurde und der große Player aus dem Bild gescrollt ist, erscheint unten eine
  schwebende Mini-Leiste (Play/Pause, nächster Song, Fortschritt, schließen).
  Die Animationen laufen nur über `transform` und belasten das Scrollen nicht;
  bei „Bewegung reduzieren“ stehen sie still. Die MP3-Dateien selbst müssen
  wie gehabt unter `assets/audio/` liegen (siehe Abschnitt 4).
- **Scroll-Performance:** Damit sich das Scrollen direkt und nicht „schwammig“
  anfühlt, sind drei Dinge bewusst so umgesetzt: (1) `scroll-behavior: smooth`
  ist NICHT global gesetzt — sanftes Scrollen wird gezielt nur bei Klick auf
  Menü-/Anker-Links und den „Nach oben“-Button ausgelöst; (2) die fixierten
  Leisten (Navigation, Admin-Topbar) nutzen einen deckenden Hintergrund statt
  `backdrop-filter: blur()`, das bei jedem Scroll-Pixel neu berechnet werden
  müsste; (3) der Hero-Parallax läuft über `requestAnimationFrame` und gibt
  seine Grafikebene wieder frei, sobald der Hero aus dem Bild gescrollt ist.
- **Kalender-Export:** Bei kommenden Terminen gibt es einen
  „Kalender“-Button, der eine `.ics`-Datei erzeugt (Standard-Kalenderformat,
  funktioniert mit Apple Kalender, Google Kalender, Outlook usw.). Läuft
  komplett im Browser, ohne externen Dienst.
- **Countdown:** Der Header-Streifen zeigt neben dem nächsten Auftritt
  automatisch „noch X Tage“ bzw. „morgen!“/„heute!“ an.
- **Hero-Parallax:** Das Hintergrundfoto bewegt sich beim Scrollen leicht
  langsamer als der Text davor. Wird auf Smartphones und bei aktivierter
  Einstellung „Bewegung reduzieren“ automatisch übersprungen. Deaktivieren:
  in `assets/js/main.js` den Aufruf `initHeroParallax();` entfernen.
- **Teilen-Button:** Nutzt auf Smartphones das native Teilen-Menü; auf dem
  Desktop wird stattdessen die Adresse in die Zwischenablage kopiert.
- **Ladebildschirm (Preloader):** Beim Öffnen der Seite läuft für 2 Sekunden
  ein Vollbild-Ladebildschirm mit Logo und Ladebalken, bevor die Homepage
  sichtbar wird. Dauer ändern: in `assets/js/main.js` die Zahl bei
  `PRELOADER_DURATION_MS` anpassen (Millisekunden). Komplett deaktivieren:
  den Aufruf `initPreloader();` ganz oben in der `DOMContentLoaded`-Funktion
  entfernen und das `<div id="preloader">` in `index.html` löschen.
- **Framework:** Tailwind CSS wird über das offizielle CDN-Script eingebunden
  (`cdn.tailwindcss.com`) — kein npm/Build-Schritt nötig, ideal für ein
  reines GitHub-Pages-Setup. Die eigenen Design-Tokens (Farben, Schriften)
  sind in `tailwind.config` in `index.html` sowie als CSS-Variablen in
  `assets/css/style.css` definiert.
- **Fonts:** "Anton" (Headlines) und "Work Sans" (Fließtext) werden über
  Google Fonts geladen (`display=swap`, damit Text sofort sichtbar ist).
- **Barrierefreiheit:** sichtbare Fokus-Ringe, ausreichende Kontraste,
  „Zum Inhalt springen“-Link, `aria`-Attribute an Menü/Modal/Player,
  `prefers-reduced-motion` wird respektiert.
- **Performance:** keine schweren Abhängigkeiten, System-/Google-Fonts,
  Bilder sollten beim Hochladen idealerweise als komprimiertes JPG/WebP
  eingebunden werden (nicht Teil dieses Templates, da noch keine echten
  Bilder vorliegen).
- **Spam-Schutz beim Bewertungsformular:** läuft automatisch mit, ohne
  dass ihr etwas einrichten müsst — kein externer Dienst, kein API-Key.
  Drei Ebenen: ein für Menschen unsichtbares Honeypot-Feld, eine
  Zeit-Falle (Absenden schneller als ~3 Sekunden nach dem Laden gilt als
  Bot-Verhalten) sowie die sichtbare „Ich bin kein Roboter“-Checkbox als
  Pflichtfeld. Beide unsichtbaren Prüfungen täuschen Bots eine normale
  Erfolgsmeldung vor, damit sie ihr Verhalten nicht anpassen — echte
  Absender bemerken davon nichts. Das ist kein hundertprozentiger Schutz
  (es gibt keine serverseitige Prüfung auf einer reinen GitHub-Pages-
  Seite), fängt aber die große Mehrheit automatisierter Spam-Einsendungen
  ab. Ohnehin landet jede neue Bewertung erst im Admin-Bereich zur
  manuellen Freigabe, bevor sie öffentlich sichtbar wird.

## Anpassung von Farben & Typografie

Alle Design-Tokens liegen zentral in `assets/css/style.css` (Abschnitt
„1) DESIGN-TOKENS“) sowie in der `tailwind.config` in `index.html`. Farbe
oder Schrift ändern reicht an einer Stelle — wirkt sich auf die ganze Seite
aus.
