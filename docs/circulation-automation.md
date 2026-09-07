# NFCPS Physical Book Circulation Automation

The live NFCPS Book Library now includes a no-admin circulation flow for physical books.

## Borrowing lifecycle

1. A visitor selects **Request book** on an available physical title.
2. The system automatically reserves that copy for 24 hours and records the borrower's name and WhatsApp number.
3. The borrower selects **I've collected the book** after physically collecting it.
4. The system changes the copy to **Borrowed** and starts a 30-day lending period.
5. The public library displays the expected return date and blocks another request for the same copy.
6. The borrower manages the loan from a private capability link sent through the circulation flow.
7. Selecting **I've returned the book** closes the active loan, records it in history and immediately makes the book available again.
8. One automatic 30-day renewal is supported without an admin approval step.

## Automatic reminders

A scheduled job runs every day at 09:00 Africa/Lagos.

- Uncollected 24-hour reservations expire automatically and the book is released.
- Borrowers receive a due-soon reminder within three days of the return date when WhatsApp automation is configured.
- If the due date passes and **I've returned the book** has not been selected, the system sends an overdue reminder.
- While the loan stays open, an overdue reminder can repeat after seven days instead of requiring a librarian to chase the borrower manually.
- Once the borrower records the return, the loan leaves the active-loan queue so overdue reminders stop automatically.

## WhatsApp integration

The backend is prepared for the Meta WhatsApp Business Platform using these encrypted server-side settings:

- `WHATSAPP_ACCESS_TOKEN`
- `WHATSAPP_PHONE_NUMBER_ID`
- `WHATSAPP_TEMPLATE_NAME` (defaults to `nfcps_library_update`)
- `WHATSAPP_GRAPH_VERSION` (optional)

The intended approved template has four body variables: borrower name, update/reminder text, book title, and the borrower's private loan-management URL.

Until those WhatsApp Business credentials and the approved template are connected, the website circulation database, reservation/borrow/return states, due dates and scheduled reminder engine work, while automatic outbound WhatsApp delivery remains inactive.

## Live preview

https://nfcps-book-library-c2ma7y.v2.appdeploy.ai/
