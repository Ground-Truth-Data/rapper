// Structural slice so this control fits both the online map (Mapbox) and the
// offline preview (MapLibre) — the two `Map` classes are only
// nominally distinct.
import { getLocale } from "$parent/src/lib/paraglide/runtime";
import { scaleUnit } from "$gc/units.svelte";
type ScaleBarMap = {
	getContainer(): HTMLElement;
	unproject(point: [number, number]): { lng: number; lat: number };
	on(type: string, listener: () => void): unknown;
	off(type: string, listener: () => void): unknown;
};

export interface ScaleBarOptions {
    width?: number;
    maxRangeMeters?: number;
    minStepWidth?: number;
    maxDepth?: number;
    height?: number;
}

const NICE_STEPS = [1, 2, 5];

function niceNumberAtMost(value: number): number {
    if (value <= 0) return 0;
    const exp = Math.floor(Math.log10(value));
    const pow = 10 ** exp;
    let best = 0;
    for (const s of NICE_STEPS) {
        const v = s * pow;
        if (v <= value && v > best) best = v;
    }
    return best;
}

function metersPerPixel(map: ScaleBarMap): number {
    const container = map.getContainer();
    const cx = container.clientWidth / 2;
    const cy = container.clientHeight / 2;
    const left = map.unproject([cx - 50, cy]);
    const right = map.unproject([cx + 50, cy]);
    const R = 6371008.8;
    const toRad = Math.PI / 180;
    const dLon = (right.lng - left.lng) * toRad;
    const lat1 = left.lat * toRad;
    const lat2 = right.lat * toRad;
    const a = Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
    return (R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))) / 100;
}

export class NiceScaleBarControl {
    private opts: Required<ScaleBarOptions>;
    private map: ScaleBarMap | null = null;
    private container: HTMLDivElement | null = null;
    private blocksEl: HTMLDivElement | null = null;
    private labelsEl: HTMLDivElement | null = null;
    private hideTimeout: ReturnType<typeof setTimeout> | null = null;
    private onMove = () => this.update();
    private onZoomStart = () => {
        if (this.hideTimeout) {
            clearTimeout(this.hideTimeout);
            this.hideTimeout = null;
        }
        this.container?.classList.add("is-active");
    };
    private onZoomEnd = () => {
        if (this.hideTimeout) clearTimeout(this.hideTimeout);
        this.hideTimeout = setTimeout(() => {
            this.container?.classList.remove("is-active");
            this.hideTimeout = null;
        }, 500);
    };

    constructor(options: ScaleBarOptions = {}) {
        this.opts = {
            width: options.width ?? 200,
            maxRangeMeters: options.maxRangeMeters ?? 5000,
            minStepWidth: options.minStepWidth ?? 23,
            maxDepth: options.maxDepth ?? 4,
            height: options.height ?? 20,
        };
    }

    onAdd(map: ScaleBarMap): HTMLElement {
        this.map = map;
        const el = document.createElement("div");
        // BOTH namespaces — carrying only one leaves this bar unpositioned
        // on the other map (each renderer positions controls by its own class).
        el.className = "mapboxgl-ctrl maplibregl-ctrl nice-scale-bar";
        el.style.pointerEvents = "none";

        const blocks = document.createElement("div");
        blocks.className = "nice-scale-bar__blocks";
        blocks.style.height = `${this.opts.height}px`;
        el.appendChild(blocks);

        const labels = document.createElement("div");
        labels.className = "nice-scale-bar__labels";
        el.appendChild(labels);

        this.container = el;
        this.blocksEl = blocks;
        this.labelsEl = labels;

        map.on("move", this.onMove);
        map.on("zoomstart", this.onZoomStart);
        map.on("zoomend", this.onZoomEnd);
        this.update();
        return el;
    }

    onRemove(): void {
        if (this.map) {
            this.map.off("move", this.onMove);
            this.map.off("zoomstart", this.onZoomStart);
            this.map.off("zoomend", this.onZoomEnd);
        }
        if (this.hideTimeout) {
            clearTimeout(this.hideTimeout);
            this.hideTimeout = null;
        }
        this.container?.parentNode?.removeChild(this.container);
        this.container = null;
        this.blocksEl = null;
        this.labelsEl = null;
        this.map = null;
    }

    getDefaultPosition(): "bottom-left" {
        return "bottom-left";
    }

    private update(): void {
        if (!this.map || !this.blocksEl || !this.labelsEl) return;
        // Locals keep the non-null narrowing inside the closures below.
        const blocksEl = this.blocksEl;
        const labelsEl = this.labelsEl;
        const { width, maxRangeMeters, minStepWidth } = this.opts;

        const mpp = metersPerPixel(this.map);
        if (!Number.isFinite(mpp) || mpp <= 0) return;

        // Round numbers in the unit printed: 2 mi, not 10,000 ft.
        const u = scaleUnit();
        const maxSmall = Math.min(maxRangeMeters, width * mpp) * u.perMetre;
        const big = maxSmall >= u.bigIs;
        const per = big ? u.bigIs : 1;
        const total = niceNumberAtMost(maxSmall / per);
        if (total <= 0) {
            blocksEl.innerHTML = "";
            labelsEl.innerHTML = "";
            return;
        }
        const label = (v: number) =>
            `${v.toLocaleString(getLocale(), { maximumFractionDigits: 2 })}${big ? u.big : u.small}`;

        const totalPx = (total * per) / u.perMetre / mpp;

        // Powers-of-two layout only: the bar always splits in half, and the
        // left half may split again into quarters. Never thirds.
        const halfPx = totalPx / 2;
        const quarterPx = totalPx / 4;

        const showQuarters = quarterPx >= minStepWidth;

        blocksEl.style.width = `${totalPx}px`;
        blocksEl.innerHTML = "";

        const addBlock = (widthPx: number, dark: boolean) => {
            const b = document.createElement("div");
            b.className = `nice-scale-bar__block ${dark ? "is-dark" : "is-light"}`;
            b.style.flex = "none";
            b.style.width = `${widthPx}px`;
            blocksEl.appendChild(b);
        };

        if (showQuarters) {
            addBlock(quarterPx, true);
            addBlock(quarterPx, false);
            addBlock(halfPx, true);
        } else {
            addBlock(halfPx, true);
            addBlock(halfPx, false);
        }

        labelsEl.style.width = `${totalPx}px`;
        labelsEl.innerHTML = "";

        const addTick = (cssClass: string, text: string, leftPx?: number) => {
            const span = document.createElement("span");
            span.className = `nice-scale-bar__tick ${cssClass}`;
            if (leftPx !== undefined) span.style.left = `${leftPx}px`;
            span.textContent = text;
            labelsEl.appendChild(span);
        };

        addTick("nice-scale-bar__tick--start", "0");

        if (showQuarters && quarterPx > minStepWidth * 1.5) {
            addTick("nice-scale-bar__tick--mid", label(total / 4), quarterPx);
        }

        addTick("nice-scale-bar__tick--mid", label(total / 2), halfPx);

        addTick("nice-scale-bar__tick--end", label(total));
    }
}
