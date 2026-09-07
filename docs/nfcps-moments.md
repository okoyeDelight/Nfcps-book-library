# NFCPS Moments

NFCPS Moments is the opt-in devotional notification layer for NFCPS BOOK LIBRARY.

## Experience

Members can choose one of three modes:

- Bible verses
- Short excerpts from a selected public-domain Christian classic
- A mix of both

Available cadence options are 5, 15, 30, 60, 120 and 240 minutes. Quiet hours default to 10 PM–7 AM in Nigeria.

Push notification title: **NFCPS UNIZIK LIBRARY**.

## Current public-domain excerpt shelf

- The Pursuit of God — A. W. Tozer
- The Pilgrim's Progress — John Bunyan
- The Imitation of Christ — Thomas à Kempis
- Humility: The Beauty of Holiness — Andrew Murray

Modern copyrighted recommendations are not used as an automated excerpt source.

## Delivery model

### Online

When a member explicitly enables lock-screen Moments, the app signs the member in, requests notification permission, saves their private preference, and routes future Moments through the platform push notification service.

### Offline-ready pack

The browser stores a compact 48-message queue plus the member's mode, cadence, selected book and quiet-hour preference on the device. This keeps the content available without network access and allows local alerts while the web app is active.

A PWA/browser cannot reliably wake itself from a fully closed phone while the device is completely offline. True closed-app offline scheduling is therefore reserved for a later native-app wrapper. The current device queue and preference format are intentionally designed so that native local notifications can reuse the same Moments model later.

## Separation from circulation reminders

NFCPS Moments is optional and independent from physical-book due-date notifications. Pausing Moments must not disable reservation, return, overdue or waitlist notifications.

## Privacy

Moment preferences are private to the authenticated notification user. Public Library Pulse and physical-book browsing do not expose Moment preferences or notification identity.
