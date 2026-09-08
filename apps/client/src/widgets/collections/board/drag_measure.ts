import { type CardBox, type ColumnBox } from "./drag_geometry";

/** What a drag measures once at its start, and reads for the rest of the gesture. */
export interface BoardMeasurement {
    /** The columns as drawn, in order, for {@link columnAt} and {@link columnInsertionIndex}. */
    columns: ColumnBox[];
    /** Each column's card area, which a point has to be read against to place a card in it. */
    areas: Map<string, HTMLElement>;
}

/**
 * Measures every column on the board, and the cards in each of them.
 *
 * Called once when a drag starts. A gesture reads two rectangles per move afterwards, whatever the
 * board holds, where measuring per move would read one for every card on it.
 *
 * @param withCards whether to measure the cards as well, which only a card is placed against. A
 * column is placed against the column boxes alone, and reading a rectangle per card for one is a
 * pass over the whole board that nothing goes on to look at.
 */
export function measureBoard(container: HTMLElement, withCards = true): BoardMeasurement {
    const origin = container.getBoundingClientRect().left - container.scrollLeft;
    const columns: ColumnBox[] = [];
    const areas = new Map<string, HTMLElement>();

    // The copy being carried is a column too, and measuring again mid-drag would count it as a
    // place to drop into, one past every place the board actually has.
    const drawn = container.querySelectorAll<HTMLElement>(".board-column:not(.board-drag-preview)");

    for (const element of drawn) {
        const value = element.dataset.column ?? "";
        const rect = element.getBoundingClientRect();
        // A strip holds its cards in the page but draws none of them: they measure nothing, and a
        // card carried over one goes to the front of whatever it holds.
        const area = element.classList.contains("collapsed")
            ? null
            : element.querySelector<HTMLElement>(".board-column-content");

        if (area) {
            areas.set(value, area);
        }

        columns.push({
            value,
            left: rect.left - origin,
            width: rect.width,
            top: rect.top,
            height: rect.height,
            cards: withCards ? measureCards(area) : []
        });
    }

    return { columns, areas };
}

/** A point in the board's content space, which its horizontal scrolling does not move columns in. */
export function toBoardX(container: HTMLElement, clientX: number): number {
    return clientX - container.getBoundingClientRect().left + container.scrollLeft;
}

/**
 * A point in a card area's content space, which that column's vertical scrolling does not move its
 * cards in.
 */
export function toAreaY(area: HTMLElement, clientY: number): number {
    return clientY - area.getBoundingClientRect().top + area.scrollTop;
}

/**
 * What each card measures, kept by note so that a column can be placed against without reading a
 * rectangle for every card in it.
 *
 * A height holds until the card's own content changes, which {@link measureCards} checks for, or
 * until the window does, which drops the lot.
 */
const heights = new Map<string, number>();

/** What stands between two cards, which is one rule the board over and so is read once. */
let spacing: number | undefined;

/**
 * What stands between two cards, which is what a gap takes up on top of the card it stands for.
 * Nothing until a column has been measured, which a drag does before it opens any gap.
 */
export function cardSpacing() {
    return spacing ?? 0;
}

/** Drops what has been measured, for a window whose size has changed under it. */
export function forgetCardHeights() {
    heights.clear();
    spacing = undefined;
}

/**
 * The cards of one column, in the area's content space.
 *
 * A card whose height is known is placed by counting up from the one above it rather than by
 * reading a rectangle of its own, which on a column of thousands is the whole cost of a drag. The
 * dragged card is counted with the rest, so the index this leads to names a place in the list the
 * board holds.
 */
function measureCards(area: HTMLElement | null): CardBox[] {
    if (!area) {
        return [];
    }

    const counted = countCards(area, false);
    const { cards, elements } = counted;
    const last = cards.length - 1;

    // A card whose title or attributes changed stands a different height, and nothing says so, so
    // where the last card really is settles whether what was remembered still holds.
    if (counted.borrowed && last > 0) {
        const at = elements[last].getBoundingClientRect().top - counted.top;
        if (Math.abs(at - cards[last].top) > 1) {
            for (const element of elements) {
                heights.delete(element.dataset.noteId ?? "");
            }

            return countCards(area, true).cards;
        }
    }

    return cards;
}

/**
 * Walks a column's cards, reading what is not known and counting up from what is.
 *
 * @param readEvery whether to read every card rather than the first and the unknown ones alone.
 */
function countCards(area: HTMLElement, readEvery: boolean) {
    const top = area.getBoundingClientRect().top - area.scrollTop;
    const cards: CardBox[] = [];
    const elements: HTMLElement[] = [];
    /** Where the next card stands if it has to be counted rather than read. */
    let next = 0;
    /** The foot of the last card read, which the next one read settles the spacing against. */
    let foot: number | undefined;
    /** Whether where the column's cards begin has been read yet. */
    let anchored = false;
    /** Whether any card's height came from what was remembered rather than from the page. */
    let borrowed = false;

    for (const child of area.children) {
        if (!(child instanceof HTMLElement)) {
            continue;
        }

        if (!child.classList.contains("board-note")) {
            continue;
        }

        const noteId = child.dataset.noteId ?? "";
        let height = heights.get(noteId);
        let at: number | undefined;

        // The first card is always read, whatever is known of it: where a column's cards begin is
        // its own, and the ones under it are counted up from there. A card whose height is not
        // known yet is read as well, and remembered.
        if (height === undefined || !anchored || readEvery) {
            const box = child.getBoundingClientRect();
            height = box.height;
            at = box.top - top;
            anchored = true;
            if (noteId && box.height) {
                heights.set(noteId, box.height);
            }
            if (spacing === undefined && foot !== undefined) {
                spacing = at - foot;
            }
            foot = at + height;
        } else {
            borrowed = true;
        }

        const stands = at ?? next;
        cards.push({ top: stands, height });
        elements.push(child);
        next = stands + height + (spacing ?? 0);
    }

    return { cards, elements, borrowed, top };
}
