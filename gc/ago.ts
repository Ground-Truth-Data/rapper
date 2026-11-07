/** How long ago, in the fewest characters a row can hold: 5m, 3h, 2d, 4w. */
export function ago(iso: string) {
	const m = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 60000));
	return m < 60 ? `${m}m` : m < 1440 ? `${Math.round(m / 60)}h` : m < 20160 ? `${Math.round(m / 1440)}d` : `${Math.round(m / 10080)}w`;
}
