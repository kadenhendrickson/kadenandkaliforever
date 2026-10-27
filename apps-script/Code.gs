/**
 * Wedding RSVP backend — Google Apps Script
 *
 * Setup:
 *  1. Create a Google Sheet. Rename the first tab to "RSVPs".
 *  2. Extensions → Apps Script. Replace the default code with this file.
 *  3. Run `setup` once from the editor (authorize when prompted) to create headers.
 *  4. Deploy → New deployment → Type: Web app
 *       Execute as: Me
 *       Who has access: Anyone
 *  5. Copy the Web app URL into CONFIG.APPS_SCRIPT_URL in app.js.
 *
 * Note: every code change requires Deploy → Manage deployments → Edit → New version.
 */

const SHEET_NAME = "RSVPs";
const TIMEZONE = "America/Los_Angeles";

const HEADERS = [
  "Timestamp (PT)",
  "Name",
  "Email",
  "Attending",
  "Guests",
  "Dietary",
  "Message",
];

function setup() {
  const sheet = getSheet_();
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight("bold");
    sheet.setFrozenRows(1);
  }
}

function doGet() {
  return json_({ ok: true, message: "RSVP endpoint is live." });
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);

    const body = parseBody_(e);

    const name = String(body.name || "").trim();
    const email = String(body.email || "").trim();
    const attending = String(body.attending || "").trim();

    if (!name || !email || !attending) {
      return json_({ ok: false, error: "Missing required fields." });
    }

    const timestamp = Utilities.formatDate(new Date(), TIMEZONE, "yyyy-MM-dd HH:mm:ss");

    getSheet_().appendRow([
      timestamp,
      name,
      email,
      attending,
      String(body.guests || ""),
      String(body.dietary || ""),
      String(body.message || ""),
    ]);

    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  } finally {
    try { lock.releaseLock(); } catch (_) {}
  }
}

/* ---------- helpers ---------- */

function getSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(SHEET_NAME);
  return sheet;
}

function parseBody_(e) {
  if (e && e.postData && e.postData.contents) {
    try {
      return JSON.parse(e.postData.contents);
    } catch (_) {
      // Fall through to form-encoded parameters.
    }
  }
  return (e && e.parameter) || {};
}

function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
