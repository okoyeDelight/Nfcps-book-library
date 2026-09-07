# Physical Library V2

Live AppDeploy stage: https://nfcps-book-library-c2ma7y.v2.appdeploy.ai/

Implemented in the live NFCPS UNIZIK Library build:

- Live physical-book availability states: Available, Reserved, Borrowed, Returning Soon, Overdue.
- Availability summary and filters for Available Now, Returning Soon, In Circulation and Waitlisted titles.
- Automatic 24-hour reservation, 30-day loan and one automatic 30-day renewal when nobody is waiting.
- Maximum of two active physical books/reservations per borrower phone number.
- Automatic overdue borrowing pause until the overdue copy is returned.
- Automatic waitlist promotion when a copy is returned or a reservation expires.
- Free push reminders branded “NFCPS UNIZIK LIBRARY”, plus Google Calendar and phone-calendar backups.
- Refined My Books / loan-management flow without routine admin approval.
- Premium physical-book 3D interaction with deeper page edges, spine ribs, dynamic light response, 180-degree turns and page flicks.
- Unverified local covers stay clearly marked instead of being replaced with guessed online editions.

This document tracks the live Physical Library V2 stage while the production GitHub/Netlify implementation is progressively synchronized with the AppDeploy preview architecture.
