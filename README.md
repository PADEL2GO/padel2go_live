# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)

---

## QR-Panel (`/qr` + `/admin/qr-panel`)

Eigene Landingpage für den QR-Code auf der Visitenkarte.

- **Öffentliche URL** (für den QR-Code): `https://www.padel2go-official.de/qr` (englisch via `padel2go-official.com/qr`)
- **Admin-URL** (du): `https://www.padel2go-official.de/admin/qr-panel`

### Einloggen

1. Auf `/auth` einloggen mit deiner Admin-Mail (`fsteinfelder@padel2go.eu`)
2. Danach im Browser auf `/admin/qr-panel` (oder in der Admin-Sidebar links auf "QR-Panel")

### Sektionen pflegen

- **Neue Sektion** anlegen: oben Titel eintragen → "Hinzufügen"
- **Texte ändern**: Titel + Beschreibung pro Sektion, EN wird via DeepL automatisch gefüllt. Mit dem 🔒-Icon im EN-Feld schaltest du Auto-Übersetzung pro Feld aus.
- **PDFs hochladen**: pro Sektion ein DE- und ein EN-PDF (max 25 MB). "Ersetzen" tauscht die Datei, das alte File wird gelöscht.
- **Reihenfolge ändern**: ↑/↓ neben dem Titel.
- **Verstecken**: Schalter "Sichtbar" → Sektion verschwindet von `/qr`, bleibt aber im Admin.
- **Löschen**: 🗑 — räumt auch die hinterlegten PDFs aus dem Storage auf.

Alles geht live, kein Deploy nötig. `/qr` ist von Suchmaschinen ausgeschlossen (robots.txt + noindex).
