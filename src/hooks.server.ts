import type { Handle } from "@sveltejs/kit";
import { paraglideMiddleware } from "$parent/src/lib/paraglide/server";

// The first paint is in the visitor's language, and app.html's lang is filled.
export const handle: Handle = ({ event, resolve }) =>
	paraglideMiddleware(event.request, ({ request, locale }) => {
		event.request = request;
		return resolve(event, { transformPageChunk: ({ html }) => html.replace("%paraglide.lang%", locale) });
	});
