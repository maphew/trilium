import type FNote from "../entities/fnote";
import attributes, { setLabelValues } from "./attributes";

/**
 * What a set of notes holds in common: one value they all agree on, or nothing.
 *
 * Kept apart from a plain `T | undefined` because the two answers are different: every note being
 * unset is an agreement, and a menu marks it, while notes that disagree mark nothing at all.
 */
export type Shared<T> = { agreed: true, value: T } | { agreed: false };

/**
 * Reads one thing off every note and reports what they agree on.
 *
 * Takes a reader rather than a property name, so the same function answers for a label, a flag or
 * anything else an `FNote` can be asked. An empty set agrees on nothing.
 */
export function shared<T>(notes: FNote[], read: (note: FNote) => T): Shared<T> {
    if (!notes.length) {
        return { agreed: false };
    }

    const value = read(notes[0]);
    return notes.every((note) => read(note) === value)
        ? { agreed: true, value }
        : { agreed: false };
}

/**
 * Sets a label to one value on every note.
 *
 * Written note by note through `setLabelValues`, which reuses the labels already there and leaves
 * inherited ones alone. The bulk-action endpoint would be one request instead of several, but its
 * `updateLabelValue` only touches labels a note already owns and `addLabel` always adds another,
 * so neither writes "hold this value" on a note that may or may not already hold it.
 */
export async function setLabelOnNotes(notes: FNote[], name: string, value: string) {
    for (const note of notes) {
        await setLabelValues(note, name, [ value ]);
    }
}

/**
 * Takes a label off every note.
 *
 * `setLabelValues` removes only the labels a note owns, so an inherited value would still apply.
 * Such a note is given an empty label of its own instead, which is what an unset promoted field
 * holds and what `renderLabelValue` draws as nothing.
 */
export async function clearLabelOnNotes(notes: FNote[], name: string) {
    for (const note of notes) {
        const isInherited = note.getAttributes("label", name)
            .some((attribute) => attribute.noteId !== note.noteId);
        await setLabelValues(note, name, isInherited ? [ "" ] : []);
    }
}

/** Adds or removes `#archived` on every note, leaving the ones already in that state alone. */
export async function setArchivedOnNotes(notes: FNote[], archived: boolean) {
    for (const note of notes) {
        if (note.isArchived === archived) {
            continue;
        }

        if (archived) {
            await attributes.addLabel(note.noteId, "archived");
        } else {
            attributes.removeOwnedLabelByName(note, "archived");
        }
    }
}
