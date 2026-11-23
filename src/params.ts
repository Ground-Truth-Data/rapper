import { defineParams } from "@sveltejs/kit/params";
// SvelteKit's build imports this file with plain Node: no aliases, explicit extensions.
import { params as whoWhat } from "../../ReTreever_who_what/params.ts";
import { params as where } from "../../ReTreever_where/params.ts";

export const params = defineParams({ ...whoWhat, ...where });
