# Consumer flow audit (2026-11-18)

I went through the consumer journey as a new visitor: website, then assessment, result, account, app, physio
match and booking, and finally admin. I read the code behind every step to see what gets stored.

**How it was checked**
- **Clicked live** on the test deploy (desktop width): homepage, Free assessment, back pain quiz, contact gate,
  result page, "Save my result", `/account/`, and the app's welcome and login screens.
- **From the code only:** everything after the WhatsApp code (sign-up, syncing results, the app home, matching, the
  pain chat, booking, admin). I stopped at the OTP step: creating accounts and entering codes is for you to do.
- **Not checked:** phone-width layout (the browser window wouldn't resize), the in-app embed on a real device, and
  the physio side.

**Test data left on production.** One website assessment submission: name "QA Walkthrough", phone
9999912345, email qa-walkthrough@example.com. Remove it or tag it in admin.

---

## The short version

The screens look good. The weak spots are underneath:

1. **One person can end up as several records**, so data goes missing.
2. **Consent and opt-ins aren't actually recorded.**
3. **Matching and hand-offs between people are silent.** Nobody gets told anything.
4. **The admin panel counts things it can't verify.**

Fix the foundation (phase 1) before polishing the screens. Otherwise each UX fix just moves the data problems
somewhere else.

---

## Phase 1: Identity, consent and data capture (do first)

### 1. The WhatsApp opt-in is pre-ticked and never saved  `[x]`

> Done on `data-capture` (2026-11-18): unticked everywhere, recorded in `consents_log` and `whatsapp_opt_in`.
- **What happens:**
  - The app login has "Send me appointment and patient updates on WhatsApp", ticked by default.
  - The value goes to the OTP screen and then gets dropped (`capacitor-app-physio/src/screens/auth/Phone.tsx:17,29`).
  - The website's sign-in has no opt-in at all.
- **Why it matters:** India's DPDP Act needs consent to be an affirmative act. Meta also requires a recorded opt-in
  before sending WhatsApp messages to a number.
- **Fix:**
  - Leave the box unticked.
  - Store `whatsapp_opt_in_at` and `whatsapp_opt_in_source` on patients and physios.
  - Add the same tick box to the website's sign-up.
  - `sendWhatsApp` checks the opt-in for anything that isn't transactional. OTPs and booking confirmations are fine
    without it.

### 2. Consent to share health data is set without being asked  `[x]`

> Done on `data-capture`: purpose, wording, version and channel logged; nothing set without a tick.
- **What happens:**
  - `POST /auth/signup-patient` writes `consent_at = now()` for every sign-up (`capacitor-app-backend/src/routes/auth.ts:116`).
  - The app's sign-up does have a tick box, "share my answers with the physio I'm matched with".
  - The website's sign-up only has "By continuing you agree…".
  - Profile switching (`/auth/switch`) also sets consent without asking.
- **Fix:**
  - Add a `consents_log` table: who, what (a terms version and a data-sharing version), where (web, app or switch)
    and when.
  - Add the explicit tick box on the website.
  - Admin shows the consent status on each person's timeline.

### 3. Assessment answers are never stored  `[x]`

> Done on `data-capture`: every answer, pain score, advisory reasons, taken-at and form version stored. Shown to the physio, the patient and admin.
- **What happens:**
  - Only the result reaches the database: the category, scores and condition.
  - The answers go only to `PUBLIC_FORM_ENDPOINT`, if it's set (`AssessmentRunner.astro:401-403`).
  - So the matched physio can't see where it hurts, how long it's lasted or any red flags. Admin can't audit a
    result either.
- **Fix:**
  - Store `answers jsonb` (question label → answer) on `assessments` and `web_submissions`.
  - Show the answers on the physio's patient detail and in the admin drawer.
- **Decision needed:** this is health data. Do we keep the answers, and who can see them (the matched physio and
  admins only)?

### 4. One person, several patient records  `[ ]`
- **What happens:**
  - The `patients` table holds one row per physio-and-phone pair.
  - Say a consumer is matched to physio A, and then physio B adds the same number by hand. That creates a second row
    (`routes/physio.ts:104`).
  - Login picks the newest row (`order by created_at desc limit 1` in `auth.ts`). From then on, the person's
    assessments, plan and chats with A seem to have vanished.
  - Admin counts two consumers.
- **Fix (the important one):**
  - Add a person-level identity, `consumers (id, phone unique, name, …)`, with `patients.consumer_id` pointing to it.
  - Assessments, pain chats, consents and opt-ins belong to the consumer. Care with a physio stays on the patient
    row.
  - Login resolves the consumer first, then the active care relationship.
  - Backfill by phone.
- **Decision needed:** confirm this model before building it. It touches most patient endpoints.

### 5. Website results get lost or attached to the wrong person  `[x]`

> Done on `data-capture`: one stable result id; results typed with a phone are joined only after the verified owner confirms them ("This is mine" / "Not mine").
- **Lost:**
  - A guest's result lives only in that browser's localStorage, so it syncs only if they sign in on the same
    browser.
  - Only the latest result per assessment syncs (`bh_results` is keyed by slug; `bh_history` is never sent).
  - A 401 from an expired session clears unsynced results (`account.ts:100` → `signOut` → `clearPersonal`).
- **Wrong person:**
  - Admin ties web submissions to accounts by the phone typed into the quiz, and that number was never verified
    (`adminJourneys.ts:53,422,445`).
  - A typo or someone else's number puts the result on a stranger's timeline.
- **Fix:**
  - After OTP verification, the server claims the unclaimed submissions made with that phone (it's verified now) and
    turns them into assessments. Add `web_submissions.claimed_by`.
  - This works on any device and keeps every past result.
  - Admin links only claimed submissions. Unclaimed ones show as "unverified lead".

### 6. No record of where people came from  `[ ]`
- **What happens:**
  - Sign-ups and submissions store no source: no landing page, referrer or UTM, and not which CTA or invite brought
    them.
  - `patients` has no `signup_source`. Admin works it out after the fact.
  - The leftover `bh_sid` / `bh_sctx` keys in browsers come from code that was removed.
- **Conflict:** this contradicts the 2026-11-03 rule: "no analytics, tracking events, UTM tags or data
  collection" on the website.
- **Decision needed:** allow **first-party attribution only**? That means, at the moment of sign-up or submission,
  we save the landing page, referrer, UTM and CTA to our own database. No third-party scripts, no page-view events.
- **If yes:**
  - Add `signup_source`, `signup_cta` and `attribution jsonb` to the consumer.
  - Add the same fields to `web_submissions`.
  - Admin gets "Where sign-ups come from".

### 7. A website assessment taken while signed in is counted twice  `[x]`

> Done on `data-capture`: same result id → saved once, submission linked.
- **What happens:** it's saved as a `web_submissions` row and as an `assessments` row (`AssessmentRunner.astro:403-407`).
- **Fix:** when signed in, skip `recordSubmission`, or link the two rows (`web_submissions.assessment_id`). Then check
  the admin website KPIs.

---

## Phase 2: Matching and the people in the loop

### 8. Matching can pick any physio, including unverified and test accounts  `[ ]`
- **What happens:**
  - `suggestPhysio` scores every row in `physios`, with no check for verified, listed, accepting patients or having
    availability (`src/match.ts`).
  - The pain chat's fallback takes literally any physio (`routes/painChat.ts`, `physioFor`).
  - The city match is a substring check on free text: "Bangalore" vs "Bengaluru".
- **Fix:**
  - Define the eligible pool: verified, listed (live), has availability, takes teleconsults or works in the
    person's city, and not a test account.
  - Normalise cities to the directory's city list.
  - If nobody fits, send it to the admin queue rather than to "anyone".

### 9. The free consult permanently assigns the physio  `[ ]`
- **What happens:**
  - Booking the sponsored video consult sets `physio_id` and `match_status = 'confirmed'` straight away.
  - The person is locked to an auto-picked physio before they've even met them.
- **Fix:** the consult makes the physio "suggested". After the consult, the patient (or the physio) confirms the
  care relationship.
- **Decision needed:** confirm this is the product intent.

### 10. Nobody is told anything  `[ ]`
- **What happens:**
  - There are no WhatsApp templates for:
    - "you've been matched with Dr X" (patient)
    - "new patient assigned to you" (physio)
    - "new consumer waiting for a match" (admin)
  - The existing templates cover only OTPs, plans, prescriptions, bookings, replies, consents and invoices.
  - So a self sign-up sits on "Being matched" with no timeline and no nudge.
- **Fix:**
  - Add the three templates and send them on assign and auto-match.
  - Admin gets a "Waiting for a match" queue sorted by how long people have waited, with a target time (for
    example, 24 hours).
  - The patient's card shows "We'll match you within a day".

### 11. An unmatched patient has nothing to do  `[ ]`
- **What happens:** booking, messaging and classes are blocked until an admin assigns a physio (`withPhysio`). The
  only active path is the pain chat.
- **Fix:** turn the "Being matched" card into actions. Show the suggested physio with "Book free video consult", or
  let them pick from verified physios near them.

---

## Phase 3: Seamless, premium experience

### 12. They're asked for the same details twice  `[ ]`
- **What happens:** the quiz requires first name, email and phone before it shows the result. Then "Save my result"
  opens `/account/` with an empty phone field, and the sign-up asks for the name again.
- **Fix:**
  - Pre-fill the phone and name from the quiz.
  - Better: "Save my result" sends the WhatsApp code to the number they already typed. One tap, then the code.

### 13. The result page has too many CTAs  `[ ]`
- **What happens:** there are five: See my toolkit, Save to betterYou corner, Save my result, Get the app, and Save
  your recommendations for later. Two of them save to the browser and one saves to the account.
- **Fix:**
  - One primary action: "Save my result & get matched" (that's the OTP above).
  - One secondary action: the toolkit.
  - Merge the betterYou corner into the account once signed in.

### 14. Decide what the contact gate is for  `[ ]`
- **Question:** if we gate the result, should the gate be the account (a verified WhatsApp code)? Or do we show the
  result freely and offer the save?
- **Why decide:** today we collect an unverified phone, and that unverified phone is what causes problem 5.
- **Decision needed.**

### 15. Physio marketing is shown to patients in the app  `[ ]`
- **What happens:** the welcome and login screens show "for Physios… Patients never have to install anything" to
  everyone (`screens/auth/AuthLayout.tsx`). This was already noted on 2026-11-16 and is still there.
- **Fix:** make the brand panel role-aware. Patients see the patient story, and the neutral welcome screen gets a
  neutral one.

### 16. City is free text and optional  `[ ]`
- **What happens:** both sign-ups use a free-text city, and matching depends on it.
- **Fix:** a city picker built from the directory's cities, plus an optional pincode. Ask for it at sign-up with the
  reason ("to find a physio near you").

### 17. Sessions and hand-off codes  `[ ]`
- **Sessions:** a 30-day JWT with no refresh, so people get logged out abruptly. Add sliding renewal through
  `/me/bootstrap`.
- **Hand-off codes:** website ⇄ app codes are held in memory (`routes/account.ts:17`). They break on restarts and
  with more than one API instance. Move them to the database.

### 18. Check every screen at phone width and on a device  `[ ]`
- Most consumers will arrive on a phone. Walk the whole journey at 390px, and in the Android APK, including the
  embedded assessment.

---

## Phase 4: Admin shows the truth

### 19. Admin reflects the new data  `[ ]`
- **Each person's timeline:** consent and opt-in status, assessment answers, claimed versus unverified website
  submissions, and the source of the sign-up.
- **Funnel:** count **people** (consumers), not patient rows.
- **"Converted":** counts only submissions made *before* the account existed. Today it counts any phone that matches
  (`adminJourneys.ts:284`).

### 20. Data rights  `[ ]`
- There's no account deletion or data export. Under DPDP, people can ask for erasure.
- **Minimum:** "Delete my account" in the profile creates a request, and admin carries it out.

### 21. Known open items (from the session log)  `[ ]`
- `ADMIN_PHONES` on DigitalOcean.
- Shopify orders aren't in the journey (deferred).
- Production: real WhatsApp provider, remove `OTP_DEV_CODE`, betterhood.in domain, and CORS for betterhood.in.

---

## Decisions I need from you

| # | Question | My recommendation |
|---|---|---|
| 3 | Store assessment answers (health data)? | Yes. Visible to the matched physio and admins only. |
| 4 | One `consumers` record per phone above the patient rows? | Yes. It's the base for everything else. |
| 6 | First-party attribution at sign-up, despite the "no analytics" rule? | Yes, our own database only, no third-party scripts. |
| 9 | Does the free consult permanently assign the physio? | No. Suggested until confirmed after the consult. |
| 14 | Gate the result with a WhatsApp code, or show it freely? | Show it freely, and make saving one tap with the code. |

## Suggested order

1. **Phase 1, items 4 and 5:** the identity model and claiming on verification. Everything else builds on them.
2. **Items 1, 2, 3, 6 and 7:** capture consent, opt-in, answers and source.
3. **Phase 2:** matching pool, notifications and the unmatched state.
4. **Phase 3:** prefill, CTAs, role-aware screens and the city picker.
5. **Phase 4:** admin updates. Then a full click-through at phone width with you entering the codes.

Each item gets a branch, a migration where needed (starting with `set search_path = app;`), API checks on a
throwaway database, and a session-log entry.
