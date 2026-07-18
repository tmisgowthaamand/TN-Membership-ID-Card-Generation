# 📱 WhatsApp CRM — Deep End-to-End Feature Plan

> Research-only document. No code has been changed.
> Based on real codebase analysis of `webhook.js`, `admin.js`, `chat.js`, `whatsappService.js`, `GeneratedVoter` model, and existing admin panel pages.

---

## 1. Current System State (What Already Exists)

### What the WhatsApp Bot Already Does Today

Your `webhook.js` handles a full registration and card delivery flow on WhatsApp:

| User Action | Bot Response |
|---|---|
| Sends any text (new user) | Sends WhatsApp Flow (EPIC entry form via `sendFlowMessage`) |
| Fills registration form | Stores `pending_registrations` with voter name, assembly, district |
| Bot sees pending → sends photo upload CTA | `sendCtaUrlMessage` with tokenized `/upload/:token` link |
| User uploads photo | Puppeteer generates card → uploads to Cloudinary → sends image back |
| User texts again (existing member) | `sendReplyButtons` with "My Card" button |
| User taps "My Card" | `handleSendCard` — fetches `card_url` from MongoDB → sends image |

### WhatsApp Service Capabilities Already Wired
Defined in `whatsappService.js`:
- `sendTextMessage` — plain text
- `sendReplyButtons` — up to 3 interactive buttons
- `sendImageMessage` — send image by Cloudinary URL
- `sendFlowMessage` — WhatsApp Flow (registration/login)
- `sendCtaUrlMessage` — CTA button with URL

### Current MongoDB Collections (relevant)

| Collection | What it holds |
|---|---|
| `generated_voters` | All registered members (EPIC, mobile, assembly, district, card_url, photo_url, bjp_code, referral data, source) |
| `generation_stats` | Per-mobile card generation count + URLs |
| `pending_registrations` | Incomplete registrations awaiting photo |
| `processed_wamids` | WhatsApp message dedup IDs |
| `admin_otp_sessions` | Admin login OTPs |
| `otp_sessions` | Member login OTPs |

### Existing Admin Panel Pages

| Route | Page | What it shows |
|---|---|---|
| `/admin/dashboard` | DashboardPage | Aggregate stats |
| `/admin/voters` | VotersPage | Raw voter roll search |
| `/admin/generated-voters` | GeneratedVotersPage | All members with cards (paginated, searchable) |
| `/admin/generated-voters/:bjpCode` | GeneratedVoterDetailPage | Individual member detail |
| `/admin/volunteer-requests` | VolunteerRequestsPage | Organizer requests |
| `/admin/confirmed-volunteers` | ConfirmedVolunteersPage | Approved organizers |
| `/admin/booth-agent-requests` | BoothAgentRequestsPage | Booth agent applications |
| `/admin/confirmed-booth-agents` | ConfirmedBoothAgentsPage | Active booth agents |
| `/admin/reports` | ReportsPage | Analytics |
| `/admin/local-body` | LocalBodyPage | Local body requests |
| `/admin/meet-requests` | MeetRequestsPage | Meet/PM Requests |

### Current Admin Auth Model
- Single shared `admin` session (username + password OR OTP)
- `requireAdminAuth` middleware — checks `req.session.adminLoggedIn` only
- No role-based differentiation — all admins see all data
- Admin mobiles whitelisted in `config.admin.allowedMobiles`

---

## 2. What Needs to Be Built

The WhatsApp CRM adds three major layers on top of this:

1. **Admin Panel: WhatsApp CRM section** — hierarchy-based member views (State → District → Assembly), conversation logs, broadcast messaging
2. **User App: Sidebar additions** — pinned Appreciation Letter + locked CRM teaser
3. **RBAC** — role-aware admin sessions so different organizer levels see only their scope

---

## 3. Role-Based Access Control (RBAC) Design

### New Admin Roles

| Role | Scope | Who |
|---|---|---|
| `super_admin` | Entire Tamil Nadu | Central party leadership |
| `state_organizer` | All districts | State-level IT/organizing team |
| `district_organizer` | One assigned district | District president |
| `assembly_coordinator` | One assigned assembly | Assembly in-charge / IT volunteer |
| `booth_agent` | One assigned assembly (read-only) | Booth-level agent |

### Schema Change: `admin_users` Collection (NEW)

Currently admins are just a whitelist in config. We need a proper `admin_users` collection:

```
admin_users {
  _id
  mobile            : String (unique)     ← matches config whitelist
  name              : String
  role              : String              ← one of the 5 roles above
  assigned_district : String | null       ← for district_organizer
  assigned_assembly : String | null       ← for assembly_coordinator, booth_agent
  is_active         : Boolean
  created_at        : Date
  last_login        : Date
}
```

### How Role is Loaded at Login

- When admin passes OTP and session is established, backend queries `admin_users` by mobile
- `req.session.adminRole`, `req.session.adminDistrict`, `req.session.adminAssembly` are set
- New middleware `requireRole(allowedRoles)` wraps all CRM API routes

### Data Scoping Rules

```
super_admin          → no filter
state_organizer      → no filter (same as super)
district_organizer   → filter: DISTRICT_NAME = assignedDistrict
assembly_coordinator → filter: ASSEMBLY_NAME = assignedAssembly
booth_agent          → filter: ASSEMBLY_NAME = assignedAssembly (read-only)
```

---

## 4. Backend — New API Routes

All under `/admin/api/crm/*`, protected by `requireAdminAuth` + role middleware.

### 4.1 Summary & Hierarchy APIs

```
GET /admin/api/crm/summary
```
Returns: total members, WhatsApp-sourced count, pending count, top 5 assemblies by count.
Scope: filtered by admin role automatically.

```
GET /admin/api/crm/state-overview
```
Returns: district-wise breakdown — `[{ district, member_count, pending_count, last_activity }]`
Access: `super_admin`, `state_organizer` only.

```
GET /admin/api/crm/district/:districtName
```
Returns: assembly-wise breakdown within a district + member list (paginated, 20/page).
Access: district level and above.

```
GET /admin/api/crm/assembly/:assemblyName
```
Returns: all members in assembly — name, EPIC, mobile (masked), card status, photo status, joined date, referral count, source (whatsapp/web).
Access: all admin levels (scoped).

### 4.2 Member APIs

```
GET /admin/api/crm/member/:bjpCode
```
Returns: full member profile — voter details, card URL, photo URL, source, dates, referral stats, admin notes, last WhatsApp interaction time.

```
POST /admin/api/crm/member/:bjpCode/note
Body: { note: string }
```
Adds an admin note to `crm_notes` collection (timestamped, tagged with admin mobile).

```
POST /admin/api/crm/member/:bjpCode/resend-card
```
Re-sends member's card image to their WhatsApp using existing `sendImageMessage`.

```
GET /admin/api/crm/member/:bjpCode/messages?page=1
```
Returns paginated WhatsApp conversation history for this member.

### 4.3 Pending Registration APIs

```
GET /admin/api/crm/pending?district=X&assembly=Y&page=1
```
Returns all `pending_registrations` (status = awaiting_photo) scoped by admin role.

```
POST /admin/api/crm/pending/:mobile/remind
```
Sends a CTA reminder via `sendCtaUrlMessage` to that mobile. Updates `last_reminded_at`.

```
DELETE /admin/api/crm/pending/:mobile
```
Clears a stale pending registration.

### 4.4 Broadcast APIs

```
POST /admin/api/crm/broadcast/text
Body: { scope, target, message, source_filter }
```

```
POST /admin/api/crm/broadcast/card
Body: { scope, target, source_filter }
← sends each member their own personal card_url image
```

```
POST /admin/api/crm/broadcast/reminder
Body: { scope, target }
← sends upload-photo reminders to all pending in scope
```

```
GET /admin/api/crm/broadcast/history
← past broadcasts: time, scope, target, count, delivered, failed
```

```
GET /admin/api/crm/broadcast/status/:jobId
← real-time progress of a running broadcast
```

All broadcasts are queued (non-blocking), run via background worker, and respect Meta's rate limits.

### 4.5 Admin User Management APIs

```
GET    /admin/api/crm/admin-users         ← list (super_admin only)
POST   /admin/api/crm/admin-users         ← create new admin user
PUT    /admin/api/crm/admin-users/:id     ← update role/assignment
DELETE /admin/api/crm/admin-users/:id     ← deactivate
```

---

## 5. Frontend — WhatsApp CRM Pages

### 5.1 New Routes Added to App.jsx

```
/admin/whatsapp-crm                  → CRMRootPage (role redirect)
/admin/whatsapp-crm/state            → CRMStateView
/admin/whatsapp-crm/district/:name   → CRMDistrictView
/admin/whatsapp-crm/assembly/:name   → CRMAssemblyView
/admin/whatsapp-crm/member/:bjpCode  → CRMMemberDetailPage
/admin/whatsapp-crm/broadcast        → CRMBroadcastPage
/admin/whatsapp-crm/pending          → CRMPendingPage
/admin/whatsapp-crm/admin-users      → CRMAdminUsersPage
```

### 5.2 Admin Sidebar (AdminLayout.jsx)

NAV_ITEMS gets a new CRM group (rendered based on session role):

```
--- existing ---
Dashboard | Voters | Generated Members | Organizer Requests | ...

--- NEW: WhatsApp CRM ---
💬  WhatsApp CRM
    ├── 📊  State Overview       (super/state only)
    ├── 📋  Pending Members      (scoped)
    ├── 📢  Broadcast            (district+ only)
    └── 👥  Admin Users          (super only)
```

### 5.3 CRMRootPage
Fetches admin session role → redirects to appropriate level view automatically.

### 5.4 CRMStateView
- Top stats bar: Total | WhatsApp | Web | Pending | Today's new
- District breakdown table: District | Members | Pending | Last activity
- Clickable rows → drills to CRMDistrictView
- Source filter (All / WhatsApp / Web), Date range filter
- Export CSV button

### 5.5 CRMDistrictView
**URL:** `/admin/whatsapp-crm/district/:districtName`
**Breadcrumb:** Tamil Nadu → District Name

- District summary (totals, WhatsApp %, card generated %)
- Assembly breakdown table (clickable rows → CRMAssemblyView)
- Member list below (paginated, filterable by assembly/source/card status)
- Broadcast to this district button

### 5.6 CRMAssemblyView
**URL:** `/admin/whatsapp-crm/assembly/:assemblyName`
**Breadcrumb:** Tamil Nadu → District → Assembly Name

- Assembly summary card
- Top 5 referral leaderboard
- Member table: # | Photo | Name | EPIC | Mobile (masked) | Source | Card | Photo | Joined | Referrals | Actions
- Per-row action: "Re-send Card" button (WhatsApp members only)

### 5.7 CRMMemberDetailPage
**URL:** `/admin/whatsapp-crm/member/:bjpCode`
**Breadcrumb:** Tamil Nadu → District → Assembly → Member Name

Two-column layout:

**Left column:**
- Member photo thumbnail
- Card preview image (from Cloudinary)
- Download card button
- "Re-send via WhatsApp" button

**Right column:**
- Full voter details + source badge + dates
- Referral tree: referred-by → this member → [N members referred]
- CRM tags (editable by admin)
- Admin notes (input + timestamp list)

**Bottom panel: WhatsApp Conversation Log**
- Timeline: direction arrow | timestamp | message type icon | content
- Paginated, 20 per page

### 5.8 CRMBroadcastPage
Three-step form:

**Step 1 — Audience:** Scope (All/District/Assembly/Pending) → target dropdown → source filter → preview count

**Step 2 — Message:** Type (Text/Card Image/Reminder) → message text area → WhatsApp preview panel

**Step 3 — Confirm:** Summary → Send button → queues job → shows progress toast

**Broadcast History table** at bottom.

### 5.9 CRMPendingPage
Table of all pending registrations in admin scope:
Name | EPIC | Assembly | Registered | Waiting since | Last reminded | Actions (Remind / Delete)

Bulk: Select stale → Bulk Remind / Bulk Delete.

### 5.10 CRMAdminUsersPage (super_admin only)
List of all admin users.
Actions: Add New (modal: name, mobile, role, district/assembly assignment) | Edit | Deactivate.

---

## 6. User App — Sidebar Additions (ChatbotPage.jsx)

### 6.1 Appreciation Letter — Pinned Sidebar Item

**Show condition:** `cardData.card_url` exists (card generated)

```
✉️  Appreciation Letter
    View & download your letter
```

On click → opens PDF URL in new tab.
If no card → shows tooltip "Generate your card first".

### 6.2 WhatsApp CRM — Locked Teaser

Always visible to logged-in members with lock icon.

```
🔒  WhatsApp CRM
    For Assembly Coordinators
```

On click → bottom sheet modal:
```
"This feature is for Assembly Coordinators and above.
 Apply to become an Organizer to unlock it."
[Apply to be an Organizer →]
```

**Unlock condition:** If `volunteer_status === 'confirmed'` OR `booth_agent_status === 'confirmed'` in the member's profile → lock disappears → link navigates directly to `/admin/whatsapp-crm` (admin login if not already logged in).

---

## 7. New MongoDB Collections

| Collection | Purpose |
|---|---|
| `admin_users` | Admin role + scope assignments |
| `whatsapp_messages` | Logged conversation per mobile |
| `broadcast_jobs` | Queue + status of broadcast jobs |
| `broadcast_logs` | Per-recipient send result |
| `crm_notes` | Admin notes on members |

### New Fields on Existing Collections

`generated_voters`:
- `last_whatsapp_at: Date` — updated each incoming message
- `crm_tags: [String]` — admin labels ('VIP', 'Verified', etc.)

`pending_registrations`:
- `last_reminded_at: Date`
- `reminder_count: Number`

---

## 8. WhatsApp Message Logging

Currently `webhook.js` processes but does not store messages. Logging must be added:

**Inbound:** In `processMessage()`, before processing logic, insert to `whatsapp_messages`:
```js
{ mobile, wamid, direction: 'inbound', type, content, timestamp, context_state }
```

**Outbound:** After each successful `sendTextMessage` / `sendImageMessage` / etc. in `whatsappService.js`:
```js
{ mobile, wamid: responseData.messages[0].id, direction: 'outbound', type, content, timestamp }
```

Both are fire-and-forget — never block main message flow.

---

## 9. Broadcast System Design

### Rate Limits to Respect
- Meta WhatsApp Business API: 1,000 conversations/month (free tier)
- Paid tier: scales with business tier (Tier 1: 1k/day, Tier 2: 10k/day, Tier 3: 100k/day)
- Max send rate: ~10 messages/second safe limit

### Broadcast Flow
1. Admin submits request → backend creates `broadcast_job` → returns jobId
2. Background worker picks up queued jobs
3. Fetches target member list (scoped, paginated in batches of 50)
4. Calls appropriate `whatsappService` function per member
5. Updates `broadcast_job.sent` / `.failed` after each batch
6. Logs each result to `broadcast_logs`
7. Admin polls `/broadcast/status/:jobId` for progress

### Templates Required from Meta
| Template | Use Case |
|---|---|
| `member_card_reminder` | Remind pending to upload photo |
| `welcome_card` | Re-send card image to member |
| `general_announcement` | Custom text broadcast |
| `referral_nudge` | Encourage referrals |

Meta template approval is required before any business-initiated broadcast goes live.

---

## 10. Phased Build Order

### Phase 1 — RBAC + Logging Foundation
- Create `admin_users` collection, seed super admin
- Extend admin login: load role from `admin_users` → save in session
- Add `requireRole()` middleware
- Add WhatsApp message logging (inbound + outbound)

### Phase 2 — Admin Panel CRM Core
- CRM sidebar section in `AdminLayout.jsx`
- `CRMRootPage` (role redirect)
- `CRMStateView` + district backend route
- `CRMDistrictView` + assembly backend route
- `CRMAssemblyView` + member list backend route

### Phase 3 — Member Detail + Conversation
- `CRMMemberDetailPage`
- Member detail backend route
- Conversation log timeline component
- Admin notes CRUD

### Phase 4 — Pending + Broadcast
- `CRMPendingPage` + remind/delete APIs
- `CRMBroadcastPage` UI
- Broadcast backend: job queue + background sender
- Broadcast history panel

### Phase 5 — User Sidebar
- Pin Appreciation Letter in ChatbotPage sidebar
- Locked CRM teaser sidebar item
- CRM unlock logic based on volunteer/booth_agent status

### Phase 6 — Admin User Management
- `CRMAdminUsersPage` + CRUD APIs
- Role-based sidebar visibility polish

---

## 11. What Stays Completely Unchanged

- Registration chatbot flow in `webhook.js` — untouched
- User card generation in `chat.js` — untouched
- Cloudinary uploads — untouched
- Existing admin pages — untouched (no edits, only additions)
- Frontend routing — only additions, no changes to existing routes
- Member OTP authentication — untouched

---

> [!IMPORTANT]
> Everything in Phase 1 is pure backend. Starting it immediately means WhatsApp conversation data starts accumulating in MongoDB before any UI exists — so when Phase 3 UI lands, all historical data is already there.

> [!NOTE]
> The broadcast system's biggest dependency is Meta template approval, which takes 1–7 days. Submit templates in parallel while building Phase 1–3.

> [!TIP]
> The entire CRM reads from collections your registration bot already writes to. Zero schema breakage. The only net-new data is `admin_users`, `whatsapp_messages`, and broadcast collections.
