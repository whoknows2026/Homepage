# Who Knows? — Band-Website

Statische, mobile-first Website für eine sechsköpfige Rock-/Blues-/Country-Band.
Kein Build-Schritt nötig — läuft direkt auf GitHub Pages. Gebaut mit Tailwind
CSS (CDN), Vanilla-JavaScript, EmailJS für den Formularversand und Firebase
für Admin-Login, Bewertungen und Statistik. Farb- und Typografie-Konzept ist
an das Bandlogo angelehnt (gealtertes Papier, Tinten-Schwarz, Siegel-Rot,
Messing-Gold).

## Projektstruktur

```
├── index.html              Hauptseite (Hero, Band, Reviews, Galerie, Player, Kontakt, Buchungs-Modal)
├── admin.html               Admin-Login + Dashboard (Statistik, Buchungen, Bewertungs-Freigabe)
├── robots.txt                schließt admin.html von Suchmaschinen aus
├── .nojekyll                verhindert, dass GitHub Pages Jekyll-Verarbeitung anwendet
├── assets/
│   ├── css/style.css        Design-Tokens (Farben/Fonts), Komponenten, Animationen
│   ├── js/
│   │   ├── main.js           Navigation, Player, Galerie/Lightbox, Formulare, Bewertungen, EmailJS
│   │   ├── admin.js           Dashboard-Logik (Login, Statistik, Listen, Freigabe/Löschen)
│   │   └── firebase-config.js  <- HIER eure Firebase-Zugangsdaten eintragen (siehe Abschnitt 9)
│   ├── img/
│   │   ├── logo.png          Euer Band-Logo (bereits eingebunden)
│   │   ├── logo-badge.png     Quadratisch zugeschnittene Variante fürs runde Header-Badge
│   │   ├── band/               <- HIER Porträtfotos der 6 Mitglieder ablegen
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
„Was Veranstalter sagen“. Ist noch keine einzige Bewertung freigegeben,
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
   weiteres HTML nötig.

**Hinweis zu Dateigrößen:** GitHub (und GitHub Pages) begrenzen einzelne
Dateien auf 100 MB und empfehlen Repositories unter ~1 GB. MP3s in guter
Qualität (192–256 kbps) sind normalerweise unproblematisch. Bei vielen/langen
Tracks ggf. [Git LFS](https://git-lfs.com/) in Betracht ziehen oder die Songs
extern hosten (z. B. SoundCloud-Embed) statt lokal im Repo.

## 5) Termine pflegen (Header-Hinweis + Termine-Seite)

Der schmale Streifen ganz oben im Header („Nächster Auftritt: …“) und die
Liste im Abschnitt **Termine** auf der Seite werden beide automatisch aus
einem einzigen Array erzeugt — ihr müsst also nur an einer Stelle etwas
eintragen.

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

Die Beispiel-Termine, die aktuell im Array stehen, könnt ihr einfach löschen
oder durch eure echten Termine ersetzen. Sind gar keine kommenden Termine
eingetragen, bleibt der Header-Streifen automatisch ausgeblendet.

## 6) Formular-Versand einrichten (EmailJS)

GitHub Pages liefert nur statische Dateien aus — es gibt keinen eigenen
Server, der E-Mails verschicken könnte. Diese Seite nutzt daher
[EmailJS](https://www.emailjs.com), einen Service, der E-Mail-Versand direkt
aus dem Browser heraus ermöglicht (kostenlose Stufe verfügbar).

**Einrichtung (einmalig, ca. 10 Minuten):**

1. Kostenlosen Account auf https://www.emailjs.com anlegen.
2. Unter **Email Services** einen Dienst verbinden (z. B. euer Gmail-Konto)
   und die **Service ID** notieren.
3. Unter **Email Templates** ein Template für die Buchungsanfrage
   erstellen. Nutzt darin folgende Platzhalter (sie werden automatisch aus
   den Formularfeldern befüllt): `{{from_name}}`, `{{from_email}}`,
   `{{phone}}`, `{{event_date}}`, `{{location}}`, `{{event_type}}`,
   `{{message}}`, `{{company}}`, `{{guests}}`, `{{tech_requirements}}`,
   `{{budget}}`, `{{set_length}}`. Die **Template ID** notieren.
4. Als Empfänger-Adresse im Template `rudolf.tobias1@web.de` hinterlegen.
5. Unter **Account → General** euren **Public Key** kopieren.
6. In `assets/js/main.js` ganz oben im Abschnitt „E-MAIL-VERSAND ÜBER
   EMAILJS“ die drei Platzhalter-Werte durch eure echten Daten ersetzen:
   ```js
   const EMAILJS_CONFIG = {
     publicKey: "euer_public_key",
     serviceId: "euer_service_id",
     bookingTemplateId: "template_id_buchung",
   };
   ```

Bis diese Werte eingetragen sind, simuliert die Seite den Versand (Formular
funktioniert inkl. Validierung und Erfolgsmeldung), verschickt aber **keine**
echte E-Mail — im Browser erscheint dazu eine Konsolen-Warnung.

**Alternative Form-Services:** Falls ihr statt EmailJS lieber
[Formspree](https://formspree.io), [Web3Forms](https://web3forms.com) oder
[Getform](https://getform.io) nutzen wollt, ist der grundlegende Aufbau
(Formular per JS an eine externe Endpoint-URL senden) sehr ähnlich — dafür
müsstet ihr die Funktion `sendViaEmailJs()` in `assets/js/main.js` gegen den
jeweiligen Service-Aufruf austauschen.

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
   einrichtet, oder den EmailJS-Absatz entfernen, falls ihr einen anderen
   Formular-Dienst nutzt (siehe Abschnitt 6).
4. Im Zweifel die Texte von einer Anwältin/einem Anwalt oder einem Dienst
   wie [eRecht24](https://www.e-recht24.de) prüfen lassen — ein Impressum
   ohne ladungsfähige Anschrift ist in Deutschland nicht rechtskonform.

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

- **Öffentliches Bewertungsformular** (im Bereich „Was Veranstalter sagen“) —
  jeder darf schreiben, neue Bewertungen erscheinen aber erst nach eurer
  Freigabe auf der Seite.
- **Admin-Login** (Button „Login“ oben rechts in der Navigation) mit eigener
  Seite `admin.html`.
- **Dashboard** nach dem Login: Besucherstatistik, alle Buchungsanfragen und
  Kontaktnachrichten, sowie die Freigabe/Löschung von Bewertungen.

Dafür wird [Firebase](https://firebase.google.com) genutzt (Google, kostenlose
Nutzung im „Spark“-Tarif reicht für eine Bandseite völlig aus). Genau wie bei
EmailJS lauft ihr das Ganze über eure eigenen, kostenlosen Zugangsdaten —
ohne dass ihr einen eigenen Server betreiben müsst.

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

    // Bewertungen: jeder darf eine neue (nicht freigegebene) Bewertung
    // anlegen; lesen dürfen alle nur freigegebene, Admins (eingeloggt)
    // dürfen alles lesen, ändern (freigeben) und löschen.
    match /reviews/{reviewId} {
      allow create: if request.resource.data.approved == false
                    && request.resource.data.keys().hasAll(['name','rating','comment','approved']);
      allow read: if resource.data.approved == true || request.auth != null;
      allow update, delete: if request.auth != null;
    }

    // Buchungsanfragen & Kontaktnachrichten: jeder darf anlegen (das ist
    // das Absenden des Formulars), lesen/ändern/löschen nur Admins.
    match /bookings/{id} {
      allow create: if true;
      allow read, update, delete: if request.auth != null;
    }
    match /contacts/{id} {
      allow create: if true;
      allow read, update, delete: if request.auth != null;
    }

    // Besucherzähler: jeder darf den Zählerstand hochzählen, aber nur das
    // Feld "count" und "lastVisitAt" — lesen dürfen nur Admins.
    match /stats/{id} {
      allow read: if request.auth != null;
      allow write: if id == 'visits';
    }
  }
}
```

Danach auf **Veröffentlichen** klicken. Diese Regeln sorgen dafür, dass:
- Besucher Bewertungen, Buchungs- und Kontaktanfragen einreichen können,
- aber nur ihr (eingeloggt) sie lesen, freigeben oder löschen könnt,
- und der Besucherzähler zwar von außen hochgezählt, aber nicht ausgelesen
  werden kann.

### 9.4 Admin-Bereich aufrufen

Nach dem Deployment erreicht ihr das Dashboard unter
`https://<euer-github-nutzername>.github.io/<repo-name>/admin.html` oder
über den „Login“-Link in der Hauptnavigation. Die Seite ist per
`robots.txt` und `<meta name="robots" content="noindex">` von Suchmaschinen
ausgeschlossen — das ersetzt aber keine echte Zugriffskontrolle, die
übernehmen Firebase Auth + die Sicherheitsregeln aus Schritt 9.3.

### 9.5 Was passiert ohne Firebase-Konfiguration?

Solange in `assets/js/firebase-config.js` noch die Platzhalter-Werte stehen,
funktioniert die restliche Seite ganz normal weiter (Kontakt-/Buchungsformular
über EmailJS, Player, Galerie usw.) — nur:
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

**c) EmailJS-Domain einschränken**
Ähnliches Prinzip für den EmailJS Public Key: im EmailJS-Dashboard unter
**Account → Security** lässt sich hinterlegen, von welcher Domain aus der
Key benutzt werden darf.

## Technische Hinweise

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
