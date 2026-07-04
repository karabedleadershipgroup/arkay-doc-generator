# Arkay Document Generator — Setup Guide
**Built July 4, 2026 · Netlify + Supabase + Anthropic + Dropbox**

## What's in this folder
```
index.html                     ← the app (single page, phone-first)
assets/                        ← logo + 4 certification badges (extracted from the real templates)
templates/
  Arkay_Proposal_Template.docx ← built to match Proposal No.1002690's live format
  Arkay_Invoice_Template.docx  ← Raffie's template + {{DescriptionOfWork}} tag added
netlify/functions/
  jobs.js                      ← numbering, history, price intelligence (Supabase)
  scope.js                     ← voice-to-scope + EN→ES (Anthropic)
  dropbox.js                   ← auto-save to Dropbox
supabase/
  schema.sql                   ← run first in Supabase SQL Editor
  seed.sql                     ← run second — loads all 48 historical docs ($802K)
netlify.toml
```

## Deploy — 5 steps (~20 min)

### 1. Supabase (new project: "arkay")
1. supabase.com → New Project → name it `arkay`, save the DB password
2. SQL Editor → paste **schema.sql** → Run
3. SQL Editor → paste **seed.sql** → Run (loads 49 rows)
4. Settings → API → copy **Project URL** and **service_role key** (NOT the anon key)

### 2. Netlify
1. Push this `site/` folder to a new GitHub repo (e.g. `arkay-doc-generator`) → Netlify → Import from Git
2. Site settings → Environment variables:

| Variable | Value |
|---|---|
| `SUPABASE_URL` | from step 1.4 |
| `SUPABASE_SERVICE_ROLE_KEY` | from step 1.4 |
| `ANTHROPIC_API_KEY` | your Anthropic key |
| `ACCESS_CODE` | pick one, e.g. `ARKAY2026!` |
| `DROPBOX_APP_KEY` | step 3 |
| `DROPBOX_APP_SECRET` | step 3 |
| `DROPBOX_REFRESH_TOKEN` | step 3 |

### 3. Dropbox (one-time, on Raffie's account)
1. dropbox.com/developers → Create app → Scoped access → Full Dropbox → name it `Arkay Doc Generator`
2. Permissions tab → check `files.content.write` → Submit
3. Get a refresh token: visit (replace APP_KEY)
   `https://www.dropbox.com/oauth2/authorize?client_id=APP_KEY&response_type=code&token_access_type=offline`
   → approve → copy the code, then run:
   ```
   curl https://api.dropbox.com/oauth2/token -d code=THE_CODE -d grant_type=authorization_code -u APP_KEY:APP_SECRET
   ```
   → the `refresh_token` in the response is what you paste into Netlify.
4. Create folders `/Automated Proposals` and `/Automated Invoices` in his Dropbox (the function targets these).

### 4. Numbering check
The app auto-suggests **1002691** next (his June 23 proposal was 1002690). If he's issued anything since, either update `min_next_seq` in the `settings` table or just edit the number in the app — it's an editable field, and every generated doc raises the counter automatically.

### 5. Test on his phone
Open the Netlify URL → enter the access code → pick "HVAC Repair (Observation & Recommendation)" → tap the mic → dictate → Preview → Generate PDF.

## Feature map (vs. the build brief)
- ✅ Core: toggle, 9 job-type auto-fills, all fields, Bryant quick-picks, editable scope, PDF + Word from the real templates, Dropbox auto-save, auto-numbering
- ✅ Tier 1: voice-to-proposal (browser dictation → Claude drafts in his language), price intelligence from the 48-doc history
- ✅ Tier 2: reports dashboard, one-tap Proposal → Invoice, 🇪🇸 Español toggle
- ⏳ Not yet: photo attachments in the Observation section (needs a decision on image handling in the docx pipeline — next session)

## Known gaps to flag for Raffie
- **History gap:** docs 1002648–1002689 aren't in the seed (the extract file ended at 1002647). Price intelligence works but is missing his most recent ~42 docs. Backfill anytime: re-run the extract on that range and I'll generate seed SQL.
- **Voice:** uses the browser's built-in dictation (Chrome and iOS Safari both work). No audio is stored.
- **Cutover:** keep the Zapier system live until he's generated 3–4 real docs here and is happy.
