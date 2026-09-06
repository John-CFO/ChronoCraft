# ChronoCraft

ChronoCraft is a native Android worktime and project management application built with React Native and Expo.

The application combines time tracking, project management, vacation planning, user management, localization and accessibility with a security-focused Firebase backend.

## Google Play Internal Testing

ChronoCraft is currently available through Google Play Internal Testing.

**[Join the internal test](YOUR_GOOGLE_PLAY_TEST_LINK)**

> Access is provided manually. If you want to test ChronoCraft, contact me with the Google account email address you want to use for Google Play testing.

### Current Release

- Version: `1.0.0`
- Version Code: `8`
- Target SDK: `36`
- Minimum API Level: `23`
- Distribution: Google Play Internal Testing

---

# Features

## Worktime Tracking

Track and analyze personal working hours.

- Define individual daily minimum working hours
- Start, pause and resume work sessions
- Real-time worktime tracking
- Continues tracking while the application is running in the background
- Automatically restores active tracking sessions after application restart
- Daily, weekly and monthly worktime overview
- Display worked hours and overtime
- Chart-based and list-based analytics

---

## Project Tracking

Manage projects and monitor project performance.

- Create and manage projects
- Configure an hourly rate for each project
- Track one active project at a time
- Real-time project time tracking
- Live earnings calculation based on tracked hours
- Live project progress tracking
- Automatically restores active project tracking after application restart

---

## Vacation Management

Plan vacations and receive timely reminders.

- Create and manage vacation entries
- Optional push notification reminders
- Configurable reminder intervals:
  - 1 day before
  - 3 days before
  - 7 days before

---

## User Profile

Personalize the application experience.

- Personal profile with name, employee ID and profile picture
- Persistent authenticated session
- Guided application tour
- Repeatable onboarding tour

---

## Localization

Support multiple languages and regional preferences.

- Automatically detects and uses the device's primary language
- Language can be changed manually within the application
- Support for 8 selectable languages
- Localization implemented with i18next

---

## Accessibility

Designed for inclusive usage.

- Accessibility mode
- Screen reader support
- Accessible navigation and UI components

---

# Security & Privacy

Security and privacy are treated as core parts of the application architecture.

## Account Security

- TOTP-based multi-factor authentication (MFA)
- Compatible with authenticator applications
- Persistent authenticated sessions
- Secure logout
- Complete account deletion
- Immediate deletion of all associated user data
- Privacy by Design

## Access Control

- Backend-enforced authorization
- Least-privilege access control
- Account ownership validation
- Restricted account registration
- Server-side validation of security-relevant operations

## Reviewer Access

Account registration is restricted through a backend whitelist.

- Reviewers must provide the email address they will use for testing
- Reviewer email addresses are added to the backend whitelist
- Only whitelisted email addresses are permitted to create an account
- After being whitelisted, reviewers can register and use the application normally
- The whitelist prevents uncontrolled account creation
- Helps protect the private Firebase project from unexpected usage and associated costs
- Provides additional protection against automated or bot-driven registration attempts

---

# Backend & Services

ChronoCraft uses Firebase as its backend infrastructure.

- Firebase Authentication
- Cloud Firestore
- Firebase Cloud Functions
- Firebase Security Rules
- Firebase App Check
- Server-side authorization
- Server-side validation
- Rate limiting
- Push notification infrastructure

---

# Testing & Development

The application is developed with a focus on security, reliability and maintainability.

- End-to-end testing
- Security-focused validation
- Trust-boundary validation with Zod
- Automated security checks
- Dependency management
- CI/CD
- Error and state recovery
- Testing of authenticated and authorization-protected endpoints

---

# Android Build & Release Engineering

ChronoCraft is developed with React Native and Expo but uses a native Android build pipeline for release builds.

- React Native / Expo → native Android application
- Android build configuration
- Gradle 8.3
- Android Gradle Plugin 8.1.1
- Android SDK 36
- Target SDK 36
- Android Build Tools 36.0.0
- Native Android release builds with Gradle
- Release AAB generation
- Android release signing
- Upload keystore management
- Google Play App Signing
- Google Play Internal Testing

---

# Technical Highlights

- State recovery after unexpected application termination
- Background-safe worktime and project tracking
- Persistent authenticated sessions
- Server-side authorization
- Security-focused backend architecture
- Automated validation of security boundaries
- Native Android release pipeline
- Google Play distribution

---

# Localization & Accessibility

ChronoCraft is designed to support different users and usage environments.

### Localization

- 8 selectable languages
- Automatic device language detection
- Manual language selection
- i18next-based localization

### Accessibility

- Accessibility mode
- Screen reader support
- Accessible navigation and UI components

---

# Technology Stack

| Area | Technology |
| --- | --- |
| Mobile | React Native |
| Framework | Expo |
| Language | TypeScript |
| Backend | Firebase |
| Database | Cloud Firestore |
| Authentication | Firebase Authentication |
| Backend Logic | Firebase Cloud Functions |
| Validation | Zod |
| Localization | i18next |
| Android Build | Gradle |
| Android Gradle Plugin | 8.1.1 |
| Android SDK | 36 |
| Testing | E2E Testing |
| CI/CD | GitHub Actions |
| Distribution | Google Play |

---

# Project

ChronoCraft is a practical project covering the complete development lifecycle of a modern Android application:

```text
Application Development
        ↓
Security Architecture
        ↓
Backend Development
        ↓
Testing & Validation
        ↓
CI/CD
        ↓
Android Build Configuration
        ↓
Release Signing
        ↓
AAB Generation
        ↓
Google Play Distribution
