import type { Reroute } from "@sveltejs/kit/hooks";

// "/" is nobody's page — every child starts at its own defaultPath; the workspace rapper starts at who_what's.
export const reroute: Reroute = ({ url }) => {
	if (url.pathname === "/") return "/who";
};
