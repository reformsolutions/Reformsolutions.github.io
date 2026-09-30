/**
 * Reform Solutions website: enquiry form backend (Google Apps Script, free).
 *
 * The contact form on the site posts each enquiry here, with any photos or documents. This script:
 *   1. saves the files to Google Drive (a "Website enquiries" folder, one subfolder per enquiry),
 *   2. adds a row to the spreadsheet it's attached to (a list of every enquiry),
 *   3. emails the enquiry to TO, with the files attached and Reply going to the customer.
 * The visitor stays on the site and sees a confirmation.
 *
 * Setup (once, signed in as the account that should own everything; README → Enquiry form):
 *   Google Sheets → blank spreadsheet → Extensions → Apps Script → paste this file → Save →
 *   Deploy → New deployment → Web app → Execute as: Me, Who has access: Anyone → Deploy →
 *   authorise → copy the Web app URL (…/exec) into data-endpoint="" on the form in index.html.
 * After editing this script: Deploy → Manage deployments → edit → Version: New version, so the
 * URL stays the same.
 */

const TO = 'info.reformsolutions@gmail.com'; // where enquiries are emailed
const FOLDER = 'Website enquiries'; // Drive folder for the files
const MAX_FILES = 5;
const MAX_FILE_MB = 10;
const MAX_TOTAL_MB = 20; // Gmail takes up to 25 MB of attachments per email
const MAX_PER_MINUTE = 20; // a flood of posts is refused
const FILE_TYPES = /\.(jpe?g|png|webp|gif|heic|heif|pdf|docx?|xlsx?|csv|txt)$/i;
const LABELS = { email: 'Email', 'Approx quantity': 'Approx. quantity' };

function doPost(e) {
  try {
    const body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (body.botcheck) return reply(true); // the hidden field only bots fill in: drop it quietly
    if (tooMany()) return reply(false, 'Too many enquiries right now. Please try again in a minute.');

    const fields = {};
    Object.keys(body.fields || {}).forEach((k) => {
      const v = String(body.fields[k]).trim().slice(0, 5000);
      if (v) fields[LABELS[k] || k] = v;
    });
    if (!fields.Name || !fields.Message || !(fields.Email || fields.Phone)) return reply(false, 'Some details are missing.');

    // files: known types only, within the limits
    let total = 0;
    const blobs = [];
    (body.files || []).slice(0, MAX_FILES).forEach((f) => {
      const name = String(f.name || 'file').replace(/[\\/:*?"<>|]+/g, '_').slice(0, 120);
      if (!FILE_TYPES.test(name) || !f.data) return;
      const bytes = Utilities.base64Decode(f.data);
      if (bytes.length > MAX_FILE_MB * 1048576 || total + bytes.length > MAX_TOTAL_MB * 1048576) return;
      total += bytes.length;
      blobs.push(Utilities.newBlob(bytes, f.type || 'application/octet-stream', name));
    });

    const now = new Date();
    const who = fields.Company || fields.Name;
    const subject = String(body.subject || `Website enquiry — ${who}`).replace(/\s+/g, ' ').slice(0, 150);

    // 1 · files to Drive
    let links = [];
    let folderUrl = '';
    if (blobs.length) {
      const stamp = Utilities.formatDate(now, 'Asia/Kolkata', 'yyyy-MM-dd HH.mm');
      const folder = enquiriesFolder().createFolder(`${stamp} — ${who}`.slice(0, 120));
      links = blobs.map((b) => ({ name: b.getName(), url: folder.createFile(b).getUrl() }));
      folderUrl = folder.getUrl();
    }

    // 2 · a row in the spreadsheet (kept even if the email can't go out)
    let logged = false;
    try {
      const book = SpreadsheetApp.getActiveSpreadsheet();
      if (book) {
        addRow(book.getSheets()[0], Object.assign({ Received: now }, fields, { Files: links.map((l) => l.url).join('\n') }));
        logged = true;
      }
    } catch (err) {
      console.error('sheet', err);
    }

    // 3 · the email
    let emailed = false;
    try {
      const rows = Object.keys(fields)
        .filter((k) => k !== 'Message')
        .map((k) => `<tr><td style="padding:4px 14px 4px 0;color:#6b7785;vertical-align:top">${esc(k)}</td><td style="padding:4px 0">${esc(fields[k])}</td></tr>`)
        .join('');
      const files = links.length
        ? `<p style="margin:18px 0 6px"><b>Files</b> (<a href="${folderUrl}">folder in Drive</a>)</p><ul style="margin:0;padding-left:18px">${links.map((l) => `<li><a href="${l.url}">${esc(l.name)}</a></li>`).join('')}</ul>`
        : '';
      const html = `<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.5;color:#1b2b3b">
        <p style="margin:0 0 12px"><b>${esc(subject)}</b></p>
        <table style="border-collapse:collapse">${rows}</table>
        <p style="margin:18px 0 6px"><b>Message</b></p>
        <p style="margin:0;white-space:pre-wrap">${esc(fields.Message)}</p>
        ${files}
      </div>`;
      const mail = { to: TO, subject, htmlBody: html, name: 'Reform Solutions website', attachments: blobs };
      if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.Email || '')) mail.replyTo = fields.Email;
      MailApp.sendEmail(mail);
      emailed = true;
    } catch (err) {
      console.error('email', err);
    }

    return logged || emailed ? reply(true) : reply(false, 'Could not save the enquiry.');
  } catch (err) {
    console.error(err);
    return reply(false, 'Something went wrong.');
  }
}

// Opening the web app URL in a browser shows this: a quick check that the deployment works.
function doGet() {
  return ContentService.createTextOutput('Reform Solutions enquiry form: ready.');
}

function reply(success, message) {
  return ContentService.createTextOutput(JSON.stringify({ success, message: message || '' })).setMimeType(ContentService.MimeType.JSON);
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

function tooMany() {
  const cache = CacheService.getScriptCache();
  const key = `n${Math.floor(Date.now() / 60000)}`;
  const n = Number(cache.get(key) || 0) + 1;
  cache.put(key, String(n), 120);
  return n > MAX_PER_MINUTE;
}

function enquiriesFolder() {
  const found = DriveApp.getFoldersByName(FOLDER);
  return found.hasNext() ? found.next() : DriveApp.createFolder(FOLDER);
}

// One row per enquiry. Columns follow the fields as they turn up (the tabs ask different things).
function addRow(sheet, record) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const width = sheet.getLastColumn();
    const headers = width ? sheet.getRange(1, 1, 1, width).getValues()[0].map(String) : [];
    Object.keys(record).forEach((k) => {
      if (headers.indexOf(k) === -1) headers.push(k);
    });
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold');
    sheet.setFrozenRows(1);
    // text a spreadsheet would read as a formula (=…, +91…) is kept as text
    sheet.appendRow(headers.map((h) => {
      const v = record[h];
      if (v === undefined) return '';
      return typeof v === 'string' && /^[=+\-@]/.test(v) ? `'${v}` : v;
    }));
  } finally {
    lock.releaseLock();
  }
}
