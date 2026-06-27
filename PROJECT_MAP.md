# EduPractice Project Map

This file is a quick operating map for future updates.

## Current Production

- Hosting URL: `https://edupractice-ab9a2.web.app`
- GitHub repo: `https://github.com/MagdyAqel/EduPractice`
- Firebase project: `edupractice-ab9a2`
- Default Firebase alias is stored in `.firebaserc`.

## App Stack

- Frontend: React + Vite
- Routing: `react-router-dom`
- Auth: Firebase Authentication, email/password
- Database: Cloud Firestore
- Hosting: Firebase Hosting
- UI icons: `lucide-react`
- Excel import/export: `xlsx`

The active app is Firebase-first. Legacy Express/SQLite files are still present locally, but normal production use does not depend on them.

## Important Commands

```bash
npm run dev
npm run build
npm run lint
firebase deploy --project edupractice-ab9a2
firebase deploy --only hosting --project edupractice-ab9a2
firebase deploy --only firestore --project edupractice-ab9a2
firebase deploy --only auth --project edupractice-ab9a2
```

On this Windows workspace, Firebase CLI is available at:

```bash
.\node_modules\.bin\firebase.cmd
```

## Key Files

- `src/App.jsx`: routes and role guards.
- `src/main.jsx`: React bootstrap.
- `src/lib/firebaseClient.js`: Firebase config, auth identifier helpers, account provisioning helper.
- `src/context/AuthContext.jsx`: login, logout, first official creation, user profile loading.
- `src/context/SystemContext.jsx`: default settings and shared system state.
- `src/context/DataStore.jsx`: Firestore subscriptions, CRUD, imports, exports, settings save, audit logs.
- `firestore.rules`: Firestore authorization rules.
- `firebase.json`: hosting, Firestore, Auth provider config.
- `public/edupractice-icon.svg`: app icon.

## Main Firestore Collections

- `users`: auth profile and role for every Firebase Auth account.
- `officials`: officials shown in the app.
- `supervisors`: supervisors.
- `students`: student records, assignments, field-training grades.
- `points`: educational points.
- `regions`: directorates/regions.
- `specializations`: specializations.
- `sections`: study sections.
- `auditLogs`: action logs.
- `system/main`: global settings.

## `system/main` Settings

The shared settings document may include:

- `fieldTrainings`: field training courses.
- `maxGrades`: grade caps: `visit1`, `visit2`, `principal`, `teacher`, `supervisorEval`, `assignments`, `recordedLessons`.
- `defaultSemester`
- `showStudentsToSupervisors`
- `systemPermissions`
- `allowanceRates`
- `visitGradingEnabled`
- `visitCriteria`
- `supervisorInstructions`
- `studentInstructions`
- `readInstructions`

`visitCriteria` must be an array of objects:

```js
[
  { id: "visit-criterion-01", text: "..." }
]
```

## Auth Model

Users log in with a simple number in the UI. The app converts it to a Firebase email:

- Official: `official.{employeeId}@edupractice.local`
- Supervisor: `supervisor.{employeeId}@edupractice.local`
- Student: `student.{studentId}@edupractice.local`

The app then loads `users/{uid}` to determine the real role and record id.

## Role Behavior

- `official`: full administration, reports, settings, audit log, all CRUD.
- `supervisor`: sees assigned students and grading tools when enabled.
- `student`: sees own data and optionally grades depending on settings.

Route guards live in `src/App.jsx`; sidebar visibility lives in `src/components/layout/Sidebar.jsx`.

## Common Update Locations

- Add/edit pages: `src/pages/*.jsx`
- Add/edit navigation: `src/components/layout/Sidebar.jsx`
- Change roles or route permissions: `src/App.jsx`
- Change default settings: `src/context/SystemContext.jsx`
- Change saved settings behavior: `src/context/DataStore.jsx`, `saveAllSettings`
- Change Firebase permissions: `firestore.rules`
- Change app title/icon: `index.html`, `public/edupractice-icon.svg`
- Change visit evaluation items: Firestore `system/main.visitCriteria`
- Change grade formulas: `src/pages/Grading.jsx`, `src/pages/Students.jsx`, `src/pages/Reports.jsx`

## Deployment Checklist

1. Run `npm run build`.
2. Deploy:

```bash
.\node_modules\.bin\firebase.cmd deploy --project edupractice-ab9a2
```

3. Verify:

```powershell
Invoke-WebRequest -UseBasicParsing https://edupractice-ab9a2.web.app
```

## Cautions

- Do not store plaintext passwords in Firestore.
- Do not delete unknown local files; several legacy/debug files are present.
- Firestore rules control production access; update and deploy them with care.
- When directly writing `system/main`, preserve unrelated fields unless intentionally replacing settings.
