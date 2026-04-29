# Acadize — Frozen Frontend API Response Contracts

> **Version:** 1.0.0  
> **Date:** 2026-04-26  
> **Status:**  FROZEN — Frontend may code against these shapes immediately. 

All dates are ISO-8601 strings unless noted. All IDs are CUID2 strings.
Pagination wrapper and error envelope are defined once at the top; every paginated route uses the same wrapper.

---

## Table of Contents

1. [Standard Envelopes](#1-standard-envelopes)
2. [Enrollments (`/api/enrollments`)](#2-enrollments)
3. [Progress (`/api/progress`)](#3-progress)
4. [Streaks (`/api/streaks`)](#4-streaks)
5. [Student (`/api/student`)](#5-student)
6. [Gamification (`/api/gamification`)](#6-gamification)
7. [Stub Payloads for Unfinished Routes](#7-stub-payloads)

---

## 1. Standard Envelopes

### 1a. Paginated Success Envelope

Used by every route that calls `buildPaginatedResponse()`.

```jsonc
{
  "data": [ /* array of items */ ],
  "pagination": {
    "total": 42,           // int — total matching rows
    "page": 1,             // int — current page (1-indexed)
    "limit": 50,           // int — items per page (max 100)
    "totalPages": 1,       // int
    "hasNextPage": false,   // bool
    "hasPrevPage": false    // bool
  }
}
```

Query params: `?page=1&limit=50` (defaults: page=1, limit=50, max=100).

### 1b. Standard Error Envelope

```jsonc
// 4xx / 5xx
{
  "message": "Human-readable error string"  // always "message", never "error"
}
```

All routes now consistently use `"message"` as the error key.

### 1c. Standard Success (non-paginated)

```jsonc
// Mutation success — always includes "message"
{
  "message": "Action completed successfully",
  // ...additional fields per route
}
```

### 1d. Empty-Collection Defaults

When the student has zero data, routes return the **same shape** with empty arrays / zeroed numbers — never `null` at the top level.

---

## 2. Enrollments

**Base path:** `/api/enrollments`  
**Auth:** Bearer JWT + active subscription on all routes.

---

### 2a. `GET /api/enrollments/my-courses`

> Student — simplified course list (no enrollment metadata).

**Response `200`** — Paginated envelope, each item:

```jsonc
{
  "id": "clxx...",                // string — course ID
  "title": "Mathematics 101",    // string
  "description": "...",          // string | null
  "teacherId": "clxx..."         // string
}
```

**Error `500`:**
```jsonc
{ "message": "Failed to fetch courses", "error": "..." }
```

---

### 2b. `GET /api/enrollments/student`

> Student — own enrollments with course details.

**Response `200`** — Paginated envelope, each item:

```jsonc
{
  "id": "clxx...",               // string — enrollment ID
  "courseId": "clxx...",         // string
  "enrolledAt": "2026-04-01T...", // ISO timestamp
  "course": {
    "id": "clxx...",             // string
    "title": "Mathematics 101", // string
    "description": "...",       // string | null
    "teacherId": "clxx...",     // string
    "isPublished": true,        // boolean
    "imageUrl": "https://..."   // string | null
  }
}
```

---

### 2c. `GET /api/enrollments/student/:studentId`

> Teacher — view a specific student's enrollments.

**Response `200`** — Same paginated shape as **2b**.

**Error `403`:**
```jsonc
{ "message": "Forbidden: Teachers only" }
```

---

### 2d. `GET /api/enrollments/course/:courseId`

> Teacher — enrolled students with progress in a course.

**Response `200`** — Paginated envelope, each item:

```jsonc
{
  "enrollmentId": "clxx...",       // string
  "enrolledAt": "2026-04-01T...", // ISO timestamp
  "studentId": "clxx...",         // string
  "studentName": "Jane Doe",     // string
  "studentEmail": "jane@...",    // string
  "studentRole": "student",      // string (always "student")
  "progress": 75,                // int 0-100 — % of assignments submitted
  "completedAssignments": 3,     // int
  "totalAssignments": 4,         // int
  "averageScore": 82             // int 0-100
}
```

---

### 2e. `GET /api/enrollments/students/available/:courseId`

> Teacher — students NOT enrolled in this course (same org).

**Response `200`** — Paginated envelope, each item:

```jsonc
{
  "id": "clxx...",           // string — user ID
  "username": "janedoe",    // string
  "email": "jane@..."       // string
}
```

---

### 2f. `GET /api/enrollments/students/all`

> Teacher — all org students with enrollment info for teacher's courses.

**Response `200`** — Paginated envelope, each item:

```jsonc
{
  "id": "clxx...",
  "username": "janedoe",
  "email": "jane@...",
  "enrollmentCount": 2,         // int
  "enrolledCourses": [
    {
      "enrollmentId": "clxx...",
      "courseId": "clxx...",
      "courseTitle": "Mathematics 101",
      "enrolledAt": "2026-04-01T..."  // ISO timestamp
    }
  ]
}
```

---

### 2g. `POST /api/enrollments/enroll`

> Teacher — enroll a student.

**Request body:**
```jsonc
{ "studentId": "clxx...", "courseId": "clxx..." }
```

**Response `201`:**
```jsonc
{
  "message": "Student enrolled successfully",
  "enrollment": {
    "id": "clxx...",
    "studentId": "clxx...",
    "courseId": "clxx...",
    "enrolledAt": "2026-04-26T..."
  }
}
```

**Error `400`:** `{ "message": "Student is already enrolled in this course" }`  
**Error `400`:** `{ "message": "studentId and courseId are required" }`

---

### 2h. `GET /api/enrollments/join/preview`

> Student — preview a course before joining. Query: `?courseId=...` or `?joinCode=...`

**Response `200`:**
```jsonc
{
  "id": "clxx...",
  "title": "Mathematics 101",
  "description": "..." ,        // string | null
  "teacherName": "Mr. Smith"    // string | null
}
```

---

### 2i. `POST /api/enrollments/join`

> Student — self-enroll by courseId or joinCode.

**Request body:**
```jsonc
{ "courseId": "clxx..." }
// OR
{ "joinCode": "ABC123" }
```

**Response `201`:**
```jsonc
{
  "message": "Enrolled successfully",
  "enrollment": {
    "id": "clxx...",
    "courseId": "clxx...",
    "enrolledAt": "2026-04-26T..."
  },
  "course": {
    "id": "clxx...",
    "title": "Mathematics 101"
  }
}
```

---

### 2j. `DELETE /api/enrollments/:enrollmentId`

> Teacher — unenroll a student.

**Response `200`:**
```jsonc
{ "message": "Student unenrolled successfully" }
```

---

### 2k. `POST /api/enrollments/:courseId/complete`

> Student — mark a course as complete (triggers gamification).

**Response `200`:**
```jsonc
{
  "message": "Course marked as complete.",
  "courseId": "clxx...",
  "gamification": {
    "awarded": true,        // bool
    "pointsAwarded": 100,   // int
    "newTotal": 350,         // int
    "levelUp": false         // bool
  }
}
```

---

## 3. Progress

**Base path:** `/api/progress`  
**Auth:** Bearer JWT + active subscription.  
**Error key:** `"message"`.

---

### 3a. `GET /api/progress/overall`

> Student — aggregate progress across all enrolled courses.

**Response `200`:**
```jsonc
{
  "totalScore": 245.5,          // float (2 decimal places)
  "totalMaxScore": 400,         // int
  "progressPercentage": 61,     // int 0-100
  "totalBonusPoints": 15.0,     // float (2 decimal places)
  "assignmentsCompleted": 5,    // int — graded submissions count
  "totalAssignments": 8         // int — total assignments across enrolled courses
}
```

**Empty state (no enrollments):** Same shape, all values `0`.

**Error `500`:**
```jsonc
{ "message": "Failed to fetch progress" }
```

---

### 3b. `GET /api/progress/courses`

> Student — per-course progress breakdown.

**Response `200`** — wrapped in `{ data }` (NOT paginated):
```jsonc
{ "data": [
  {
    "courseId": "clxx...",
    "courseName": "Mathematics 101",
    "courseDescription": "...",         // string | null
    "totalScore": 85.0,                // float
    "totalMaxScore": 100,              // int
    "progressPercentage": 85,          // int 0-100
    "bonusPoints": 5.0,               // float
    "assignmentsCompleted": 2,        // int
    "totalAssignments": 3             // int
  }
]
```

**Empty state:** `{ "data": [] }`

---

### 3c. `GET /api/progress/course/:courseId`

> Student — detailed progress for one course, including per-assignment breakdown.

**Response `200`:**
```jsonc
{
  "course": {
    "id": "clxx...",
    "title": "Mathematics 101",
    "description": "..."               // string | null
  },
  "progress": {
    "totalScore": 85.0,               // float
    "totalBonusPoints": 5.0,          // float
    "totalMaxScore": 100,             // int
    "progressPercentage": 90,         // int 0-100
    "assignmentsCompleted": 2,        // int
    "totalAssignments": 3             // int
  },
  "assignments": [
    {
      "assignmentId": "clxx...",
      "assignmentTitle": "Homework 1",
      "dueDate": "2026-05-01T...",     // ISO timestamp | null
      "maxScore": 100,                // int | null
      "score": 85,                     // float | null (null = not yet graded)
      "bonusPoints": 5.0,             // float
      "bonusPercentage": 5,           // int
      "submittedAt": "2026-04-25T...", // ISO timestamp | null
      "status": "submitted",          // "submitted" | "graded" | "not_submitted"
      "feedback": "Good work!"        // string | null
    }
  ]
}
```

**Error `403`:**
```jsonc
{ "message": "Not enrolled in this course" }
```

---

### 3d. `GET /api/progress/bonus-info`

> Student — static bonus tier reference.

**Response `200`:**
```jsonc
{
  "bonusTiers": [
    { "hoursEarly": 72, "percentage": 10, "label": "3+ days early" },
    { "hoursEarly": 48, "percentage": 7,  "label": "2+ days early" },
    { "hoursEarly": 24, "percentage": 5,  "label": "1+ day early" },
    { "hoursEarly": 12, "percentage": 3,  "label": "12+ hours early" }
  ],
  "description": "Submit assignments early to earn bonus points! The earlier you submit, the more bonus you get."
}
```

---

## 4. Streaks

**Base path:** `/api/streaks`  
**Auth:** Bearer JWT + active subscription.  
**Error key:** `"message"`.

### Streak Info Shape (reused across routes)

```jsonc
{
  "currentStreak": 5,            // int — consecutive login days
  "longestStreak": 12,           // int
  "lastActivityDate": "2026-04-25T...", // ISO timestamp | null
  "totalActiveDays": 30,         // int
  "weeklyGoalHours": 10,         // float
  "currentWeekHours": 4.5,       // float
  "weeklyProgress": 45           // int 0-100 — capped at 100
}
```

**Empty state (new user):** All ints/floats `0`, `lastActivityDate: null`, `weeklyGoalHours: 10`, `weeklyProgress: 0`.

---

### 4a. `GET /api/streaks/me`

**Response `200`:** Returns the Streak Info Shape directly (no wrapper).

---

### 4b. `POST /api/streaks/login`

> Called automatically on login to record streak.

**Response `200`:**
```jsonc
{
  "message": "Login streak recorded successfully",
  "streak": { /* Streak Info Shape */ }
}
```

---

### 4c. `POST /api/streaks/activity`

> Record a study activity (called by `useActivityTracker`). Writes to `study_activities` table, updates weekly hours, and triggers streak.

**Request body:**
```jsonc
{ "activityType": "lesson_view", "durationMinutes": 15 }
```

- `activityType` — **required** — one of: `"lesson_view"`, `"assignment_submit"`, `"quiz_complete"`, `"login"`, `"study_session"`
- `durationMinutes` — optional — time spent (updates weekly study hours)

**Response `200`:**
```jsonc
{ "message": "Activity recorded" }
```

**Error `400`:**
```jsonc
{ "message": "activityType is required" }
```

---

### 4d. `PUT /api/streaks/weekly-goal`

**Request body:**
```jsonc
{ "goalHours": 15 }
```

**Response `200`:**
```jsonc
{
  "message": "Weekly goal updated successfully",
  "streak": { /* Streak Info Shape */ }
}
```

**Error `400`:**
```jsonc
{ "message": "Valid goalHours is required" }
```

---

## 5. Student

**Base path:** `/api/student`  
**Auth:** Bearer JWT + active subscription. Student role only.  
**Error key:** `"message"`.

---

### 5a. `GET /api/student/my-progress`

> Student — assignments, submissions, and grades (org-scoped).

**Response `200`:**
```jsonc
{
  "assignments": [
    {
      "id": "clxx...",           // assignment ID
      "title": "Homework 1",
      "courseTitle": "Math 101",
      "dueDate": "2026-05-01T..."  // ISO timestamp | null
    }
  ],
  "submissions": [
    {
      "id": "clxx...",              // submission ID
      "assignmentId": "clxx...",
      "studentId": "clxx...",
      "fileUrl": "https://...",     // string | null
      "content": "...",            // string | null
      "submittedAt": "2026-04-25T...",
      "status": "submitted",       // string
      "grade": 85                   // float | null
    }
  ],
  "grades": [
    {
      "id": "clxx...",             // submission ID (NOT grade ID)
      "courseTitle": "Math 101",
      "assignmentTitle": "Homework 1",
      "score": 85,                 // float
      "maxScore": 100,             // int
      "feedback": "Good work!"    // string | null
    }
  ]
}
```

---

### 5b. `GET /api/student/exams`

> Student — available exams from enrolled courses.

**Response `200`** — wrapped in `{ data }`, whitelisted fields only (no `accessCode`, `ipWhitelist`, etc.):
```jsonc
{ "data": [
  {
    "id": "clxx...",
    "organizationId": "clxx...",
    "courseId": "clxx...",
    "title": "Midterm Exam",
    "description": "...",
    "status": "active",              // "scheduled" | "active"
    "scheduledStartAt": "2026-05-01T...",
    "scheduledEndAt": "2026-05-01T...",
    "duration": 60,                  // int — minutes
    "totalPoints": 100,
    "passingScore": 70,
    "attemptsAllowed": "1",
    "maxAttempts": 1,
    "shuffleQuestions": false,
    "shuffleOptions": false,
    "showResults": true,
    "showCorrectAnswers": false,
    "allowReview": true,
    "allowBacktracking": false,
    "antiCheatEnabled": true,
    "requireWebcam": false,
    "requireFullscreen": true,
    "lockBrowser": false,
    "createdAt": "2026-04-01T...",
    "updatedAt": "2026-04-15T..."
  }
] }
```

**Empty state:** `{ "data": [] }`

---

### 5c. `GET /api/student/attempts/active`

> Student — all exam attempts (sorted newest first).

**Response `200`** — wrapped in `{ data }`:
```jsonc
{ "data": [
  {
    "id": "clxx...",
    "examId": "clxx...",
    "studentId": "clxx...",
    "attemptNumber": 1,           // int
    "status": "submitted",        // "in_progress" | "submitted" | "graded" | "flagged" | ...
    "startedAt": "2026-04-25T...",
    "submittedAt": "2026-04-25T...", // ISO | null
    "score": 85,                  // float | null
    "percentage": 85.0,           // float | null
    "passed": true,               // bool | null
    "isRetake": false,            // bool
    "flaggedForReview": false     // bool
  }
]
```

---

### 5d. `GET /api/student/retakes`

> **STUB** — returns `{ "data": [] }`. See [Section 7](#7-stub-payloads).

---

### 5e. `GET /api/student/mistakes`

> Student — mistake pool with groupings and stats.

**Response `200`:**
```jsonc
{
  "mistakes": [ /* full mistake objects — see below */ ],
  "activeMistakes": [ /* subset: correctedInRetake == false */ ],
  "resolvedMistakes": [ /* subset: correctedInRetake == true */ ],
  "byExam": [
    {
      "examId": "clxx...",
      "examTitle": "Midterm",
      "mistakes": [ /* mistake objects */ ]
    }
  ],
  "byTopic": [
    {
      "topic": "Algebra",
      "count": 3,
      "mistakes": [ /* mistake objects */ ]
    }
  ],
  "byDifficulty": {
    "easy": 1,
    "medium": 2,
    "hard": 1
  },
  "stats": {
    "total": 4,
    "active": 3,
    "resolved": 1,
    "repeated": 0
  }
}
```

**Mistake object shape:**
```jsonc
{
  "mistakeId": "clxx...",
  "examId": "clxx...",
  "examTitle": "Midterm",
  "questionId": "clxx...",
  "questionText": "What is 2+2?",
  "questionType": "multiple_choice",
  "topic": "Algebra",               // string | null
  "subtopic": "Basics",             // string | null
  "skillTag": "problem_solving",    // string | null
  "difficultyLevel": "easy",        // string | null
  "studentAnswer": "{ ... }",       // jsonb serialized
  "pointsLost": 5,                  // float
  "pointsPossible": 10,             // float
  "occurredAt": "2026-04-20T...",
  "mistakeType": "wrong_answer",    // "wrong_answer"|"partial_credit"|"timeout"|"skipped"
  "isRepeatedMistake": false,       // bool
  "repetitionCount": 0,             // int
  "remediationStatus": "not_started", // "not_started"|"in_progress"|"completed"|"skipped"
  "correctedInRetake": false,       // bool
  "attemptId": "clxx..."            // string
}
```

---

## 6. Gamification

### 6a. `GET /api/gamification/me`

> Student — enriched gamification profile.

**Response `200`:**
```jsonc
{
  "userId": "clxx...",
  "organizationId": "clxx...",
  "totalPoints": 350,
  "currentLevelNumber": 3,
  "currentLevel": {                // GamificationLevel | null
    "id": "clxx...",
    "organizationId": "clxx...",
    "levelNumber": 3,
    "name": "Scholar",
    "minPoints": 200,
    "maxPoints": 500,              // int | null
    "badgeEmoji": "📚",           // string | null
    "createdAt": "2026-01-01T..."
  },
  "nextLevel": { /* same shape */ }, // | null (at max level)
  "nextLevelProgress": 50,          // int 0-100
  "createdAt": "2026-03-01T...",
  "updatedAt": "2026-04-25T...",     // string | null
  "recentBadges": [                  // AwardedBadge[] (last 5)
    {
      "id": "clxx...",
      "organizationId": "clxx...",
      "name": "First Steps",
      "description": "Complete your first lesson",
      "emoji": "🎯",
      "criteriaType": "first_action",
      "criteriaValue": 1,
      "courseId": null,              // string | null
      "isActive": true,
      "archivedAt": null,
      "createdAt": "2026-01-01T...",
      "updatedAt": null,
      "awardedAt": "2026-03-15T..."
    }
  ],
  "recentEvents": [                  // GamificationEvent[] (last 10)
    {
      "id": "clxx...",
      "organizationId": "clxx...",
      "userId": "clxx...",
      "eventType": "lesson_completion",
      "entityId": "clxx...",
      "entityType": "lesson",
      "pointsAwarded": 10,
      "metadata": null,              // Record<string, unknown> | null
      "occurredAt": "2026-04-24T..."
    }
  ]
}
```

**Fallback (no profile yet):** Same shape with `totalPoints: 0`, `currentLevelNumber: 0`, both level fields `null`, empty arrays.

---

### 6b. `GET /api/gamification/me/badges?earned=all`

**Response `200`:**
```jsonc
{
  "earned": [
    {
      "id": "clxx...",
      "organizationId": "clxx...",
      "name": "First Steps",
      "description": "...",
      "emoji": "🎯",
      "criteriaType": "first_action",
      "criteriaValue": 1,
      "courseId": null,
      "isActive": true,
      "archivedAt": null,
      "createdAt": "2026-01-01T...",
      "updatedAt": null,
      "awardedAt": "2026-03-15T..."   // ← ONLY on earned badges
    }
  ],
  "available": [
    {
      // same shape WITHOUT awardedAt
    }
  ]
}
```

Query `?earned=true` → `available: []`. Query `?earned=false` → `earned: []`.

---

### 6c. `GET /api/gamification/leaderboard?courseId=...`

**Response `200`:**
```jsonc
{
  "entries": [
    {
      "rank": 1,                   // int (1-indexed)
      "userId": "clxx...",
      "fullName": "Top Student",
      "avatarUrl": "https://...",  // string | null
      "totalPoints": 500,
      "currentLevelNumber": 5,
      "badgeCount": 8
    }
  ],
  "userRank": 3,                   // int | null (requesting user's rank)
  "enabled": true                  // bool — false if leaderboards disabled
}
```

**Disabled state:** `{ "entries": [], "userRank": null, "enabled": false }`

---

### 6d. `GET /api/gamification/activity?limit=20&offset=0`

**Response `200`:**
```jsonc
{
  "events": [ /* GamificationEvent[] — same shape as recentEvents above */ ],
  "total": 42,     // int
  "limit": 20,     // int
  "offset": 0      // int
}
```

> **Note:** This route uses `limit/offset` pagination, NOT the standard `page/limit` paginated envelope.

---

### 6e. `GET /api/teacher/gamification/overview?courseId=...`

**Response `200`:**
```jsonc
{
  "leaderboard": [ /* GamificationLeaderboardEntry[] — same as 6c entries */ ],
  "topAchievers": [
    {
      "userId": "clxx...",
      "fullName": "Top Student",
      "totalPoints": 500,
      "badgeCount": 8
    }
  ],
  "lowEngagement": [
    {
      "userId": "clxx...",
      "fullName": "Struggling Student",
      "totalPoints": 0
    }
  ],
  "badgeDistribution": [
    { "badgeName": "First Steps", "count": 12 }
  ]
}
```

---

## 7. Stub Payloads

Routes that exist but return placeholder data. Frontend should handle these shapes now; they will be populated in future sprints.

| Route | Current Response | Notes |
|---|---|---|
| `GET /api/student/retakes` | `{ "data": [] }` | Will return retake eligibility objects |
| `POST /api/streaks/activity` | `{ "message": "Activity recorded" }` | ✅ Now implemented — writes to DB and updates weekly hours |

---

## Appendix: Known Inconsistencies (Bug-Fix Targets)

| # | Issue | Status | Resolution |
|---|---|---|---|
| 1 | Error key mismatch across routes |  **Fixed** | All routes now use `{ "message": "..." }` |
| 2 | Progress `/courses` returns bare array |  **Fixed** | Now returns `{ "data": [...] }` |
| 3 | `/student/exams` leaks `accessCode`, `ipWhitelist` |  **Fixed** | Whitelisted safe fields only |
| 4 | `/student/attempts/active` returns ALL attempts |  **Open** | Route name is misleading; data is correct |
| 5 | Gamification activity uses `limit/offset` vs `page/limit` |  **Open** | Pagination style mismatch |
| 6 | Client calls `POST /streaks/activity` — route missing |  **Fixed** | Route added with real DB recording |

---

