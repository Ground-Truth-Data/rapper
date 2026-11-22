/** An error whose message was written for the planter: the one kind whose words may reach the screen. */
export class PlainError extends Error {
	override name = "PlainError";
}

/** What a failure shows: a PlainError's own words, else `plain`. Anything else goes whole to the console,
 *  which Sentry records, and never to the screen. */
export function plainly(where: string, e: unknown, plain: string): string {
	if (e instanceof PlainError) return e.message;
	console.error(`[${where}]`, e);
	return plain;
}
