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

Then open http://localhost:8000. With `APPS_SCRIPT_URL` empty, the form runs in
demo mode and logs the payload to the browser console.

## Backend setup (Google Sheets + Apps Script)

1. Create a new Google Sheet and rename the first tab to `RSVPs`.
2. In the sheet, go to **Extensions → Apps Script**.
3. Replace the default code with the contents of `apps-script/Code.gs`.
4. In the editor, select the `setup` function and click **Run**. Authorize when asked.
   This writes the header row.
5. Click **Deploy → New deployment**.
   - Type: **Web app**
   - Execute as: **Me**
   - Who has access: **Anyone**
6. Copy the **Web app URL** and paste it into `CONFIG.APPS_SCRIPT_URL` in `app.js`.

After any change to `Code.gs`, go to **Deploy → Manage deployments → Edit → Version: New version**
or the live URL will keep running the old code.

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
