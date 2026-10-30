# AGENTS.md

Instructions for AI coding agents working in this repository. Read this whole file before
making any change. The README covers how the site works in more depth; this file covers how
to work here safely.

## What this is

The wedding website for **Kaden and Kali**. Wedding: **Saturday, August 14, 2027** at
**Galena Lodge, Sun Valley, Idaho**. Live at **https://kadenandkali.com**, hosted on GitHub
Pages straight from the `main` branch. There is no build step: the files in this repo are the
files guests download.

Two people work here:

- **Kaden** (`kadenhendrickson`): repository owner and admin. Owns the Google Sheet and the
  Apps Script backend. Reviews and merges pull requests.
- **Kali** (`kaliwatkins10`): collaborator with write access. Kali is not a developer and
  makes changes through an AI agent. If you are that agent, the rules below are for you.
  Explain what you are doing in plain language, avoid jargon, and never assume Kali will read
  a diff or a terminal error.

## Git workflow (mandatory)

`main` is protected by a repository ruleset. Collaborators cannot push to it directly; every
change must arrive by pull request. Only the repository admin (Kaden) can bypass this, and
that exception is his alone: do not ask him to push on your behalf to skip a review. Follow these steps every time, in order.

1. **Start from a fresh `main`.**
   ```bash
   git checkout main
   git pull origin main
   ```
2. **Create a new branch for the change.** One branch per topic. Name it `kali/<short-description>`,
   for example `kali/update-our-story` or `kali/add-hotel-info`.
   ```bash
   git checkout -b kali/<short-description>
   ```
3. **Make the change and test it locally** (see "Testing before you open a pull request").
4. **Merge `main` into your branch before pushing**, so the pull request is guaranteed to merge
   cleanly:
   ```bash
   git fetch origin
   git merge origin/main
   ```
   If git reports conflicts, open each conflicted file, keep Kali's intended change plus the
   latest version of everything else, remove the `<<<<<<<`, `=======`, `>>>>>>>` markers, then
   `git add` the files and `git commit`. If a conflict is in a file Kali did not mean to touch,
   take `main`'s version of that file: `git checkout origin/main -- <file>`.
5. **Commit with a plain-language message** describing what changed and why.
6. **Push the branch and open a pull request** against `main`:
   ```bash
   git push -u origin kali/<short-description>
   gh pr create --fill
   ```
   Fill in the pull request template. Describe the change the way you would describe it to a
   friend, and say which pages to look at. Screenshots help.
7. **Stop there.** Kaden reviews and merges. GitHub will let you press the merge button, but do
   not merge your own pull request, do not push to `main`, and do not try to work around the
   rules. After the merge, GitHub Pages redeploys within a
   couple of minutes.
8. After the merge, go back to step 1 for the next change. Delete the old branch.

Never do any of the following: `git push --force`, rewriting history, committing directly on
`main`, committing passwords, tokens, or the guest list, or deleting the `CNAME` file.

## Repository map

| Path | What it is | Edit? |
| --- | --- | --- |
| `index.html` | The **"Coming soon" holding page** guests see at the root until launch. | Rarely |
| `admin/index.html` | **The real website.** Hero, Our Story, Save the Date (picnic + wedding), Travel & Stay (room block + two hotels + getting here). Content edits go here. | Yes |
| `admin/details/index.html` | **Day-of details sub-page** (schedule, attire, getting there and parking). Same gate. **Intentionally unlinked** until invitations go out. | Yes |
| `admin/rsvp/index.html` | **RSVP form page.** Same gate. **Intentionally unlinked** from the main page and menus until invitations go out. | Only if asked |
| `admin/gate.js` | The guest gate: asks for a name and checks it against the Google Sheet. | Only if asked |
| `app.js` | Menu, countdown, RSVP form behavior. | Carefully |
| `config.js` | Apps Script URL, wedding date, storage key. | Only the date, and only if asked |
| `styles.css` | All styling. Design tokens (colors, fonts) at the top. | Yes, carefully |
| `apps-script/Code.gs` | The backend that runs inside the Google Sheet. See the big warning below. | Only if asked |
| `assets/` | Favicons, home-screen icon, link-preview image. | Only if asked |
| `CNAME` | Binds the custom domain. | **Never** |
| `README.md` | Full technical documentation. | Keep in sync |
| `.claude/launch.json` | Local preview server config for the Claude desktop app. | No |

## Things that are not obvious from the code

**The site content is inside a `<template>`.** In `admin/index.html` (and the sub-pages under `admin/`), everything between
`<template id="site">` and `</template>` is the website. It is inert until the gate unlocks it,
so a browser never renders it directly. Edit text inside the template exactly as if it were
normal HTML.

**Pushing does not deploy the backend.** `apps-script/Code.gs` is the source of truth for the
backend, but GitHub cannot deploy it. Only Kaden can, by pasting it into the Apps Script editor
attached to the Google Sheet and publishing a new version. If a pull request changes `Code.gs`,
say so prominently in the description so Kaden knows to redeploy. Until then the live site runs
the old backend.

**The guest list is not in this repo and must never be.** It lives in the "Guests" tab of
Kaden's Google Sheet. The site asks the backend whether a typed name is on the list. To add or
change guests, edit the sheet, not the code. The backend caches the list for five minutes.

**RSVPs are also in the sheet**, on the "RSVPs" tab, one row per person. The site reads them
back so returning guests see and can update their answers.

**Cache-busting.** Stylesheets and scripts are referenced with a version query string such as
`styles.css?v=20261029d`. GitHub Pages caches files for ten minutes, so when you change
`styles.css`, `app.js`, `gate.js`, or `config.js`, bump the version string everywhere it appears
(`admin/index.html`, `index.html`, and inside `admin/gate.js`) to a new value like today's date.
Otherwise guests may see stale files.

**Localhost behaves differently on purpose.** On `localhost` the holding page redirects to
`/admin/` and the gate unlocks with no name lookup, so you always see the real site. To view
the holding page locally, open `http://localhost:8000/?stay`. To test the
gate itself locally, open `http://localhost:8000/admin/?gate`.

**The RSVP form (`admin/rsvp/index.html`) writes to the real spreadsheet, even from localhost.** Do not submit the form
while testing unless you intend to add a row. If you must test a submission, use a name that
starts with `TEST` and tell Kaden so it can be deleted.

**Dates are Mountain Time.** The venue is in Idaho. The countdown and timestamps use
`America/Boise`. Guests are mostly on the West Coast; that is fine, the venue's local date is
what should be displayed.

**Launch day** has its own checklist in the README ("Launch day"). Do not perform it unless
asked; it removes the holding page.

## Design rules

The look is modeled on Bliss & Bone's "Rivera" template: classic, quiet, editorial.

- **Monochrome.** Cream, white, near-black, warm grays. No accent colors, gradients, shadows,
  rounded cards, or pill buttons. Buttons are thin rectangles with letterspaced capitals.
- **Two fonts only:** Cormorant Garamond for display, EB Garamond for text, loaded from Google
  Fonts in the HTML. Small labels are uppercase with wide letterspacing (the `.caps` class).
- **Generous space.** Sections breathe. Hairline rules separate things. When in doubt, remove
  rather than add.
- **Photos render in black and white automatically** (a CSS filter). Replace a
  `.photo-placeholder` div with an `<img>` tag; keep the surrounding `<figure>`. The hero
  photo is `assets/hero.jpg` plus `assets/hero-small.jpg` for phones; the header sits
  transparently over it and turns solid on scroll (`.over-hero` toggled in `app.js`).
- **No frameworks, no npm, no build tools.** Plain HTML, CSS, and JavaScript. Do not add
  dependencies.
- **Mobile first.** Most guests will open this on a phone. Check layouts at roughly 375px wide.
- Use the design tokens at the top of `styles.css` rather than new hard-coded colors or fonts.

## Testing before you open a pull request

1. Start a local server from the repo root and open the site:
   ```bash
   python3 -m http.server 8000
   ```
   Then visit http://localhost:8000 (redirects to the real site on localhost).
2. Check the page at desktop width and at phone width (about 375px). Nothing should overflow
   horizontally.
3. Open the browser console. There should be no errors.
4. If you touched the menu, countdown, or form, click through them. Do not submit the form.
5. If you changed CSS or JavaScript, confirm you bumped the `?v=` version strings.
6. Read the page copy once more as a guest would. Names are **Kaden** and **Kali**, in that
   order, matching the domain kadenandkali.com.

## Adding photos

Put image files in `assets/` (or a new `images/` folder), ideally JPEG, longest side 2000px or
less, under 500 KB each. Replace the placeholder:

```html
<div class="photo-placeholder"><span class="caps">Photograph</span></div>
```

with

```html
<img src="/assets/your-photo.jpg" alt="Kaden and Kali at ..." />
```

Keep the `<figure class="photo ...">` wrapper. The grayscale treatment is automatic.

## Writing pull request descriptions

Kaden will read the description before the code. Include:

- What changed, in one or two plain sentences.
- Which page or section to look at to see it.
- Anything Kaden must do afterward (for example "redeploy Code.gs").
- Screenshots if the change is visual.

## When to stop and ask

Stop and ask Kali (and have her ask Kaden if needed) before: changing the gate or RSVP logic,
touching `config.js`, `CNAME`, or `apps-script/`, adding a dependency, restructuring pages,
changing the date or venue, or doing anything in the launch-day checklist. Small content and
styling changes do not need permission, just a pull request.

## Keep this file current

AGENTS.md is part of the codebase, not a one-time document. Whenever a change alters how the
repo works, update this file in the same pull request. That includes, at minimum:

- adding, removing, renaming, or moving files, or changing what a file is responsible for;
- changing the git workflow, branch rules, or deploy process;
- changing how the gate, RSVP form, or Apps Script backend work, or their data shapes;
- adding or removing a dependency, tool, or external service;
- changing a convention (cache-busting, design tokens, naming);
- filling in a placeholder listed below.

Before opening a pull request, reread the sections this change touches and fix anything that is
no longer true. Keep the README in step too; AGENTS.md is the short version, README is the full one.

**The gate has a loading state and a welcome card.** While a name is being checked, the
Continue button hides and a pulsing `<3` cycles through short playful lines (the
`LOADING_LINES` array in `admin/gate.js`). After a successful check, a one-per-session welcome
card greets the guest by first name (`showWelcome` in `gate.js`, styles under "Welcome card" in
`styles.css`). Both live in `gate.js` so every gated page gets them.

**The main page header starts with class `over-hero` in the markup** so it is transparent over
the photo from the first paint; `app.js` only toggles it on scroll. Sub-pages have no hero and
omit the class. Do not remove it or the header flashes white on load.

**`[hidden]` always wins.** A global rule makes the `hidden` attribute beat any `display`
value, so prefer `el.hidden = true/false` over class toggles for show/hide.

**Sub-pages share the gate and live in folders.** A page is `admin/<name>/index.html`, so its URL
is `/admin/<name>/` with no `.html`. Any new page must copy the structure of
`admin/details/index.html`: the same `<div id="gate">`, its content inside `<template id="site">`,
and the two script tags at the bottom. Asset paths are root-absolute (`/styles.css`,
`/config.js`, `/admin/gate.js`, `/assets/...`); links between pages are relative (`../#dates`). `gate.js` and `app.js` tolerate pages without a hero or
RSVP form. A guest who unlocked one page is already unlocked on the others for that session.

**The RSVP form is on its own page and hidden on purpose.** `admin/rsvp/index.html` holds the form.
It is not linked from the main page or the menu because save-the-dates are going out and the
couple does not want guests replying yet. Do not add a link or button to it unless Kaden or
Kali asks. The README explains how to wire it up when the time comes.

**Keep the main page light.** Save-the-date level only: Our Story, a Save the Date section
with the Welcome Picnic and the Wedding side by side (date, time, venue, reception note), and
Travel. Everything else (attire, parking, schedule) goes on `details.html`, which is hidden
until the couple decides to surface it. Do not add sections or links to the main page unless
Kaden or Kali asks.

## Known placeholders still to fill in

- Ceremony and reception times (four and six o'clock) in `admin/index.html` and
  `admin/details/index.html` are placeholders.
- `admin/details/index.html` is placeholder copy throughout (schedule, attire, parking).
- The whole **Welcome Party** section in `admin/index.html` is placeholder text: time, venue,
  street address, and the description. The date is assumed to be Friday, August 13, 2027, the
  evening before the wedding; confirm it. The section deliberately carries no attire or arrival
  notes. The welcome party is not part of the RSVP form, so there is currently no way for a
  guest to reply to it.
- The Galena Lodge street address should be verified.
- "Our Story" is a placeholder paragraph. Travel & Stay is written (verify the airport and
  drive-time figures in "Getting here").
- No photo placeholders remain; the hero photo is in place. Add more photos only if asked.
