# EduPractice

EduPractice is an Arabic web application for educational supervision and field-training management. It manages students, supervisors, educational points, regions, specializations, sections, grades, reports, financial allowances, announcements, and audit logs.

## Stack

- React + Vite
- Firebase Authentication
- Cloud Firestore
- Firebase Hosting
- Tailwind CSS
- Recharts
- XLSX import/export

The current build is Firebase-first. The old local Express/SQLite server is kept only as legacy code and is not required for normal use.

## Firebase Project

Default project configuration points to:

```js
projectId: "edupractice-ab9a2"
```

The Firebase web config is public by design. For deployments that need a different project, copy `.env.example` to `.env` and change the `VITE_FIREBASE_*` values.

## Required Firebase Setup

1. Open Firebase Console.
2. Enable Authentication > Sign-in method > Email/Password.
3. Enable Firestore Database.
4. Publish the rules in `firestore.rules`.
5. Optional: enable Firebase Hosting and deploy the app.

## Run Locally

```bash
npm install
npm run dev
```

The app runs on Vite. No local API server is required.

## First Login

On the login screen, open "تهيئة أول مسؤول للنظام" and create the first official account. After that, officials can add supervisors, students, regions, specializations, educational points, and sections from inside the application.

Generated login identifiers use this pattern:

- Official: `official.{employeeId}@edupractice.local`
- Supervisor: `supervisor.{employeeId}@edupractice.local`
- Student: `student.{studentId}@edupractice.local`

The login form keeps the Arabic workflow simple: users enter only the employee/student number and password.

## Build

```bash
npm run build
```

## Deploy To Firebase Hosting

```bash
firebase login
firebase use edupractice-ab9a2
npm run build
firebase deploy
```

## Data Model

Firestore collections:

- `users`
- `officials`
- `supervisors`
- `students`
- `points`
- `regions`
- `specializations`
- `sections`
- `auditLogs`
- `system/main`

`system/main` stores shared settings such as training names, grade caps, permissions, visit grading toggles, allowance rates, and announcements.
