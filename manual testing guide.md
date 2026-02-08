# Manual Testing Guide (Hyper In‑Depth)

## Purpose
Provide a step‑by‑step, click‑by‑click walkthrough to manually verify every visible feature of the web app. This guide tells testers exactly what to click, what data to enter, and what to record. It does not instruct any code or configuration changes.

## Scope
Covers the current web UI routes and core API‑backed workflows surfaced in the app navigation:
- Home
- Sign in
- Dashboard (Projects + Documents)
- Workspaces (create, invite, accept, update role, remove, list)
- AI Actions (execute tools, runs, tool calls)
- Retrieval (index chunks, search)
- Analytics (quota, events, anomalies)
- Automation (rules, events, runs)
- Integrations (register/list)
- Notifications (preferences/list)
- Webhooks (deliveries/replay)
- Settings hub links

## Preconditions (Do This Before Testing)
1. Ensure the API server is running and reachable.
2. Ensure the web app is running and reachable.
3. Use a Chromium‑based browser.
4. Have the demo credentials ready:
   - Email: admin@example.com
   - Password: password123

## Test Data (Use These Exact Values)
Use the exact values below when the steps ask for input so results are deterministic:
- Workspace name: QA Workspace Alpha
- Invite member email: qa.member@example.com
- Invite role: member
- Project name 1: Apollo Project
- Project name 2: Borealis Project
- Document name: Q1 Strategy Memo
- Document source URI: file://qa/q1-strategy.txt
- Document content: This is the Q1 strategy memo. It mentions Apollo and Borealis.
- Retrieval document ID: doc_qa_01
- Retrieval source URI: file://qa/retrieval.txt
- Retrieval source title: QA Retrieval Doc
- Retrieval content: Apollo project kickoff notes with milestones.
- Retrieval query: Apollo
- Automation event type: project.created
- Automation action name: notify.owner
- Automation max retries: 3
- Integrations provider: slack
- Integrations auth type: oauth
- Integrations credential reference: vault://demo
- AI tool name (low risk): project.list
- AI tool input (JSON): {}

## How to Record Results
For every step that says Record, capture:
- Status: Pass or Fail
- Actual result observed
- Screenshot or short note (if a failure)

Use the reporting templates at the end of this guide.

---

# 1) Home Page and Navigation

### 1.1 Open Home
1. Open the web app in the browser.
2. Verify the Home page title reads Demo MVP Control Center.
3. Look for the four links: Dashboard, Workspaces, Settings, Sign in.
4. Record the Home page load result.

Record:
- Home page loads (Pass/Fail)
- Page title displayed

### 1.2 Global Navigation Bar
1. Look at the bottom navigation bar (pill‑shaped dock).
2. Verify these labeled items exist: Home, Dashboard, Workspaces, AI, Retrieval, Analytics, Automation, Integrations, Notifications, Webhooks, Settings.
3. Hover a few icons to confirm labels appear.
4. Record the presence of all navigation items.

Record:
- All nav items present (Pass/Fail)
- Any missing labels

---

# 2) Sign In

### 2.1 Open Sign in Page
1. Click Sign in on the Home page.
2. Confirm the page title is Sign in.
3. Confirm there are two fields: Email and Password.
4. Confirm the button label says Sign in.

Record:
- Sign in page loads (Pass/Fail)
- Fields and button present

### 2.2 Sign In With Valid Credentials
1. In Email, enter admin@example.com.
2. In Password, enter password123.
3. Click Sign in.
4. Wait for redirect to Dashboard.

Expected:
- You are redirected to Dashboard.
- No error message shows.

Record:
- Redirect to Dashboard (Pass/Fail)
- Any error message

### 2.3 Sign In With Invalid Credentials
1. Return to Sign in (use the bottom nav or back button).
2. In Email, enter admin@example.com.
3. In Password, enter wrong-password.
4. Click Sign in.

Expected:
- An error message appears (for example Unable to sign in.).
- You remain on the Sign in page.

Record:
- Error message displayed (Pass/Fail)
- Exact error text

---

# 3) Dashboard (Projects + Documents)

### 3.1 Open Dashboard
1. Click Dashboard in the bottom nav.
2. Confirm the page title is Dashboard.
3. Confirm there are three quick cards: AI Actions, Retrieval, Analytics.

Record:
- Dashboard loads (Pass/Fail)
- Quick cards visible

### 3.2 Create Project (Apollo Project)
1. In the Projects card, find the input labeled New project name.
2. Enter Apollo Project.
3. Click Create.
4. Wait for the message below the form.
5. Look at the project list.

Expected:
- A success message appears (for example Project created or similar).
- Apollo Project appears in the list.

Record:
- Create project success (Pass/Fail)
- Message text
- List entry text

### 3.3 Create Project (Borealis Project)
1. Enter Borealis Project in the same input.
2. Click Create.
3. Verify Borealis Project appears in the list.

Record:
- Second project created (Pass/Fail)
- List entry text

### 3.4 Upload Document
1. In the Documents card, locate the three inputs: Document name, Source URI, Paste document content.
2. Enter the test data:
   - Document name: Q1 Strategy Memo
   - Source URI: file://qa/q1-strategy.txt
   - Paste document content: This is the Q1 strategy memo. It mentions Apollo and Borealis.
3. Click Upload & index.
4. Wait for the message below the form.
5. Look for the document in the list.

Expected:
- A success message appears (for example Document created or similar).
- Q1 Strategy Memo appears in the list with a status label.

Record:
- Upload document success (Pass/Fail)
- Message text
- List entry text

### 3.5 Retry or Replay (If Available)
1. Look for a Retry or Replay button next to the document.
2. If a button exists, click it once.
3. Wait for the message and list refresh.

Expected:
- A status message appears (for example Retry queued or similar).
- The list refreshes.

Record:
- Retry/Replay available (Yes/No)
- If clicked: result (Pass/Fail)
- Message text

---

# 4) Workspaces

### 4.1 Open Workspaces Page
1. Click Workspaces in the bottom nav.
2. Confirm the title is Workspaces.
3. In Active workspace, confirm a workspace ID is shown (not Sign in required).

Record:
- Workspaces page loads (Pass/Fail)
- Active workspace ID shown

### 4.2 Create Workspace
1. In Create workspace, enter QA Workspace Alpha.
2. Click Create.
3. Look for the message Workspace created.
4. Verify the Active workspace ID updates.

Record:
- Workspace created (Pass/Fail)
- Active workspace ID changed

### 4.3 Invite Member
1. In Invite member, enter:
   - Member email: qa.member@example.com
   - Role: member
2. Click Send invite.
3. Look for the message Invite sent. Token: <token>.
4. Copy the token from the message and save it for the next step.

Record:
- Invite sent (Pass/Fail)
- Invite token value

### 4.4 Accept Invite
1. In Accept invite, paste the invite token from the prior step.
2. Click Accept.
3. Look for the message Invite accepted.

Record:
- Invite accepted (Pass/Fail)
- Message text

### 4.5 Update Member Role
1. In Members, copy a user ID (any listed user ID).
2. In Update member role, paste that user ID into Target user ID.
3. Select a new role (for example admin).
4. Click Update role.
5. Verify the Members list reflects the new role.

Record:
- Role update success (Pass/Fail)
- Member entry updated

### 4.6 Remove Member
1. In Remove member, paste the same Target user ID used above.
2. Click Remove.
3. Verify the member is removed from the list.

Record:
- Remove member success (Pass/Fail)
- Member removed from list

---

# 5) AI Actions

### 5.1 Open AI Actions Page
1. Click AI in the bottom nav.
2. Confirm the page title is AI Actions.
3. Confirm there is a form with Tool name, Tool input, Confirm high‑risk action, and Execute button.

Record:
- AI Actions page loads (Pass/Fail)
- Form fields present

### 5.2 Execute Low‑Risk Tool (project.list)
1. In Tool name, enter project.list.
2. In Tool input, enter {}.
3. Ensure Confirm high‑risk action is unchecked.
4. Click Execute.
5. Observe the message below the form.
6. Check Runs and Tool Calls lists for new entries.

Expected:
- Message shows Action completed successfully.
- Runs list includes a new run with status and model name.
- Tool Calls list includes project.list with a status and policy decision.

Record:
- Execution success (Pass/Fail)
- Message text
- Runs list entry added
- Tool Calls list entry added

### 5.3 Execute High‑Risk Tool (Optional)
Only run this if billing tools are enabled and available.
1. In Tool name, enter billing.cancel.
2. In Tool input, enter {}.
3. Leave Confirm high‑risk action unchecked.
4. Click Execute.
5. Observe the message.
6. Now check Confirm high‑risk action.
7. Click Execute again.
8. Observe the message and lists.

Expected:
- First attempt should show a confirmation required message.
- Second attempt should succeed.

Record:
- High‑risk confirmation required (Pass/Fail)
- High‑risk execution success (Pass/Fail)
- Message texts

---

# 6) Retrieval

### 6.1 Open Retrieval Page
1. Click Retrieval in the bottom nav.
2. Confirm the page title is Retrieval.
3. Confirm there are two forms: Index chunk and Search.

Record:
- Retrieval page loads (Pass/Fail)

### 6.2 Index a Retrieval Chunk
1. In the Index chunk form, enter:
   - Document ID: doc_qa_01
   - Source URI: file://qa/retrieval.txt
   - Source title: QA Retrieval Doc
   - Content: Apollo project kickoff notes with milestones.
2. Click Index chunk.
3. Observe the message below the forms.

Expected:
- Message shows Chunk indexed.

Record:
- Index chunk success (Pass/Fail)
- Message text

### 6.3 Search Retrieval
1. In the Search query input, enter Apollo.
2. Click Search.
3. Observe the results list.

Expected:
- At least one result appears in the list.

Record:
- Search success (Pass/Fail)
- Result list entries

---

# 7) Analytics

### 7.1 Open Analytics Page
1. Click Analytics in the bottom nav.
2. Confirm the page title is Analytics.
3. In AI usage quota, note the text (Remaining X or Quota exceeded).
4. Review Analytics events and Integrity anomalies lists.

Record:
- Analytics page loads (Pass/Fail)
- Quota text
- Events list entries
- Anomalies list entries

---

# 8) Automation

### 8.1 Open Automation Page
1. Click Automation in the bottom nav.
2. Confirm the page title is Automation.
3. Confirm there is a form for rule creation and a Publish demo event button.

Record:
- Automation page loads (Pass/Fail)

### 8.2 Create an Automation Rule
1. In the form, enter:
   - Event type: project.created
   - Action name: notify.owner
   - Max retries: 3
2. Click Create rule.
3. Observe the message under the Publish button.
4. Check the Rules list for the new rule.

Expected:
- Message shows Rule created.
- Rules list includes project.created → notify.owner.

Record:
- Rule created (Pass/Fail)
- Message text
- Rules list entry

### 8.3 Publish a Demo Event
1. Click Publish demo event.
2. Observe the message and refresh of lists.
3. Check Event ingestion for a new record.
4. Check Runs for a new run entry.

Record:
- Publish event success (Pass/Fail)
- Message text
- Event ingestion entry
- Runs entry

---

# 9) Integrations

### 9.1 Open Integrations Page
1. Click Integrations in the bottom nav.
2. Confirm the page title is Integrations.

Record:
- Integrations page loads (Pass/Fail)

### 9.2 Register a Connector
1. In the form, enter:
   - Provider: slack
   - Auth type: oauth
   - Credential reference: vault://demo
2. Click Register.
3. Observe the message below the button.
4. Check the list for a new connector entry.

Expected:
- Message shows Connector registered.
- List includes slack with status and auth type.

Record:
- Connector registered (Pass/Fail)
- Message text
- List entry

---

# 10) Notifications

### 10.1 Open Notifications Page
1. Click Notifications in the bottom nav.
2. Confirm the page title is Notifications.

Record:
- Notifications page loads (Pass/Fail)

### 10.2 Update Notification Preferences
1. In the form, set:
   - Email: checked
   - In‑app: checked
   - Webhook: unchecked
2. Click Update preferences.
3. Observe the message below the button.
4. In Workspace preferences, verify your user appears with a channel summary.

Record:
- Preferences updated (Pass/Fail)
- Message text
- Workspace preferences list entry

---

# 11) Webhooks

### 11.1 Open Webhooks Page
1. Click Webhooks in the bottom nav.
2. Confirm the page title is Outbound Webhooks.

Record:
- Webhooks page loads (Pass/Fail)

### 11.2 Replay Webhook (If Available)
1. Look for any delivery entry with a Replay link.
2. If available, click Replay once.
3. Observe the message at the top and list refresh.

Record:
- Replay available (Yes/No)
- If clicked: replay success (Pass/Fail)
- Message text

---

# 12) Settings Hub

### 12.1 Open Settings Page
1. Click Settings in the bottom nav.
2. Confirm the page title is Settings.
3. Confirm there are four cards: Integrations, Automation, Notifications, Webhooks.
4. Click each card and verify it navigates to the correct page.

Record:
- Settings page loads (Pass/Fail)
- All four cards present
- Each card navigates correctly

---

# Reporting Templates

## A) Executive Summary Report
- Test date:
- Tester name:
- Environment (local/staging/other):
- Overall status (Pass/Fail):
- Total test cases executed:
- Total passed:
- Total failed:
- Total blocked:
- Notes:

## B) Detailed Test Case Results
Use one row per test step group (for example 3.2, 5.2, 8.3).

| Test Case ID | Feature Area | Step Title | Status (Pass/Fail/Blocked) | Actual Result | Evidence (screenshot or note) |
| --- | --- | --- | --- | --- | --- |
| 1.1 | Home | Open Home |  |  |  |
| 1.2 | Navigation | Global Navigation Bar |  |  |  |
| 2.1 | Sign In | Open Sign in Page |  |  |  |
| 2.2 | Sign In | Sign In With Valid Credentials |  |  |  |
| 2.3 | Sign In | Sign In With Invalid Credentials |  |  |  |
| 3.1 | Dashboard | Open Dashboard |  |  |  |
| 3.2 | Dashboard | Create Project (Apollo) |  |  |  |
| 3.3 | Dashboard | Create Project (Borealis) |  |  |  |
| 3.4 | Dashboard | Upload Document |  |  |  |
| 3.5 | Dashboard | Retry/Replay Document (If Available) |  |  |  |
| 4.1 | Workspaces | Open Workspaces Page |  |  |  |
| 4.2 | Workspaces | Create Workspace |  |  |  |
| 4.3 | Workspaces | Invite Member |  |  |  |
| 4.4 | Workspaces | Accept Invite |  |  |  |
| 4.5 | Workspaces | Update Member Role |  |  |  |
| 4.6 | Workspaces | Remove Member |  |  |  |
| 5.1 | AI Actions | Open AI Actions Page |  |  |  |
| 5.2 | AI Actions | Execute Low‑Risk Tool |  |  |  |
| 5.3 | AI Actions | Execute High‑Risk Tool (Optional) |  |  |  |
| 6.1 | Retrieval | Open Retrieval Page |  |  |  |
| 6.2 | Retrieval | Index a Retrieval Chunk |  |  |  |
| 6.3 | Retrieval | Search Retrieval |  |  |  |
| 7.1 | Analytics | Open Analytics Page |  |  |  |
| 8.1 | Automation | Open Automation Page |  |  |  |
| 8.2 | Automation | Create an Automation Rule |  |  |  |
| 8.3 | Automation | Publish a Demo Event |  |  |  |
| 9.1 | Integrations | Open Integrations Page |  |  |  |
| 9.2 | Integrations | Register a Connector |  |  |  |
| 10.1 | Notifications | Open Notifications Page |  |  |  |
| 10.2 | Notifications | Update Notification Preferences |  |  |  |
| 11.1 | Webhooks | Open Webhooks Page |  |  |  |
| 11.2 | Webhooks | Replay Webhook (If Available) |  |  |  |
| 12.1 | Settings | Open Settings Page |  |  |  |

## C) Issues Log
| Issue ID | Feature Area | Step ID | Summary | Severity | Repro Steps | Actual Result | Expected Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
|  |  |  |  |  |  |  |  |
