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
        const area = element.querySelector<HTMLElement>(".board-column-content");

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
 * A card's height is settled by its content and by the column's width, and a column is a fixed
 * width the reader cannot change, so a height holds until the card itself changes. The one thing
 * that moves it is the width a phone gives a column, which follows the size of the window.
 */
const heights = new Map<string, number>();

/** What stands between two cards, which is one rule the board over and so is read once. */
let spacing: number | undefined;

/** Drops what has been measured, for a window whose size has changed under it. */
export function forgetCardHeights() {
    heights.clear();
    spacing = undefined;
}

/**
 * The cards of one column, in the area's content space.
 *
 * A card whose height is already known is placed by counting up from the one above it rather than
 * by reading a rectangle of its own, which on a column of thousands is the whole cost of a drag.
 * One that is not is read and remembered. The dragged card is counted with the rest, so the index
 * this leads to names a place in the list the board holds, which is the list a move is expressed
 * against.
 *
 * The gap standing open for the carried card holds the cards under it a place lower than they are
 * measured to be. What a place is counted against is the column without the drag's own doing in
 * it, so the room the gap takes is given back to everything below it.
 */
function measureCards(area: HTMLElement | null) {
    if (!area) {
        return [];
    }

    const top = area.getBoundingClientRect().top - area.scrollTop;
    const cards: CardBox[] = [];
    let gap = 0;
    /** Where the next card stands if it has to be counted rather than read. */
    let next = 0;
    /** The foot of the last card read, which the next one read settles the spacing against. */
    let foot: number | undefined;
    /** Whether where the column's cards begin has been read yet. */
    let anchored = false;

    for (const child of area.children) {
        if (!(child instanceof HTMLElement)) {
            continue;
        }

        if (child.classList.contains("board-drop-placeholder")) {
            const box = child.getBoundingClientRect();
            gap += box.height + Number.parseFloat(getComputedStyle(child).marginBottom || "0");
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
        if (height === undefined || !anchored) {
            const box = child.getBoundingClientRect();
            height ??= box.height;
            at = box.top - top - gap;
            anchored = true;
            if (noteId && box.height) {
                heights.set(noteId, box.height);
            }
            if (spacing === undefined && foot !== undefined) {
                spacing = at - foot;
            }
            foot = at + height;
        }

        const stands = at ?? next;
        cards.push({ top: stands, height });
        next = stands + height + (spacing ?? 0);
    }

    return cards;
}
