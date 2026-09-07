import { describe, expect, it } from "vitest";

import type FNote from "../../entities/fnote";
import froca from "../../services/froca";
import { buildNote } from "../../test/easy-froca";
import type { PromotedAttribute } from "./promoted_attributes";
import { parseSortKey, sortItems, type SortContext, type SortKey } from "./sorting";

/** The label type a definition declares, or "relation" when the field is a relation. */
type FieldType = PromotedAttribute["labelType"] | "relation";

interface Item {
    note: FNote;
    createdAt?: number;
}

/** One note to sort, with the single attribute the tests give it. */
interface ItemDraft {
    title: string;
    createdAt?: number;
    "#field"?: string;
    "~field"?: string;
}

describe("parseSortKey", () => {
    it("reads the keys a column can be sorted by", () => {
        expect(parseSortKey("title")).toBe("title");
        expect(parseSortKey("creationDate")).toBe("creationDate");
        expect(parseSortKey("attr:priority")).toBe("attr:priority");
    });

    it("reads everything else as the manual order", () => {
        for (const orderBy of [ undefined, null, "", "none", "attr:", "dateModified" ]) {
            expect(parseSortKey(orderBy)).toBeUndefined();
        }
    });
});

describe("sortItems", () => {
    it("sorts titles as the user reads them, digits included", () => {
        const items = build([
            { title: "Task 10" }, { title: "task 2" }, { title: "Alpha" }
        ]);

        expect(titles(sort(items, "title"))).toEqual([ "Alpha", "task 2", "Task 10" ]);
        expect(titles(sort(items, "title", true))).toEqual([ "Task 10", "task 2", "Alpha" ]);
    });

    it("sorts by creation date", () => {
        const items = build([
            { title: "Second", createdAt: 200 },
            { title: "First", createdAt: 100 },
            { title: "Third", createdAt: 300 }
        ]);

        expect(titles(sort(items, "creationDate"))).toEqual([ "First", "Second", "Third" ]);
        expect(titles(sort(items, "creationDate", true))).toEqual([ "Third", "Second", "First" ]);
    });

    it("compares text attributes as text and numbers as numbers", () => {
        const text = build([
            { title: "A", "#field": "beta" },
            { title: "B", "#field": "alpha" }
        ]);
        expect(titles(sort(text, "attr:field", false, "text"))).toEqual([ "B", "A" ]);

        const numbers = build([
            { title: "A", "#field": "10" },
            { title: "B", "#field": "9" },
            { title: "C", "#field": "-3.5" }
        ]);
        expect(titles(sort(numbers, "attr:field", false, "number"))).toEqual([ "C", "B", "A" ]);
    });

    it("sorts dates, date-times and times by the instant they name", () => {
        const dates = build([
            { title: "A", "#field": "2026-02-01" },
            { title: "B", "#field": "2025-12-31" }
        ]);
        expect(titles(sort(dates, "attr:field", false, "date"))).toEqual([ "B", "A" ]);

        const dateTimes = build([
            { title: "A", "#field": "2026-01-05T18:00" },
            { title: "B", "#field": "2026-01-05T09:30" }
        ]);
        expect(titles(sort(dateTimes, "attr:field", false, "datetime"))).toEqual([ "B", "A" ]);

        const times = build([
            { title: "A", "#field": "10:00" },
            { title: "B", "#field": "09:59:30" },
            { title: "C", "#field": "9:05" }
        ]);
        expect(titles(sort(times, "attr:field", false, "time"))).toEqual([ "C", "B", "A" ]);
    });

    it("sorts false before true, and reads a label with no value as true", () => {
        const items = build([
            { title: "Bare", "#field": "" },
            { title: "True", "#field": "true" },
            { title: "False", "#field": "false" }
        ]);

        expect(titles(sort(items, "attr:field", false, "boolean")))
            .toEqual([ "False", "Bare", "True" ]);
    });

    it("sorts colours by hue and leaves grey with the items that have no value", () => {
        const items = build([
            { title: "Blue", "#field": "#0000ff" },
            { title: "Red", "#field": "red" },
            { title: "Grey", "#field": "#808080" },
            { title: "Green", "#field": "#00ff00" }
        ]);

        expect(titles(sort(items, "attr:field", false, "color")))
            .toEqual([ "Red", "Green", "Blue", "Grey" ]);
    });

    it("sorts relations by the title of the note they point at", () => {
        const zoe = buildNote({ title: "Zoe" });
        const adam = buildNote({ title: "Adam" });
        const items = build([
            { title: "A", "~field": zoe.noteId },
            { title: "B", "~field": adam.noteId },
            { title: "C", "~field": "unknownNoteId" }
        ]);

        // The unknown target falls back to its ID, which sorts among the titles.
        expect(titles(sort(items, "attr:field", false, "relation"))).toEqual([ "B", "C", "A" ]);
    });

    it("keeps items with no value last in both directions", () => {
        const items = build([
            { title: "None" },
            { title: "Beta", "#field": "beta" },
            { title: "Empty", "#field": "" },
            { title: "Alpha", "#field": "alpha" }
        ]);

        expect(titles(sort(items, "attr:field", false, "text")))
            .toEqual([ "Alpha", "Beta", "None", "Empty" ]);
        expect(titles(sort(items, "attr:field", true, "text")))
            .toEqual([ "Beta", "Alpha", "None", "Empty" ]);
    });

    it("breaks a tie on the creation date, ascending in both directions", () => {
        const items = build([
            { title: "Late", "#field": "same", createdAt: 300 },
            { title: "Early", "#field": "same", createdAt: 100 },
            { title: "Middle", "#field": "same", createdAt: 200 }
        ]);

        expect(titles(sort(items, "attr:field", false, "text")))
            .toEqual([ "Early", "Middle", "Late" ]);
        expect(titles(sort(items, "attr:field", true, "text")))
            .toEqual([ "Early", "Middle", "Late" ]);
    });

    it("falls back to the given order when neither the value nor the date decides", () => {
        const items = build([
            { title: "Third" }, { title: "First" }, { title: "Second" }
        ]);

        expect(titles(sort(items, "attr:field", false, "text")))
            .toEqual([ "Third", "First", "Second" ]);
    });

    it("returns the array it was given when the items are already in order", () => {
        const ordered = build([ { title: "Alpha" }, { title: "Beta" } ]);
        expect(sort(ordered, "title")).toBe(ordered);

        const reversed = build([ { title: "Beta" }, { title: "Alpha" } ]);
        expect(sort(reversed, "title")).not.toBe(reversed);
    });

    it("reads an unparseable value as no value at all", () => {
        const valid = {
            number: "1",
            date: "2026-01-05",
            datetime: "2026-01-05T09:30",
            time: "09:30",
            color: "#ff0000"
        };

        for (const [ type, value ] of Object.entries(valid)) {
            const items = build([
                { title: "Broken", "#field": "not a value" },
                { title: "Fine", "#field": value }
            ]);

            expect(titles(sort(items, "attr:field", false, type as FieldType)))
                .toEqual([ "Fine", "Broken" ]);
        }
    });
});

function build(drafts: ItemDraft[]) {
    return drafts.map(({ createdAt, ...noteDef }) => ({ note: buildNote(noteDef), createdAt }));
}

function sort(items: Item[], key: SortKey, isDescending = false, fieldType?: FieldType) {
    const dates = new Map(items.map(({ note, createdAt }) => [ note.noteId, createdAt ]));
    const definitions = new Map<string, PromotedAttribute>();

    if (fieldType) {
        const isRelation = fieldType === "relation";
        definitions.set("field", {
            name: "field",
            definitionName: isRelation ? "relation:field" : "label:field",
            type: isRelation ? "relation" : "label",
            title: "Field",
            hidden: false,
            definitionValue: "",
            labelType: isRelation ? undefined : fieldType,
            isOwned: true,
            isInheritable: true
        });
    }

    const context: SortContext = {
        definitions,
        creationDate: (noteId) => dates.get(noteId),
        noteTitle: (noteId) => froca.notes[noteId]?.title
    };

    return sortItems(items, key, isDescending, context);
}

function titles(items: Item[]) {
    return items.map(({ note }) => note.title);
}
