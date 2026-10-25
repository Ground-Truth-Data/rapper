The user's data is never thrown away and the app never waits.
1. Old-version local file: open it and add any missing columns/tables in place. Data stays. No new file, no download.
2. Broken local file (corrupt/unreadable): set it aside, never delete it, and download the current file from Supabase.
3. No account and broken file: start fresh and say on screen 'Your old data couldn't load — import a backup.'
4. Newest tab always takes the database immediately. No waiting on other tabs, locks, or old copies. Never a 'open in another tab' screen.
5. Schema changes are add-only: add columns/tables, never rename or delete. Adding an attribute never needs a new version or a new file.
6. Never an empty screen when data exists, never a silent spinner.
7. One page, one database worker. A second copy of open.ts reloads the page. Gate stage "tabs" (newestTabWins.spec.ts) proves it; a red there is fixed in the gate, never with a retry or a wait.
