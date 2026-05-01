# Onboarding Tracker — Product Specification

**Version:** 1.0.0  
**Date:** 2025-04-30  
**Status:** Draft  

---

## 1. Overview

### 1.1 Product Vision

Onboarding Tracker is a Trello-like kanban board system purpose-built for **client onboarding progression tracking**. It enables internal teams (admin + delivery) to create and manage onboarding boards from templates, while clients follow progress in real time via a unique public URL — no login required.

### 1.2 Problem Statement

During client onboarding, teams struggle to provide transparent, professional progress visibility. Current approaches (spreadsheets, email threads, generic project tools) are either invisible to clients or require client authentication, creating friction. Onboarding Tracker solves this by providing a branded, read-only kanban view that clients access instantly via a link.

### 1.3 Target Users

| Persona | Description |
|---|---|
| **Admin** | Creates templates, manages team members, configures branding and webhooks. Has full system access. |
| **Team Member (Delivery)** | Executes onboarding boards — creates cards, moves them through lists, uploads documents, adds comments. Cannot manage templates or team settings. |
| **Client** | External stakeholder who views the onboarding board via a public link. Read-only access. No account required. |

---

## 2. User Stories

### 2.1 Authentication & User Management

| ID | Story | Acceptance Criteria |
|---|---|---|
| US-001 | As an admin, I want to register team members so they can access the system | Admin provides email, display name, and role. Member receives welcome email (if email configured). Member appears in member list. |
| US-002 | As a team member, I want to log in with email and password so I can access my boards | Enter email + password → JWT token issued → redirected to dashboard. Invalid credentials show error message. |
| US-003 | As a team member, I want to update my profile so my info is current | Can change display name, avatar, and password. Cannot change own role. |
| US-004 | As an admin, I want to change a member's role so I can control permissions | Admin can set role to 'admin' or 'member'. Changing from admin to member is blocked if they're the last admin. |
| US-005 | As an admin, I want to remove a member so departed team members lose access | Member is removed. Their comments and card assignments remain (with "Deleted User" fallback). |

### 2.2 Templates

| ID | Story | Acceptance Criteria |
|---|---|---|
| US-010 | As an admin, I want to create onboarding templates so I can standardize the process | Template has name, description, category, and contains lists with cards. Template is saved and appears in template list. |
| US-011 | As an admin, I want to organize templates by category so I can find the right one quickly | Categories have name and description. Templates can be assigned to one category. Templates can be filtered by category. |
| US-012 | As an admin, I want to define template variables so boards are personalized automatically | Variables have key (e.g. `client_name`), display name, default value, and required flag. Variables appear in template list/card titles as `{{key}}`. |
| US-013 | As an admin, I want template cards to have relative due dates so deadlines are set automatically | Card has "due date offset in days from board creation". When template is applied, card due date = board creation date + offset. |
| US-014 | As a team member, I want to apply a template to create a new board so I can start onboarding quickly | Select template → fill in required variables → board created with all lists, cards, and resolved variables. Board is immediately visible in dashboard. |
| US-015 | As an admin, I want to duplicate a template so I can create variations without starting from scratch | Duplicate creates a new template with same lists, cards, and variables. Copy has "(Copy)" suffix in name. |
| US-016 | As an admin, I want to edit a template so I can improve the onboarding process over time | Changes to template do NOT affect boards already created from it. Only new boards will use updated template. |

### 2.3 Boards

| ID | Story | Acceptance Criteria |
|---|---|---|
| US-020 | As a team member, I want to create a board from scratch so I can handle unique onboarding cases | Board requires title and client name. Board gets a unique slug and public access token. Board appears in dashboard. |
| US-021 | As a team member, I want to create a board from a template so standard onboardings are fast | Choose template → fill variables → board created with resolved content. Template reference is stored on board. |
| US-022 | As a team member, I want to see all boards in a dashboard so I can track all active onboardings | Dashboard shows board list with status, client name, completion %, assignees, last updated. Can filter by status and search by client name. |
| US-023 | As a team member, I want to see board metrics so I understand the overall onboarding health | Dashboard shows: total boards, active count, completed count, average completion percentage. |
| US-024 | As a team member, I want to edit board details so client info stays current | Can change title, description, client name, client email. Changes are reflected immediately. |
| US-025 | As a team member, I want to archive a completed board so it doesn't clutter the dashboard | Board status changes to 'archived'. Archived boards don't appear in default view but can be filtered. Client public link still works. |
| US-026 | As a team member, I want to mark a board as completed so the client sees the milestone | Board status changes to 'completed'. Client notification email sent (if client email configured). Webhook `board.completed` fired. |
| US-027 | As a team member, I want to regenerate the public access token so old links become invalid | New token generated. Old link returns 404. New link works immediately. |

### 2.4 Lists

| ID | Story | Acceptance Criteria |
|---|---|---|
| US-030 | As a team member, I want to add lists to a board so I can organize onboarding phases | List requires title. Position is set after existing lists. Optional color. |
| US-031 | As a team member, I want to rename a list so the phase labels stay accurate | Inline edit on list title. Cannot be empty. |
| US-032 | As a team member, I want to reorder lists via drag-and-drop so the board flow matches reality | Dragging a list changes its position. Position is persisted. Other lists shift accordingly. |
| US-033 | As a team member, I want to delete a list so I can remove obsolete phases | Delete confirmation required. All cards in list are deleted (cascade). This action is irreversible. |
| US-034 | As a team member, I want to set a list color so phases are visually distinct | Color picker on list header. Color appears as accent on list header background. |

### 2.5 Cards

| ID | Story | Acceptance Criteria |
|---|---|---|
| US-040 | As a team member, I want to create cards so I can define individual tasks/steps | Card requires title. Card is added at the bottom of the list. Optional description and due date. |
| US-041 | As a team member, I want to move cards between lists via drag-and-drop so I can track progress | Dragging card to another list updates its `list_id`. Position within new list is set appropriately. |
| US-042 | As a team member, I want to reorder cards within a list so priority is clear | Dragging card within same list changes position. |
| US-043 | As a team member, I want to assign team members to a card so responsibilities are clear | One or more members can be assigned. Assignee avatars appear on card. Assignee receives in-app notification. |
| US-044 | As a team member, I want to set a due date on a card so deadlines are tracked | Date picker sets due date. Overdue cards show red indicator. Due-in-3-days triggers notification for assignees. |
| US-045 | As a team member, I want to write a description on a card so details are captured | Markdown editor with preview. Description supports template variable syntax highlighting for template cards. |
| US-046 | As a team member, I want a card to be marked as completed automatically when moved to a "Done" list | When card is moved to a list whose title contains "done", "complete", or "concluíd" (case-insensitive), `completed_at` is set. Card shows checkmark. |
| US-047 | As a team member, I want to un-complete a card when moved out of a "Done" list | `completed_at` is cleared. Board stats update immediately. |
| US-048 | As a team member, I want to delete a card so obsolete tasks are removed | Delete confirmation required. Comments, attachments, and assignments are cascade-deleted. |

### 2.6 Comments

| ID | Story | Acceptance Criteria |
|---|---|---|
| US-050 | As a team member, I want to add a comment to a card so context is documented | Comment requires content. Must select visibility: "internal" (team only) or "client" (visible to client). |
| US-051 | As a team member, I want to edit my own comment so I can fix mistakes | Only the comment author can edit. Edit updates `updated_at`. |
| US-052 | As a team member, I want to delete a comment so inappropriate content is removed | Author can delete own comment. Admin can delete any comment. Deletion is permanent. |
| US-053 | As a team member, I want to filter comments by visibility so I can focus on the right context | Tabs: "All", "Internal", "Client". Each tab shows only matching comments. |
| US-054 | As a client, I want to see comments visible to me so I understand what's happening | Public view shows only comments with `visibility = 'client'`. No filter UI needed — only client-visible shown. |

### 2.7 Attachments

| ID | Story | Acceptance Criteria |
|---|---|---|
| US-060 | As a team member, I want to upload attachments to a card so related files are organized | File is uploaded to S3-compatible storage. Attachment record created with file name, size, mime type, and visibility. |
| US-061 | As a team member, I want to set attachment visibility so sensitive files are hidden from clients | Each attachment has visibility: "internal" or "client". Default is "client". Can toggle after upload. |
| US-062 | As a team member, I want to delete an attachment so outdated files are removed | File is deleted from S3 + database record removed. |
| US-063 | As a client, I want to download attachments shared with me so I can access deliverables | Public view shows download links only for `visibility = 'client'` attachments. |

### 2.8 Labels

| ID | Story | Acceptance Criteria |
|---|---|---|
| US-070 | As a team member, I want to create labels for a board so I can categorize cards | Label has name and hex color. Labels are board-scoped. |
| US-071 | As a team member, I want to assign labels to cards so they're visually categorized | Colored dots appear on card. Multiple labels per card allowed. |
| US-072 | As a team member, I want to remove a label from a card so categorization stays accurate | Remove does not delete the label — only unassigns it from the card. |
| US-073 | As a team member, I want to edit and delete labels so board taxonomy evolves | Editing label updates it on all assigned cards. Deleting label removes it from all cards. |

### 2.9 Public Board View (Client)

| ID | Story | Acceptance Criteria |
|---|---|---|
| US-080 | As a client, I want to access my onboarding board via a link so I can track progress | URL format: `/b/{public_token}`. No login required. Board loads with all lists and cards. |
| US-081 | As a client, I want to see the company branding so I know who's managing my onboarding | Logo and primary color from settings are applied. Company name displayed in header. |
| US-082 | As a client, I want to see which tasks are done so I know how far along we are | Completed cards show checkmark. Completion percentage is displayed. Cards in "Done" lists are visually distinct. |
| US-083 | As a client, I want to read comments shared with me so I'm informed | Only `visibility = 'client'` comments are shown, with author name and date. |
| US-084 | As a client, I want to download shared attachments so I can access deliverables | Only `visibility = 'client'` attachments show download links. |
| US-085 | As a client, I want to see due dates so I know timelines | Due dates visible on cards. Overdue indicators shown. |
| US-086 | As a client, I do NOT want to see internal-only information | Internal comments, internal attachments, and internal team discussions are completely hidden. No indication they exist. |

### 2.10 Notifications

| ID | Story | Acceptance Criteria |
|---|---|---|
| US-090 | As a team member, I want to receive in-app notifications so I stay informed | Bell icon in header with unread count. Click → notification list. Each notification has title, message, related board/card link. |
| US-091 | As a team member, I want to be notified when a card is assigned to me | Notification created immediately. Type: 'card.assigned'. |
| US-092 | As a team member, I want to be notified when my cards are due soon | Notification 3 days before due date. Type: 'card.due_soon'. |
| US-093 | As a team member, I want to be notified when my cards are overdue | Daily cron check creates notification. Type: 'card.overdue'. |
| US-094 | As a team member, I want to mark notifications as read so my inbox stays clean | Individual mark-as-read and "mark all as read" available. |
| US-095 | As a client, I want to receive an email when important milestones are reached | Emails sent on: board created, card completed (in "Done" list), board completed. Email includes board title, summary, and CTA link. Only if `client_email` is set. |
| US-096 | As a client, I want the email to look professional and branded | Email uses company logo, primary color, and React Email templates. Sender is the configured email. |

### 2.11 Webhooks

| ID | Story | Acceptance Criteria |
|---|---|---|
| US-100 | As an admin, I want to configure webhooks so external systems react to onboarding events | Webhook has URL, events (multi-select), and HMAC secret. Can be toggled active/inactive. |
| US-101 | As an admin, I want to test a webhook so I verify it's working | Test button sends sample payload to URL. Shows success/failure result. |
| US-102 | As a system, I want webhook payloads to be signed so the receiver can verify authenticity | `X-Webhook-Signature` header contains `sha256={hmac}` using webhook secret. |
| US-103 | As a system, I want failed webhook deliveries to retry so events aren't lost | 3 retry attempts with exponential backoff (1s, 2s, 4s). If all fail, webhook is logged but not blocked. |
| US-104 | As an admin, I want to choose which events trigger each webhook so I filter noise | Available events: `board.created`, `board.completed`, `card.created`, `card.moved`, `card.completed`, `card.overdue`. Multi-select. |

### 2.12 Settings & Branding

| ID | Story | Acceptance Criteria |
|---|---|---|
| US-110 | As an admin, I want to set company branding so the client view looks professional | Company name, logo (image upload), primary color (hex picker). Applied to public board view header and email templates. |
| US-111 | As an admin, I want to configure email sender so notifications come from our domain | Email from address configured. SMTP credentials or Resend API key. Test email button to verify. |
| US-112 | As an admin, I want to manage webhooks from settings so integration is centralized | Webhooks CRUD under Settings → Webhooks tab. |
| US-113 | As a system, I want branding settings to be publicly accessible so the client view can load without auth | `GET /settings/public` returns logo URL, primary color, and company name. No authentication required. |

### 2.14 Dashboard & Metrics

| ID | Story | Acceptance Criteria |
|---|---|---|
| US-120 | As a team member, I want to see an overview of all onboarding boards so I can prioritize | Board list with: title, client name, status badge (active/completed/archived), completion % bar, assignee avatars, last updated. |
| US-121 | As a team member, I want to filter boards by status so I can focus on active work | Filter tabs: All, Active, Completed, Archived. Search by client name or board title. |
| US-122 | As a team member, I want to see aggregate metrics so I understand team performance | Stats: total boards, active count, completed count, average completion %. Updated in real-time (on refresh). |
| US-123 | As a team member, I want to see recent activity so I know what changed recently | Last 20 actions across all boards: card moves, comments, completions. |

---

## 3. Functional Requirements

### 3.1 FR-AUTH: Authentication

| ID | Requirement | Priority |
|---|---|---|
| FR-AUTH-001 | System shall provide email + password login for internal users | Must |
| FR-AUTH-002 | System shall issue JWT tokens on successful login | Must |
| FR-AUTH-003 | System shall protect all internal API endpoints with JWT validation | Must |
| FR-AUTH-004 | System shall provide public access to boards via signed URL token | Must |
| FR-AUTH-005 | System shall support two user roles: 'admin' and 'member' | Must |
| FR-AUTH-006 | System shall prevent the last admin from being demoted to member | Must |

### 3.2 FR-BOARD: Board Management

| ID | Requirement | Priority |
|---|---|---|
| FR-BOARD-001 | System shall allow creating boards from scratch | Must |
| FR-BOARD-002 | System shall allow creating boards from templates with variable substitution | Must |
| FR-BOARD-003 | Each board shall have a unique public access token (32-char random) | Must |
| FR-BOARD-004 | System shall auto-generate URL-friendly slugs for boards | Must |
| FR-BOARD-005 | System shall track board status: active, completed, archived | Must |
| FR-BOARD-006 | System shall calculate and store board completion percentage | Must |
| FR-BOARD-007 | System shall allow board title, description, client name, and client email to be updated | Must |
| FR-BOARD-008 | System shall allow regenerating the public access token | Should |
| FR-BOARD-009 | System shall allow archiving and deleting boards (admin only) | Must |

### 3.3 FR-LIST: List Management

| ID | Requirement | Priority |
|---|---|---|
| FR-LIST-001 | System shall allow creating, updating, and deleting lists within boards | Must |
| FR-LIST-002 | System shall support list reordering via position field | Must |
| FR-LIST-003 | System shall support optional list color | Should |
| FR-LIST-004 | Deleting a list shall cascade-delete all cards within it | Must |

### 3.4 FR-CARD: Card Management

| ID | Requirement | Priority |
|---|---|---|
| FR-CARD-001 | System shall allow creating, updating, and deleting cards within lists | Must |
| FR-CARD-002 | System shall support drag-and-drop card movement between lists and within lists | Must |
| FR-CARD-003 | System shall auto-detect card completion when moved to a list with title containing "done", "complete", or "concluíd" | Must |
| FR-CARD-004 | System shall set `completed_at` timestamp on completion | Must |
| FR-CARD-005 | System shall clear `completed_at` when card moves out of a completion list | Must |
| FR-CARD-006 | System shall support optional due date on cards | Must |
| FR-CARD-007 | System shall support card description in markdown | Must |
| FR-CARD-008 | System shall support multiple assignees per card | Must |
| FR-CARD-009 | System shall support multiple labels per card | Must |

### 3.5 FR-COMMENT: Comments

| ID | Requirement | Priority |
|---|---|---|
| FR-COMMENT-001 | System shall support comments on cards | Must |
| FR-COMMENT-002 | Each comment shall have a visibility level: 'internal' or 'client' | Must |
| FR-COMMENT-003 | Public board view shall only show comments with 'client' visibility | Must |
| FR-COMMENT-004 | System shall allow comment authors to edit their own comments | Must |
| FR-COMMENT-005 | System shall allow comment authors and admins to delete comments | Must |
| FR-COMMENT-006 | System shall support markdown content in comments | Should |

### 3.6 FR-ATTACH: Attachments

| ID | Requirement | Priority |
|---|---|---|
| FR-ATTACH-001 | System shall support file upload on cards via S3-compatible storage | Must |
| FR-ATTACH-002 | Each attachment shall have a visibility level: 'internal' or 'client' | Must |
| FR-ATTACH-003 | Public board view shall only show attachments with 'client' visibility | Must |
| FR-ATTACH-004 | System shall allow deleting attachments (removes from both S3 and DB) | Must |
| FR-ATTACH-005 | Maximum file size shall be 10MB | Must |
| FR-ATTACH-006 | Supported file types: images, PDFs, documents, spreadsheets | Must |

### 3.7 FR-TEMPLATE: Templates

| ID | Requirement | Priority |
|---|---|---|
| FR-TEMPL-001 | System shall support creating, editing, duplicating, and deleting templates | Must |
| FR-TEMPL-002 | Templates shall contain lists and cards that define the onboarding structure | Must |
| FR-TEMPL-003 | Templates shall support variables (key/value pairs) for dynamic content | Must |
| FR-TEMPL-004 | Variable substitution shall replace `{{key}}` in list titles, card titles, and card descriptions | Must |
| FR-TEMPL-005 | Template cards shall support due date offset (days from board creation) | Must |
| FR-TEMPL-006 | Templates shall be organized by categories | Must |
| FR-TEMPL-007 | Applying a template shall create a board with resolved variables and calculated due dates | Must |
| FR-TEMPL-008 | Changes to a template shall not affect boards already created from it | Must |

### 3.8 FR-NOTIF: Notifications

| ID | Requirement | Priority |
|---|---|---|
| FR-NOTIF-001 | System shall create in-app notifications for team members on key events | Must |
| FR-NOTIF-002 | Notification events: card assigned, card due in 3 days, card overdue | Must |
| FR-NOTIF-003 | System shall support marking individual and all notifications as read | Must |
| FR-NOTIF-004 | System shall send emails to clients on milestones: board created, card completed, board completed | Should |
| FR-NOTIF-005 | Client emails shall use branded React Email templates | Should |
| FR-NOTIF-006 | System shall run a daily cron job to detect overdue cards | Must |

### 3.9 FR-WEBHOOK: Webhooks

| ID | Requirement | Priority |
|---|---|---|
| FR-WEBH-001 | System shall support creating, updating, deleting, and toggling webhooks | Must |
| FR-WEBH-002 | Webhooks shall be configurable per event type | Must |
| FR-WEBH-003 | Webhook payloads shall include HMAC signature in `X-Webhook-Signature` header | Must |
| FR-WEBH-004 | Failed webhook deliveries shall retry up to 3 times with exponential backoff | Must |
| FR-WEBH-005 | System shall provide a test endpoint to verify webhook configuration | Should |

### 3.10 FR-BRAND: Branding

| ID | Requirement | Priority |
|---|---|---|
| FR-BRAND-001 | System shall allow admin to configure company name, logo, and primary color | Must |
| FR-BRAND-002 | Branding shall be applied to public board view and client emails | Must |
| FR-BRAND-003 | Public branding endpoint shall be accessible without authentication | Must |

### 3.11 FR-DASH: Dashboard

| ID | Requirement | Priority |
|---|---|---|
| FR-DASH-001 | System shall provide a board list with status, completion %, assignees, and last updated | Must |
| FR-DASH-002 | System shall provide board list filtering by status and search by client/title | Must |
| FR-DASH-003 | System shall provide aggregate stats: total boards, by status counts, avg completion | Must |
| FR-DASH-004 | System shall provide a recent activity feed across all boards | Should |

---

## 4. Non-Functional Requirements

| ID | Requirement | Priority |
|---|---|---|
| NFR-001 | System shall support up to 100 concurrent internal users | Must |
| NFR-002 | API response time shall be under 500ms for all endpoints under normal load | Must |
| NFR-003 | System shall use HTTPS in production | Must |
| NFR-004 | Public board tokens shall be at minimum 32 characters of cryptographic randomness | Must |
| NFR-005 | Passwords shall be hashed with bcrypt (min 10 rounds) | Must |
| NFR-006 | JWT tokens shall expire after 24 hours | Must |
| NFR-007 | System shall be deployable via Docker Compose | Must |
| NFR-008 | System shall support PostgreSQL 17 | Must |
| NFR-009 | All API inputs shall be validated with Zod schemas | Must |
| NFR-010 | Public endpoints shall be rate-limited (100 requests/minute per IP) | Should |
| NFR-011 | Frontend shall be responsive (desktop and tablet, mobile best-effort) | Should |
| NFR-012 | System shall support light and dark theme | Could |

---

## 5. Business Rules

### BR-001: Card Completion Detection

A card is considered "completed" when it is moved to a list whose title (case-insensitive, trimmed) contains any of the following substrings:
- `done`
- `complete`
- `concluído`
- `concluido`
- `finalizado`

When this condition is met, `completed_at` is set to the current timestamp. When a card is moved OUT of such a list, `completed_at` is cleared.

### BR-002: Board Completion Calculation

```
board.completion_percentage = (cards_with_completed_at_not_null / total_cards) * 100
```

Rounded to nearest integer. If board has 0 cards, completion is 0%.

A board is automatically marked as "completed" (status → 'completed') when ALL its cards have `completed_at` set.

### BR-003: Template Variable Resolution

- Variables use `{{key}}` syntax
- Only word characters (`[a-zA-Z0-9_]`) in key names
- If a key is not provided during template application, and no default exists, the `{{key}}` text remains as-is
- If a default is defined and no value provided, the default is used
- Resolution is applied to: template name (as board title default), list titles, card titles, card descriptions

### BR-004: Due Date Offset

- Template card `due_date_offset_days` is an integer (nullable)
- On board creation from template: `card.due_date = board.created_at + offset_days`
- If offset is null, card has no due date
- If offset is 0, due date is the same day as board creation

### BR-005: Comment/Attachment Visibility

- Both comments and attachments have a `visibility` field: `'internal'` or `'client'`
- Default for new comments: `'internal'`
- Default for new attachments: `'client'`
- Public board API endpoint filters: only returns `visibility = 'client'` items
- There is no indication to the client that internal items exist

### BR-006: Public Token Security

- Token is 32 characters from `crypto.randomUUID()` (stripped hyphens) or `crypto.randomBytes(24).toString('hex')`
- Token is unique per board (database UNIQUE constraint)
- Admin can regenerate token via board settings
- Old token becomes invalid immediately on regeneration
- Rate limiting applies to public endpoint

### BR-007: Role Permissions Matrix

| Action | Admin | Member |
|---|---|---|
| Login | ✅ | ✅ |
| View all boards | ✅ | ✅ |
| Create board from scratch | ✅ | ✅ |
| Create board from template | ✅ | ✅ |
| Edit board details | ✅ | ✅ |
| Manage lists/cards/comments/attachments | ✅ | ✅ |
| View dashboard metrics | ✅ | ✅ |
| Manage own profile | ✅ | ✅ |
| Create/edit/delete templates | ✅ | ❌ |
| Manage team members | ✅ | ❌ |
| Change settings/branding | ✅ | ❌ |
| Manage webhooks | ✅ | ❌ |
| Archive/delete boards | ✅ | ❌ |
| Change other users' roles | ✅ | ❌ |
| Access public board view | N/A | N/A (no auth) |

### BR-008: Webhook Events and Payloads

| Event | Trigger | Payload Fields |
|---|---|---|
| `board.created` | Board created | `event`, `timestamp`, `board.id`, `board.title`, `board.clientName`, `board.status` |
| `board.completed` | All cards completed | `event`, `timestamp`, `board.id`, `board.title`, `board.clientName` |
| `card.created` | Card created | `event`, `timestamp`, `card.id`, `card.title`, `card.listId`, `board.id`, `board.title` |
| `card.moved` | Card changed lists | `event`, `timestamp`, `card.id`, `card.title`, `fromList.id`, `fromList.title`, `toList.id`, `toList.title`, `board.id` |
| `card.completed` | Card moved to done list | `event`, `timestamp`, `card.id`, `card.title`, `board.id`, `board.title` |
| `card.overdue` | Card past due date (cron) | `event`, `timestamp`, `card.id`, `card.title`, `card.dueDate`, `board.id`, `board.title` |

### BR-009: Client Email Notification Triggers

| Trigger | Email Template | Condition |
|---|---|---|
| Board created | `board-created` | Board linked to template OR manually configured |
| Card completed (milestone) | `card-completed` | Card moved to completion list AND board.client_email is set |
| Board completed | `board-completed` | All cards completed AND board.client_email is set |

Emails are sent only if `board.client_email` is not null AND email service is configured.

---

## 6. Data Entities Summary

| Entity | Count | Relationships |
|---|---|---|
| Users | Unlimited | Create boards, author comments, assigned to cards, receive notifications |
| Boards | Unlimited | Has many Lists, belongs to User (creator), may use Template |
| Lists | Per board | Has many Cards, belongs to Board |
| Cards | Per list | Has many Comments, Attachments, Assignees, Labels |
| Comments | Per card | Belongs to User (author) and Card |
| Attachments | Per card | Belongs to User (uploader) and Card |
| Labels | Per board | Has many Card-Label junction records |
| Template Categories | Unlimited | Has many Templates |
| Templates | Unlimited | Has many Template Variables, Template Lists |
| Template Lists | Per template | Has many Template Cards |
| Template Cards | Per template list | Belongs to Template List |
| Template Variables | Per template | Used for substitution on board creation |
| Webhooks | Unlimited | Admin-managed, event-driven |
| Notifications | Per user | Created by system events |
| Settings | 1 row | Global singleton |

---

## 7. Screens Inventory

| # | Screen | Route | Auth | Primary Users |
|---|---|---|---|---|
| 1 | Login | `/login` | No | Admin, Member |
| 2 | Dashboard (Board List + Stats) | `/boards` | Yes | Admin, Member |
| 3 | Board Detail (Kanban) | `/boards/[id]` | Yes | Admin, Member |
| 4 | Card Detail Panel | Modal/sidebar on `/boards/[id]` | Yes | Admin, Member |
| 5 | Templates List | `/templates` | Yes | Admin, Member |
| 6 | Template Editor | `/templates/[id]` | Yes | Admin |
| 7 | New Template | `/templates/new` | Yes | Admin |
| 8 | Members Management | `/members` | Yes | Admin |
| 9 | Settings (Branding + Webhooks + Notifications) | `/settings` | Yes | Admin |
| 10 | Notifications | `/notifications` | Yes | Admin, Member |
| 11 | Public Board View (Client) | `/b/[token]` | No (token) | Client |

---

## 8. API Endpoints Summary

| Module | Endpoints | Auth Required |
|---|---|---|
| Auth | 5 | Partial |
| Boards | 9 | Partial (1 public) |
| Lists | 4 | Yes |
| Cards | 5 | Yes |
| Comments | 3 | Yes |
| Attachments | 2 | Yes |
| Labels | 4 | Yes |
| Templates | 5 | Yes (admin for CUD) |
| Template Categories | 4 | Yes (admin for CUD) |
| Dashboard | 2 | Yes |
| Notifications | 3 | Yes |
| Webhooks | 5 | Yes (admin) |
| Settings | 3 | Partial (1 public) |
| **Total** | **54** | |

---

## 9. Out of Scope (V2 Considerations)

The following features are explicitly excluded from V1 but documented for future consideration:

| Feature | Reason |
|---|---|
| Real-time updates (WebSocket) | Refresh-based flow is sufficient for V1 |
| Multi-tenancy / organization switching | Single-org product |
| Client login/authentication | Public link access is simpler and sufficient |
| Calendar view | Kanban only for V1 |
| Table view | Kanban only for V1 |
| Gantt/timeline view | Kanban only for V1 |
| Card time tracking | Not needed for progress tracking |
| Card dependencies (blocked by) | Over-engineering for V1 |
| Card checklists/subtasks | Scope containment |
| Board activity log/audit trail | Could be added in V2 |
| Import from Trello/other tools | Not needed for purpose-built system |
| Mobile native app | Responsive web is sufficient |
| i18n / multiple languages | Portuguese primary for V1 |
| Dark/light theme | Could be added in V2 |
| Card mentions (@user) | Can be added later with notifications |
| File preview (in-browser PDF/image viewer) | Download-only for V1 |