# Deployment mit Docker

Dieser Ordner betreibt JATOS mit dem Experiment auf einem Server mit Docker (geplant: Hamburg). JATOS liefert die Seiten aus und speichert die Daten; ein eigener Webserver für das Experiment ist nicht nötig. Wie die WebApp JATOS nutzt: [docs/JATOS.md](../docs/JATOS.md).

| Datei | Zweck |
| --- | --- |
| `docker-compose.yml` | Zwei Container: `jatos` (JATOS 3.11.3, HTTP, standardmäßig auf `127.0.0.1:9000`) und `db` (MySQL 8.4, die Ergebnisdaten). HTTPS und Zertifikate übernimmt ein nginx-Proxy davor (siehe „nginx-Proxy“). |
| `.env.example` | Vorlage für `deploy/.env`: Datenbankpasswörter und wo JATOS für den Proxy lauscht. `.env` wird nicht eingecheckt. |
| `build-study.py` | Packt das Experiment als JATOS-Studienarchiv `dist/visuelle-suche.jzip`. |
| `upload-study.sh` | Baut das Archiv und importiert es über die JATOS-API (erstes Mal: neue Studie, danach: Aktualisierung). |

## Voraussetzungen

- Linux-Server mit Docker und dem Compose-Plugin (`docker compose version`).
- Ein nginx-Proxy mit Zertifikat für den Servernamen der Studie (z. B. `studie.example.de`), der an JATOS weiterleitet (siehe „nginx-Proxy“).
- Auf dem Rechner, der die Studie hochlädt: Python 3 und `curl`.

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
   curl -s http://127.0.0.1:9000/ping   # antwortet, sobald JATOS läuft (beim ersten Start bis zu einer Minute)
   ```

3. **Admin-Passwort ändern, bevor JATOS öffentlich erreichbar ist.** JATOS legt beim ersten Start den Nutzer `admin` mit dem Passwort `admin` an. Vom eigenen Rechner einen SSH-Tunnel öffnen, `http://localhost:9000` im Browser aufrufen, mit `admin`/`admin` anmelden und das Passwort ändern (Nutzermenü oben rechts):

   ```bash
   ssh -L 9000:127.0.0.1:9000 <nutzer>@<server>
   ```

   Ist `JATOS_BIND` gesetzt (nginx auf einem anderen Rechner), in `curl` und im Tunnel diese Adresse statt `127.0.0.1` verwenden.

   Im Browser `localhost` verwenden, nicht `127.0.0.1`. JATOS setzt seine Cookies nur für HTTPS, und Browser lassen das für `http://localhost` als Ausnahme zu.

4. Den nginx-Proxy auf JATOS zeigen lassen (siehe „nginx-Proxy“). Danach ist JATOS unter `https://<servername>` erreichbar.

5. In JATOS unter dem eigenen Nutzer (Nutzermenü > API tokens) ein API-Token erzeugen. Dann von einem Rechner mit dem Repository die Studie hochladen:

   ```bash
   JATOS_URL=https://<servername> JATOS_TOKEN=jap_... deploy/upload-study.sh
   ```

   Alternativ `python3 deploy/build-study.py` ausführen und `deploy/dist/visuelle-suche.jzip` in der JATOS-Oberfläche über „Import study“ hochladen.

6. In JATOS die Studie „Visuelle Suche Experiment“ öffnen, unter „Study Links“ den Link für Prolific anlegen und wie in [docs/JATOS.md](../docs/JATOS.md) beschrieben in Prolific eintragen. Vor dem Start die Batch Session leeren, damit Testläufe die balancierte Vergabe nicht verschieben.

## Experiment aktualisieren

Nach Änderungen am Experiment erneut `deploy/upload-study.sh` ausführen. Die Studie wird anhand ihrer festen UUID wiedererkannt: Die Dateien werden ersetzt, die in JATOS gesetzten Studieneinstellungen bleiben (`keepProperties`), Ergebnisse bleiben erhalten. Während der Datenerhebung nur aktualisieren, wenn es nötig ist; laufende Durchläufe haben die alten Dateien schon geladen.

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

JATOS spricht nur HTTP. Der nginx-Proxy liefert HTTPS mit dem Zertifikat aus und leitet an JATOS weiter. Er muss dabei WebSockets durchlassen (die Batch Session von jatos.js, also die balancierte Versionsvergabe, läuft darüber) und die Header `Host` und `X-Forwarded-Proto` setzen. HTTP-Anfragen sollte er auf HTTPS umleiten: JATOS setzt seine Cookies nur für HTTPS, eine Anmeldung über reines HTTP hielte nicht.

```nginx
server {
    listen 443 ssl;
    server_name studie.example.de;
    ssl_certificate     /pfad/zum/zertifikat.pem;   # vom Proxy-Betrieb geliefert
    ssl_certificate_key /pfad/zum/schluessel.pem;

    location / {
        proxy_pass http://127.0.0.1:9000;           # JATOS (JATOS_BIND:JATOS_PORT)
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 3600s;                   # WebSockets bleiben lange offen
        client_max_body_size 200M;                  # Import des Studienarchivs (ca. 15 MB)
    }
}

server {
    listen 80;
    server_name studie.example.de;
    return 301 https://$host$request_uri;
}
```

### nginx auf einem anderen Rechner

Standardmäßig lauscht JATOS nur auf `127.0.0.1:9000`, also für einen nginx auf demselben Rechner. Läuft nginx woanders, in `.env` `JATOS_BIND` auf die Adresse dieses Rechners im Netz zum Proxy setzen (z. B. `JATOS_BIND=10.0.0.5`), `docker compose up -d` ausführen und in nginx `proxy_pass http://10.0.0.5:9000;` eintragen. Den Port dann nur für den Proxy freigeben: Docker trägt veröffentlichte Ports an `ufw` und ähnlichen Firewalls vorbei in iptables ein, der Port muss also durch die Wahl der Adresse oder eine Firewall vor dem Rechner geschützt sein. Zwischen Proxy und JATOS läuft die Verbindung unverschlüsselt; das passt nur in einem vertrauenswürdigen internen Netz.

## Noch nicht geprüft

Hier stand kein Docker zur Verfügung. Geprüft sind der Aufbau des Studienarchivs (Felder gegen die Klassen von JATOS 3.11.3, Pfadregel der Komponente, Inhalt) und die Syntax der Skripte; JATOS-Konfiguration (Umgebungsvariablen, Pfade im Image, Cookie-Optionen, API-Route und Feldname `study`) wurde aus Image-Metadaten und dem JATOS-Quelltext übernommen. Ein erster Start auf dem Server, der Import und ein vollständiger Durchlauf über den HTTPS-Proxy stehen aus.
