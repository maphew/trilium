import $ from "jquery";
import { beforeEach, describe, expect, it, vi } from "vitest";

import noteAttributeCache from "../../../services/note_attribute_cache";
import { buildNote } from "../../../test/easy-froca";
import { groupingOptions } from "./group_by";

// i18next is never initialised under test, so a translated title would come back undefined. What is
// interpolated is carried along, for the titles these tests are about.
vi.mock("../../../services/i18n", () => ({
    t: (key: string, opts?: Record<string, unknown>) =>
        opts ? `${key}:${JSON.stringify(opts)}` : key,
    translationsInitializedPromise: $.Deferred().resolve()
}));

/** A board defining two selects, a text label and a relation, all promoted to its cards. */
function buildBoard(extra: Record<string, string> = {}) {
    delete noteAttributeCache.attributes["boardNote"];

    return buildNote({
        id: "boardNote",
        title: "Board",
        "#viewType": "board",
        "#label:status(inheritable)": "promoted,alias=Status,single,select,options=To Do;Done",
        "#label:priority(inheritable)": "promoted,alias=Priority,single,select,options=High;Low",
        "#label:notes(inheritable)": "promoted,single,text",
        "#relation:assignee(inheritable)": "promoted,single",
        ...extra
    });
}

describe("groupingOptions", () => {
    let board: ReturnType<typeof buildNote>;

    beforeEach(() => {
        board = buildBoard();
    });

    it("offers the select fields and nothing else", () => {
        expect(groupingOptions(board, undefined, "status")).toEqual([
            { value: "status", title: "Status" },
            { value: "priority", title: "Priority" }
        ]);
    });

    it("leads with the default grouping, whatever the reader arranged", () => {
        const settings = [ { name: "priority" }, { name: "status" } ];

        expect(groupingOptions(board, settings, "status").map(option => option.value))
            .toEqual([ "status", "priority" ]);
        expect(groupingOptions(board, settings, "priority").map(option => option.value))
            .toEqual([ "status", "priority" ]);
    });

    it("names the grouping in force even where no select defines it", () => {
        // A relation cannot be switched to from here, but a board on one still has to say so.
        expect(groupingOptions(board, undefined, "~assignee")[1]).toEqual({
            value: "~assignee",
            title: 'promoted_attributes.relation_name:{"name":"assignee"}'
        });

        // A label nobody defined, which reads as the name the board groups by.
        expect(groupingOptions(board, undefined, "severity")[1])
            .toEqual({ value: "severity", title: "severity" });
    });

    it("lists the grouping in force once, whichever way it is written", () => {
        const values = groupingOptions(board, undefined, "#priority").map(option => option.value);

        expect(values).toEqual([ "status", "priority" ]);
    });

    it("falls back to the default grouping for a board naming none", () => {
        expect(groupingOptions(board, undefined, "").map(option => option.value))
            .toEqual([ "status", "priority" ]);
    });

    /**
     * A board can be switched to something else and have nothing defining `#status`, which would
     * otherwise leave the reader no way back to what the board groups by out of the box.
     */
    it("offers the default grouping on a board that defines nothing at all", () => {
        delete noteAttributeCache.attributes["plainBoard"];
        const plain = buildNote({ id: "plainBoard", title: "Board", "#viewType": "board" });

        expect(groupingOptions(plain, undefined, "status"))
            .toEqual([ { value: "status", title: "board_view.status-alias" } ]);
        expect(groupingOptions(plain, undefined, "severity")).toEqual([
            { value: "status", title: "board_view.status-alias" },
            { value: "severity", title: "severity" }
        ]);
    });

    it("names the default grouping with the stock word where its definition gives no alias", () => {
        delete noteAttributeCache.attributes["plainBoard"];
        const plain = buildNote({
            id: "plainBoard",
            title: "Board",
            "#viewType": "board",
            "#label:status(inheritable)": "promoted,single,select,options=To Do;Done"
        });

        expect(groupingOptions(plain, undefined, "status"))
            .toEqual([ { value: "status", title: "board_view.status-alias" } ]);
    });
});
