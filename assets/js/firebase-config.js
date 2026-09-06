/* ==========================================================================
   FIREBASE-KONFIGURATION
   --------------------------------------------------------------------------
   Diese Datei verbindet die Website mit eurem eigenen (kostenlosen)
   Firebase-Projekt. Firebase übernimmt drei Dinge, die eine rein statische
   GitHub-Pages-Seite alleine nicht kann:

   1. Öffentliche Bewertungen speichern (jeder darf schreiben, aber erst
      nach eurer Freigabe erscheint der Kommentar auf der Seite)
   2. Buchungs-/Kontaktanfragen zusätzlich zur E-Mail auch strukturiert
      speichern, damit ihr sie im Admin-Bereich seht
   3. Einen einfachen Besucherzähler führen und einen Admin-Login mit
      geschütztem Bereich ermöglichen

   EINRICHTUNG (einmalig, siehe README.md Abschnitt "Admin-Bereich &
   Bewertungen einrichten" für die ausführliche Schritt-für-Schritt-Anleitung):
   1. Kostenloses Firebase-Projekt auf https://console.firebase.google.com anlegen.
   2. "Firestore Database" aktivieren (im Produktionsmodus).
   3. "Authentication" aktivieren, Anbieter "E-Mail/Passwort" einschalten
      und dort EUREN Admin-Zugang (E-Mail + Passwort) manuell anlegen.
   4. In den Projekteinstellungen eine "Web-App" hinzufügen — Firebase zeigt
      euch danach genau das untenstehende Objekt mit euren echten Werten.
   5. Die Werte unten eintragen. Fertig.
   6. Die Firestore-Sicherheitsregeln aus der README einfügen (Firebase
      Console -> Firestore Database -> Regeln), sonst funktionieren
      Schreib-/Leserechte nicht wie gewünscht.

   Solange hier noch Platzhalter stehen, läuft die Seite ganz normal weiter
   (Formulare funktionieren über E-Mail/EmailJS), nur die Firebase-Extras
   (Live-Bewertungen, Besucherzähler, Admin-Bereich) bleiben inaktiv.
   ========================================================================== */
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyCri725J1pBaprFTo9Ws_hZDKU-jov6hF0",
  authDomain: "homepage-who-knows.firebaseapp.com",
  projectId: "homepage-who-knows",
  storageBucket: "homepage-who-knows.firebasestorage.app",
  messagingSenderId: "883750061634",
  appId: "1:883750061634:web:3ba24f85cb6d7dce9e4fdb",
  measurementId: "G-D3Z23M9E28",
};

/* --------------------------------------------------------------------------
   HINWEIS ZU "API-KEY IST ÖFFENTLICH SICHTBAR" (z. B. GitHub-Warnung):
   --------------------------------------------------------------------------
   Der obige apiKey ist bei Firebase-WEB-Apps bewusst kein Geheimnis — er
   identifiziert nur euer Projekt gegenüber Google, erlaubt für sich genommen
   aber keinen Zugriff auf eure Daten. Google selbst bestätigt das offiziell:
   https://firebase.google.com/docs/projects/api-keys
   Die eigentliche Absicherung läuft über zwei andere Dinge:
   1. Firestore-Sicherheitsregeln (siehe README, Abschnitt 9.3) — legen fest,
      wer was lesen/schreiben darf.
   2. Firebase Authentication — nur euer manuell angelegter Admin-Zugang
      kommt an die geschützten Daten (Buchungen, Kontaktnachrichten,
      unveröffentlichte Bewertungen, Statistik).

   Automatische Scanner (auch GitHub Secret Scanning) kennen diesen
   Unterschied oft nicht und schlagen bei JEDEM Firebase-Key Alarm — das ist
   normal und kein Zeichen für ein echtes Leck, SOLANGE die Regeln aus der
   README korrekt eingefügt sind. Zusätzliche Härtung (empfohlen, siehe
   README Abschnitt 9.6 "API-Key zusätzlich absichern"):
   - Den Key in der Google Cloud Console auf eure Domain einschränken
   - Ein Budget-Limit einrichten, falls doch mal jemand Anfragen missbraucht
   -------------------------------------------------------------------------- */

/** Prüft, ob echte Zugangsdaten eingetragen wurden. */
function isFirebaseConfigured() {
  return (
    typeof firebase !== "undefined" &&
    FIREBASE_CONFIG.apiKey &&
    !FIREBASE_CONFIG.apiKey.startsWith("DEIN_")
  );
}

// Globale Referenzen, die main.js / admin.js nutzen. Bleiben null, solange
// Firebase nicht konfiguriert ist — der restliche Code prüft das jeweils
// selbst ab (siehe isFirebaseConfigured()).
let fbApp = null;
let fbDb = null;
let fbAuth = null;

if (isFirebaseConfigured()) {
  fbApp = firebase.initializeApp(FIREBASE_CONFIG);
  fbDb = firebase.firestore();
  fbAuth = firebase.auth();
} else {
  console.warn(
    "[Who Knows?] Firebase ist noch nicht konfiguriert (assets/js/firebase-config.js). " +
      "Live-Bewertungen, Besucherzähler und Admin-Bereich sind bis dahin inaktiv."
  );
}
