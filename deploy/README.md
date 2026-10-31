# Deployment mit Docker

Dieser Ordner betreibt JATOS mit dem Experiment auf einem Server mit Docker (geplant: Hamburg). JATOS liefert die Seiten aus und speichert die Daten; ein eigener Webserver für das Experiment ist nicht nötig. Wie die WebApp JATOS nutzt: [docs/JATOS.md](../docs/JATOS.md).

| Datei | Zweck |
| --- | --- |
| `docker-compose.yml` | Zwei Container: `jatos` (JATOS 3.11.3, HTTP, standardmäßig auf `127.0.0.1:9000`) und `db` (MySQL 8.4, die Ergebnisdaten). HTTPS und Zertifikate übernimmt ein nginx-Proxy davor (siehe „nginx-Proxy“). |
| `.env.example` | Vorlage für `deploy/.env`: Datenbankpasswörter und wo JATOS für den Proxy lauscht. `.env` wird nicht eingecheckt. |
| `study.sh` | `deploy/study.sh` packt das Experiment als JATOS-Studienarchiv `dist/visuelle-suche.jzip`; `deploy/study.sh upload` packt es und importiert es über die JATOS-API (erstes Mal: neue Studie, danach: Aktualisierung). Braucht nur bash, curl und `zip` (fehlt `zip`, nimmt es das `python3` des Systems, ohne zusätzliche Pakete). |

## Voraussetzungen

- Linux-Server mit Docker und dem Compose-Plugin (`docker compose version`).
- Ein nginx-Proxy mit Zertifikat, der einen Pfad seines Servernamens (z. B. `https://example.com/jatos/`) an JATOS weiterleitet (siehe „nginx-Proxy“).
- Auf dem Rechner, der die Studie hochlädt (der Server selbst oder ein anderer): bash, `curl` und `zip` oder `python3`.

## Erstmalige Einrichtung

1. Repository auf den Server holen und Einstellungen anlegen:

   ```bash
   git clone https://github.com/anna-sp1/visuelle-suche-experiment.git
   cd visuelle-suche-experiment/deploy
   cp .env.example .env
   # in .env: DB_PASSWORD und DB_ROOT_PASSWORD z. B. mit `openssl rand -base64 24` füllen
   ```

2. JATOS und Datenbank starten (noch nicht über den Proxy freigeben):

   ```bash
   docker compose up -d
   curl -s http://127.0.0.1:9000/jatos/ping   # antwortet, sobald JATOS läuft (bis zu einer Minute); ohne Basispfad /ping
   ```

3. **Admin-Passwort ändern, bevor JATOS öffentlich erreichbar ist.** JATOS legt beim ersten Start den Nutzer `admin` mit dem Passwort `admin` an. Vom eigenen Rechner einen SSH-Tunnel öffnen, `http://localhost:9000/jatos/` im Browser aufrufen, mit `admin`/`admin` anmelden und das Passwort ändern (Nutzermenü oben rechts):

   ```bash
   ssh -L 9000:127.0.0.1:9000 <nutzer>@<server>
   ```

   Ist `JATOS_BIND` gesetzt (nginx auf einem anderen Rechner), in `curl` und im Tunnel diese Adresse statt `127.0.0.1` verwenden.

   Im Browser `localhost` verwenden, nicht `127.0.0.1`. JATOS setzt seine Cookies nur für HTTPS, und Browser lassen das für `http://localhost` als Ausnahme zu.

4. Den nginx-Proxy auf JATOS zeigen lassen (siehe „nginx-Proxy“). Danach ist JATOS unter `https://example.com/jatos/` erreichbar.

5. In JATOS unter dem eigenen Nutzer (Nutzermenü > API tokens) ein API-Token erzeugen und die Studie hochladen. Auf dem Server selbst (JATOS unter `http://localhost:9000/jatos/`) reicht das Token, z. B. als `JATOS_TOKEN=jap_...` in `deploy/.env`:

   ```bash
   deploy/study.sh upload
   ```

   Von einem anderen Rechner `JATOS_URL` mitgeben (oder über einen SSH-Tunnel ohne `JATOS_URL`):

   ```bash
   JATOS_URL=https://example.com/jatos JATOS_TOKEN=jap_... deploy/study.sh upload
   ```

   Alternativ `deploy/study.sh` ausführen und `deploy/dist/visuelle-suche.jzip` in der JATOS-Oberfläche über „Import study“ hochladen.

6. In JATOS die Studie „Visuelle Suche Experiment“ öffnen, unter „Study Links“ den Link für Prolific anlegen und wie in [docs/JATOS.md](../docs/JATOS.md) beschrieben in Prolific eintragen. Vor dem Start die Batch Session leeren, damit Testläufe die balancierte Vergabe nicht verschieben.

## Experiment aktualisieren

Nach Änderungen am Experiment erneut `deploy/study.sh upload` ausführen. Die Studie wird anhand ihrer festen UUID wiedererkannt: Die Dateien werden ersetzt, die in JATOS gesetzten Studieneinstellungen bleiben (`keepProperties`), Ergebnisse bleiben erhalten. Während der Datenerhebung nur aktualisieren, wenn es nötig ist; laufende Durchläufe haben die alten Dateien schon geladen.

## Betrieb

| Aufgabe | Befehl (im Ordner `deploy/`) |
| --- | --- |
| Status | `docker compose ps` |
| Logs | `docker compose logs -f jatos` (auch `db`) |
| Neu starten | `docker compose restart jatos` |
| Stoppen / starten | `docker compose down` / `docker compose up -d` (Daten bleiben in den Volumes) |
| JATOS-Version wechseln | Image-Tag `jatos/jatos:3.11.3` in `docker-compose.yml` ändern, `docker compose pull jatos && docker compose up -d`. Vorher sichern. |

Die Daten liegen in Docker-Volumes: `db-data` (Datenbank mit allen Ergebnisdaten), `jatos-data` (Study Assets, Ergebnisdateien, Studienlogs), `jatos-logs`. `docker compose down -v` löscht sie; das nie ohne Sicherung ausführen.

## Sicherung

```bash
cd deploy
stamp=$(date +%Y%m%d-%H%M)
# Datenbank (alle Studien, Ergebnisse und Batch Sessions)
docker compose exec -T db sh -c 'exec mysqldump --single-transaction -u root -p"$MYSQL_ROOT_PASSWORD" jatos' > jatos-db-$stamp.sql
# Study Assets, Ergebnisdateien und Studienlogs (Volume des Compose-Projekts "visuelle-suche")
docker run --rm -v visuelle-suche_jatos-data:/data:ro -v "$PWD":/backup alpine tar czf /backup/jatos-data-$stamp.tar.gz -C /data .
```

Zurückspielen der Datenbank: `docker compose exec -T db sh -c 'exec mysql -u root -p"$MYSQL_ROOT_PASSWORD" jatos' < jatos-db-<stamp>.sql`. Sicherungen enthalten personenbezogene Daten (Prolific-IDs) und gehören nicht in das Repository.

## nginx-Proxy

JATOS läuft unter einem Pfad des Servernamens, hier `https://example.com/jatos/`. JATOS selbst kennt diesen Pfad (`JATOS_URL_BASE_PATH=/jatos/` in `.env`, mit Schrägstrich an beiden Enden) und erzeugt alle Links, Studienlinks und API-Adressen damit; das Experiment und jatos.js verwenden nur relative Pfade und laufen darunter unverändert. Ohne diesen Eintrag läuft JATOS an der Wurzel (`/`).

JATOS spricht nur HTTP. Der nginx-Proxy liefert HTTPS mit seinem Zertifikat aus und leitet `/jatos/` an JATOS weiter, **ohne den Pfad abzuschneiden** (`proxy_pass` ohne Pfad dahinter). Er muss WebSockets durchlassen (die Batch Session von jatos.js, also die balancierte Versionsvergabe, läuft darüber) und die Header `Host` und `X-Forwarded-Proto` setzen. HTTP sollte auf HTTPS umgeleitet werden: JATOS setzt seine Cookies nur für HTTPS, eine Anmeldung über reines HTTP hielte nicht.

Im vorhandenen `server`-Block für `example.com` (Port 443, mit Zertifikat):

```nginx
location /jatos/ {
    proxy_pass http://127.0.0.1:9000;           # JATOS (JATOS_BIND:JATOS_PORT); kein Pfad dahinter
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_read_timeout 3600s;                   # WebSockets bleiben lange offen
    client_max_body_size 200M;                  # Import des Studienarchivs (ca. 15 MB)
}
```

Ein `proxy_pass http://127.0.0.1:9000/;` (mit Schrägstrich) würde `/jatos/` abschneiden; JATOS fände dann seine Seiten nicht. Ändert sich der Pfad, `JATOS_URL_BASE_PATH` und die `location` gemeinsam ändern und `docker compose up -d` ausführen.

### nginx auf einem anderen Rechner

Standardmäßig lauscht JATOS nur auf `127.0.0.1:9000`, also für einen nginx auf demselben Rechner. Läuft nginx woanders, in `.env` `JATOS_BIND` auf die Adresse dieses Rechners im Netz zum Proxy setzen (z. B. `JATOS_BIND=10.0.0.5`), `docker compose up -d` ausführen und in nginx `proxy_pass http://10.0.0.5:9000;` eintragen. Den Port dann nur für den Proxy freigeben: Docker trägt veröffentlichte Ports an `ufw` und ähnlichen Firewalls vorbei in iptables ein, der Port muss also durch die Wahl der Adresse oder eine Firewall vor dem Rechner geschützt sein. Zwischen Proxy und JATOS läuft die Verbindung unverschlüsselt; das passt nur in einem vertrauenswürdigen internen Netz.

## Noch nicht geprüft

Hier stand kein Docker zur Verfügung. Geprüft sind der Aufbau des Studienarchivs (Felder gegen die Klassen von JATOS 3.11.3, Pfadregel der Komponente, Inhalt) und die Syntax der Skripte; JATOS-Konfiguration (Umgebungsvariablen, Pfade im Image, Cookie-Optionen, API-Route und Feldname `study`) wurde aus Image-Metadaten und dem JATOS-Quelltext übernommen. Ein erster Start auf dem Server, der Import und ein vollständiger Durchlauf über den HTTPS-Proxy stehen aus.
