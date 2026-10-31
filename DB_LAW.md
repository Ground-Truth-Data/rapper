The user's data is never thrown away and the app never waits.
1. A local file an older build made (it lacks a table or column today's DDL declares) is never migrated. Signed in: delete it, open a fresh file, and the account's cloud copy fills it — rows not yet uploaded are lost until the rescue card lands. Signed out (or a sandbox world): copy its rows into a fresh file and keep the older file aside, never deleted.
2. Broken local file (corrupt/unreadable): set it aside, never delete it, and download the current file from Supabase.
3. No account and broken file: start fresh and alarm `sql:setAside`. Nothing on screen — no line, no banner.
4. Newest tab always takes the database immediately. No waiting on other tabs, locks, or old copies. Never a 'open in another tab' screen.
5. Schema changes are add-only: add columns/tables, never rename or delete. Adding an attribute never needs a new version or a new file.
6. Never an empty screen when data exists, never a silent spinner.
7. One page, one database worker. A second copy of open.ts reloads the page. Gate stage "tabs" (newestTabWins.spec.ts) proves it; a red there is fixed in the gate, never with a retry or a wait.
8. The one retry: a transaction a newer tab cuts is rolled back whole, and the older tab redoes it silently once it has the file back (`alone()` in open.ts).
9. A file something live still holds (SQLITE_BUSY) runs the tab on memory and alarms `sql:memory`; on each later focus the tab tries the file once and moves onto it when free. What it wrote on memory does not come along. A frozen tab never holds the file (`busyHolder.spec.ts`).
