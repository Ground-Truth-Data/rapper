// Every plugin on this phone and everything filled into one: a file of its own beside the planter's, attached as
// `plugins`, so a bad form can never touch core data. It belongs to the phone, not to an account. A form is one
// row, rewritten as Central changes it and never deleted; every answer, entry and photo is insert-only, and a fix
// is a new row naming the one it replaces. Ops keeps every sent file's rows, and its own fills, in a file of this
// same shape.

export const PLUGINS = "plugins";

// Where an answer was saved or an entry added, named as deliveryTable names it; all null when there was no fix.
const FIX_COLUMNS = `\`lat\` real,
	\`lng\` real,
	\`accuracyM\` real,
	CHECK ((\`lat\` IS NULL) = (\`lng\` IS NULL) AND (\`accuracyM\` IS NULL OR \`lat\` IS NOT NULL))`;

export const pluginsDdl = [
	// A form as Central last served it. retiredAt is this phone's alone: the planter swiped it into the past.
	`CREATE TABLE \`plugin\` (
	\`id\` text PRIMARY KEY NOT NULL,
	\`definition\` text NOT NULL CHECK (json_valid(\`definition\`) AND json_type(\`definition\`) = 'object'),
	\`madeBy\` text NOT NULL,
	\`logo\` text,
	\`publishedAt\` text NOT NULL,
	\`addedAt\` text NOT NULL,
	-- The company that publishes it, null for a person's own. Its name and colour are the planter's Contacts org's.
	\`orgKey\` text,
	\`submissions\` integer,
	\`lastSubmittedAt\` text,
	\`lockedAt\` text,
	-- The form made from this one once it locked: { id, title }.
	\`replacedBy\` text CHECK (\`replacedBy\` IS NULL OR json_valid(\`replacedBy\`) AND json_type(\`replacedBy\`) = 'object'),
	\`droppedAt\` text,
	\`retiredAt\` text
)`,
	// A company's suite, kept once its link is opened; its forms come down with it on every refresh online.
	`CREATE TABLE \`suite\` (
	\`suiteKey\` text PRIMARY KEY NOT NULL,
	\`fetchedAt\` text NOT NULL
)`,
	// editedByKey is this phone's self personKey, filled by the insert from the planter's file. No REFERENCES:
	// SQLite cannot point across attached files.
	`CREATE TABLE \`answer\` (
	\`id\` text PRIMARY KEY NOT NULL,
	\`plugin\` text NOT NULL REFERENCES \`plugin\`(\`id\`),
	\`filledAt\` text NOT NULL,
	\`replaces\` text REFERENCES \`answer\`(\`id\`),
	\`data\` text NOT NULL CHECK (json_valid(\`data\`) AND json_type(\`data\`) = 'object'),
	\`editedByKey\` text NOT NULL,
	${FIX_COLUMNS}
)`,
	`CREATE TABLE \`answerRow\` (
	\`id\` text PRIMARY KEY NOT NULL,
	\`answer\` text NOT NULL REFERENCES \`answer\`(\`id\`),
	\`groupKey\` text NOT NULL,
	\`n\` integer NOT NULL,
	\`replaces\` text REFERENCES \`answerRow\`(\`id\`),
	\`data\` text NOT NULL CHECK (json_valid(\`data\`) AND json_type(\`data\`) = 'object'),
	${FIX_COLUMNS}
)`,
	// An answer holds a photo's key; the bytes travel in this file when it is sent.
	`CREATE TABLE \`photo\` (
	\`key\` text PRIMARY KEY NOT NULL,
	\`type\` text NOT NULL,
	\`bytes\` blob NOT NULL,
	\`takenAt\` text NOT NULL
)`,
	// The one form being filled per form, kept as it changes so a closed app resumes it; the only row that is
	// rewritten, and gone once its answer is saved.
	`CREATE TABLE \`draft\` (
	\`plugin\` text PRIMARY KEY NOT NULL REFERENCES \`plugin\`(\`id\`),
	\`data\` text NOT NULL CHECK (json_valid(\`data\`) AND json_type(\`data\`) = 'object'),
	\`path\` text NOT NULL CHECK (json_valid(\`path\`) AND json_type(\`path\`) = 'array'),
	\`savedAt\` text NOT NULL
)`,
	"CREATE TRIGGER `plugin_kept` BEFORE DELETE ON `plugin` BEGIN SELECT RAISE(ABORT, 'a form is never deleted'); END",
	"CREATE TRIGGER `answer_locked` BEFORE UPDATE ON `answer` BEGIN SELECT RAISE(ABORT, 'answer rows are insert-only'); END",
	"CREATE TRIGGER `answer_kept` BEFORE DELETE ON `answer` BEGIN SELECT RAISE(ABORT, 'answer rows are insert-only'); END",
	"CREATE TRIGGER `answerRow_locked` BEFORE UPDATE ON `answerRow` BEGIN SELECT RAISE(ABORT, 'answerRow rows are insert-only'); END",
	"CREATE TRIGGER `answerRow_kept` BEFORE DELETE ON `answerRow` BEGIN SELECT RAISE(ABORT, 'answerRow rows are insert-only'); END",
	"CREATE TRIGGER `photo_locked` BEFORE UPDATE ON `photo` BEGIN SELECT RAISE(ABORT, 'photo rows are insert-only'); END",
	"CREATE TRIGGER `photo_kept` BEFORE DELETE ON `photo` BEGIN SELECT RAISE(ABORT, 'photo rows are insert-only'); END",
].join("\n--> statement-breakpoint\n");
