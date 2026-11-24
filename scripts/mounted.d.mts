export function mountedChild(): string | undefined;
export function kitFiles(): {
	routes: string;
	params: string;
	hooks: { universal: string; server: string };
};
