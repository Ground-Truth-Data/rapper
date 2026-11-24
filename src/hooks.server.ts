import type { Handle } from "@sveltejs/kit/hooks";
import { paraglideMiddleware } from "$parent/src/lib/paraglide/server";

// The first paint is in the visitor's language, and app.html's lang is filled.
export const handle: Handle = ({ event, resolve }) =>
	// No URL strategy, so the middleware never rewrites the request: `event` stands as it is.
	paraglideMiddleware(event.request, ({ locale }) => {
		return resolve(event, { transformPageChunk: ({ html }) => html.replace("%paraglide.lang%", locale) });
	});
