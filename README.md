# Wedding Website

A single-page, responsive wedding site with no build step. RSVPs are written to a
Google Sheet through a Google Apps Script web app.

## Files

| File | Purpose |
| --- | --- |
| `index.html` | Page structure: hero, story, details, travel, RSVP form |
| `styles.css` | Mobile-first styling (plain CSS, no framework) |
| `app.js` | Nav toggle, countdown, RSVP form submission. **Config lives at the top.** |
| `apps-script/Code.gs` | Backend that appends RSVPs to the sheet |

## Local preview

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000. The form posts to the live Apps Script endpoint, so
local test submissions land in the real sheet. To work offline, temporarily blank out
`CONFIG.APPS_SCRIPT_URL` in `app.js`; the form then runs in demo mode and only logs the
payload to the browser console.

## Backend (Google Sheets + Apps Script)

RSVPs are stored in this Google Sheet:
https://docs.google.com/spreadsheets/d/1Q3bktxJn6A5O1wqw7eosSdO0YqnIvObw6QA9-iNWAKE/edit

The sheet has a container-bound Apps Script project (open it from the sheet via
**Extensions → Apps Script**). That script is deployed as a web app, and its URL is
set in `CONFIG.APPS_SCRIPT_URL` at the top of `app.js`.

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

The web app URL does not change when you create a new version, so `app.js` needs no
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

Do not add `-X POST` to the curl command. Apps Script answers with a redirect, and
forcing the method makes curl re-POST to the redirect target, which returns a Google
"Page Not Found" HTML page. Browsers follow the redirect with GET automatically.

### Initial setup (already done, kept for reference)

1. Create a Google Sheet. The script creates an `RSVPs` tab if one does not exist.
2. **Extensions → Apps Script**, replace the default code with `apps-script/Code.gs`.
3. Select the `setup` function and click **Run**. Authorize when asked. This writes the
   header row.
4. **Deploy → New deployment**, type **Web app**, Execute as **Me**, access **Anyone**.
5. Copy the web app URL into `CONFIG.APPS_SCRIPT_URL` in `app.js`.

## Hosting (GitHub Pages)

The site is three static files with no build step.

1. Create a GitHub repository and push this folder to the `main` branch.
2. In the repo, open **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**, select `main` and `/ (root)`, then save.
4. The site publishes at `https://<username>.github.io/<repo>/` within a minute or two.

Every push to `main` redeploys automatically. For a custom domain, add it under the same
Pages settings and point your DNS at GitHub per their instructions.

## Customizing

- Names, dates, venues, and copy: `index.html`
- Wedding date for the countdown: `CONFIG.WEDDING_DATE_ISO` in `app.js`
  (set in Pacific time; `-07:00` is PDT, `-08:00` is PST)
- Colors and fonts: the `:root` tokens at the top of `styles.css`
