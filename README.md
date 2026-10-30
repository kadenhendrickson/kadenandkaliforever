# Wedding Website

Kaden and Kali's wedding site. Galena Lodge, Sun Valley, Idaho. August 14, 2027.

A single-page, responsive site with no build step. RSVPs are written to a
Google Sheet through a Google Apps Script web app.

## Files

| File | Purpose |
| --- | --- |
| `index.html` | **Coming-soon page** served at the root until launch |
| `admin/index.html` | The real site, behind the guest gate |
| `admin/details/index.html` | Gated sub-page for day-of details (schedule, attire, parking). Placeholder content. **Not linked yet.** |
| `admin/rsvp/index.html` | Gated sub-page holding the RSVP form. **Not linked from the main page yet.** |
| `admin/gate.js` | The gate: asks for a name, checks it with the Apps Script, unlocks for the session |
| `config.js` | Shared config: Apps Script URL, wedding date, storage key. **Edit here.** |
| `styles.css` | Shared styles for both pages (plain CSS, no framework) |
| `app.js` | Menu, countdown, RSVP submission and pre-fill |
| `apps-script/Code.gs` | Backend: RSVP writes and guest lookup |
| `assets/` | Favicons, Apple touch icon, and the 1200×630 link-preview image |

## Site structure until launch

- `kadenandkali.com/` shows the coming-soon page.
- `kadenandkali.com/admin/` asks for the visitor's name and shows the site if it is on the
  guest list.

### How the guest gate works

1. The visitor types their name. `admin/gate.js` POSTs `{ action: "lookup", name }` to
   the Apps Script.
2. The script reads the **Guests** tab of the spreadsheet and answers `found: true/false`.
   On a match it also returns the guest's display name, party name, maximum guests, and
   the names in their party.
3. On success the gate stores that in `sessionStorage`, stamps the site out of its inert
   `<template>`, and loads `app.js`.

### Replying for a party

When the recognized guest's party has more than one person (or their Maximum Guests is
larger than the party), the RSVP form switches to party mode:

- Every party member is listed with a checkbox and an Accepts / Declines choice. The
  person replying is ticked by default. Untick anyone you are not answering for.
- If Maximum Guests exceeds the number of named members, blank "Additional guest" fields
  appear for plus-ones. A name typed there counts as accepting.
- One submission writes **one row per person** to the RSVPs tab, each with the same
  email, dietary note, message, party, and a **Submitted By** column naming who replied.
  Additional guests are suffixed "(additional guest)".

A single-person party, or an unrecognized visitor (for example on localhost), gets the
simple form: one name, accept/decline, and a guest-count dropdown.

### Returning guests and updates

The lookup also returns each party member's latest reply from the RSVPs tab. When a
guest comes back, the form shows who has already answered (with a "Replied <date>"
tag), pre-selects their answers, restores email, dietary note, message, and any
additional guests, and the button reads **Update reply**.

Submitting again does not add duplicate rows. The backend matches each person by
normalized name (and party) to their existing row and overwrites it, setting the
**Last Updated** column. The original **Timestamp (MT)** keeps the time of the first
reply. People without an existing row are appended.

To see who has not replied, add a column to the Guests tab with this formula in row 2
and fill it down:

```
=IF(COUNTIF(RSVPs!B:B, A2&" "&B2)>0, "Replied", "")
```

Name matching is forgiving: case, accents, punctuation, and extra spaces are ignored, and
"Robert James Smith" matches "Robert Smith". The **Aliases** column holds comma-separated
alternates such as nicknames or maiden names. Guest data is cached in the script for five
minutes, so a newly added name can take up to that long to work.

The guest list never enters this repo. It is still a light gate: anyone who knows an
invitee's name gets in, and the site HTML is public to anyone who reads source.

**Guests tab columns** (row 1, any order): `First Name`, `Last Name`, `Party Name`,
`Maximum Guests`, `Aliases`. Party Name groups a household; Maximum Guests is the number
of seats that household may RSVP for (defaults to 1 if blank). Set it higher than the
number of named members to allow plus-ones.

### Local development

On localhost the holding page redirects to `/admin/` and the gate unlocks with no lookup.
Add `?gate` to the admin URL (`http://localhost:8000/admin/?gate`) to exercise the gate
locally against the live Apps Script.

### Launch day

1. Delete the root `index.html` (the coming-soon page).
2. Move `admin/index.html` to `index.html`, and `admin/details/` and `admin/rsvp/` to the
   root (`details/`, `rsvp/`). Asset paths are root-absolute and page links are relative, so
   nothing inside them needs to change.
3. In each page: remove the `<div id="gate">` block and the `<template id="site">` /
   `</template>` lines so the markup sits directly in `<body>`; replace the
   `/admin/gate.js` script tag with `<script src="/app.js?v=..."></script>`; remove
   `class="locked"` on `<body>` and the `noindex` meta tag; restore a description meta tag.
4. Delete the `admin/` folder.
5. Commit and push.

## Main page scope (save-the-date)

Until invitations go out, `admin/index.html` carries only save-the-date content: the hero,
Our Story, a **Save the Date** section with two columns (the Welcome Picnic on Friday and the
Wedding on Saturday), and Travel & Stay. Day-of detail (attire, parking, schedule) lives on
`admin/details/`, and the form on `admin/rsvp/`; neither is linked from the main page
or menus yet. To surface the details page later, add an outlined button
(`<a href="details/" class="button button-ink">`) in the Save the Date section.

## RSVP page

The RSVP form lives on `admin/rsvp/` (same gate as the main page). While save-the-dates
are going out it is deliberately **not linked** from the main page or the menu, so guests do
not see it; it is reachable directly at `/admin/rsvp/` for testing. When invitations go
out, add a button to the main page (for example an outlined `.button.button-ink` linking to
`rsvp.html`, like the "Wedding details" button) and restore `<li><a href="rsvp/">RSVP</a></li>`
in the menus of `admin/index.html` and `admin/details/`.

## Local preview

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000. See "Local development" above. The form posts to the live Apps Script endpoint, so
local test submissions land in the real sheet. To work offline, temporarily blank out
`APPS_SCRIPT_URL` in `config.js`; the form then runs in demo mode and only logs the
payload to the browser console.

## Backend (Google Sheets + Apps Script)

RSVPs are stored in this Google Sheet:
https://docs.google.com/spreadsheets/d/1Q3bktxJn6A5O1wqw7eosSdO0YqnIvObw6QA9-iNWAKE/edit

The sheet has a container-bound Apps Script project (open it from the sheet via
**Extensions → Apps Script**). That script is deployed as a web app, and its URL is
set in `APPS_SCRIPT_URL` in `config.js`.

**`apps-script/Code.gs` in this repo is the source of truth for the backend code, but
it is not deployed automatically.** Git pushes only update the static site. Any change
to the backend has to be copied into the Apps Script editor and redeployed by hand.

### Editing and deploying `Code.gs`

1. Edit `apps-script/Code.gs` in this repo and commit it, so the repo stays in sync.
2. Open the sheet linked above, then **Extensions → Apps Script**.
3. Select all in the editor's `Code.gs` and paste in the new contents. Save (Cmd+S).
4. If you added a new function that touches new Google services, run it once from the
   editor so you can grant any new permissions.
5. Click **Deploy → Manage deployments**.
6. Click the pencil (Edit) icon on the active deployment.
7. Under **Version**, choose **New version**. Optionally add a description.
8. Click **Deploy**.

The web app URL does not change when you create a new version, so `config.js` needs no
edit. If you skip step 7 and just save, the live endpoint keeps running the old code.

Do **not** use **Deploy → New deployment** for updates. That creates a second
deployment with a different URL, and the site would keep pointing at the old one.

The deployment must be done from the Google account that owns the sheet, since the web
app runs as that account (**Execute as: Me**) with access set to **Anyone**. "Anyone
with a Google account" breaks submissions from guests who are not signed in.

### Testing the endpoint

Health check (should return `{"ok":true,...}`):

```bash
curl -sL "https://script.google.com/macros/s/AKfycbwpsnPv-xVrRwvC_Z9_KgOBtrAjKzwmesN987-BMkcUbX0TKL1TXkYYiooCM8bxWSFKwA/exec"
```

Submit a test RSVP (adds a row to the sheet, delete it afterwards):

```bash
curl -sL --data '{"name":"TEST - delete me","email":"test@example.com","attending":"Yes","guests":"1"}' \
  "https://script.google.com/macros/s/AKfycbwpsnPv-xVrRwvC_Z9_KgOBtrAjKzwmesN987-BMkcUbX0TKL1TXkYYiooCM8bxWSFKwA/exec"
```

Guest lookup (should return `{"ok":true,"found":true,...}` for a name on the Guests tab):

```bash
curl -sL --data '{"action":"lookup","name":"Jane Doe"}' \
  "https://script.google.com/macros/s/AKfycbwpsnPv-xVrRwvC_Z9_KgOBtrAjKzwmesN987-BMkcUbX0TKL1TXkYYiooCM8bxWSFKwA/exec"
```

Submit a party reply (one row per response):

```bash
curl -sL --data '{"submittedBy":"TEST A","email":"test@example.com","party":"Test Party","responses":[{"name":"TEST A","attending":"Yes"},{"name":"TEST B","attending":"No"}]}' \
  "https://script.google.com/macros/s/AKfycbwpsnPv-xVrRwvC_Z9_KgOBtrAjKzwmesN987-BMkcUbX0TKL1TXkYYiooCM8bxWSFKwA/exec"
```

Do not add `-X POST` to the curl command. Apps Script answers with a redirect, and
forcing the method makes curl re-POST to the redirect target, which returns a Google
"Page Not Found" HTML page. Browsers follow the redirect with GET automatically.

### Initial setup (already done, kept for reference)

1. Create a Google Sheet. The script creates an `RSVPs` tab if one does not exist.
2. **Extensions → Apps Script**, replace the default code with `apps-script/Code.gs`.
3. Select the `setup` function and click **Run**. Authorize when asked. This writes the
   header row.
4. **Deploy → New deployment**, type **Web app**, Execute as **Me**, access **Anyone**.
5. Copy the web app URL into `APPS_SCRIPT_URL` in `config.js`.

## Hosting (GitHub Pages)

The site is static files with no build step. Every push to `main` redeploys automatically.
Pages is configured to deploy from the `main` branch root.

### Custom domain: kadenandkali.com

Do the DNS step first. Once a `CNAME` file exists in the repo, GitHub redirects the
github.io URL to the custom domain, so if DNS is not ready the site goes dark.

1. At the domain registrar, add these records:

   | Type | Name | Value |
   | --- | --- | --- |
   | A | `@` | `185.199.108.153` |
   | A | `@` | `185.199.109.153` |
   | A | `@` | `185.199.110.153` |
   | A | `@` | `185.199.111.153` |
   | CNAME | `www` | `kadenhendrickson.github.io` |

2. Wait for DNS to propagate (`dig kadenandkali.com +short` should list the four IPs).
3. Add a file named `CNAME` to the repo root containing `kadenandkali.com` and push, or
   enter the domain under **Settings → Pages → Custom domain**, which creates the file.
4. Once the DNS check passes, enable **Enforce HTTPS** on the same settings page.

After this the site is served at the root of the domain, and `www` redirects to the apex.

## Icons and link previews

`assets/og-image.png` is what iMessage, Slack, and social apps show when the link is
shared; `assets/apple-touch-icon.png` is the home-screen icon; the favicons are an
italic ampersand. All were rendered with ImageMagick using the site's fonts (Cormorant
Garamond and EB Garamond). To regenerate after a text change, fetch the TTFs from Google
Fonts and rerun a `magick` command with the same palette (`#f7f5f1` cream, `#231f20` ink).

Link-preview apps cache aggressively. After changing the image, share the URL with a
query string (e.g. `?v=2`) to force a fresh preview, or keep the filename versioned.

## Customizing

- Names, dates, venues, and copy: `index.html`
- Wedding date for the countdown: `WEDDING_DATE_ISO` in `config.js`
  (set in the venue's Mountain time; `-06:00` is MDT, `-07:00` is MST)
- Fonts: Cormorant Garamond (display) and EB Garamond (text), loaded from Google Fonts
  in `index.html`. The design follows Bliss & Bone's "Rivera" template: monochrome,
  one serif family, hairline rules, full-screen menu, black-and-white photography.
- Hero photo: `assets/hero.jpg` (desktop) and `assets/hero-small.jpg` (phones, via a
  `<picture>` source). Replace both to change it; keep the photo black and white, landscape,
  with the subjects roughly centered. The header is transparent over the hero and turns solid
  once you scroll past it.
- Other photos: wrap an `<img>` in `<figure class="photo photo-inset">` anywhere in
  `admin/index.html`. The CSS renders it in grayscale automatically.
- Colors and fonts: the `:root` tokens at the top of `styles.css`
