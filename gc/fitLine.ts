// A list row is two lines. These fit each line to its width by measuring it, as attachments.

// Fits again when the line is resized and when what it holds changes: a name or a place lands late.
const refit = (el: HTMLElement, fit: () => void) => {
	// On the next frame: fitting inside the observer's own callback resizes what it watches, which the
	// browser reports as a "ResizeObserver loop" error.
	const sized = new ResizeObserver(() => requestAnimationFrame(fit));
	const filled = new MutationObserver(fit);
	sized.observe(el);
	filled.observe(el, { childList: true, subtree: true, characterData: true });
	return () => (sized.disconnect(), filled.disconnect());
};

/** The second line is one line and nothing on it is cut. What does not fit whole gives way: the place
 *  (`[data-place]`, fullest first) steps down to its next shorter form, planters (`[data-role=planter]`) are left
 *  off last first and `[data-planter-count]` then shows, and the measure (`[data-rest]`) goes last. */
export function fitLine(line: HTMLElement) {
	return refit(line, () => {
		const over = () => line.scrollWidth > line.clientWidth;
		const all = (sel: string) => [...line.querySelectorAll<HTMLElement>(sel)];
		const places = all("[data-place]");
		const pills = all("[data-role=planter]");
		const rest = all("[data-rest]");
		for (const e of [...pills, ...rest]) e.hidden = false;
		places.forEach((p, i) => (p.hidden = i > 0));
		for (let i = 0; i < places.length && over(); i++) {
			places[i]!.hidden = true;
			if (places[i + 1]) places[i + 1]!.hidden = false;
		}
		let shown = pills.length;
		while (shown > 0 && over()) pills[--shown]!.hidden = true;
		for (const e of rest) e.hidden = over();
		const count = line.querySelector<HTMLElement>("[data-planter-count]");
		if (count) count.hidden = shown === pills.length;
	});
}

/** The `[data-title]` inside shrinks to fit beside its count, down to 70%. Past that it is cut: the drawer and the
 *  row's label still say the whole name. */
export function fitTitle(line: HTMLElement) {
	const title = line.querySelector<HTMLElement>("[data-title]");
	if (!title) return;
	return refit(line, () => {
		title.style.fontSize = "";
		let px = Math.floor(parseFloat(getComputedStyle(title).fontSize));
		const floor = px * 0.7;
		while (px > floor && title.scrollWidth > title.clientWidth) title.style.fontSize = `${--px}px`;
	});
}
