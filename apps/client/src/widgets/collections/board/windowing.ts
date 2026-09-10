/**
 * Which of a column's cards are drawn, for a column holding more of them than the page can carry.
 *
 * A board keeps every card of every column in the page, and the cost of that is not the elements
 * inside a card but the card itself: the style rules the page holds are matched against each one,
 * so a column of thousands makes scrolling, dragging and hovering it cost hundreds of milliseconds.
 * Drawing only what the reader can see, with a spacer standing for the rest, takes those back to
 * the frame budget.
 */

import { RefObject } from "preact";
import { flushSync } from "preact/compat";
import {
    useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState
} from "preact/hooks";

import { cardSpacing } from "./drag_measure";

/** What a card stands at before anything has measured it: one line of title with its padding. */
export const NOMINAL_CARD_HEIGHT = 64;

/** How far past each edge of the area cards are still drawn, so scrolling has somewhere to go. */
export const OVERSCAN_PX = 800;

/** The window's edges move in steps of this many cards, so a scroll swaps them in batches. */
export const WINDOW_CHUNK = 25;

/** What a column holds before it is worth windowing at all. */
export const WINDOW_THRESHOLD = 120;

export interface ColumnWindow {
    /** The first card drawn. */
    from: number;
    /** One past the last card drawn. */
    until: number;
    /** What the spacer above the drawn cards stands at, in pixels. */
    above: number;
    /** What the spacer below them stands at, in pixels. */
    below: number;
}

export interface WindowInput {
    /** What each card stands at, in the order the column holds them. */
    heights: readonly number[];
    /** What stands between one card and the next. */
    spacing: number;
    scrollTop: number;
    /** What the area drawing the cards stands at. */
    viewport: number;
    overscan?: number;
    /** How many cards the window's edges move by. One card, for a test that wants no batching. */
    chunk?: number;
}

/**
 * The cards to draw at a scroll position, and what the spacers around them stand at.
 *
 * The edges are rounded outwards to whole chunks so that scrolling by a card does not redraw the
 * column: a window only changes once the reader has passed a chunk of them.
 */
export function computeWindow({
    heights, spacing, scrollTop, viewport, overscan = OVERSCAN_PX, chunk = WINDOW_CHUNK
}: WindowInput): ColumnWindow {
    const count = heights.length;
    if (count === 0) {
        return { from: 0, until: 0, above: 0, below: 0 };
    }

    const top = scrollTop - overscan;
    const bottom = scrollTop + viewport + overscan;
    let first = count;
    let last = -1;
    let offset = 0;
    /** Where each drawn edge stands, kept while walking so neither is measured a second time. */
    const edges: number[] = [];

    for (const [index, height] of heights.entries()) {
        edges.push(offset);
        const foot = offset + height;
        if (foot > top && first === count) {
            first = index;
        }
        if (offset < bottom) {
            last = index;
        }
        offset += height + spacing;
    }
    edges.push(offset);

    // Nothing is in view when the column is scrolled past its own end, which a shrinking column
    // leaves the reader at. The last chunk is drawn instead, so the column is never blank.
    if (last < 0 || first > last) {
        first = Math.max(0, count - 1);
        last = count - 1;
    }

    const from = Math.max(0, Math.floor(first / chunk) * chunk);
    const until = Math.min(count, Math.ceil((last + 1) / chunk) * chunk);

    return {
        from,
        until,
        above: edges[from] ?? 0,
        // The spacing below the last drawn card is its own margin, so the spacer stands for what
        // is left after it.
        below: Math.max(0, (edges[count] ?? 0) - (edges[until] ?? edges[count] ?? 0))
    };
}

/**
 * What each card stands at, measured where it has been drawn and estimated where it has not.
 *
 * The estimate is the average of what has been measured, so a column of tall cards is not counted
 * as a column of short ones once any of them has been seen.
 */
export function resolveHeights(
    noteIds: readonly string[],
    measured: ReadonlyMap<string, number>,
    nominal = NOMINAL_CARD_HEIGHT
): number[] {
    return noteIds.map((noteId) => measured.get(noteId) ?? nominal);
}

/**
 * What a column counts an unmeasured card at, from the cards of that column already measured.
 *
 * A column's own cards, not every card the page has drawn: two boards, or two columns of one
 * board, can carry different attributes and stand at quite different heights, and counting one
 * column's cards at another's average puts its spacers, its scrollbar and its scroll destinations
 * all in the wrong place.
 *
 * Answers nothing until enough of them have been measured, and the caller then holds what it is
 * given for good. It has to stop moving: the spacer above the window holds the reader's place and
 * is counted from this, so a figure that kept being revised would slide the column as they read.
 *
 * @param held what the column has already settled on, which is answered back unchanged.
 */
export function estimateFor(
    noteIds: readonly string[],
    measured: ReadonlyMap<string, number>,
    held: number | undefined
) {
    if (held !== undefined) {
        return held;
    }

    let total = 0;
    let seen = 0;
    for (const noteId of noteIds) {
        const height = measured.get(noteId);
        if (height !== undefined) {
            total += height;
            seen++;
        }
    }

    return seen >= ESTIMATE_SAMPLE ? total / seen : undefined;
}

/** How many of a column's cards are measured before what the rest are counted at is settled. */
const ESTIMATE_SAMPLE = 12;

/**
 * Bumped when what has been measured is dropped, so every column settles on a fresh estimate
 * rather than holding one taken at a width the board no longer has.
 */
let generation = 0;

/**
 * Whether two windows draw the same cards.
 *
 * The spacers are left out: they follow from the heights, and a measurement that only corrects
 * them must not count as a change that redraws the column.
 */
export function sameWindow(a: ColumnWindow, b: ColumnWindow) {
    return a.from === b.from && a.until === b.until;
}

/**
 * The window a column draws, kept in step with its scrolling and with what its cards measure.
 *
 * Heights are learned as cards are drawn and remembered by note, so a card that has been on screen
 * once is counted at its own height afterwards rather than at the estimate. Correcting a height
 * above the reader would slide the column under them, so the scroll position is moved by the same
 * amount in the frame the correction lands.
 *
 * @param areaRef the scrolling element the cards are drawn in.
 * @param noteIds the column's cards, in the order it holds them.
 * @param enabled whether this column is windowed at all.
 */
export function useColumnWindow(
    areaRef: RefObject<HTMLElement>,
    noteIds: readonly string[],
    enabled: boolean
) {
    const [ revision, setRevision ] = useState(0);
    const [ scroll, setScroll ] = useState({ top: 0, viewport: 0 });
    /** What this column counts its unmeasured cards at, once its own have settled it. */
    const estimate = useRef<{ at: number, value?: number }>({ at: generation });
    if (estimate.current.at !== generation) {
        estimate.current = { at: generation };
    }
    estimate.current.value = estimateFor(noteIds, cardHeights, estimate.current.value);

    const settled = estimate.current.value;
    const heights = useMemo(
        () => resolveHeights(noteIds, cardHeights, settled ?? NOMINAL_CARD_HEIGHT),
        // `revision` stands for the measurements, which live outside the render.
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [ noteIds, revision, settled ]);
    const spacing = cardSpacing() || DEFAULT_SPACING;

    const bounds = useMemo(() => (enabled
        ? computeWindow({
            heights, spacing, scrollTop: scroll.top, viewport: scroll.viewport
        })
        : { from: 0, until: noteIds.length, above: 0, below: 0 }
    ), [ enabled, heights, spacing, scroll.top, scroll.viewport, noteIds.length ]);

    /** What the last commit drew, so a change of window can be told from a change of spacer. */
    const drawn = useRef(bounds);
    const changed = enabled && !sameWindow(drawn.current, bounds);
    drawn.current = bounds;

    // Follows the column's own scrolling. Read in the event rather than through state, so the
    // window keeps up with the finger instead of trailing it by a frame.
    useEffect(() => {
        const area = areaRef.current;
        if (!area || !enabled) return;

        const read = () => setScroll((current) => (
            current.top === area.scrollTop && current.viewport === area.clientHeight
                ? current
                : { top: area.scrollTop, viewport: area.clientHeight }));

        read();
        area.addEventListener("scroll", read, { passive: true });
        const resize = new ResizeObserver(read);
        resize.observe(area);

        return () => {
            area.removeEventListener("scroll", read);
            resize.disconnect();
        };
    }, [ areaRef, enabled ]);

    /** What the spacer above stood at last, and for which first card, so a correction is spotted. */
    const above = useRef({ from: bounds.from, height: bounds.above });
    useLayoutEffect(() => {
        const area = areaRef.current;
        if (!area || !enabled) {
            above.current = { from: bounds.from, height: bounds.above };
            return;
        }

        // A correction to what the undrawn cards are counted at moves everything below it, so the
        // column is scrolled by as much to leave what the reader is looking at where it was.
        //
        // Only where the same cards are still drawn: a window that moved because the reader
        // scrolled has a different spacer above it by rights, and the scroll position that moved
        // it is already the one they asked for.
        const held = above.current;
        const shift = held.from === bounds.from ? bounds.above - held.height : 0;
        above.current = { from: bounds.from, height: bounds.above };
        if (Math.abs(shift) > 1 && area.scrollTop > 0) {
            area.scrollTop += shift;
        }

        let corrected = false;
        for (const card of area.querySelectorAll<HTMLElement>(".board-note")) {
            const noteId = card.dataset.noteId;
            const height = card.offsetHeight;
            // A card holding the field its title is typed in stands taller than the card does, and
            // a carried one is out of the flow at no height at all.
            if (!noteId || !height || card.classList.contains("editing")) continue;

            const known = cardHeights.get(noteId);
            if (known === undefined || Math.abs(known - height) > 0.5) {
                cardHeights.set(noteId, height);
                corrected = true;
            }
        }

        if (corrected) {
            setRevision((r) => r + 1);
        }
    });

    // Published after each commit, so a gesture reads what the column is drawing with now rather
    // than what it was drawing with when the gesture started.
    useLayoutEffect(() => {
        const area = areaRef.current;
        if (!area) return;

        if (enabled) {
            models.set(area, { heights, spacing });
        } else {
            models.delete(area);
        }
    }, [ areaRef, enabled, heights, spacing ]);

    /**
     * Brings a card into the window, for one the column has just made where the reader is not
     * looking. The scroll is what moves the window: it is worked out from the same heights.
     */
    const scrollToCard = useCallback((index: number, immediate = false) => {
        const area = areaRef.current;
        if (!area || !enabled) return;

        let offset = 0;
        for (const [ at, height ] of heights.entries()) {
            if (at >= index) break;
            offset += height + spacing;
        }

        // Placed a little above the foot of the area, so the card is not left under its own edge.
        area.scrollTop = Math.max(0, offset - area.clientHeight / 2);

        if (immediate) {
            // The scroll event that would move the window arrives a frame later, so the window is
            // moved here instead and the card is in the page before this returns.
            flushSync(() => setScroll({ top: area.scrollTop, viewport: area.clientHeight }));
        }
    }, [ areaRef, enabled, heights, spacing ]);

    return { bounds, windowChanged: changed, scrollToCard };
}

/**
 * What a column lays its cards out from: the heights the spacers are counted with, and the gap
 * between one card and the next.
 *
 * Published so a drag can work out where a card would land without reading the page. The page is
 * the wrong source mid-gesture: the carried card is out of the flow, the gap stands over the cards,
 * and the ones below it are moved aside by a transform.
 */
export interface ColumnModel {
    heights: readonly number[];
    spacing: number;
}

/** The model a column is drawing with, or nothing where it draws all of its cards. */
export function getColumnModel(area: HTMLElement) {
    return models.get(area);
}

const models = new WeakMap<HTMLElement, ColumnModel>();

/**
 * Asks the column drawing `column` to bring a card into view.
 *
 * The keyboard walks a column by index and can step onto a card outside the window, which is not
 * in the page to be focused. The column answers by scrolling to it, which draws it.
 */
export function askForCard(
    container: HTMLElement, column: string, index: number, immediate = false
) {
    container.dispatchEvent(new CustomEvent(REVEAL_CARD, { detail: { column, index, immediate } }));
}

/** The event {@link askForCard} raises, which a windowed column listens for. */
export const REVEAL_CARD = "board:reveal-card";

export interface RevealCardDetail {
    column: string;
    index: number;
    /**
     * Whether the card must be in the page by the time the ask returns.
     *
     * For a keyboard walk, which has to focus it in the same keystroke: focus left on nothing
     * while a frame is waited for makes the next key find no card to walk from, and the browser
     * scrolls the board instead. Not for an ask made while the board is drawing, where drawing
     * again in the middle of a commit is not safe.
     */
    immediate?: boolean;
}

/** Drops what has been measured, for a window whose size has changed under it. */
export function forgetWindowHeights() {
    cardHeights.clear();
    generation++;
}

/**
 * What each card measured, by note, kept for as long as the page is open.
 *
 * Shared by every board: a card keeps its height wherever it is drawn, and a column that has never
 * been scrolled still counts its cards at what they stood at somewhere else.
 */
const cardHeights = new Map<string, number>();

/** What stands between two cards before a drag has measured it. Matches `.board-note`'s margin. */
const DEFAULT_SPACING = 9;
