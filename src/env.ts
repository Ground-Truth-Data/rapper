// Written from .env.schema by rapper/scripts/envFromBitwarden.mjs on every dev run and build. Hand edits are overwritten.
import { defineEnvVars } from "@sveltejs/kit/env";

const optional = (value: string | undefined) => value;

export const variables = defineEnvVars({
	DEV: { schema: optional },
	BUILD_TARGET: { schema: optional },
	APP_ENV: { schema: optional },
	VITE_RAPPER_TIER: { schema: optional },
	VITE_OTHER_TIER: { schema: optional },
	VITE_OTHER_ORIGIN: { schema: optional },
	VITE_OTHER_HOME: { schema: optional },
	VITE_TIER_ROUTES: { schema: optional },
	VITE_TIER_SLOT: { schema: optional },
	VITE_MOUNTED_CHILD: { schema: optional },
});
