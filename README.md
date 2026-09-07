# NFCPS BOOK LIBRARY

> Christ, the Therapy for All.

Official Digital Library of the National Fellowship of Christian Pharmacy Students (NFCPS), UNIZIK Chapter.

## Live preview

https://nfcps-book-library-c2ma7y.v2.appdeploy.ai/

## Current build

- Real NFCPS logo integrated into the live app identity
- Cinematic NFCPS opening splash with logo reveal, halo/orbit motion, light sweep and premium transition
- Splash is shown once per browser session so normal in-app navigation stays fast
- NFCPS logo now remains in the live header and footer after the intro
- Installable app metadata, favicon and app icon now use the NFCPS identity
- Full-width mobile-first home experience with explicit viewport handling to prevent narrow/one-sided rendering
- Premium Apple-like visual pass with restrained glass surfaces, softer borders, cleaner hierarchy and more deliberate spacing
- Animated **flipping-book mark** replaces the old sparkle/star-style identity across the hero, Library Pulse, mobile dock and recommendations
- Immersive hero layout with responsive book showcase and live-library visual treatment
- Smart-start section for Physical Books, My Books, E-books and **NFCPS Moments**
- Fixed mobile quick dock for Home, Physical Books, E-books, Moments and My Books
- **NFCPS Moments** with Bible verse, public-domain book excerpt and mixed modes
- User-selectable Moments cadence: 5 min, 15 min, 30 min, 1 hour, 2 hours or 4 hours
- Default Moments quiet hours from 10 PM to 7 AM
- Optional lock-screen Moments delivered as **NFCPS UNIZIK LIBRARY** push notifications
- 48-message offline-ready Moments pack stored on the member's device
- Moments plan can be paused independently without disabling physical-book due reminders
- Public-domain excerpt choices currently include The Pursuit of God, The Pilgrim's Progress, The Imitation of Christ and Humility: The Beauty of Holiness
- Honest PWA offline model: cached Moments remain available offline; fully closed-app offline scheduled alerts require the later native-app layer
- Live automation rail showing 24-hour reservations, 30-day loans, push/calendar reminders and automatic waitlist promotion
- Interactive premium 3D physical-book collection with live availability states
- Physical shelf filters for Available Now, Returning Soon, In Circulation and Waitlisted books
- Privacy-safe **Library Pulse** showing reading activity without exposing borrower names or phone numbers
- **Most Requested Lately** ranking built from live requests, recent circulation and waitlist demand
- **Returning This Week** shelf with due dates and waitlist pressure
- **Recent Activity** timeline for reservations, borrowing, returns and expired reservations
- Automated physical-book reservations with no admin approval
- Self-confirmed collection and return
- Fully automated waitlist for borrowed/reserved physical books
- Automatic next-person 24-hour reservation when a book is returned or a reservation expires
- Waitlist fairness: renewals are blocked when another member is waiting
- Maximum of two active physical books/reservations per member phone number
- Overdue borrowers are automatically blocked from taking another physical book until the overdue copy is returned
- Floating **My Books** self-service shelf for the current phone/device, plus direct opening from the mobile dock
- My Books shows active borrowed books, reservations, waitlist positions, due countdowns and reminder status
- Promoted waitlist entries appear as **YOUR TURN** with a direct path into the new reservation
- Closed/stale loan and waitlist links are cleaned from the device shelf automatically
- 30-day lending period and one automatic renewal when the queue is empty
- Public Reserved / Borrowed / Available / Returning Soon / Overdue status with expected return date
- Daily circulation scheduler for reservation expiry, due-date reminders and overdue follow-up
- Free lock-screen push notifications branded **NFCPS UNIZIK LIBRARY**
- Free push alert when a waitlisted book becomes the member's turn
- Reminder schedule: 7 days before, 2 days before, due day and repeated overdue follow-ups
- Google Calendar and downloadable phone-calendar backup with built-in return alerts
- Installable web-app manifest for a more app-like phone experience
- 600-book free Christian e-book browse target
- Fast e-book first shelf with skeleton placeholders instead of a blank wait
- Background e-book prefetch so upcoming shelves are prepared before the member taps **Show next shelf**
- Session e-book cache so returning to the same topic/search during a session can reopen immediately
- Progressive **Open all up to 600** mode that streams books into the page instead of freezing the reader behind one long load
- Lazy-loaded covers and content-visibility optimization to reduce mobile rendering cost
- Curated NFCPS Christian recommendations

See `docs/circulation-automation.md` for physical-library automation and `docs/nfcps-moments.md` for the Moments reminder architecture.
