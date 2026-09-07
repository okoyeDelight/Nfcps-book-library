# NFCPS Physical Book Circulation Automation

The live NFCPS Book Library includes a no-admin circulation flow for physical books.

## Borrowing lifecycle

1. A visitor selects **Request book** on an available physical title.
2. The system automatically reserves that copy for 24 hours and records the borrower's name and mobile number.
3. The borrower selects **I've collected the book** after physically collecting it.
4. The system changes the copy to **Borrowed** and starts a 30-day lending period.
5. The public library displays the expected return date and blocks another request for the same copy.
6. The borrower manages the loan from a private capability link.
7. Selecting **I've returned the book** closes the active loan, records it in history and immediately makes the book available again.
8. One automatic 30-day renewal is supported without an admin approval step.

## Free push reminder system

The paid WhatsApp reminder dependency has been replaced by free web push notifications.

After collection, the borrower sees a sleek **NFCPS UNIZIK LIBRARY** reminder centre. Enabling reminders uses a quick optional sign-in only to route private push alerts to the borrower's registered browser/device.

A scheduled job runs every day at 09:00 Africa/Lagos and follows active loans automatically:

- **7 days before due date:** lock-screen push reminder.
- **2 days before due date:** second reminder.
- **Due day:** branded `NFCPS UNIZIK LIBRARY` notification with a direct link to the private loan page.
- **Overdue:** follow-up notification if **I've returned the book** has not been selected.
- **Still overdue:** follow-ups can repeat every three days while the loan remains open.
- **Returned:** the active loan is closed, so future reminders stop automatically.
- **Uncollected reservation:** a 24-hour reservation expires automatically and the physical copy is released.

The notification opens the private loan page where the borrower can mark the book returned or use the automatic renewal.

## Calendar backup

Every borrowed book also offers two free calendar options:

- **Google Calendar** — opens a pre-filled return event.
- **Phone calendar** — downloads an `.ics` calendar event for compatible phone calendar apps.

The calendar event is branded for NFCPS and includes return alerts 7 days before, 2 days before and on the return day, plus the private loan-management link.

## App-like phone experience

The live preview now includes a web-app manifest branded **NFCPS UNIZIK LIBRARY**. Supported browsers can use the library in a more app-like home-screen experience. On platforms that require installation before web push (such as some iPhone configurations), the reminder setup surfaces the appropriate installation guidance.

## Privacy and admin workload

Normal browsing and borrowing do not require an admin approval step. Push reminders are optional, and the sign-in used by the notification system is not required for ordinary book browsing.

Admins remain outside the normal circulation loop; the system handles availability, reservation expiry, due dates, reminders, renewal and self-reported return automatically.

## Live preview

https://nfcps-book-library-c2ma7y.v2.appdeploy.ai/
