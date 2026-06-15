# LocalWala Workforce Hub — Product Requirements Document (PRD)

**Platform:** onboard.localwala.tech  
**Version:** 1.0 — Developer-Ready & Investor-Grade  
**Prepared by:** Product, Engineering & Design Team  
**Date:** June 2026  
**Stack:** Next.js 14 (App Router) + Supabase + TypeScript + Tailwind CSS  
**Project Directory:** `C:\onboarding\localwala-food\`  
**Deploy Target:** onboard.localwala.tech (Vercel)

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Company Context & System Landscape](#2-company-context--system-landscape)
3. [Product Objectives](#3-product-objectives)
4. [User Roles & Permissions](#4-user-roles--permissions)
5. [Employee Management Module](#5-employee-management-module)
6. [Attendance Module](#6-attendance-module)
7. [Daily Updates Module](#7-daily-updates-module)
8. [Task Management Module](#8-task-management-module)
9. [Developer Workflow](#9-developer-workflow)
10. [Support Workflow](#10-support-workflow)
11. [Marketing Module](#11-marketing-module)
12. [Influencer Management Module](#12-influencer-management-module)
13. [Restaurant Onboarding Executive Module](#13-restaurant-onboarding-executive-module)
14. [Restaurant CRM Module](#14-restaurant-crm-module)
15. [Follow-Up Engine](#15-follow-up-engine)
16. [Founder Quick Actions](#16-founder-quick-actions)
17. [Restaurant Review Insights](#17-restaurant-review-insights)
18. [Territory Management](#18-territory-management)
19. [Founder Dashboard](#19-founder-dashboard)
20. [Supabase Architecture](#20-supabase-architecture)
21. [Database Schema (PostgreSQL)](#21-database-schema-postgresql)
22. [Storage Strategy](#22-storage-strategy)
23. [Notification System](#23-notification-system)
24. [Security & RLS Policies](#24-security--rls-policies)
25. [UI/UX Requirements](#25-uiux-requirements)
26. [Implementation Roadmap](#26-implementation-roadmap)
27. [Success Metrics & KPIs](#27-success-metrics--kpis)

---

## 1. Executive Summary

LocalWala Workforce Hub is an internal operations platform built for LocalWala's distributed teams. It serves as the single source of truth for employee management, attendance, task tracking, restaurant acquisition, marketing operations, and founder-level visibility.

The platform replaces fragmented tools (WhatsApp groups, Google Sheets, manual logs) with a unified, role-based digital operating system. It is purpose-built for the Indian hyperlocal food delivery context, where field sales, influencer marketing, and rapid restaurant onboarding are core growth levers.

### Target Users
- ~50–500 internal employees across departments
- Field onboarding executives (mobile-first)
- Marketing teams and content creators
- Influencers and brand ambassadors
- HR and administrative staff
- Founders with real-time operational visibility

### Business Goals
- Reduce restaurant onboarding cycle from 7–14 days to 2–3 days
- Achieve 100% digital attendance tracking with GPS verification
- Eliminate daily update gaps; ensure 95%+ daily submission compliance
- Give founders real-time operational visibility without requiring meetings

---

## 2. Company Context & System Landscape

```
┌─────────────────────────────────────────────────────────────────────┐
│                     LocalWala Platform Ecosystem                    │
├─────────────────────────┬───────────────────────┬───────────────────┤
│  onboard.localwala.tech │ admin.localwala.tech  │ Customer/Vendor   │
│  (THIS PRD)             │ (Support Workspace)   │ Apps (Separate)   │
│                         │                       │                   │
│  • Employee Mgmt        │ • Ticket Management   │ • Customer App    │
│  • HR Operations        │ • Support Queues      │ • Vendor Portal   │
│  • Attendance           │ • Escalations         │ • Delivery App    │
│  • Task Tracking        │                       │                   │
│  • Restaurant CRM       │                       │                   │
│  • Marketing Ops        │                       │                   │
│  • Influencer Mgmt      │                       │                   │
│  • Founder Dashboard    │                       │                   │
└─────────────────────────┴───────────────────────┴───────────────────┘
```

### Integration Points
- **admin.localwala.tech**: Support executives log attendance and daily updates on onboard.localwala.tech but handle tickets on admin.localwala.tech
- **WhatsApp Business API**: Pre-filled onboarding messages from Founder Quick Actions
- **Google Maps API**: GPS validation, restaurant discovery, territory mapping
- **GitHub** (future): Developer task sync via webhooks

---

## 3. Product Objectives

| # | Objective | Priority |
|---|-----------|----------|
| 1 | Manage employees across all departments with role-based access | P0 |
| 2 | Track attendance with GPS verification and working hours | P0 |
| 3 | Capture daily work updates (EOD reports) from all employees | P0 |
| 4 | Assign, monitor, and track tasks across teams | P0 |
| 5 | Provide a field CRM for restaurant onboarding executives | P0 |
| 6 | Give founders real-time operational visibility | P0 |
| 7 | Manage marketing campaigns and content performance | P1 |
| 8 | Track influencer collaborations and performance metrics | P1 |
| 9 | Enable HR document management and compliance | P1 |
| 10 | Territory management and executive assignment | P1 |

---

## 4. User Roles & Permissions

### 4.1 Role Hierarchy

```
Founder
  └── Super Admin
        ├── HR Admin
        ├── Team Lead (per department)
        │     ├── Employee
        │     ├── Developer
        │     ├── Support Executive
        │     ├── Marketing Executive
        │     └── Restaurant Onboarding Executive
        ├── Influencer / Brand Ambassador
        ├── Intern
        └── Freelancer
```

---

### 4.2 Founder

**Responsibilities:**
- Strategic oversight of all operations
- Direct restaurant outreach and onboarding
- Performance review of all departments

**Dashboard Widgets:**
- Total employees online today
- Attendance heatmap (present / absent / late)
- Restaurant pipeline funnel (Leads → Onboarded → Live)
- Follow-ups due today
- Top performing executives (leaderboard)
- Campaign performance summary
- Daily updates submitted vs. pending
- Open tasks by priority

**Allowed Actions:**
- View ALL data across all modules
- Mark restaurants as onboarded
- Assign restaurants to executives
- Call / WhatsApp any restaurant directly
- Create tasks for any employee
- Override attendance records
- Access all documents and agreements
- View financials and compensation data

**Restricted Actions:**
- Cannot delete audit logs
- Cannot permanently delete employee records (soft delete only)

**Access Control:**
- `role = 'founder'`
- Bypasses all RLS (super-admin level)

---

### 4.3 Super Admin

**Responsibilities:**
- Platform configuration and user management
- Role assignment and access control
- System health monitoring

**Dashboard Widgets:**
- User management panel
- System alerts and errors
- Pending role approvals
- Audit log feed

**Allowed Actions:**
- Create / edit / deactivate user accounts
- Assign and modify roles
- Configure system settings
- View all modules
- Export all data

**Restricted Actions:**
- Cannot override financial approvals (Founder only)

---

### 4.4 HR Admin

**Responsibilities:**
- Employee lifecycle management
- Document management
- Leave and attendance oversight
- Offer letter and agreement generation

**Dashboard Widgets:**
- Headcount by department
- Employees on notice period
- Pending document uploads
- Recent joiners
- Attendance anomalies

**Allowed Actions:**
- Create and manage employee profiles
- Upload / manage HR documents
- View all attendance records
- Manage leave requests
- Generate reports (headcount, attendance, turnover)
- Mark employees as On Leave / Notice Period / Inactive

**Restricted Actions:**
- Cannot access restaurant CRM data
- Cannot modify task assignments outside HR department

---

### 4.5 Team Lead

**Responsibilities:**
- Daily team oversight
- Task assignment and review
- Escalating blockers

**Dashboard Widgets:**
- Team attendance status
- Tasks due today (team-wide)
- Daily updates submitted by team
- Blocked tasks requiring action
- Team performance metrics

**Allowed Actions:**
- View team members' profiles, attendance, and updates
- Create and assign tasks to team members
- Review and approve daily updates
- Escalate blockers to HR Admin or Founder
- Add comments to tasks

**Restricted Actions:**
- Cannot view other team's data
- Cannot access HR documents of other teams
- Cannot modify role assignments

---

### 4.6 Employee

**Responsibilities:**
- Completing assigned tasks
- Submitting daily updates
- Logging attendance

**Dashboard Widgets:**
- My attendance today
- My tasks (To Do / In Progress)
- Daily update submission status
- Upcoming deadlines
- Team announcements

**Allowed Actions:**
- Check in / check out
- Submit daily updates
- View and update own tasks
- Upload task attachments
- View own profile and documents

**Restricted Actions:**
- Cannot view other employees' data
- Cannot create tasks for others
- Cannot access HR admin features

---

### 4.7 Developer

**Responsibilities:**
- Software development (primarily external tools)
- Using platform for attendance, daily updates, task tracking

**Dashboard Widgets:**
- My tasks (development-focused view)
- GitHub PRs linked (future integration)
- Daily update status
- Blocker flags

**Allowed Actions:**
- All Employee permissions
- Link GitHub repositories to tasks (future)
- View technical tasks and sprint boards

**Restricted Actions:**
- Cannot access restaurant CRM or marketing modules

---

### 4.8 Support Executive

**Responsibilities:**
- Customer support (primary work on admin.localwala.tech)
- Attendance and daily updates on this platform

**Dashboard Widgets:**
- Attendance status
- Daily update submission prompt
- Linked support ticket stats (from admin.localwala.tech)

**Allowed Actions:**
- All Employee permissions
- View linked support metrics (read-only)

---

### 4.9 Marketing Executive

**Responsibilities:**
- Campaign creation and execution
- Content submission
- Performance tracking

**Dashboard Widgets:**
- Active campaigns
- Content submissions pending review
- Campaign reach metrics
- Influencer coordination status

**Allowed Actions:**
- Create and manage campaigns
- Assign influencers to campaigns
- Submit and review content
- View marketing performance dashboards

**Restricted Actions:**
- Cannot access restaurant CRM
- Cannot modify HR data

---

### 4.10 Influencer / Brand Ambassador

**Responsibilities:**
- Content creation for campaigns
- Performance reporting

**Dashboard Widgets:**
- Active campaigns assigned
- My performance metrics (views, likes, shares)
- Pending deliverables
- Leaderboard ranking

**Allowed Actions:**
- View own campaigns and deliverables
- Submit content (links, screenshots)
- View own performance metrics and leaderboard position

**Restricted Actions:**
- Cannot view other influencers' detailed data
- Cannot access employee data or HR features

---

### 4.11 Restaurant Onboarding Executive

**Responsibilities:**
- Field visits to acquire restaurants
- Logging interactions and follow-ups
- Managing restaurant pipeline

**Dashboard Widgets:**
- Assigned territory map
- Restaurants due for follow-up today
- Today's visit log
- Conversion rate this month
- Nearby uncontacted restaurants
- Daily update submission prompt

**Allowed Actions:**
- View and manage assigned restaurants
- Log visits and interactions
- Schedule follow-ups
- Update restaurant status
- Submit GPS-verified check-ins at restaurant locations

**Restricted Actions:**
- Cannot access restaurants assigned to other executives
- Cannot onboard restaurants without manager approval

---

### 4.12 Intern

**Responsibilities:**
- Supporting team members on assigned tasks
- Daily learning updates

**Allowed Actions:**
- Subset of Employee permissions
- Cannot create tasks for others
- Cannot access financial or HR documents

---

### 4.13 Freelancer

**Responsibilities:**
- Project-based work
- Deliverable submission

**Allowed Actions:**
- View only assigned tasks and projects
- Submit deliverables
- Log daily updates for active project days
- Attendance logging optional (configurable by HR)

---

### 4.14 Role Permissions Matrix

| Action | Founder | Super Admin | HR Admin | Team Lead | Employee | Developer | Marketing | Influencer | Onboarding Exec | Intern | Freelancer |
|--------|---------|-------------|----------|-----------|----------|-----------|-----------|------------|-----------------|--------|------------|
| View all employees | ✅ | ✅ | ✅ | 🔶 (team) | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Manage employee profiles | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| View all attendance | ✅ | ✅ | ✅ | 🔶 (team) | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Override attendance | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Submit daily update | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| View all daily updates | ✅ | ✅ | ✅ | 🔶 (team) | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Create tasks | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | 🔶 (campaigns) | ❌ | ❌ | ❌ | ❌ |
| Manage restaurant CRM | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | 🔶 (assigned) | ❌ | ❌ |
| Manage campaigns | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| View influencer data | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | 🔶 (own) | ❌ | ❌ | ❌ |
| HR documents | ✅ | ✅ | ✅ | ❌ | 🔶 (own) | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Founder quick actions | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

---

## 5. Employee Management Module

### 5.1 Employee Profile Schema (UI Fields)

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Employee ID | Auto-generated | Yes | Format: LW-2024-001 |
| Full Name | Text | Yes | |
| Phone Number | Text | Yes | Indian format: +91XXXXXXXXXX |
| Email | Email | Yes | Unique |
| Department | Enum | Yes | Engineering, Marketing, Operations, HR, Sales, Support |
| Designation | Text | Yes | |
| Employment Type | Enum | Yes | See below |
| Joining Date | Date | Yes | |
| Reporting Manager | FK → profiles | Yes | |
| Profile Picture | Storage URL | No | |
| Status | Enum | Yes | Active, Inactive, On Leave, Notice Period, Internship Completed |
| Work Location | Text | No | City / Remote / Field |
| Emergency Contact | Text | No | |
| Aadhaar Number | Text | No | Encrypted at rest |
| PAN Number | Text | No | Encrypted at rest |

### 5.2 Employment Types

```
Full-Time          → Standard employment, full benefits
Part-Time          → Reduced hours, partial benefits  
Intern             → Fixed duration, internship letter required
Freelancer         → Project-based, no fixed hours
Consultant         → Advisory, SOW-based
Contract Employee  → Fixed-term contract
Probationary       → First 3–6 months, review pending
```

### 5.3 Employee Statuses

```
Active              → Currently working
Inactive            → Left company / terminated
On Leave            → Approved leave period
Notice Period       → Serving notice before exit
Internship Completed → Intern program ended
```

### 5.4 HR Document Management

**Document Types:**
- Offer Letter (PDF upload)
- Internship Letter (PDF upload)
- Employment Agreement (PDF upload)
- NDA (PDF upload)
- Aadhaar Copy (PDF / Image)
- PAN Copy (PDF / Image)
- Bank Account Details Form
- Exit Documents (if applicable)

**Upload Rules:**
- Only HR Admin and Founder can upload documents
- Employees can view only their own documents
- All documents stored in Supabase Storage with signed URLs
- Document history tracked with upload timestamps and uploader identity

### 5.5 Reporting Hierarchy

```
Founder
  └── HR Admin / Super Admin
        └── Team Lead (Department Head)
              ├── Senior Employee
              │     └── Junior Employee
              └── Intern / Freelancer
```

- Every employee must have a `reporting_manager_id`
- Team Leads report to HR Admin or Founder
- Hierarchy is enforced in visibility (RLS policies follow the tree)

### 5.6 User Stories

| ID | User Story | Acceptance Criteria |
|----|-----------|---------------------|
| EM-01 | As HR Admin, I want to create a new employee profile | Profile saved, Employee ID auto-generated, Welcome email triggered |
| EM-02 | As Employee, I want to view my own profile | Shows all personal and employment details, masked sensitive fields |
| EM-03 | As HR Admin, I want to upload an offer letter | PDF stored securely, linked to employee, viewable by employee |
| EM-04 | As Team Lead, I want to view my team's profiles | Only team members visible, not other departments |
| EM-05 | As Founder, I want to see all employees in one view | Full directory with filters by department, status, type |

---

## 6. Attendance Module

### 6.1 Employee Check-In / Check-Out Flow

```
Employee Opens App → Attendance Screen
       ↓
GPS Location Captured (lat/lng)
       ↓
Employee Taps "Check In"
       ↓
System Records: timestamp, GPS coords, device info
       ↓
Status → "Checked In" (Green badge)
       ↓
[During Day]
       ↓
Employee Taps "Check Out"
       ↓
System Records: checkout timestamp, GPS coords
Working Hours Calculated = checkout_time - checkin_time
       ↓
Daily record marked COMPLETE
```

### 6.2 Attendance Record Fields

| Field | Type | Notes |
|-------|------|-------|
| employee_id | UUID | FK → profiles |
| date | Date | Auto-captured |
| check_in_time | Timestamp | |
| check_out_time | Timestamp | Nullable |
| check_in_lat | Float | GPS |
| check_in_lng | Float | GPS |
| check_out_lat | Float | GPS |
| check_out_lng | Float | GPS |
| working_hours | Float | Calculated |
| status | Enum | Present, Absent, Half Day, Late, WFH |
| notes | Text | Optional |
| override_by | UUID | FK → profiles (admin who corrected) |

### 6.3 Status Definitions

```
Present     → Checked in on time (before 10:00 AM default)
Late        → Checked in after grace period
Half Day    → Working hours < 4
Absent      → No check-in by end of day
WFH         → Marked by employee (requires approval)
On Leave    → Pre-approved leave
```

### 6.4 Admin Attendance Dashboard

**Widgets:**
- Total Present Today: `{count}` / `{total_active_employees}`
- Absent Today: Listed by name with contact options
- Late Arrivals: Sorted by late duration
- Missed Check-Outs (from previous day)
- Average Working Hours (team / department filter)
- Department-wise attendance heatmap (weekly view)
- Monthly attendance calendar per employee

**Filters:**
- By Department
- By Date Range
- By Status (Present / Absent / Late / Leave)
- By Employee

### 6.5 Notification Workflows

| Trigger | Recipients | Time | Message |
|---------|-----------|------|---------|
| No check-in by 10:30 AM | Employee | 10:30 AM | "Don't forget to check in for today!" |
| No check-out by 7:30 PM | Employee | 7:30 PM | "Please check out to log your working hours." |
| Late arrival detected | Team Lead | Real-time | "{Employee} checked in late at {time}" |
| 3 consecutive absences | HR Admin + Founder | Real-time | "{Employee} absent for 3 days — action required" |
| Missing daily update by 7 PM | Employee | 7:00 PM | "Submit your EOD update before 8 PM" |

### 6.6 Acceptance Criteria

- [ ] Check-in requires GPS permission on mobile
- [ ] GPS coordinates logged on every attendance action
- [ ] Working hours auto-calculated on check-out
- [ ] Late arrivals flagged automatically (configurable grace period)
- [ ] Admin can override any attendance record with reason
- [ ] Monthly attendance report exportable as CSV/PDF
- [ ] Real-time attendance count on Founder Dashboard

---

## 7. Daily Updates Module

### 7.1 Update Structure

Every employee submits one daily update before end of business (configurable — default 8:00 PM IST).

**Required Fields:**

```
1. "What did you complete today?"        [Text, min 50 chars]
2. "What will you work on tomorrow?"     [Text, min 30 chars]
3. "Any blockers or dependencies?"       [Text, Optional but flaggable]
4. "Mood / Energy Level"                 [Emoji Scale: 😔 😐 🙂 😊 🔥, Optional]
```

### 7.2 Submission Workflow

```
8:00 PM → Push notification to all employees who haven't submitted
        ↓
Employee opens Daily Update screen
        ↓
Fills form → Submits
        ↓
System saves with timestamp, employee_id, date
        ↓
Status on dashboard: ✅ Submitted
        ↓
Team Lead / Founder sees update in feed
        ↓
If blockers reported → Flagged with 🚨 in dashboard
        ↓
Team Lead can react / comment / escalate
```

### 7.3 Blocker Escalation

- If `has_blocker = true`, update is highlighted in red in Team Lead and Founder dashboards
- Team Lead receives instant push notification
- Founder can see all active blockers across all teams in one view
- Blocker resolved when employee marks it resolved or Team Lead closes it

### 7.4 Non-Submission Escalation

```
8:00 PM  → First reminder notification
9:00 PM  → Second reminder notification
10:00 PM → Auto-flag employee as "Update Missing"
Next Day Morning → Team Lead notified of missing updates
3 consecutive misses → HR Admin + Founder notified
```

### 7.5 Founder / Team Lead Dashboard Feed

- Chronological feed of all daily updates (newest first)
- Filter by: Department, Employee, Date, Has Blocker
- One-click reply / comment
- Blocker dashboard: All active blockers with assignee and age
- Weekly summary: % employees who submitted updates per day

### 7.6 User Stories

| ID | User Story | Acceptance Criteria |
|----|-----------|---------------------|
| DU-01 | As Employee, I want to submit my EOD update easily | Form loads in <2s, submission confirmed with animation |
| DU-02 | As Team Lead, I want to see my team's updates | Feed shows team updates, blocker flag visible |
| DU-03 | As Founder, I want all blockers in one view | Blocker dashboard with employee name, blocker text, age |
| DU-04 | As HR Admin, I want to track update submission rates | Weekly chart: submission % per team per day |

---

## 8. Task Management Module

### 8.1 Task Fields

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| task_id | UUID | Auto | |
| title | Text | Yes | Max 200 chars |
| description | Text | No | Rich text (markdown) |
| assigned_to | UUID | Yes | FK → profiles |
| created_by | UUID | Auto | FK → profiles |
| priority | Enum | Yes | Low, Medium, High, Urgent |
| status | Enum | Yes | To Do, In Progress, Completed, Blocked |
| due_date | Date | No | |
| project_id | UUID | No | FK → projects |
| department | Enum | No | |
| attachments | Array | No | Supabase Storage URLs |
| tags | Array | No | |
| estimated_hours | Float | No | |
| actual_hours | Float | No | |
| github_pr_url | Text | No | For developer tasks |
| created_at | Timestamp | Auto | |
| updated_at | Timestamp | Auto | |

### 8.2 Task Statuses & Transitions

```
To Do → In Progress → Completed
         ↓
       Blocked → In Progress (when unblocked)
```

### 8.3 Task Lifecycle

```
Task Created by Team Lead / Manager
       ↓
Assigned to Employee (Push Notification sent)
       ↓
Employee moves to "In Progress" (with optional start note)
       ↓
Employee adds comments / updates progress
       ↓
If blocked → Status = Blocked, Blocker reason required
       ↓
Team Lead notified of blocked task
       ↓
Employee marks Completed → Team Lead reviews
       ↓
Team Lead approves → Task Closed
```

### 8.4 Task Comments

Each task has a threaded comment system:

```sql
task_comments:
  - id
  - task_id (FK → tasks)
  - author_id (FK → profiles)
  - content (text)
  - attachment_url (nullable)
  - created_at
```

### 8.5 Priority Levels

| Priority | Color | SLA |
|----------|-------|-----|
| Low | 🟢 Green | 5+ business days |
| Medium | 🟡 Yellow | 2–5 business days |
| High | 🟠 Orange | 1–2 business days |
| Urgent | 🔴 Red | Same day |

### 8.6 Acceptance Criteria

- [ ] Tasks can have file attachments (PDF, image, video)
- [ ] Email + push notification on task assignment
- [ ] Overdue tasks flagged automatically
- [ ] Task history (all status changes logged)
- [ ] Urgent tasks appear at the top of dashboards
- [ ] Team Lead can filter tasks by status, priority, assignee
- [ ] Task search by title, tag, or assignee name

### 8.7 User Stories

| ID | User Story | Acceptance Criteria |
|----|-----------|---------------------|
| TM-01 | As Team Lead, I want to create a task and assign it | Task created, assignee notified immediately |
| TM-02 | As Employee, I want to update task status | Status update logged with timestamp |
| TM-03 | As Employee, I want to mark a task as blocked | Blocker reason required, Team Lead notified |
| TM-04 | As Team Lead, I want to see all overdue tasks | Overdue tasks highlighted in red |
| TM-05 | As Founder, I want to see tasks across all teams | Global task board with department filters |

---

## 9. Developer Workflow

### 9.1 Platform Usage

Developers use the same platform as other employees with a developer-specific task view.

**Attendance:** Standard check-in/check-out (remote-friendly, GPS optional for WFH)

**Daily Updates:** Same EOD form but with additional optional field:
- "GitHub PR / Commit links for today" (plain text)
- "Current sprint / milestone" (linked to task)

**Task Tracking:**
- Tasks can be linked to GitHub PR URLs (manual entry initially)
- Task board has "Developer" view: shows sprint-style columns
- Developers can self-assign tasks within their project scope

**Blocker Reporting:**
- Blockers can specify type: `Technical`, `Dependency`, `Approval Required`, `Infrastructure`
- Blocker notifications go to Team Lead and (if Infrastructure) to relevant team

### 9.2 Future GitHub Integration (Phase 3)

```
GitHub Webhook → Supabase Edge Function
       ↓
PR Opened → Auto-creates linked task comment
PR Merged → Auto-marks associated task as "Code Complete"
PR Review Requested → Notifies reviewer via platform
Issue Created → Can be imported as task (with mapping)
```

**GitHub Integration Fields (future):**
- `github_repo` on projects table
- `github_pr_url` on tasks table
- `github_commit_sha` on task_comments
- OAuth login with GitHub for developer accounts (optional)

---

## 10. Support Workflow

### 10.1 Platform Interaction

Support Executives work primarily in admin.localwala.tech. Their interaction with onboard.localwala.tech is:

**Attendance:** Required daily check-in/check-out via onboard.localwala.tech

**Daily Updates:** EOD update form with custom field:
- "Today's ticket count handled"
- "Escalations raised"
- "Top issues reported by customers"

**Task Updates:** HR tasks, training tasks, and admin tasks tracked here

### 10.2 Metrics Sync (Future)

- Ticket count auto-pulled from admin.localwala.tech API
- CSAT score surfaced in daily update summary
- Support performance dashboard linked to employee profile

---

## 11. Marketing Module

### 11.1 Campaign Management

**Campaign Fields:**

| Field | Type | Notes |
|-------|------|-------|
| campaign_id | UUID | |
| title | Text | |
| description | Text | |
| type | Enum | Social Media, Influencer, Email, Event, Paid Ads |
| status | Enum | Draft, Active, Paused, Completed |
| start_date | Date | |
| end_date | Date | |
| target_reach | Integer | |
| budget | Decimal | Optional |
| assigned_to | Array[UUID] | Multiple team members |
| influencers | Array[UUID] | FK → influencer_profiles |
| created_by | UUID | |

### 11.2 Campaign Workflow

```
Marketing Executive creates Campaign
       ↓
Assigns team members + influencers
       ↓
Sets deliverables per assignee (posts, reels, stories)
       ↓
Participants submit content (links, screenshots)
       ↓
Marketing Executive reviews and approves
       ↓
Performance metrics tracked post-go-live
```

### 11.3 Content Submission

- Each influencer/executive submits:
  - Post URL / Reel URL
  - Screenshot of engagement metrics
  - Views, likes, shares, saves (manual entry initially)
- Marketing Executive reviews submissions

### 11.4 Performance Dashboard

**Metrics:**
- Posts Created vs. Target
- Reels Uploaded vs. Target
- Total Campaign Reach
- Followers Gained (campaign period)
- Engagement Rate (likes+comments+shares / reach)
- Best performing content piece
- Top performing influencer

**Charts:**
- Daily reach line chart
- Platform breakdown (Instagram, YouTube, LinkedIn, etc.)
- Influencer performance comparison bar chart

---

## 12. Influencer Management Module

### 12.1 Influencer Profile

| Field | Type | Notes |
|-------|------|-------|
| influencer_id | UUID | |
| name | Text | |
| email | Text | |
| phone | Text | |
| instagram_handle | Text | |
| youtube_channel | Text | |
| linkedin_url | Text | |
| other_platforms | JSONB | Flexible |
| follower_count_instagram | Integer | |
| follower_count_youtube | Integer | |
| category | Enum | Food, Lifestyle, Travel, Tech, Fitness |
| city | Text | |
| collaboration_type | Enum | Employee, Influencer, Brand Ambassador, Freelancer |
| status | Enum | Active, Inactive, Blacklisted |
| rate_per_post | Decimal | Optional |
| notes | Text | |

### 12.2 Collaboration Types

```
Employee          → Salaried, full-time content role
Influencer        → External, campaign-based
Brand Ambassador  → Long-term advocate, retainer model
Freelancer        → One-off content projects
```

### 12.3 Performance Metrics

Per campaign, per influencer:

| Metric | Source |
|--------|--------|
| Views | Manual entry (auto in Phase 3) |
| Likes | Manual entry |
| Shares | Manual entry |
| Saves | Manual entry |
| Comments | Manual entry |
| Followers Gained | Pre/post comparison |
| Engagement Rate | Calculated: (L+C+S) / Views |

### 12.4 Leaderboards

**Top Influencers (Monthly):**
- Ranked by total reach
- Ranked by engagement rate
- Ranked by followers gained

**Campaign Rankings:**
- Best ROI campaign
- Highest reach campaign
- Most engaged audience campaign

---

## 13. Restaurant Onboarding Executive Module

### 13.1 Executive Dashboard

**Widgets:**
- 📍 My Territory Map (Google Maps embed)
- 📋 Assigned Restaurants (count + list)
- ⏰ Follow-ups Due Today
- 🆕 Nearby Uncontacted Restaurants (radius-based)
- 📈 This Month's Conversions
- 🏆 My Rank on Leaderboard

### 13.2 Restaurant Discovery

- GPS-based discovery: "Show restaurants within X km of my current location"
- Filters: Cuisine type, Rating, Already contacted, New lead
- Data source: Google Places API (Phase 1) + LocalWala internal DB

### 13.3 Field Visit Logging

```
Executive arrives at restaurant
       ↓
Taps "Log Visit" on their assigned restaurant
       ↓
GPS captured and verified (must be within 200m of restaurant)
       ↓
Visit form:
  - Visit type: Cold Call / Follow-Up / Document Collection / Onboarding
  - Outcome: Interested / Not Interested / Follow-up Required / Documents Collected
  - Notes (text)
  - Photo (optional — storefront, menu, owner interaction)
  - Next follow-up date
       ↓
Interaction saved to restaurant timeline
       ↓
Dashboard updated: last contact date refreshed
```

### 13.4 GPS Visit Verification

- System checks executive GPS coords vs. restaurant coords
- Visit only logged if within `200m` radius (configurable)
- If mismatch: executive can submit with reason (exception mode, requires approval)
- Fraud prevention: duplicate visits within 30 mins flagged

### 13.5 Executive Leaderboard

Ranked monthly by:
1. Restaurants converted (onboarded)
2. Total restaurants contacted
3. Visits logged
4. Follow-up completion rate

---

## 14. Restaurant CRM Module

### 14.1 Restaurant Record

| Field | Type | Notes |
|-------|------|-------|
| restaurant_id | UUID | |
| name | Text | |
| owner_name | Text | |
| owner_phone | Text | |
| owner_email | Text | Optional |
| address | Text | Full address |
| locality | Text | Area / Neighbourhood |
| city | Text | |
| pincode | Text | |
| latitude | Float | |
| longitude | Float | |
| google_place_id | Text | For Maps integration |
| cuisine_types | Array | |
| avg_rating | Float | From Google/Zomato |
| review_count | Integer | |
| positive_themes | Array | AI-extracted (Phase 2) |
| negative_themes | Array | AI-extracted (Phase 2) |
| assigned_executive_id | UUID | FK → profiles |
| lead_source | Enum | Field Visit, Founder, Marketing, Referral, Walk-in |
| status | Enum | See below |
| onboarded_at | Timestamp | |
| live_at | Timestamp | |
| created_at | Timestamp | |

### 14.2 Restaurant Statuses

```
New Lead             → Just added, not yet contacted
Contacted            → First contact made (call/visit)
Interested           → Restaurant owner showed interest
Follow-up Required   → Needs revisit / more information
Documents Pending    → Owner agreed, awaiting documents
Onboarding In Progress → Documents received, setup in progress
Onboarded            → On platform, not yet live
Live                 → Active on LocalWala, accepting orders
Rejected             → Owner declined
Closed Permanently   → Not available (closed/sold/demolished)
```

### 14.3 Restaurant Timeline

Every restaurant has a chronological timeline:

```
📅 2024-01-15 10:30 AM — Cold Visit by Rahul Kumar
   "Owner not available. Neighbour gave contact number."

📅 2024-01-17 03:00 PM — Follow-up Call by Rahul Kumar
   "Owner interested. Meeting scheduled for Monday."

📅 2024-01-20 11:00 AM — Meeting + Document Collection by Rahul Kumar
   "FSSAI uploaded. Bank details pending."
   [Document: FSSAI_Certificate.pdf]

📅 2024-01-22 09:00 AM — Status → Onboarding In Progress
   Updated by: Priya Sharma (HR Admin)

📅 2024-01-25 02:00 PM — Status → Live
   Updated by: Arjun (Founder)
   "First order placed at 6:15 PM same day. 🎉"
```

### 14.4 Restaurant Documents

| Document | Required For |
|----------|-------------|
| FSSAI License | Live status |
| GST Certificate | Live status |
| PAN Card (Owner) | Onboarding |
| Bank Account Details | Payment setup |
| Menu Photos | Profile setup |
| Storefront Photo | Profile setup |
| Partnership Agreement | Signing |

---

## 15. Follow-Up Engine

### 15.1 Follow-Up Fields

| Field | Notes |
|-------|-------|
| follow_up_date | Date picker |
| follow_up_time | Time picker |
| type | Call / In-Person Visit / WhatsApp |
| notes | What to discuss |
| reminder | 15min / 30min / 1hr / 1 day before |
| assigned_to | Executive (auto-filled) |

### 15.2 Notification Workflow

```
Follow-up scheduled → Saved to database
       ↓
Edge Function (cron) runs every 15 minutes
       ↓
Checks: follow_up_datetime - current_time < reminder_window
       ↓
Push notification → "Follow-up with {Restaurant Name} at {time}"
       ↓
Tap notification → Opens restaurant profile
       ↓
Executive logs visit / call outcome
       ↓
Schedule next follow-up or change status
```

### 15.3 Follow-Up Dashboard

- Calendar view: all follow-ups for the week
- Today's follow-ups: sorted by time
- Overdue follow-ups: highlighted in red
- Team Lead can see all team follow-ups

---

## 16. Founder Quick Actions

### 16.1 One-Tap Actions on Restaurant Profile

| Action | Behavior |
|--------|----------|
| 📞 Call | `tel:{owner_phone}` — opens dialer |
| 💬 WhatsApp | Opens pre-filled message (see below) |
| 🗺️ Maps | `https://maps.google.com/?q={lat},{lng}` |
| 👤 Assign Executive | Modal to select executive |
| 🚀 Start Onboarding | Changes status → Onboarding In Progress |

### 16.2 WhatsApp Pre-Filled Message

```
Template:
"Hello {owner_name}! 👋

I'm Arjun from LocalWala, a food delivery platform serving {city}.

We'd love to partner with {restaurant_name} to help you reach more customers in your area.

Our platform offers:
✅ Zero commission for first 3 months
✅ Free menu digitisation
✅ Daily payouts directly to your bank

Would you be available for a quick 10-minute call? 

Best regards,
LocalWala Team 🍽️"

URL: https://api.whatsapp.com/send?phone=91{phone}&text={encoded_message}
```

### 16.3 Founder Lead Tracking

All restaurants where Founder is `lead_source = 'Founder'` are tagged.

**Founder Lead Metrics:**
- Total founder-generated leads
- Conversion rate of founder leads vs. executive leads
- Average time to onboard founder leads

---

## 17. Restaurant Review Insights

### 17.1 Data Display

For each restaurant, display:

| Metric | Source |
|--------|--------|
| Google Rating (★) | Google Places API |
| Total Review Count | Google Places API |
| Top Positive Themes | AI tag extraction (Phase 2) |
| Top Negative Themes | AI tag extraction (Phase 2) |
| Sample Recent Reviews | Google Places API (3 latest) |

### 17.2 Executive Usage Guide

> **How to use review insights during a visit:**
>
> - If rating > 4.0: "Your restaurant is highly rated — customers love you! Joining LocalWala will help even more people discover you."
> - If rating < 3.5: "We've seen some reviews about [negative theme]. LocalWala partners get a dedicated account manager to improve customer experience."
> - If review count > 500: "You already have a strong customer base. Our platform will amplify your existing brand."

### 17.3 Review Intelligence (Phase 2)

- Auto-categorise reviews using Gemini / OpenAI API
- Surface top 5 positive and negative themes
- Executive talk-track suggestions based on negative themes

---

## 18. Territory Management

### 18.1 Territory Assignment

**Territory Unit:** Locality / Pincode (configurable)

| Feature | Description |
|---------|-------------|
| Assign territory to executive | HR Admin / Founder action |
| Territory map view | Visual colour-coded map |
| Conflict prevention | Alert if restaurant in another exec's territory |
| Territory transfer | Formal transfer with reason and approval |

### 18.2 Territory Rules

```
1. Each restaurant belongs to exactly one territory
2. Each territory has one primary executive assigned
3. An executive can have multiple territories
4. Conflicts: if Exec A adds restaurant in Exec B's territory → alert
5. Founder/HR can override territory assignment
6. Territory transfers logged in audit trail
```

### 18.3 Acceptance Criteria

- [ ] Territory boundaries visible on map
- [ ] Restaurant auto-assigned to territory based on GPS coords + pincode
- [ ] Executives cannot view restaurants outside their territory
- [ ] Transfer workflow requires approval from HR Admin or Founder
- [ ] Territory reassignment history logged

---

## 19. Founder Dashboard

### 19.1 Layout

```
┌──────────────────────────────────────────────────────┐
│  LocalWala Workforce Hub     [Search] [🔔 3] [Arjun] │
├──────────────────────────────────────────────────────┤
│                                                      │
│  👥 PEOPLE TODAY             📊 RESTAURANT PIPELINE  │
│  ┌─────────────────────┐    ┌──────────────────────┐ │
│  │ Present:    34/48   │    │ New Leads:     28    │ │
│  │ Absent:     14      │    │ Follow-ups:    45    │ │
│  │ Late:        6      │    │ Onboarding:    12    │ │
│  │ On Leave:    3      │    │ Live:         127    │ │
│  └─────────────────────┘    └──────────────────────┘ │
│                                                      │
│  🚨 ACTIVE BLOCKERS          📝 DAILY UPDATES        │
│  ┌─────────────────────┐    ┌──────────────────────┐ │
│  │ Rahul: API issue    │    │ Submitted: 38/48     │ │
│  │ Priya: Design review│    │ Pending:   10        │ │
│  │ [View All 5]        │    │ [Escalate Pending]   │ │
│  └─────────────────────┘    └──────────────────────┘ │
│                                                      │
│  🏆 EXECUTIVE LEADERBOARD    📣 MARKETING            │
│  1. Rahul Kumar   12 conv.  Active Campaigns:  3    │
│  2. Priya Sharma   9 conv.  Total Reach:  2.4L      │
│  3. Amit Singh     7 conv.  Top Influencer: @xyz    │
│                                                      │
│  ⚡ FOUNDER QUICK ACTIONS                            │
│  [+ Add Restaurant] [📞 Call All Pending Follow-ups] │
│  [🗺️ Territory Map] [📊 Export Weekly Report]        │
└──────────────────────────────────────────────────────┘
```

### 19.2 Real-Time Updates

- Dashboard uses Supabase Realtime subscriptions
- Attendance counts update live as employees check in
- New restaurant statuses reflect immediately
- Blocker count updates in real-time

---

## 20. Supabase Architecture

### 20.1 Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                  React Frontend                     │
│         (onboard.localwala.tech)                    │
└────────────────────┬────────────────────────────────┘
                     │ Supabase JS Client
┌────────────────────▼────────────────────────────────┐
│                 SUPABASE PLATFORM                   │
│                                                     │
│  ┌─────────┐  ┌──────────┐  ┌────────────────────┐ │
│  │  Auth   │  │ Realtime │  │   Edge Functions   │ │
│  │         │  │          │  │  (Deno / TS)       │ │
│  │• JWT    │  │• WS      │  │• Cron jobs         │ │
│  │• MFA    │  │• Channels│  │• Webhooks          │ │
│  │• Magic  │  │• Presence│  │• Notifications     │ │
│  │  Link   │  │          │  │• WhatsApp trigger  │ │
│  └─────────┘  └──────────┘  └────────────────────┘ │
│                                                     │
│  ┌─────────────────────────────────────────────┐   │
│  │          PostgreSQL Database                │   │
│  │  • profiles        • restaurants            │   │
│  │  • attendance      • restaurant_interactions│   │
│  │  • tasks           • campaigns              │   │
│  │  • daily_updates   • influencer_profiles    │   │
│  │  • notifications   • territories            │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
│  ┌────────────────────────────────────┐             │
│  │       Supabase Storage             │             │
│  │  • employee-docs                   │             │
│  │  • restaurant-docs                 │             │
│  │  • profile-pictures                │             │
│  │  • marketing-assets                │             │
│  └────────────────────────────────────┘             │
└─────────────────────────────────────────────────────┘
```

### 20.2 Supabase Auth Configuration

```typescript
// Auth settings
{
  provider: 'email',            // Primary: email + password
  magicLink: true,              // Enable for quick access
  phone: true,                  // OTP via Indian phone numbers
  mfa: true,                    // Enforce for Founder / HR Admin
  jwtExpiry: 3600,              // 1 hour tokens
  refreshTokenRotation: true,
  sessionTimeout: 86400,        // 24 hours
}

// Custom claims in JWT
{
  sub: 'user_uuid',
  role: 'founder | hr_admin | team_lead | employee | ...',
  department: 'engineering | marketing | operations | ...',
  employee_id: 'LW-2024-001',
  territory_ids: ['uuid1', 'uuid2'] // for onboarding execs
}
```

### 20.3 Supabase Realtime Channels

```typescript
// Attendance real-time
supabase.channel('attendance-live')
  .on('postgres_changes', { 
    event: '*', 
    schema: 'public', 
    table: 'attendance' 
  }, handleAttendanceUpdate)
  .subscribe()

// Founder dashboard live updates
supabase.channel('founder-dashboard')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'restaurants',
    filter: 'status=eq.Live'
  }, handleRestaurantUpdate)
  .subscribe()

// Notifications channel (per user)
supabase.channel(`notifications:${userId}`)
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'notifications',
    filter: `recipient_id=eq.${userId}`
  }, handleNewNotification)
  .subscribe()
```

### 20.4 Edge Functions

| Function | Trigger | Purpose |
|----------|---------|---------|
| `send-attendance-reminder` | Cron: 10:30 AM daily | Notify employees who haven't checked in |
| `send-checkout-reminder` | Cron: 7:30 PM daily | Notify checked-in employees to check out |
| `send-update-reminder` | Cron: 8:00 PM daily | Notify employees to submit EOD update |
| `check-followups` | Cron: every 15 min | Send follow-up reminders to executives |
| `whatsapp-trigger` | On founder action | Send pre-filled WhatsApp via API |
| `calculate-leaderboard` | Cron: daily midnight | Recalculate executive leaderboard |
| `sync-google-places` | On restaurant create | Fetch Google Place data for restaurant |
| `process-notification` | On DB insert | Push notification via FCM |

---

## 21. Database Schema (PostgreSQL)

### 21.1 profiles

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  employee_id TEXT UNIQUE NOT NULL, -- LW-2024-001
  full_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  department TEXT CHECK (department IN (
    'engineering', 'marketing', 'operations', 'hr', 
    'sales', 'support', 'finance', 'leadership'
  )),
  designation TEXT,
  employment_type TEXT CHECK (employment_type IN (
    'full_time', 'part_time', 'intern', 'freelancer',
    'consultant', 'contract', 'probationary'
  )),
  role TEXT NOT NULL CHECK (role IN (
    'founder', 'super_admin', 'hr_admin', 'team_lead',
    'employee', 'developer', 'support_executive',
    'marketing_executive', 'influencer', 'onboarding_executive',
    'intern', 'freelancer'
  )),
  status TEXT DEFAULT 'active' CHECK (status IN (
    'active', 'inactive', 'on_leave', 'notice_period', 'internship_completed'
  )),
  reporting_manager_id UUID REFERENCES profiles(id),
  joining_date DATE,
  profile_picture_url TEXT,
  work_location TEXT,
  emergency_contact TEXT,
  aadhaar_number TEXT, -- encrypted
  pan_number TEXT, -- encrypted
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 21.2 attendance

```sql
CREATE TABLE attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES profiles(id),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  check_in_time TIMESTAMPTZ,
  check_out_time TIMESTAMPTZ,
  check_in_lat DECIMAL(10,7),
  check_in_lng DECIMAL(10,7),
  check_out_lat DECIMAL(10,7),
  check_out_lng DECIMAL(10,7),
  working_hours DECIMAL(4,2) GENERATED ALWAYS AS (
    EXTRACT(EPOCH FROM (check_out_time - check_in_time)) / 3600
  ) STORED,
  status TEXT DEFAULT 'absent' CHECK (status IN (
    'present', 'absent', 'half_day', 'late', 'wfh', 'on_leave'
  )),
  notes TEXT,
  override_by UUID REFERENCES profiles(id),
  override_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(employee_id, date)
);
```

### 21.3 tasks

```sql
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  assigned_to UUID NOT NULL REFERENCES profiles(id),
  created_by UUID NOT NULL REFERENCES profiles(id),
  department TEXT,
  priority TEXT DEFAULT 'medium' CHECK (priority IN (
    'low', 'medium', 'high', 'urgent'
  )),
  status TEXT DEFAULT 'todo' CHECK (status IN (
    'todo', 'in_progress', 'completed', 'blocked'
  )),
  due_date DATE,
  estimated_hours DECIMAL(5,2),
  actual_hours DECIMAL(5,2),
  blocker_reason TEXT,
  github_pr_url TEXT,
  tags TEXT[],
  attachment_urls TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 21.4 task_comments

```sql
CREATE TABLE task_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES profiles(id),
  content TEXT NOT NULL,
  attachment_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 21.5 daily_updates

```sql
CREATE TABLE daily_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES profiles(id),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  completed_today TEXT NOT NULL,
  plan_for_tomorrow TEXT NOT NULL,
  blockers TEXT,
  has_blocker BOOLEAN DEFAULT FALSE,
  blocker_resolved BOOLEAN DEFAULT FALSE,
  mood TEXT CHECK (mood IN ('terrible', 'bad', 'neutral', 'good', 'great')),
  github_links TEXT, -- for developers
  ticket_count INTEGER, -- for support executives
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(employee_id, date)
);
```

### 21.6 restaurants

```sql
CREATE TABLE restaurants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  owner_name TEXT,
  owner_phone TEXT,
  owner_email TEXT,
  address TEXT,
  locality TEXT,
  city TEXT DEFAULT 'Indore',
  pincode TEXT,
  latitude DECIMAL(10,7),
  longitude DECIMAL(10,7),
  google_place_id TEXT,
  cuisine_types TEXT[],
  avg_rating DECIMAL(2,1),
  review_count INTEGER,
  positive_themes TEXT[], -- AI-generated (Phase 2)
  negative_themes TEXT[], -- AI-generated (Phase 2)
  assigned_executive_id UUID REFERENCES profiles(id),
  territory_id UUID REFERENCES territories(id),
  lead_source TEXT CHECK (lead_source IN (
    'field_visit', 'founder', 'marketing', 'referral', 'walk_in'
  )),
  status TEXT DEFAULT 'new_lead' CHECK (status IN (
    'new_lead', 'contacted', 'interested', 'follow_up_required',
    'documents_pending', 'onboarding_in_progress', 'onboarded',
    'live', 'rejected', 'closed_permanently'
  )),
  onboarded_at TIMESTAMPTZ,
  live_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 21.7 restaurant_interactions

```sql
CREATE TABLE restaurant_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id),
  executive_id UUID NOT NULL REFERENCES profiles(id),
  interaction_type TEXT CHECK (interaction_type IN (
    'cold_visit', 'follow_up_visit', 'call', 'whatsapp',
    'document_collection', 'onboarding_meeting', 'founder_call'
  )),
  outcome TEXT CHECK (outcome IN (
    'interested', 'not_interested', 'follow_up_required',
    'documents_collected', 'rejected', 'no_response'
  )),
  notes TEXT,
  visit_lat DECIMAL(10,7),
  visit_lng DECIMAL(10,7),
  gps_verified BOOLEAN DEFAULT FALSE,
  photo_urls TEXT[],
  interacted_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 21.8 restaurant_documents

```sql
CREATE TABLE restaurant_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id),
  document_type TEXT CHECK (document_type IN (
    'fssai', 'gst', 'pan', 'bank_details', 'menu_photos',
    'storefront_photo', 'partnership_agreement', 'other'
  )),
  file_url TEXT NOT NULL,
  file_name TEXT,
  uploaded_by UUID NOT NULL REFERENCES profiles(id),
  verified BOOLEAN DEFAULT FALSE,
  verified_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 21.9 follow_ups

```sql
CREATE TABLE follow_ups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id),
  assigned_to UUID NOT NULL REFERENCES profiles(id),
  follow_up_type TEXT CHECK (follow_up_type IN ('call', 'visit', 'whatsapp')),
  scheduled_at TIMESTAMPTZ NOT NULL,
  reminder_minutes INTEGER DEFAULT 30, -- notify X mins before
  notes TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN (
    'pending', 'completed', 'cancelled', 'rescheduled'
  )),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 21.10 campaigns

```sql
CREATE TABLE campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  campaign_type TEXT CHECK (campaign_type IN (
    'social_media', 'influencer', 'email', 'event', 'paid_ads'
  )),
  status TEXT DEFAULT 'draft' CHECK (status IN (
    'draft', 'active', 'paused', 'completed'
  )),
  start_date DATE,
  end_date DATE,
  target_reach INTEGER,
  budget DECIMAL(12,2),
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE campaign_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id),
  member_id UUID NOT NULL REFERENCES profiles(id),
  member_type TEXT CHECK (member_type IN ('team', 'influencer')),
  deliverables JSONB, -- {posts: 3, reels: 2, stories: 5}
  UNIQUE(campaign_id, member_id)
);
```

### 21.11 influencer_profiles

```sql
CREATE TABLE influencer_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES profiles(id), -- if also an employee
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  instagram_handle TEXT,
  youtube_channel TEXT,
  linkedin_url TEXT,
  other_platforms JSONB,
  follower_count_instagram INTEGER DEFAULT 0,
  follower_count_youtube INTEGER DEFAULT 0,
  category TEXT CHECK (category IN (
    'food', 'lifestyle', 'travel', 'tech', 'fitness', 'general'
  )),
  city TEXT,
  collaboration_type TEXT CHECK (collaboration_type IN (
    'employee', 'influencer', 'brand_ambassador', 'freelancer'
  )),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'blacklisted')),
  rate_per_post DECIMAL(10,2),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 21.12 influencer_performance

```sql
CREATE TABLE influencer_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  influencer_id UUID NOT NULL REFERENCES influencer_profiles(id),
  campaign_id UUID NOT NULL REFERENCES campaigns(id),
  content_url TEXT,
  platform TEXT CHECK (platform IN (
    'instagram', 'youtube', 'linkedin', 'twitter', 'other'
  )),
  views INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  saves INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  followers_gained INTEGER DEFAULT 0,
  engagement_rate DECIMAL(5,2) GENERATED ALWAYS AS (
    CASE WHEN views > 0 
    THEN ((likes + shares + comments)::DECIMAL / views) * 100
    ELSE 0 END
  ) STORED,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  approved BOOLEAN DEFAULT FALSE,
  approved_by UUID REFERENCES profiles(id)
);
```

### 21.13 territories

```sql
CREATE TABLE territories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  city TEXT,
  pincodes TEXT[], -- ['452001', '452002']
  assigned_executive_id UUID REFERENCES profiles(id),
  polygon_coords JSONB, -- GeoJSON polygon for map display
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 21.14 notifications

```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id UUID NOT NULL REFERENCES profiles(id),
  sender_id UUID REFERENCES profiles(id),
  type TEXT CHECK (type IN (
    'attendance_reminder', 'checkout_reminder', 'update_reminder',
    'follow_up_reminder', 'task_assigned', 'task_updated',
    'task_overdue', 'blocker_flagged', 'restaurant_status_changed',
    'campaign_assigned', 'general'
  )),
  title TEXT NOT NULL,
  message TEXT,
  data JSONB, -- Metadata: {restaurant_id, task_id, etc.}
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 21.15 audit_logs

```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID NOT NULL REFERENCES profiles(id),
  action TEXT NOT NULL, -- 'UPDATE', 'DELETE', 'STATUS_CHANGE'
  resource_type TEXT NOT NULL, -- 'restaurant', 'employee', 'task'
  resource_id UUID NOT NULL,
  old_value JSONB,
  new_value JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 22. Storage Strategy

### 22.1 Bucket Structure

```
supabase-storage/
├── profile-pictures/
│   └── {user_id}/avatar.{ext}
│
├── employee-documents/
│   └── {employee_id}/
│       ├── offer-letter.pdf
│       ├── internship-letter.pdf
│       ├── employment-agreement.pdf
│       ├── nda.pdf
│       ├── aadhaar.pdf
│       └── pan.pdf
│
├── restaurant-documents/
│   └── {restaurant_id}/
│       ├── fssai.pdf
│       ├── gst-certificate.pdf
│       ├── pan-card.pdf
│       ├── bank-details.pdf
│       └── partnership-agreement.pdf
│
├── restaurant-images/
│   └── {restaurant_id}/
│       ├── storefront.jpg
│       └── menu-{n}.jpg
│
└── marketing-assets/
    └── {campaign_id}/
        ├── brief.pdf
        ├── assets/
        │   ├── logo.png
        │   └── banner.jpg
        └── submissions/
            └── {influencer_id}/
                └── screenshot.jpg
```

### 22.2 Bucket Access Rules

| Bucket | Public | Auth Required | RLS Rule |
|--------|--------|---------------|----------|
| profile-pictures | Yes (read) | Write | Own file only for write |
| employee-documents | No | Yes | `auth.uid() = employee_id OR role IN ('hr_admin', 'founder')` |
| restaurant-documents | No | Yes | `role IN ('onboarding_executive', 'hr_admin', 'founder')` |
| restaurant-images | No | Yes | Executives and above |
| marketing-assets | No | Yes | Marketing team and above |

### 22.3 Signed URLs

- All private documents served via signed URLs with 1-hour expiry
- Founder and HR Admin get 24-hour signed URLs
- Document access logged in `audit_logs`

---

## 23. Notification System

### 23.1 Notification Channels

| Channel | Use Case | Tool |
|---------|----------|------|
| In-App | All notifications | Supabase Realtime |
| Push (Web) | Mobile/PWA | Firebase Cloud Messaging |
| WhatsApp | Follow-up reminders, critical alerts | WhatsApp Business API |
| Email | Document uploads, weekly reports | Supabase + SendGrid |

### 23.2 Notification Triggers

| Event | Recipient | Channel |
|-------|-----------|---------|
| No check-in by 10:30 AM | Employee | Push + In-App |
| No check-out by 7:30 PM | Employee | Push + In-App |
| 3 consecutive absences | HR + Founder | In-App + Email |
| EOD update missing at 8 PM | Employee | Push |
| EOD update missing at 9 PM | Employee | Push |
| Blocker reported | Team Lead | Push + In-App |
| Task assigned | Employee | Push + Email |
| Task overdue | Employee + Team Lead | Push + In-App |
| Follow-up due | Executive | Push + WhatsApp |
| Restaurant status changed to Live | Founder | In-App |
| Campaign deadline approaching | Marketing team | Push |
| New restaurant added to territory | Executive | In-App |

---

## 24. Security & RLS Policies

### 24.1 Row Level Security — Core Tables

```sql
-- PROFILES: Employees see own, Team Leads see team, HR/Founder see all
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Employee can read own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "HR and Founder can read all profiles"
  ON profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.id = auth.uid() 
      AND p.role IN ('founder', 'super_admin', 'hr_admin')
    )
  );

CREATE POLICY "Team Lead can read team profiles"
  ON profiles FOR SELECT
  USING (
    reporting_manager_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles p WHERE p.id = auth.uid() 
      AND p.role = 'team_lead'
      AND p.department = profiles.department
    )
  );

-- ATTENDANCE: Own records + admin access
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Employee reads own attendance"
  ON attendance FOR SELECT
  USING (employee_id = auth.uid());

CREATE POLICY "Admin reads all attendance"
  ON attendance FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() 
      AND role IN ('founder', 'super_admin', 'hr_admin', 'team_lead')
    )
  );

CREATE POLICY "Employee inserts own attendance"
  ON attendance FOR INSERT
  WITH CHECK (employee_id = auth.uid());

CREATE POLICY "Admin can override attendance"
  ON attendance FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() 
      AND role IN ('founder', 'super_admin', 'hr_admin')
    )
  );

-- RESTAURANTS: Executive sees assigned, Admin sees all
ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Executive reads assigned restaurants"
  ON restaurants FOR SELECT
  USING (
    assigned_executive_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid()
      AND role IN ('founder', 'super_admin', 'hr_admin', 'team_lead')
    )
  );

CREATE POLICY "Executive updates assigned restaurants"
  ON restaurants FOR UPDATE
  USING (assigned_executive_id = auth.uid())
  WITH CHECK (assigned_executive_id = auth.uid());

-- TASKS: Assignee + creator + admin
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Assignee and creator can view task"
  ON tasks FOR SELECT
  USING (
    assigned_to = auth.uid()
    OR created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid()
      AND role IN ('founder', 'super_admin', 'hr_admin', 'team_lead')
    )
  );
```

### 24.2 Audit Logging Requirements

All of the following actions must be logged in `audit_logs`:

| Action | Log Fields |
|--------|-----------|
| Employee profile created/updated | actor, resource, old→new |
| Attendance record overridden | actor, employee, reason |
| Restaurant status changed | actor, restaurant, old→new status |
| Document uploaded | actor, employee/restaurant, doc type |
| Task status changed | actor, task, old→new status |
| User role changed | actor, target user, old→new role |
| Territory assigned/transferred | actor, territory, old→new executive |

### 24.3 MFA Requirements

- **Founder**: MFA enforced (TOTP)
- **HR Admin**: MFA enforced
- **Super Admin**: MFA enforced
- **Team Lead**: MFA optional (recommended)
- **Others**: MFA optional

---

## 25. UI/UX Requirements

### 25.1 Design System

```
Color Palette:
  Primary:    #FF6B35 (LocalWala brand orange)
  Secondary:  #2D3748 (Dark slate)
  Success:    #48BB78 (Green)
  Warning:    #ECC94B (Yellow)
  Danger:     #FC8181 (Red)
  Background: #F7FAFC (Light grey)
  Dark Mode:  #1A202C

Typography:
  Heading: Inter (700/600)
  Body:    Inter (400/500)
  Mono:    Fira Code (Developer tasks, IDs)

Components:
  Border Radius: 12px (cards), 8px (inputs), 999px (badges)
  Shadow: 0 4px 24px rgba(0,0,0,0.08)
  Spacing: 8px base grid
```

### 25.2 Login Screen

```
┌─────────────────────────────────────────┐
│                                         │
│         🍽️  LocalWala                   │
│         Workforce Hub                   │
│                                         │
│    [Email Address input]                │
│    [Password input]         [Show/Hide] │
│                                         │
│    [Sign In →]                          │
│                                         │
│    ──────── or ────────                 │
│    [📱 Sign in with OTP]                │
│    [🔗 Magic Link]                      │
│                                         │
│    Forgot password?                     │
└─────────────────────────────────────────┘
```

**Requirements:**
- LocalWala logo and brand colours
- Smooth fade-in animation on load
- Error states with shake animation
- Auto-redirect to role-specific dashboard after login

### 25.3 Founder Dashboard

- Full-screen grid layout (desktop first, responsive mobile)
- Live attendance counter with pulse animation
- Restaurant pipeline as Kanban-style funnel chart
- Leaderboard with animated rank numbers
- Quick Action buttons: floating action bar at bottom
- Realtime notification bell with badge count

### 25.4 Employee Dashboard

```
Top: Welcome card + attendance check-in/out button (large, prominent)
Middle: My tasks for today (card list)
Bottom: Daily update submission status + prompt
Sidebar: Quick links to profile, team, announcements
```

### 25.5 Restaurant Onboarding Executive Dashboard

- **Mobile-first design** (executives are in the field)
- Large touch targets (44px minimum)
- Google Maps embed as primary view
- Restaurant list below map with swipe cards
- Floating "Log Visit" button (bottom-right FAB)
- Offline support: cache last-known data for low connectivity

### 25.6 Restaurant Profile Screen

```
[Restaurant Photo / Map Pin]
[Name] [Rating ★★★★☆] [Review Count]
[Status Badge: Interested]
[Owner: Ramesh Kumar  📞 Call  💬 WhatsApp]
[Address + 🗺️ Open Maps]
[Assigned: Rahul Kumar]

═══════ Timeline ═══════
📅 2024-01-20 — Document Collection
   "FSSAI received. Bank details pending."
📅 2024-01-17 — Follow-up Call
   "Very interested. Meeting booked."
📅 2024-01-15 — Cold Visit
   "Owner not available."

═══════ Documents ═══════
📄 FSSAI Certificate ✅
📄 GST Certificate ⏳ Pending

[+ Schedule Follow-up]  [Update Status]
```

### 25.7 Marketing Dashboard

- Campaign Kanban: Draft → Active → Completed
- Metrics cards: Reach, Engagement, Follower Growth
- Influencer performance table with sortable columns
- Content submission gallery view

### 25.8 HR Dashboard

- Employee directory with filters
- Headcount chart by department (donut chart)
- Attendance anomalies widget
- Document status table (who has pending uploads)
- Leave calendar

### 25.9 Attendance Screen (Mobile)

```
┌──────────────────────────┐
│  Tuesday, 10 June 2026   │
│                          │
│  📍 Indore, MP           │
│  GPS: ✅ Active          │
│                          │
│  ┌────────────────────┐  │
│  │                    │  │
│  │   CHECK IN         │  │  ← Large tap area
│  │   Tap to punch in  │  │
│  │                    │  │
│  └────────────────────┘  │
│                          │
│  Today's Schedule:       │
│  Work Hours: 9 AM - 6 PM │
│  Grace Period: 30 min    │
│                          │
│  Yesterday: ✅ 9h 12m   │
└──────────────────────────┘
```

---

## 26. Implementation Roadmap

### Phase 1 — MVP (Weeks 1–8)

**Goal:** Core workforce operations running for all employees.

| Feature | Effort | Dependencies |
|---------|--------|-------------|
| Supabase setup + Auth | 3 days | None |
| Employee profiles + roles | 5 days | Auth |
| Attendance module | 5 days | Profiles |
| Daily updates module | 4 days | Profiles |
| Task management | 6 days | Profiles |
| Restaurant CRM (basic) | 6 days | Profiles |
| Founder dashboard | 5 days | All above |
| Basic notifications | 3 days | Edge Functions |
| HR document uploads | 3 days | Storage |

**Phase 1 Risks:**
- GPS accuracy issues on cheap Android devices → Add manual override with photo proof
- Connectivity in field → Implement offline-first with queue-based sync

**Phase 1 Success Criteria:**
- 100% of employees onboarded to platform
- Attendance tracked digitally for 2+ weeks
- EOD updates submitting at 80%+ rate
- 50+ restaurants in CRM

---

### Phase 2 — Growth (Weeks 9–16)

**Goal:** Marketing module, influencer management, territory management, advanced analytics.

| Feature | Effort | Dependencies |
|---------|--------|-------------|
| Marketing campaigns module | 6 days | Profiles |
| Influencer management | 5 days | Campaigns |
| Territory management + maps | 6 days | Restaurants |
| Follow-up engine + notifications | 4 days | Restaurants |
| WhatsApp integration | 3 days | Restaurants |
| Leaderboards | 3 days | Attendance, Tasks, Restaurants |
| Advanced founder dashboard | 5 days | All modules |
| Executive mobile PWA optimisation | 4 days | CRM |
| Review insights (Google Places) | 3 days | Restaurants |

**Phase 2 Risks:**
- WhatsApp Business API approval delays → Fallback to `wa.me` deep links
- Google Places API costs → Cache restaurant data, limit refresh frequency

**Phase 2 Success Criteria:**
- 10+ active campaigns tracked
- Territory conflicts reduced to zero
- Follow-up completion rate > 80%

---

### Phase 3 — Scale (Weeks 17–24)

**Goal:** AI features, GitHub integration, advanced analytics, multi-city support.

| Feature | Effort | Dependencies |
|---------|--------|-------------|
| GitHub integration (developer tasks) | 5 days | Tasks |
| AI review theme extraction | 4 days | Restaurants |
| AI-generated talk tracks for executives | 4 days | Reviews |
| Advanced reporting + exports | 5 days | All modules |
| Multi-city / multi-region support | 5 days | Territories |
| Mobile app (React Native) | 14 days | All APIs |
| HRMS payroll integration (Phase 3b) | 8 days | Profiles |
| Automated influencer metrics pull | 5 days | Influencer |

**Phase 3 Risks:**
- AI API costs at scale → Add rate limiting and caching
- React Native parity with web → Maintain shared component library

---

## 27. Success Metrics & KPIs

### 27.1 Employee Productivity

| KPI | Target | Measurement |
|-----|--------|-------------|
| EOD Update Submission Rate | >95% daily | `(updates_submitted / active_employees) * 100` |
| Task Completion Rate (on time) | >80% | Tasks completed before due date / total tasks |
| Average Task Cycle Time | Decrease 20% QoQ | `completed_at - created_at` average |
| Blocker Resolution Time | <24 hours | `blocker_resolved_at - reported_at` |
| Attendance Accuracy | 100% digital | Zero manual records |

### 27.2 Restaurant Onboarding Efficiency

| KPI | Target | Measurement |
|-----|--------|-------------|
| Time to Onboard (Lead → Live) | <3 days | `live_at - created_at` |
| Follow-up Completion Rate | >85% | Follow-ups completed / scheduled |
| Weekly Restaurants Contacted | >15 per executive | Interactions per exec per week |
| Conversion Rate (Lead → Live) | >30% | Live restaurants / total leads |
| Founder Lead Conversion Rate | >50% | Founder-generated leads → Live |

### 27.3 Executive Performance

| KPI | Target | Measurement |
|-----|--------|-------------|
| Visits per Day | >5 | Interactions logged per day |
| GPS Verified Visit Rate | >90% | GPS-verified / total visits |
| New Restaurants Added per Week | >10 | New CRM entries per exec per week |
| Documents Collected on First Visit | >40% | Docs submitted same day as first visit |

### 27.4 Marketing Effectiveness

| KPI | Target | Measurement |
|-----|--------|-------------|
| Campaign Reach | 50K+ per campaign | Sum of content views |
| Influencer Engagement Rate | >4% | (L+C+S) / Views |
| Content Submission On-Time Rate | >90% | Submissions before deadline |
| Followers Gained per Campaign | >500 | Net new followers |

### 27.5 Founder Visibility

| KPI | Target | Measurement |
|-----|--------|-------------|
| Time to Access Daily Ops Report | <60 seconds | Dashboard load time + data freshness |
| Realtime Attendance Accuracy | 100% | Live count vs. manual spot check |
| Blocker Visibility Delay | <5 minutes | Blocker reported to founder view |
| Restaurant Pipeline Freshness | <1 hour lag | Last update timestamp |

---

## Appendix A — Entity Relationship Diagram

```
profiles ─────────────────────────────────────────────────┐
   │                                                      │
   ├── attendance (1:many)                                │
   ├── daily_updates (1:many)                             │
   ├── tasks [assigned_to, created_by] (many:many)        │
   ├── task_comments (1:many)                             │
   ├── notifications (1:many)                             │
   ├── restaurants [assigned_executive_id] (1:many)       │
   ├── restaurant_interactions (1:many)                   │
   ├── follow_ups (1:many)                                │
   ├── influencer_profiles [profile_id] (1:1 optional)   │
   ├── campaign_members (many:many via campaigns)         │
   └── audit_logs [actor_id] (1:many)                    │
                                                         │
restaurants ─────────────────────────────────────────────┘
   │
   ├── restaurant_interactions (1:many)
   ├── restaurant_documents (1:many)
   ├── follow_ups (1:many)
   └── territories (many:1)

campaigns
   ├── campaign_members (1:many)
   └── influencer_performance (1:many via influencer_profiles)
```

---

## Appendix B — Confirmed Tech Stack

> All packages below are **already installed** in `C:\onboarding\localwala-food\`. No additional setup required unless noted.

### Core Framework

| Layer | Technology | Version | Notes |
|-------|-----------|---------|-------|
| Framework | **Next.js** (App Router) | 14.x | SSR + API Routes built-in |
| Language | **TypeScript** | 5.x | Strict mode enabled |
| Runtime | **React** | 18.x | Concurrent features |
| Package Manager | npm | — | `package-lock.json` present |

### Styling & UI

| Layer | Technology | Version | Notes |
|-------|-----------|---------|-------|
| CSS Framework | **Tailwind CSS** | 3.x | `tailwind.config.js` configured |
| Animation | **Framer Motion** | 11.x | Page transitions, micro-animations |
| Animation (advanced) | **GSAP + @gsap/react** | 3.x | Complex timeline animations |
| Icon Library | **Lucide React** | 0.454 | Consistent icon set |
| Component Primitives | **Radix UI** | Latest | Checkbox, Label, Select, Tabs, Slot |
| 3D (optional) | **Three.js + @react-three/fiber + drei** | Latest | For landing/background effects |
| Theme | **next-themes** | 0.3 | Dark/Light mode support |
| Class Utilities | **clsx + tailwind-merge + cva** | Latest | Dynamic classname management |

### Forms & Validation

| Layer | Technology | Version | Notes |
|-------|-----------|---------|-------|
| Forms | **React Hook Form** | 7.x | Performant, uncontrolled forms |
| Validation Schema | **Zod** | 3.x | TypeScript-first schema validation |
| Resolver | **@hookform/resolvers** | 3.x | Bridges RHF ↔ Zod |

### Backend & Data

| Layer | Technology | Version | Notes |
|-------|-----------|---------|-------|
| Backend-as-a-Service | **Supabase** | 2.x | Auth, DB, Storage, Realtime, Edge Functions |
| Database | **PostgreSQL 15** | via Supabase | Row Level Security enabled |
| Auth | **Supabase Auth** | built-in | Email, OTP, Magic Link, MFA |
| Realtime | **Supabase Realtime** | built-in | Live attendance, notifications |
| Storage | **Supabase Storage** | built-in | Documents, images, assets |
| Edge Functions | **Supabase Edge (Deno)** | built-in | Cron jobs, webhooks, notifications |
| Email | **Resend** | 6.x | ✅ Already installed — transactional emails |

### Maps & Location

| Layer | Technology | Notes |
|-------|-----------|-------|
| Maps | **Google Maps JS API** | To install: `@react-google-maps/api` (Phase 1) |
| GPS | **Browser Geolocation API** | Native — no package needed |

### Charts & Analytics

| Layer | Technology | Notes |
|-------|-----------|-------|
| Charts | **Recharts** | To install in Phase 1: `npm i recharts` |

### State Management

| Layer | Technology | Notes |
|-------|-----------|-------|
| Server State | **Next.js Server Components + fetch** | Built-in with App Router |
| Client State | **React Context / useState** | Sufficient for MVP |
| Complex State (Phase 2+) | **Zustand** | To install when needed: `npm i zustand` |

### DevOps & Infrastructure

| Layer | Technology | Notes |
|-------|-----------|-------|
| Hosting | **Vercel** | Recommended for Next.js |
| Containerisation | **Docker** | `Dockerfile` already present |
| Version Control | **Git** | `.git` already initialised |
| Linting | **ESLint** | `.eslintrc.json` configured |
| Formatting | **Prettier** | Configured in `package.json` |
| Type Checking | `tsc --noEmit` | `npm run typecheck` |

### Notifications

| Channel | Tool | Status |
|---------|------|--------|
| In-App | Supabase Realtime | ✅ Installed |
| Email | Resend | ✅ Installed |
| Push (Web/PWA) | Firebase Cloud Messaging | To install Phase 1 |
| WhatsApp | `wa.me` deep link (Phase 1) → WhatsApp Business API (Phase 2) | No install needed for Phase 1 |

### Packages To Install (Not Yet in project)

```bash
# Phase 1 — Maps & Charts
npm install @react-google-maps/api recharts

# Phase 1 — Push Notifications
npm install firebase

# Phase 2 — State Management
npm install zustand

# Phase 2 — Date handling
npm install date-fns

# Phase 2 — Rich Text (task descriptions)
npm install @tiptap/react @tiptap/pm @tiptap/starter-kit
```

### Project Directory Structure (Planned)

```
C:\onboarding\localwala-food\src\
├── app/
│   ├── (public)/              ← Existing public site
│   │   ├── page.tsx
│   │   ├── about-us/
│   │   └── ...
│   └── (workforce)/           ← NEW: Internal platform
│       ├── login/
│       ├── dashboard/
│       ├── attendance/
│       ├── tasks/
│       ├── daily-updates/
│       ├── restaurants/
│       ├── marketing/
│       ├── influencers/
│       ├── employees/
│       └── hr/
├── components/
│   ├── ui/                    ← Radix + Tailwind primitives
│   ├── workforce/             ← NEW: Workforce Hub components
│   └── ...
├── lib/
│   ├── supabase/              ← Supabase client + helpers
│   ├── hooks/                 ← Custom React hooks
│   └── utils/
└── types/
    └── workforce.ts           ← Shared TypeScript types
```

---

*Document prepared for LocalWala internal use. Version 1.1 — June 2026.*  
*Tech stack updated to reflect confirmed `localwala-food` project dependencies.*  
*Next review: After Phase 1 completion.*
