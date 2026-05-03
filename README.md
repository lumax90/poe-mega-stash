# PoE Mega Stash

**PoE Mega Stash** is a desktop app for **Path of Exile** on PC. You can sync your **stash tabs** and **character** gear, search and filter everything in one place, optionally estimate stash wealth, find duplicates, and open **official pathofexile.com trade** searches built from your items’ mods.

## This app is builth with AI. Alltough I have checked everything it generated -still, use it with caution.

---

## What you need

- **Windows, macOS, or Linux** (the app uses Electron).
- To run from source: **Node.js 18+** and npm.
- A Path of Exile account.

---
## Download the setup file from releases.

or

## Install and run (from source)

```bash
git clone <your-repo-url> poe-mega-stash
cd poe-mega-stash
npm install
npm run dev
```

To build a packaged app:

```bash
npm run build
```

Where the installer or binaries appear depends on your **electron-vite** setup—check the output under `dist/`.

---

## First launch

### 1. Welcome and setup

When you open the app for the first time, finish setup if prompted:

- Open **Settings** from the bottom of the sidebar (together with **Guide**).
- After you save **Account** details and/or complete **PoE login**, follow the prompts to **sync** your items.

### 2. Settings — Account (POESESSID)

Most people connect using the session cookie from their browser:

1. Log in on **pathofexile.com** in Chrome, Edge, or Firefox.
2. Open developer tools → **Application** / **Storage** → **Cookies** → copy **`POESESSID`**.
3. In **Settings**, enter your **Account Name** (for example `YourAccount#1234`) and paste **POESESSID**.
4. Choose your **League** from the list (it matches GGG’s trade league IDs for PC).
5. Click **Save Settings**.

Treat **POESESSID** like a password: anyone who has it can act as you on the website until it expires.

### 3. PoE OAuth (optional)

Some builds support signing in with **OAuth** instead of pasting a cookie. If you see **Connect with PoE**, follow the steps on screen once **Settings** is ready.

### 4. First sync

When you see **Ready to Load Items**:

1. Double-check **League** in **Settings** matches where you play.
2. Click **Sync All Items**.
3. Wait until progress finishes—large stashes take longer.

After that, **All Items** fills with icons from your stash and equipped/inventory gear.

---

## How to use the app

### Sidebar

- **All Items** — everything you synced (count on the right).
- **Stash Items** / **Character Items** — same idea as the toolbar **Source** filters; narrows the list without leaving the page.
- **Tools** (when you’re logged in or have items): **Wealth**, **Duplicate Finder**.
- At the **bottom**: **Guide** and **Settings** sit together.

### Search and toolbar

- **Search** — fuzzy search across names, bases, mod text, tab names, characters, and more.
- **Source** — **Stash** / **Character** toggles (matches the sidebar shortcuts).
- **Rarity** — filter by Path of Exile rarity.
- **Sort** — stash order and stat-based sorts where available.
- **Sync** — pull fresh data from GGG.
- **Advanced** — extra filters (categories, item level, links, mod substring, and so on).

Switch **grid** / **list** with the view toggle when it’s shown.

### Items

- **Hover** — quick tooltip summary.
- **Click** — **Item detail**: mods split out (implicit, explicit, crafted, …), valuation hints where available, optional **manual Divine** override for wealth math, and **Search on pathofexile.com trade** for similar listings.

### Trade search (from the item panel)

- Builds **official trade** queries from **mod lines → stat filters**, not only base type.
- **Roll offset** (for example 0–30%) relaxes **minimum** rolled values only—higher rolls on the trade site still show up.
- Rare and magic searches avoid filters that often return zero results; listing scope uses trade **Instant Buyout and In Person** when the API supports it.

### Wealth

- **Experimental**: totals may use external price data (for example poe.ninja–style); rare and magic pricing is often approximate or skipped.
- Read the disclaimer on the **Wealth** screen before you rely on numbers for real decisions.
- **Manual overrides** on a stack stay on your machine and are not cleared by routine price refreshes.

### Duplicate Finder

- Helps you spot duplicate or very similar items—handy before vendor recipes or stash cleanup.

---

## Tips

- Pick the right **League** before **Sync** and before trade links—wrong league means wrong economy context.
- Use **Stash Items** vs **Character Items** when you only care about one source.
- After a league change, run **Sync** again and update **Settings → League**.

---

## Privacy and disclaimer

- Your credentials and stash snapshots are stored **locally** on your computer (Electron store / app data). Be careful on shared PCs.
- This project is not affiliated with Grinding Gear Games. Follow [GGG’s Terms of Use](https://www.pathofexile.com/legal/terms-of-use-and-privacy-policy) and their rules for APIs and sessions.
- Trade and pricing features can break when GGG changes APIs—please report problems on the repository.

---

## For contributors — editing this guide

The in-app **Guide** loads Markdown copied from this README into `src/content/guide.md`. After you edit **README.md**, run `npm run sync-guide`, or run `npm install` / `npm run dev` / `npm run build` (scripts copy automatically).

---

## Repository

Issues and pull requests are welcome. When you report a bug, include league, platform, and steps to reproduce.
