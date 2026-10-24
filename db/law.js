// What only rapper/db/gate.ts may do (rapper/DB_LAW.md). Read by gateLaw.test.ts, which scans
// every repo, and by fetch/.claude/hooks/dbLawGuard.mjs, which warns on an edit.

/** Each rule names a way to open a database, take its lock, or make its file. */
export const RULES = [
	["imports the SQLite engine", /from ["']@sqlite\.org\/sqlite-wasm["']|import\(["']@sqlite\.org\/sqlite-wasm["']\)|["']sql\.js["']|initSqlJs/],
	["opens a database", /\boo1\.(DB|OpfsDb)\b|OpfsSAHPool|installOpfs|sqlite3_deserialize|new SQL\.Database/],
	["takes a lock", /navigator\.locks/],
	["names a database file", /["'`/]getcache[\w${}-]*\.sqlite3/],
];

export const GATE = "rapper/db/gate.ts";
/** The one file that may NAME the file (it never opens it): the name is frozen for life there. */
export const NAMES_THE_FILE = "getCache/src/routes/(getcache)/db/sql/worlds.ts";

/** What `text`, the source of `rel` (a path from fetch/), does that only the gate may. Comments don't count. */
export const breaches = (rel, text) => {
	if (rel === GATE || rel === "rapper/db/law.js") return [];
	const code = text.replace(/^\s*(\/\/|\*|\/\*).*$/gm, "");
	return RULES.filter(([what, rule]) => rule.test(code) && !(what === "names a database file" && rel === NAMES_THE_FILE)).map(([what]) => what);
};
