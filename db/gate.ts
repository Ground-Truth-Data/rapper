// THE GATE — the only code that opens SQLite. Read ../DB_LAW.md before touching it.
// Everything else asks the gate for the database; gateLaw.test.ts fails the build otherwise.
//
// A file keeps its name for life. One an older build made (it lacks a table or column
// today's DDL declares) is replaced by a fresh file: signed in, the account's cloud copy
// fills the new one and the older file waits aside until its unsent rows are uploaded;
// signed out, its rows are copied across and the older file is kept aside. A file SQLite
// cannot read is set aside; only sign-out deletes it.
// The newest tab steals the database's lock at once; the tab it took it from lets go
// and takes it back when it is looked at again.

import sqlite3InitModule from "@sqlite.org/sqlite-wasm";

export type Db = {
	exec: (o: unknown) => unknown;
	selectValue: (s: string, bind?: unknown[]) => unknown;
	changes: () => number;
	close: () => void;
	pointer: number;
};
type Sqlite3 = Awaited<ReturnType<typeof sqlite3InitModule>>;

const q = (name: string) => `"${name.replace(/"/g, '""')}"`;
const rows = (h: Db, sql: string) =>
	h.exec({ sql, rowMode: "object", returnValue: "resultRows" }) as Record<string, unknown>[];

/** drizzle-kit's separator; splitting on ";" would tear CHECK bodies apart. */
export const statements = (text: string): string[] =>
	text
		.split("--> statement-breakpoint")
		.map((s) => s.trim())
		.filter(Boolean);

/** A file SQLite cannot read at all — the one case a file is set aside. */
export const UNREADABLE = /SQLITE_CORRUPT|SQLITE_NOTADB|malformed|not a database/;

/** Brings `schema` up to `ddl`, add-only: a missing table is created, a missing column is
 *  added (its NOT NULL / UNIQUE dropped when SQLite refuses them on a table with rows),
 *  views and triggers — which hold no rows — are rebuilt. Nothing is renamed or dropped.
 *  A copy attached for a moment gets tables and columns only; `full` (main, or a file
 *  attached for good) gets the whole shape. Returns what was added, as `table` or `table.column`. */
export function reconcile(h: Db, ddl: string, schema = "main", full = schema === "main"): string[] {
	// An attached schema's index, trigger or view is named in it; its table, unqualified, is its own.
	const inSchema = (s: string) => (schema === "main" ? s : s.replace(/^CREATE (UNIQUE INDEX|INDEX|TRIGGER|VIEW) (IF NOT EXISTS )?/, `$&${schema}.`));
	const added: string[] = [];
	const has = new Set(rows(h, `SELECT name FROM ${schema}.sqlite_master WHERE type = 'table'`).map((r) => String(r.name)));
	h.exec({ sql: "PRAGMA foreign_keys = OFF" });
	h.exec({ sql: "BEGIN IMMEDIATE" });
	try {
		if (full)
			for (const r of rows(h, `SELECT type, name FROM ${schema}.sqlite_master WHERE type IN ('view', 'trigger')`))
				h.exec({ sql: `DROP ${String(r.type).toUpperCase()} IF EXISTS ${schema}.${q(String(r.name))}` });
		for (const s of statements(ddl)) {
			const table = s.match(/^CREATE TABLE `([^`]+)`/)?.[1];
			if (table && has.has(table)) added.push(...addColumns(h, schema, table, s));
			else if (table) {
				h.exec({ sql: s.replace("CREATE TABLE ", `CREATE TABLE ${schema}.`) });
				added.push(table);
			} else if (!full) continue;
			else if (/^CREATE (UNIQUE )?INDEX /.test(s)) {
				// Rows that break a new unique index keep their place; the index waits for them.
				try {
					h.exec({ sql: inSchema(s.replace(/^CREATE (UNIQUE )?INDEX /, "CREATE $1INDEX IF NOT EXISTS ")) });
				} catch (e) {
					console.error(`[gate] index not built, rows kept: ${String((e as Error)?.message ?? e)}`);
				}
			} else h.exec({ sql: inSchema(s) });
		}
		h.exec({ sql: "COMMIT" });
	} catch (e) {
		h.exec({ sql: "ROLLBACK" });
		throw e;
	} finally {
		h.exec({ sql: "PRAGMA foreign_keys = ON" });
	}
	return added;
}

/** The tables and columns `ddl` declares that the file lacks: an older build made it. An
 *  empty file lacks nothing — it is new, not older. */
function lacking(h: Db, ddl: string, schema = "main"): string[] {
	const has = new Set(rows(h, `SELECT name FROM ${schema}.sqlite_master WHERE type = 'table'`).map((r) => String(r.name)));
	if (!has.size) return [];
	const out: string[] = [];
	for (const s of statements(ddl)) {
		const table = s.match(/^CREATE TABLE `([^`]+)`/)?.[1];
		if (!table) continue;
		if (!has.has(table)) {
			out.push(table);
			continue;
		}
		const cols = new Set(rows(h, `PRAGMA ${schema}.table_info(${q(table)})`).map((c) => String(c.name)));
		for (const [, col] of s.matchAll(/^\t`([^`]+)` /gm)) if (!cols.has(col)) out.push(`${table}.${col}`);
	}
	return out;
}

/** An older file's rows, copied into `h` at today's shape. Triggers are rebuilt after the
 *  copy, so a rule newer than a row cannot refuse it. A table today's shape still refuses
 *  keeps its rows in the file set aside, and the console says which. */
export function carry(h: Db, bytes: Uint8Array, ddl: string, schema = "main"): void {
	withBytes(h, bytes, ddl, () => {
		for (const r of rows(h, `SELECT name FROM ${schema}.sqlite_master WHERE type = 'trigger'`))
			h.exec({ sql: `DROP TRIGGER ${schema}.${q(String(r.name))}` });
		h.exec({ sql: "PRAGMA foreign_keys = OFF" });
		h.exec({ sql: "BEGIN IMMEDIATE" });
		try {
			for (const s of statements(ddl)) {
				const table = s.match(/^CREATE TABLE `([^`]+)`/)?.[1];
				if (!table) continue;
				const cols = rows(h, `PRAGMA ${schema}.table_info(${q(table)})`).map((c) => q(String(c.name))).join(", ");
				try {
					h.exec({ sql: `INSERT INTO ${schema}.${q(table)} (${cols}) SELECT ${cols} FROM backup.${q(table)}` });
				} catch (e) {
					console.error(`[gate] ${table}'s rows were refused by today's shape; they stay in the older file: ${String((e as Error)?.message ?? e)}`);
				}
			}
			h.exec({ sql: "COMMIT" });
		} catch (e) {
			h.exec({ sql: "ROLLBACK" });
			throw e;
		} finally {
			h.exec({ sql: "PRAGMA foreign_keys = ON" });
		}
	});
	reconcile(h, ddl, schema, true);
}

function addColumns(h: Db, schema: string, table: string, create: string): string[] {
	const have = new Set(rows(h, `PRAGMA ${schema}.table_info(${q(table)})`).map((c) => String(c.name)));
	const added: string[] = [];
	for (const [, col, def] of create.matchAll(/^\t`([^`]+)` (.+?),?$/gm)) {
		if (have.has(col)) continue;
		// ALTER TABLE takes no table-level FOREIGN KEY, so the column carries its own.
		const fk = create.match(new RegExp(`FOREIGN KEY \\(\`${col}\`\\) (REFERENCES [^\\n]*?)(?:,|\\n|$)`))?.[1] ?? "";
		const alter = (d: string) => h.exec({ sql: `ALTER TABLE ${schema}.${q(table)} ADD COLUMN \`${col}\` ${d} ${fk}` });
		try {
			alter(def);
		} catch {
			alter(def.replace(/\b(PRIMARY KEY|NOT NULL|UNIQUE)\b/g, ""));
			// Rows an older build made without a key or a required value would land with NULL in it.
			if (/\b(PRIMARY KEY|NOT NULL)\b/.test(def) && h.selectValue(`SELECT 1 FROM ${schema}.${q(table)} WHERE ${q(col)} IS NULL LIMIT 1`))
				throw new Error(`${schema}.${table} has rows with no ${col}: an older build made them, and today's shape cannot hold them`);
		}
		added.push(`${table}.${col}`);
	}
	return added;
}

// ── the browser side: one worker, one file, one connection ──────────────────────────

let sqlite3: Sqlite3 | null = null;

/** sqlite-wasm's own wasm lookup resolves against the built bundle, wrong in production. */
export const loadApi = async (wasmUrl?: string, opfs = true): Promise<Sqlite3> => {
	// "opfs-wl" installs itself by default and starts a proxy worker this gate never uses. "opfs"
	// waits 4 s for its proxy when the browser refuses OPFS, so it is off once refused.
	(globalThis as { sqlite3ApiConfig?: unknown }).sqlite3ApiConfig ??= { disable: { vfs: { "opfs-wl": true, opfs: !opfs } } };
	return (sqlite3 ??= await (sqlite3InitModule as unknown as (o: { locateFile: (f: string) => string }) => Promise<Sqlite3>)({
		locateFile: (f) => (f.endsWith(".wasm") && wasmUrl ? wasmUrl : f),
	}));
};

export type Opened = {
	db: Db;
	/** Why the browser refused its storage, so this tab runs in memory; "" for the real file. */
	memory: string;
	/** The name an unreadable file was set aside under, which alarms; "" when none was. An older build's file, its rows copied, is not one. */
	aside: string;
	/** Tables and columns this open added to the file. */
	added: string[];
};

export type GateOptions = {
	file: string;
	ddl: string;
	version: number;
	/** The native shells: one webview, the pool VFS, no cross-origin isolation. */
	native: boolean;
	/** The account's cloud copy holds this file's rows, so an older file is deleted, not copied. */
	signedIn: boolean;
	wasmUrl: string;
	/** Each step as it starts, so a stuck boot can say where it is stuck. */
	step: (s: string) => void;
	/** A newer tab took the database; called in the tick the connection closes, so nothing reads it closed.
	 *  `cut`: it closed inside a transaction, which SQLite rolled back. `takenBack`: the taker is the
	 *  connection this one took it from, so it was taken back, not opened. */
	lost: (cut: boolean, takenBack: Promise<boolean>) => void;
};

let pool: Awaited<ReturnType<Sqlite3["installOpfsSAHPoolVfs"]>> | null = null;
const loadPool = async (o: GateOptions) => (pool ??= await (await loadApi(o.wasmUrl)).installOpfsSAHPoolVfs({}));

/** Opens `o.file`, takes it from any other tab, and brings it to today's shape in place. */
export async function openGate(o: GateOptions): Promise<Opened> {
	let memory = "";
	if (!o.native) {
		o.step("asking the browser for storage");
		memory = await navigator.storage.getDirectory().then(
			() => "",
			(e: unknown) => String((e as Error)?.message ?? e),
		);
	}
	o.step("loading SQLite");
	const api = await loadApi(o.wasmUrl, !memory);
	o.step("taking the database from other tabs");
	const name = `gc-db:${o.file}`;
	const holder = async () => (await navigator.locks.query()).held?.find((l) => l.name === name)?.clientId;
	const from = await holder();
	return new Promise((res, rej) => {
		let held: Db | null = null;
		let opening = true;
		navigator.locks
			.request(name, { steal: true }, async () => {
				try {
					let opened = await openHeld(api, o, memory);
					// Taken while it opened: it holds the file without the lock, so it runs on memory like a held open.
					if (!opening && !opened.memory) {
						opened.db.close();
						opened = { ...opened, db: inMemory(api, o), memory: "a newer tab took the file while this one opened it" };
					}
					opening = false;
					res(opened);
					// No file, no lock: a retake from this tab must not steal from itself.
					if (opened.memory) return;
					held = opened.db;
				} catch (e) {
					rej(e);
					return;
				}
				return new Promise<never>(() => {});
			})
			.catch((e: unknown) => {
				if ((e as Error)?.name !== "AbortError") return rej(e);
				if (opening) return void (opening = false);
				const cut = !!held && !api.capi.sqlite3_get_autocommit(held.pointer);
				held?.close();
				o.lost(cut, holder().then((by) => !!from && by === from));
			});
	});
}

async function openHeld(api: Sqlite3, o: GateOptions, memory: string): Promise<Opened> {
	if (memory) return { db: inMemory(api, o), memory, aside: "", added: [] };
	let aside = "";
	for (;;) {
		o.step(`opening ${o.file}`);
		let h: Db | null = null;
		try {
			h = o.native ? await openPooled(o) : await openShared(api, o);
			const older = lacking(h, o.ddl);
			const rows = older.length && !o.signedIn ? exportBytes(h) : null;
			if (older.length) {
				h.close();
				h = null;
				o.step(`replacing ${o.file}: an older build made it`);
				// Signed in, the account's copy fills the fresh file; rows written since the last upload wait in the kept one.
				const kept = await setAside(o, rows ? "older" : "unsent");
				console.info(`[gate] ${o.file} lacked ${older.join(", ")}: ${rows ? `its rows were copied from ${kept}` : `kept as ${kept} until its rows reach the cloud`}`);
				h = o.native ? await openPooled(o) : await openShared(api, o);
			}
			o.step("adding missing tables and columns");
			const added = reconcile(h, o.ddl);
			if (rows) carry(h, rows, o.ddl);
			h.exec({ sql: `PRAGMA user_version = ${o.version}` });
			if (added.length) console.info(`[gate] ${o.file}: added ${added.join(", ")}`);
			return { db: h, memory: "", aside, added };
		} catch (e) {
			h?.close();
			const why = String((e as Error)?.message ?? e);
			if (aside || !UNREADABLE.test(why)) {
				if (o.native || aside) throw e;
				console.error(`[gate] the browser refused the database file, so this tab runs in memory: ${why}`);
				return { db: inMemory(api, o), memory: why, aside, added: [] };
			}
			o.step(`setting aside ${o.file}: SQLite cannot read it`);
			aside = await setAside(o);
			console.error(`[gate] ${o.file} could not be read and was set aside as ${aside}: ${why}`);
		}
	}
}

function inMemory(api: Sqlite3, o: GateOptions): Db {
	const h = new api.oo1.DB(":memory:") as unknown as Db;
	reconcile(h, o.ddl);
	h.exec({ sql: `PRAGMA user_version = ${o.version}` });
	return h;
}

/** Moved, never copied-then-deleted: the bytes stay exactly as they were for a rescue. */
async function setAside(o: GateOptions, why = "unreadable"): Promise<string> {
	const name = o.file.replace(/^\//, "");
	const aside = name.replace(/\.sqlite3$/, `.${why}-${Date.now()}.sqlite3`);
	if (o.native) {
		const p = await loadPool(o);
		await p.importDb(`/${aside}`, await p.exportFile(o.file));
		p.unlink(o.file);
		return aside;
	}
	const root = await navigator.storage.getDirectory();
	type Movable = FileSystemFileHandle & { move: (n: string) => Promise<void> };
	await ((await root.getFileHandle(name)) as Movable).move(aside);
	// A journal left behind would be replayed into the fresh file.
	const journal = await root.getFileHandle(`${name}-journal`).catch(() => null);
	await (journal as Movable | null)?.move(`${aside}-journal`);
	return aside;
}

async function openPooled(o: GateOptions): Promise<Db> {
	const p = await loadPool(o);
	// A pool slot per file, journal included; a full pool refuses the open.
	await p.reserveMinimumCapacity(Number(p.getFileCount()) + 2);
	return new p.OpfsSAHPoolDb(o.file) as unknown as Db;
}

/** `o.file` attached beside the open file as `schema`, in this one connection under its one lock (law 7),
 *  brought to `ddl`'s whole shape and made when new. An older build's file waits aside, its rows carried
 *  into a fresh one (law 1); one SQLite cannot read is set aside (law 2). Refused inside a transaction. */
export async function attach(h: Db, o: Files, schema: string, ddl: string): Promise<string[]> {
	if (o.native) {
		const p = await loadPool(o as GateOptions);
		await p.reserveMinimumCapacity(Number(p.getFileCount()) + 2);
	}
	const on = () => h.exec({ sql: `ATTACH ? AS ${q(schema)}`, bind: [`file:${o.file}?vfs=${o.native ? "opfs-sahpool" : "opfs"}`] });
	on();
	let older: string[];
	try {
		older = lacking(h, ddl, schema);
	} catch (e) {
		detach(h, schema);
		if (!UNREADABLE.test(String((e as Error)?.message ?? e))) throw e;
		console.error(`[gate] ${o.file} could not be read and was set aside as ${await setAside(o as GateOptions)}`);
		on();
		return reconcile(h, ddl, schema, true);
	}
	if (!older.length) return reconcile(h, ddl, schema, true);
	const bytes = exportBytes(h, schema);
	detach(h, schema);
	const kept = await setAside(o as GateOptions, "older");
	on();
	const added = reconcile(h, ddl, schema, true);
	carry(h, bytes, ddl, schema);
	console.info(`[gate] ${o.file} lacked ${older.join(", ")}: its rows were copied from ${kept}`);
	return added;
}

export const detach = (h: Db, schema: string): void => void h.exec({ sql: `DETACH ${q(schema)}` });

/** The names, without a leading slash, of the files `is` matches. */
export async function names(o: Pick<GateOptions, "native" | "wasmUrl">, is: RegExp): Promise<string[]> {
	if (o.native) return (await loadPool(o as GateOptions)).getFileNames().map((n) => n.replace(/^\//, "")).filter((n) => is.test(n)).sort();
	const root = (await navigator.storage.getDirectory()) as FileSystemDirectoryHandle & { keys(): AsyncIterable<string> };
	const out: string[] = [];
	for await (const n of root.keys()) if (is.test(n)) out.push(n);
	return out.sort();
}

// "opfs" VFS, not "opfs-sahpool" — sahpool takes an EXCLUSIVE sync access handle, so a
// second tab would be refused. "opfs" needs cross-origin isolation (COOP/COEP in
// hooks.server.ts and vercel.json). "opfs-wl" left files unreadable under open tabs on
// 6 Oct 2026, so it is out.
async function openShared(api: Sqlite3, o: GateOptions): Promise<Db> {
	const oo1 = api.oo1 as unknown as { OpfsDb?: new (f: string) => Db };
	if (!oo1.OpfsDb)
		throw new Error(
			`the 'opfs' VFS did not install (crossOriginIsolated=${String(globalThis.crossOriginIsolated)}); ` +
				"cross-origin isolation and the async proxy worker are its two preconditions.",
		);
	return new oo1.OpfsDb(o.file);
}

/** An empty database in memory, never written anywhere. */
export const scratch = (): Db => new (sqlite3 as Sqlite3).oo1.DB(":memory:") as unknown as Db;

export const exportBytes = (h: Db, schema = "main"): Uint8Array =>
	(sqlite3 as unknown as { capi: { sqlite3_js_db_export: (d: unknown, s: string) => Uint8Array } }).capi.sqlite3_js_db_export(
		h,
		schema,
	);

/** `bytes` attached beside `h` as schema `backup`, in memory, brought to `ddl`'s tables and
 *  columns first — an older copy lands like a newer one. Detached when `fn` returns. */
export function withBytes<T>(h: Db, bytes: Uint8Array, ddl: string, fn: () => T): T {
	const api = sqlite3 as unknown as {
		wasm: { allocFromTypedArray: (b: Uint8Array) => number };
		capi: {
			sqlite3_deserialize: (...a: unknown[]) => number;
			sqlite3_get_autocommit: (p: unknown) => number;
			SQLITE_DESERIALIZE_FREEONCLOSE: number;
			SQLITE_DESERIALIZE_RESIZEABLE: number;
		};
	};
	// DETACH is refused inside a transaction, so a copy attached there would stay attached and refuse every later one.
	if (!api.capi.sqlite3_get_autocommit(h.pointer)) throw new Error("a backup copy cannot be attached inside a transaction");
	h.exec({ sql: "ATTACH ':memory:' AS backup" });
	try {
		const rc = api.capi.sqlite3_deserialize(
			h.pointer,
			"backup",
			api.wasm.allocFromTypedArray(bytes),
			bytes.byteLength,
			bytes.byteLength,
			api.capi.SQLITE_DESERIALIZE_FREEONCLOSE | api.capi.SQLITE_DESERIALIZE_RESIZEABLE,
		);
		if (rc !== 0) throw new Error(`the copy could not be opened (sqlite rc=${rc})`);
		reconcile(h, ddl, "backup");
		return fn();
	} finally {
		h.exec({ sql: "DETACH backup" });
	}
}

/** A dropped or downloaded `.sqlite3`, read-only in memory — the admin viewers' door. */
export async function openBytes(bytes: Uint8Array, wasmUrl?: string): Promise<Db> {
	const api = await loadApi(wasmUrl);
	const capi = api.capi as unknown as {
		sqlite3_deserialize: (...a: unknown[]) => number;
		SQLITE_DESERIALIZE_FREEONCLOSE: number;
		SQLITE_DESERIALIZE_READONLY: number;
	};
	const h = new api.oo1.DB() as unknown as Db;
	const rc = capi.sqlite3_deserialize(
		h.pointer,
		"main",
		(api.wasm as unknown as { allocFromTypedArray: (b: Uint8Array) => number }).allocFromTypedArray(bytes),
		bytes.byteLength,
		bytes.byteLength,
		capi.SQLITE_DESERIALIZE_FREEONCLOSE | capi.SQLITE_DESERIALIZE_READONLY,
	);
	if (rc !== 0) {
		h.close();
		throw new Error(`not a SQLite file this tool can open (rc=${rc})`);
	}
	return h;
}

type Files = Pick<GateOptions, "file" | "native" | "wasmUrl">;
const unsentName = (o: Files) => {
	const base = o.file.replace(/^\//, "").replace(/\.sqlite3$/, "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	return new RegExp(`^${base}\\.unsent-\\d+\\.sqlite3$`);
};

/** The files a signed-in open kept for rows the account's copy may lack, oldest first. */
export async function unsentFiles(o: Files): Promise<{ name: string; bytes: Uint8Array }[]> {
	const found = await names(o, unsentName(o));
	if (o.native) {
		const p = await loadPool(o as GateOptions);
		return Promise.all(found.map(async (name) => ({ name, bytes: await p.exportFile(`/${name}`) })));
	}
	const root = await navigator.storage.getDirectory();
	return Promise.all(found.map(async (name) => ({ name, bytes: new Uint8Array(await (await (await root.getFileHandle(name)).getFile()).arrayBuffer()) })));
}

/** An unsent file goes only once its rows are in a copy the cloud holds. */
export async function dropUnsent(o: Files, names: string[]): Promise<void> {
	const is = unsentName(o);
	for (const name of names) {
		if (!is.test(name)) throw new Error(`${name} is not an unsent file of ${o.file}`);
		if (o.native) {
			(await loadPool(o as GateOptions)).unlink(`/${name}`);
			continue;
		}
		const root = await navigator.storage.getDirectory();
		await root.removeEntry(name);
		await root.removeEntry(`${name}-journal`).catch((e: unknown) => {
			if ((e as Error)?.name !== "NotFoundError") throw e;
		});
	}
}

/** Sign-out: every file `live` names goes, journals with them. */
export async function erase(o: Pick<GateOptions, "native" | "wasmUrl">, live: (name: string) => boolean): Promise<string[]> {
	const gone: string[] = [];
	if (o.native) {
		const p = await loadPool(o as GateOptions);
		for (const n of p.getFileNames().filter((n) => live(n.replace(/^\//, "")))) {
			p.unlink(n);
			gone.push(n);
		}
		return gone;
	}
	const root = (await navigator.storage.getDirectory()) as FileSystemDirectoryHandle & { keys(): AsyncIterable<string> };
	for await (const n of root.keys()) if (live(n.replace(/-journal$/, ""))) gone.push(n);
	for (const n of gone) await root.removeEntry(n);
	return gone;
}
