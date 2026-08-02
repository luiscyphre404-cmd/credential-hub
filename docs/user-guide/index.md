# User Guide

## Zweck und Geltungsbereich

Dieses Handbuch beschreibt die aktuellen Nutzerworkflows von Credential HUB. Es richtet sich an berechtigte Anwender und Administratoren, die Credentials verwalten, Provider autorisieren, Consumer-Zugriffe einrichten, Transferdateien bearbeiten oder technische API-Zugaenge einrichten.

Es beschreibt die Admin-Oberflaeche unter `/admin/`. Die genauen HTTP-Vertraege, Berechtigungen und Fehlermeldungen sind in der [API Reference](../api-reference/index.md) definiert. Provider-spezifische Voraussetzungen und Felder stehen in der [Provider-Uebersicht](../providers/README.md).

## Zugriff und Berechtigungen

Die Admin-Oberflaeche verwendet die aktiven API-Endpunkte. Wenn die Autorisierung aktiv ist, prueft Credential HUB fuer `/api/v1` die Identitaet und anschliessend die zugeordnete RBAC-Berechtigung. Fehlende Berechtigungen verhindern das Lesen oder Verwalten von Credentials.

Zum Anzeigen von Credentials ist die Berechtigung `credentials:read` erforderlich. Anlegen, Aendern, Loeschen, Validieren, Aktualisieren, Widerrufen, Importieren und Exportieren erfordern `credentials:manage`. Die vollstaendige Zuordnung steht in der [API Reference](../api-reference/index.md#authorization-and-errors).

## Admin-Oberflaeche verwenden

### Sprache der Admin-Oberflaeche

Die Admin-Oberflaeche startet standardmaessig auf Englisch. Wenn keine gespeicherte Auswahl vorliegt, wird nur bei einer Browser-Sprache mit dem Praefix `de` automatisch Deutsch gewaehlt; alle anderen Browser-Sprachen verwenden Englisch. Der sichtbare Umschalter **EN / DE** ist auf Wizard, Dashboard, API-Token- und Credential-Transfer-Seite vorhanden. Die Auswahl liegt ausschliesslich im Browser unter `credentialHub.language` und gilt fuer alle Admin-Seiten.

Backend-Fehler werden nicht roh angezeigt. Bekannte Fehlercodes koennen lokalisiert werden; unbekannte oder technische Fehler erscheinen als sichere allgemeine Meldung. Das aendert weder Serverprotokolle noch API-Fehlervertraege.

### Credential Wizard oeffnen

Der Einstieg unter `/admin/` startet den Credential Wizard. Der Wizard fuehrt durch folgende Schritte:

1. Eine verfuegbare Authentifizierungsart auswaehlen.
2. Einen dazu passenden Provider auswaehlen oder suchen.
3. Die vom Provider verlangten Credential-Daten erfassen.
4. Bei OAuth-Providern die Autorisierung durchfuehren.
5. Die Zusammenfassung pruefen und das Credential anlegen.

Die angezeigten Provider und Eingabefelder kommen aus den aktuellen Provider-Metadaten. Dadurch sind nur die jeweils passenden Felder sichtbar. Ein neu angelegtes Credential startet mit dem Lebenszyklusstatus `registered`.

### Authentifizierungsart auswaehlen

Die Auswahl wird aus den aktuell registrierten Providern abgeleitet. Der Wizard fuehrt keine feste Providerliste und zeigt nur die Authentifizierungsarten, die mindestens ein registrierter Provider unterstuetzt.

| Authentifizierungsart | Typischer Ablauf |
|---|---|---|
| OAuth | Provider auswaehlen, optionale Scopes pruefen und beim Provider autorisieren. |
| API-Key oder Connection | Provider auswaehlen, die verlangten Felder erfassen und anlegen. |

Welche Capabilities und Felder ein einzelner Provider anbietet, ist verbindlich in der [Provider-Uebersicht](../providers/README.md) festgehalten. Ein nicht registrierter Provider kann im Wizard nicht angelegt werden.

### Benutzerdefinierten Provider anlegen

Administratoren erreichen **Custom providers** ueber die Admin-Navigation oder die Management-Karte im Dashboard. Der Assistent erfasst in vier Schritten Providername, unveraenderliche Provider-ID, Kategorie und Beschreibung, danach Credential-Methoden, Credential-Felder und die Zuordnung der Methoden. Nach der Pruefung waehlen Sie **Provider anlegen**. Der neue Provider ist sofort im Credential Wizard verfuegbar; nach einem Neustart wird die gespeicherte Definition erneut geladen.

Dieser Assistent erstellt ausschliesslich deklarative Provider. OAuth, Provider-Konfigurationsfelder, Verbindungs- oder andere Runtime-Operationen, Code, Hooks, Skripte und Secrets in der Providerdefinition sind nicht verfuegbar und werden durch die API abgelehnt. Ein als `secret` markiertes Credential-Feld beschreibt nur die sichere Behandlung eines spaeter eingegebenen Credential-Werts; der Wert selbst wird erst beim Anlegen eines Credentials erfasst.

### Provider auswaehlen

Jeder Provider erscheint in einer eigenen horizontalen Zeile mit Name, Kurzbeschreibung, Authentifizierungsart und Auswahlbutton. Technische Capabilities und Scopes sind in einem aufklappbaren Detailbereich verfuegbar. Bei OAuth-Providern zeigt dieser Bereich zusaetzlich die schreibgeschuetzte Redirect URI, den Authorization Endpoint und den Callback-Pfad. Registrieren Sie die angezeigte Redirect URI exakt bei der Provider-Anwendung. Die Anzeige wird vollstaendig aus den Provider- und Runtime-Metadaten erzeugt; Threads wird dabei als OAuth-Provider gefuehrt. Suche und Filter beruecksichtigen Providername, Schluessel, Beschreibung und Authentifizierungsart. Fehlende optionale Uebersetzungen blockieren den Wizard nicht; er verwendet dann die lesbare Feldbezeichnung aus den Metadaten.

Das Dashboard zeigt dieselben schreibgeschuetzten OAuth-Registrierungswerte in einem eigenen technischen Detailbereich, damit Administratoren sie auch nach dem Verlassen des Wizards nachschlagen koennen.

### OAuth autorisieren

Bei einem OAuth-Credential fordert der Wizard zuerst die benutzerkonfigurierbaren Anwendungsdaten der eigenen Provider-Registrierung an: Client-ID, gegebenenfalls Client-Secret und Scopes. Die Redirect URI ist kein Eingabefeld, sondern wird in den technischen Details angezeigt. Credential HUB leitet sie serverseitig aus der konfigurierten oeffentlichen Base-URL oder dem validierten Deployment-Host, dem `BASE_PATH` und dem ausgewaehlten Provider ab. Weicht die beim Start verwendete URI von der zuvor angezeigten URI ab, bricht der Wizard ab und nennt die tatsaechlich verwendete URI. Diese Provider-Konfiguration ist von dem Benutzer-Credential getrennt. Sie wird erst nach vollstaendiger Validierung verschluesselt im Backend gespeichert; der Browser legt sie nicht dauerhaft ab.

Nach erfolgreicher lokaler Pruefung oeffnet der Wizard das OAuth-Fenster und startet die Autorisierung ueber den geschuetzten API-Endpunkt. Nach Zustimmung, Ablehnung oder Fehler zeigt die Callback-Seite ein neutrales Credential-HUB-Ergebnis und meldet dem urspruenglichen Wizard Status, stabilen Ergebniscode, Provider und gegebenenfalls Credential-ID. Nur bei `OAUTH_REDIRECT_URI_MISMATCH` wird zusaetzlich die nicht geheime Redirect URI uebertragen. Secrets oder rohe Backend-Fehler werden nicht uebertragen.

Bei Abbruch oder Fehler bleibt der Wizard auf dem Autorisierungsschritt und bietet einen erneuten Versuch an. Bei Erfolg kann direkt zum Dashboard gewechselt werden. Der Browser-Zurueck-Button ist kein regulaerer Workflow-Schritt. OAuth-Sicherheitsmechanismen wie State, PKCE oder Nonce werden durch die Providerdefinition und den gemeinsamen OAuth-Sicherheitsdienst angewendet; sie werden nicht manuell im Wizard eingegeben. Details stehen im [Security Guide](../security-guide/index.md).

### Nicht-OAuth-Credentials anlegen

Bei API-Key- und Connection-Providern erfassen Sie die angeforderten Felder, pruefen die Zusammenfassung und waehlen **Credential anlegen**. Der Wizard sendet die Angaben an die Credential-API. Vor dem Speichern werden Provider, Pflichtfelder und Feldvalidierungen geprueft. Nach erfolgreicher verschluesselter Speicherung zeigt der Wizard **Credential erfolgreich erstellt** sowie direkte Aktionen zum Dashboard und zum Anlegen eines weiteren Credentials. Das Credential ist anschliessend in der Dashboard-Datenquelle sichtbar.

Schlaegt die Erstellung fehl, zeigt der Wizard **Credential konnte nicht erstellt werden**, einen stabilen Fehlercode und **Zurueck bearbeiten**. Roh-Exceptions oder interne Storage-Details werden nicht angezeigt. Bei Validierungs-, Verschluesselungs- oder Persistenzfehlern wird kein erfolgreicher Abschluss behauptet.

Verwenden Sie ausschliesslich die vom jeweiligen Provider erwarteten Werte. Provider-spezifische Angaben, zum Beispiel OAuth-Clientdaten oder Verbindungsparameter, gehoeren nicht in dieses Handbuch; sie sind in den jeweiligen Provider-Dokumenten beschrieben.

### Verbindung vor dem Speichern testen

Bei Providern mit der Capability `validation` zeigt der Wizard im Schritt **Credential-Daten** die Aktion **Verbindung testen**. Sie prueft die aktuellen Werte im Backend und legt dabei weder ein Credential an noch aendert sie ein bestehendes Credential. Der Browser stellt keine direkte Verbindung zu einem Provider her.

Ein erfolgreicher Test ist keine Pflicht zum Speichern: Ein Credential kann weiterhin ohne vorherigen Test angelegt werden und bleibt dann `registered`. Aendern Sie nach einem Test ein Feld, wird das vorherige Ergebnis ungueltig und aus der Oberflaeche entfernt. Secrets erscheinen weder im Ergebnis noch in Fehlermeldungen.

OAuth-Provider und deklarative Custom Provider bieten keinen Test vor dem Speichern. Ein fehlender Testbutton ist daher kein Fehler, sondern eine bewusst begrenzte Funktion.

## Dashboard lesen

Das Dashboard unter `/admin/dashboard.html` zeigt die aktuelle Systemuebersicht. Es fasst die Anzahl der Credentials und Provider sowie abgelaufene und bald ablaufende Credentials zusammen. Der Bereich **Management** zeigt zusaetzlich Systemstatus, Credential-Lebenszyklusdaten, Provider-Capabilities und Scheduler-Informationen.

Unter **Warnungen** erscheinen die vom Management-Endpunkt gemeldeten Hinweise. Pruefen Sie abgelaufene oder bald ablaufende Credentials zeitnah. Die moeglichen Lifecycle-Zustaende sind `registered`, `validated`, `active`, `expiring`, `expired`, `revoked` und `deleted`.

Die technische Credential-API bietet dafuer die Aktionen Validierung, Aktualisierung, Widerruf und Health Check. Ob und wie diese Aktionen in einer konkreten Bedienoberflaeche bereitstehen, richtet sich nach der aktiven Oberflaeche und den Berechtigungen. Die vertragliche Schnittstelle steht in der [API Reference](../api-reference/index.md#credential-routes).

## Credentials verwalten

Die Seite **Credentials** unter `/admin/credentials.html` zeigt eine Liste ohne Secret-Werte. Sie enthaelt Anzeigename, Provider, Typ, Lifecycle-Status, Aktualisierungszeit und die Credential-ID als technische Nebeninformation. Die Seite ist auch bei einem konfigurierten `BASE_PATH` ueber die gemeinsame Admin-Navigation erreichbar.

### Bearbeiten

1. Waehlen Sie beim Credential **Bearbeiten**.
2. Credential HUB laedt die oeffentlichen Credential-Daten und den registrierten Provider-Feldvertrag.
3. Aendern Sie nur die angezeigten, benutzerkonfigurierbaren Felder und speichern Sie.

Credential-ID, Provider-Key, Erstellzeitpunkt, Lifecycle-Status, abgeleitete Metadaten und systemverwaltete Werte wie die OAuth Redirect URI sind nicht bearbeitbar. OAuth-Provider-Konfiguration wird ebenfalls nicht als Credential-Bearbeitungsfeld angezeigt.

Secret-Felder werden nie vorbefuellt oder angezeigt. Ein leer gelassenes Secret-Feld behaelt das bestehende verschluesselte Secret unveraendert. Ein bewusst eingegebener neuer Wert ersetzt nur dieses Secret. Bei einem Fehler bleiben Formulareingaben erhalten und koennen nach Korrektur erneut gesendet werden.

### Gespeicherte Verbindung validieren

Bei Credentials eines Providers mit `validation` steht in der Liste **Verbindung testen** zur Verfuegung. Die Aktion verwendet das gespeicherte verschluesselte Credential und zeigt erst nach einer bestaetigten Backend-Antwort einen Erfolg an. Bei Erfolg werden Liste und sichtbarer Lifecycle-Status neu geladen. Bei einem Fehler bleibt das Credential sichtbar; Secrets und technische Providerfehler werden nicht angezeigt.

OpenAI kann im aktiven Release-1.0-Container ueber den vorhandenen HTTP-Client validiert werden. FTP und SFTP besitzen den sicheren Validierungsvertrag, aber der Standardcontainer enthaelt noch keinen produktiven Transportadapter. Solche Tests koennen deshalb mit einer sicheren Verfuegbarkeitsmeldung enden; sie sind keine Zusage einer produktiven FTP- oder SFTP-Verbindung.

### Loeschen

Waehlen Sie **Loeschen** und pruefen Sie im Bestaetigungsdialog Anzeigename und Provider. Die Loeschung ist irreversibel. Die Oberflaeche entfernt einen Listeneintrag erst nach der bestaetigten `204`-Antwort des Dienstes; bei einem Provider-, Storage- oder Netzwerkfehler bleibt der Eintrag sichtbar und ein erneuter Versuch ist moeglich.

## Credentials uebertragen

Die Seite **Credential Export / Import** ist vom Dashboard aus erreichbar und liegt unter `/admin/credential-transfer.html`.

### Export

1. Aktualisieren Sie bei Bedarf die Credential-Liste.
2. Waehlen Sie einzelne Credentials aus oder aktivieren Sie **Alle Credentials exportieren**.
3. Vergeben Sie ein Export-Passwort mit mindestens acht Zeichen.
4. Erzeugen Sie die Exportdatei und bewahren Sie Datei und Passwort getrennt und sicher auf.

Die Oberflaeche erzeugt eine verschluesselte Credential-HUB-Exportdatei. Ohne das zugehoerige Passwort kann diese beim Import nicht entschluesselt werden.

### Import

1. Waehlen Sie das Quellformat: Credential-HUB-Exportdatei oder CSV-Migrationsimport.
2. Waehlen Sie die Datei oder fuegen Sie deren Inhalt ein. Fuer verschluesselte Exportdateien geben Sie das zugehoerige Passwort ein.
3. Waehlen Sie die Konfliktstrategie: ueberspringen, bestehende Credentials ueberschreiben oder importierte Credentials umbenennen.
4. Waehlen Sie **Vorschau pruefen** und kontrollieren Sie die angezeigten Aktionen und Konflikte.
5. Erst nach einer erfolgreichen Vorschau ist **Import ausfuehren** verfuegbar.

Ein CSV-Migrationsimport benoetigt `providerKey`, `externalReference` und mindestens eine Secret-Spalte, beispielsweise `apiKey` oder `secret.clientSecret`. Provider koennen zusaetzlich Alias-Spalten wie `api_key` oder `credential_name` definieren. Die Vorschau zeigt die daraus abgeleiteten Feldzuordnungen ohne Secret-Werte. Die Import-Vorschau ist ein verpflichtender Schutzschritt; sie sollte vor dem Schreiben immer fachlich kontrolliert werden.

## API-Tokens verwalten

Die Seite **API Tokens** unter `/admin/api-tokens.html` verwaltet technische REST-API-Zugaenge. Sie zeigt Name, Status, Prefix, Scopes, Erstellzeitpunkt, optionales Ablaufdatum und letzte Nutzung. Token-Klartexte und Token-Hashes werden in der Uebersicht nicht angezeigt.

### Token erstellen

1. Waehlen Sie **API-Token erstellen**.
2. Geben Sie einen internen Namen und die Benutzer-ID ein, die der Token authentifiziert.
3. Legen Sie bei Bedarf Ablaufdatum und Scopes fest.
4. Erstellen Sie den Token und kopieren Sie den Klartext sofort in einen sicheren Ablageort.

Der Klartext wird nur direkt nach der Erstellung angezeigt. Nach dem Schliessen kann er nicht erneut abgerufen werden. Die Berechtigungen ergeben sich weiterhin aus der Benutzer-ID und RBAC; Scopes ersetzen diese Pruefung nicht.

### Token widerrufen

Waehlen Sie beim betreffenden Token **Widerrufen** und bestaetigen Sie die Aktion. Der Token ist danach sofort fuer REST-Zugriffe gesperrt und kann nicht wiederhergestellt werden. Aktualisieren Sie betroffene Clients mit einem neuen Token.

## Consumer verwenden (Beta-1-supported Advanced Integration Flow)

Der Consumer-Flow verwendet ausschliesslich die getrennte Consumer API. Der
vollstaendige Ablauf ist technisch vollstaendig und verifiziert. Er setzt eine
vorherige administrative Einrichtung voraus und ist kein primaerer
Consumer-first-Onboarding-Flow. Consumer-first-Verbesserungen bleiben als
zukuenftige Arbeit fuer eine spaetere Version vorgesehen.

Der Ablauf ist:

```text
API Token
    ↓
Discovery
    ↓
Credential Selection
    ↓
Secret Selection
    ↓
Resolve
    ↓
Secure Result Rendering
```

### Voraussetzungen

Vor der Verwendung muss ein Administrator:

- einen aktiven Bearer API-Token fuer den Consumer bereitstellen;
- den Scope `credentials:consume` setzen;
- dem Token-Eigner die Berechtigung `credentials:consume` zuweisen; und
- einen passenden Consumer Grant fuer Credential, Provider und Secret-Felder
  einrichten.

Der Consumer benoetigt nur diesen Consumer-Token. Management-Token und
Consumer-Token sind getrennte Zugangsarten. Der Consumer-Token wird nur in
der geoeffneten Consumer-Seite im Arbeitsspeicher verwendet.

### Einstieg in die Consumer-Oberflaeche

Nach erfolgreicher Einrichtung und echter Resolve-Verifikation im Credential
Wizard steht die Aktion **Consumer-Oberflaeche oeffnen** zur Verfuegung. Sie
fuehrt zur getrennten Consumer-Oberflaeche unter `/consumer/`. Der Wechsel
uebertraegt keinen Management-Token und keinen Admin-Kontext. Geben Sie dort
den eigenen Consumer-API-Token ein.

### Discovery und Credential-Auswahl

Geben Sie den Consumer API-Token in der Consumer-Oberflaeche ein und waehlen
Sie **Test connection**. Die Oberflaeche ruft die bestehende Discovery-Route
`GET /api/v1/consumer/credentials` auf. Sie zeigt nur aktive, dem Consumer
zugewiesene Credentials mit oeffentlichen Metadaten und dem oeffentlichen
`credentialKey`.

Waehlen Sie anschliessend ein Credential aus. Interne Credential-IDs,
CredentialMethod-IDs und ProviderMethodBinding-Daten gehoeren nicht zum
Consumer-Flow und werden nicht dargestellt.

Wenn fuer das ausgewaehlte Credential ein freigegebener Runtime-Public-Wert
vorhanden ist, kann Discovery diesen als optionale oeffentliche Eingabe fuer
die nachfolgende Zieloperation anzeigen. Solche Werte sind an das konkrete
Credential und den Consumer gebunden. Sie sind weder Secret-Werte noch
Provider-weite Konfiguration; fehlt die optionale Projektion, muss der
Consumer den Ablauf ohne Ersatzwert fortsetzen.

### Secret-Auswahl und Resolve

Nach der Credential-Auswahl zeigt die Oberflaeche nur sichtbare oeffentliche
Secret-Feldnamen. Waehlen Sie die benoetigten Felder ueber die Checkboxen aus.
Die ausgewaehlten Namen werden deterministisch in der oeffentlichen
Feldreihenfolge als `secretNames[]` weitergegeben. Ohne ausgewaehltes
Secret-Feld kann kein Resolve gestartet werden.

Mit **Resolve selected secrets** wird die bestehende Route
`POST /api/v1/consumer/credentials/:credentialKey/resolve` verwendet. Der
Request enthaelt ausschliesslich die ausgewaehlten `secretNames`. Grant-
Pruefung, Credential-Status und Feldberechtigung bleiben serverseitig
autoritativ.

### Ergebnisdarstellung

Ein erfolgreiches Ergebnis erscheint ausschliesslich im dedizierten Bereich
**Resolved secrets**. Alle Werte sind zunaechst maskiert. **Reveal** zeigt
einzelne Werte nur nach ausdruecklicher Benutzeraktion und unabhaengig pro
Secret. Die Anzeige wird nach fuenf Sekunden automatisch wieder maskiert.

Bei Credential-Wechsel, Token-Wechsel, Discovery-Refresh, Reset oder einem
Fehler werden alte Ergebnisse und Reveal-Zustaende entfernt. Unerwartete,
unvollstaendige oder leere Resolve-Antworten werden als Fehler behandelt und
nicht teilweise angezeigt.

### Typische Fehler und bekannte Meldungen

| Situation | Meldung der Consumer-Oberflaeche |
|---|---|
| Fehlender Token | `Enter a Consumer API token to continue.` |
| `401` bei Discovery | `Connection failed. Check the Consumer API token and try again.` |
| `403` bei Discovery | `Connection failed. This token is not authorized for Consumer Discovery.` |
| `500` bei Discovery | `Credential Discovery is temporarily unavailable. Try again.` |
| `400` bei Resolve | `Resolve request could not be completed. Check the selected secret fields and try again.` |
| `401` bei Resolve | `Resolve failed. Check the Consumer API token and try again.` |
| `403` bei Resolve | `Resolve failed. This token is not authorized for the selected credential fields.` |
| Netzwerkfehler | `Network error. Check the connection and try again.` |

Technische Rohfehler, Secret-Werte und Providerantworten werden nicht als
Benutzermeldung dargestellt. Die vertraglichen Statuscodes und Fehlergrenzen
stehen in der [API Reference](../api-reference/index.md).

### Sicherheitsregeln des Consumer-Flows

Die Consumer-Oberflaeche folgt dem geltenden Consumer-API-Vertrag einschliesslich der darin
enthaltenen Secure-Result-Rendering-Regeln:

- Secret-Werte werden initial maskiert und nur einzeln per **Reveal** gezeigt;
- Reveal wird automatisch nach dem Timeout sowie bei Lifecycle-Wechseln
  zurueckgesetzt;
- Secret-Werte werden nicht persistiert und nicht in `localStorage`,
  `sessionStorage`, Cookies, URLs oder HTML-Attributen abgelegt;
- es gibt keine Clipboard- oder Copy-Funktion;
- Secret-Werte werden nicht geloggt oder telemetriert; und
- die Darstellung erfolgt nur im dedizierten Ergebnisbereich mit
  `textContent`; `innerHTML` wird nicht verwendet.

## Consumer Grants fuer Administratoren

Ein Consumer Grant verbindet einen Consumer-API-Token mit einem konkreten
Credential, Provider und einer expliziten Liste erlaubter Secret-Felder.
Die initiale Consumer-Zugriffseinrichtung erfolgt im **Credential Wizard**.
Die Seite **Consumer Grants** verwaltet anschliessend bestehende Grants und
passt insbesondere die erlaubten Secret-Feldnamen an. Dafuer ist ein
Management-Token mit
`consumer-grants:manage` erforderlich.

1. Waehlen Sie den Consumer-Token beziehungsweise dessen Consumer-Identitaet.
2. Waehlen Sie das Credential und den zugehoerigen Provider.
3. Geben Sie nur die Secret-Feldnamen frei, die der Consumer fuer seinen
   konkreten Anwendungsfall benoetigt.
4. Speichern Sie den Grant und pruefen Sie die Auswahl mit der vorhandenen
   Diagnosefunktion, falls sie im Wizard angeboten wird.

Consumer Grants folgen dem Least-Privilege-Prinzip: Wildcards und implizite
Standardfelder sind nicht vorgesehen. Ein Grant fuer ein Credential oder
Secret-Feld darf nicht auf ein anderes Credential, einen anderen Provider oder
ein anderes Feld uebertragen werden. Die Management-Oberflaeche zeigt keine
Secret-Werte; sie verwaltet nur die Freigabe ihrer Namen.

Die Voraussetzungen fuer einen erfolgreichen Resolve sind ein aktiver
Consumer-Token, der Scope `credentials:consume`, die gleichnamige Berechtigung
des Token-Eigners, ein aktives Credential und ein passender Grant fuer jedes
angeforderte Secret-Feld. Eine erfolgreiche Diagnose ersetzt nicht den
anschliessenden echten Resolve.

### Beta-1-Administrationsgrenze

In Beta 1 sind Consumer- und Credential-Zuordnungen in der Admin-Oberflaeche
schreibgeschuetzt. Bearbeitbar bleiben nur die explizit freigegebenen
Secret-Feldnamen je Credential. Die Admin-Oberflaeche zeigt dabei keine
Secret-Werte an. Der vereinfachte Consumer-orientierte Checkbox-Workflow ist
als Beta-1.1-Follow-up vorgesehen und nicht Bestandteil des Beta-1-Umfangs.

## Sicher arbeiten

- Geben Sie Secrets, Export-Passwoerter und Token-Klartexte nicht weiter und speichern Sie sie nicht in Tickets, Chat-Nachrichten oder Quellcode.
- Kontrollieren Sie Provider, Auswahl und Konfliktstrategie vor einem Import.
- Verwenden Sie fuer technische Clients eigene, nachvollziehbar benannte API-Tokens und widerrufen Sie nicht mehr benoetigte Tokens.
- Reagieren Sie auf Dashboard-Warnungen und pruefen Sie die Provider-Voraussetzungen, bevor Sie ein Credential erneut anlegen oder autorisieren.

Weitere Informationen zu Verschluesselung, Autorisierung und OAuth-Schutz stehen im [Security Guide](../security-guide/index.md). Sicherheitsluecken werden nach den Angaben im [Security Guide](../security-guide/index.md) gemeldet.

## Navigation und Support

Alle Admin-Seiten stellen eine gemeinsame Navigation zu Dashboard, Credential Wizard, API Tokens und Credential Export / Import bereit. Die Links beruecksichtigen den konfigurierten `BASE_PATH`.

Der gemeinsame Seitenabschluss verweist ueber stabile, `BASE_PATH`-faehige Anwendungsrouten auf Lizenz, Notice, Third-Party Software und Security Policy. Zusaetzlich enthaelt er E-Mail und die offizielle Discord-Community. Die Rechtstext-Links sind nicht von einem GitHub-Branch oder einer angemeldeten GitHub-Sitzung abhaengig. Discord ist fuer allgemeine Hilfe und Diskussion vorgesehen. Sicherheitsluecken duerfen ausschliesslich ueber den Prozess in `SECURITY.md` gemeldet werden.

## Abgrenzung

Dieses Handbuch beschreibt Nutzerablaeufe. Es ersetzt weder die technische API-Referenz noch die Provider-, Konfigurations-, Installations-, Betriebs- oder Datenmodelldokumentation. Deployment- und Infrastrukturentscheidungen sind bewusst nicht Teil dieses Dokuments.
