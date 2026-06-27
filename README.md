# EduPractice

EduPractice is an Arabic Firebase-first web app for educational supervision and field-training management.

## Features

- Firebase Authentication with role-based access: official, supervisor, student.
- Cloud Firestore data storage.
- Officials can manage students, supervisors, educational points, regions, specializations, sections, and system settings.
- Supervisors can view assigned students and enter grades.
- Students can view their assignment and grades when enabled.
- Reports, audit logs, announcements, and Firebase Hosting configuration.

## Firebase Project

The app is configured for:

```js
projectId: "edupractice-ab9a2"
```

## Firebase Setup

1. Enable Authentication > Email/Password in Firebase Console.
2. Enable Firestore Database.
3. Publish `firestore.rules`.
4. Optional: deploy to Firebase Hosting with `firebase deploy`.

## Local Run

```bash
npm install
npm run dev
```

## First Login

Open the login screen and use **تهيئة أول مسؤول للنظام** to create the first official account.

Login identifiers are generated internally as:

- `official.{employeeId}@edupractice.local`
- `supervisor.{employeeId}@edupractice.local`
- `student.{studentId}@edupractice.local`

Users type only their employee/student number in the Arabic login form.

## Build

```bash
npm run build
```

## Deploy

```bash
firebase login
firebase use edupractice-ab9a2
npm run build
firebase deploy
```
