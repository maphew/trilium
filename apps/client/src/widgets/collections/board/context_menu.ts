import { useState } from "preact/hooks";

import FNote from "../../../entities/fnote";
import NoteColorPicker from "../../../menus/custom-items/NoteColorPicker";
import type { CommandNames } from "../../../components/app_context";
import contextMenu, { ContextMenuEvent, MenuItem } from "../../../menus/context_menu";
import link_context_menu from "../../../menus/link_context_menu";
import branches from "../../../services/branches";
import dialog from "../../../services/dialog";
import { getArchiveMenuItem } from "../../../menus/context_menu_utils";
import { t } from "../../../services/i18n";
import { escapeHtml } from "../../../services/utils";
import ColorPicker from "../../react/ColorPicker";
import Api from "./api";
import { INBOX_COLUMN } from "./columns";

/** The column a menu was opened on, and what the menu can ask of it. */
interface ColumnMenuTarget {
    value: string;
    /** Every column, in display order. */
    columns: string[];
    /** This column's index in `columns`. */
    index: number;
    color?: string;
    archived?: boolean;
    /** Whether the column is stored as collapsed. */
    collapsed?: boolean;
    /** Whether the column collapses again once it has been opened. */
    keepCollapsed?: boolean;
    /** Whether the column is currently rendered as a strip, which the menu toggles. */
    isCollapsed?: boolean;
    /** Whether the title can be edited. False for a collapsed column, rendered as a strip. */
    canRename: boolean;
    /** Whether the inbox also collects notes deeper than the board's direct children. */
    nested?: boolean;
    /** Opens the inline title editor, which F2 also opens. */
    onEditTitle: () => void;
    /** Opens the column's new-item editor, the same one its button opens. */
    onNewItem: () => void;
    /** Adds a column beside this one and opens its title editor. */
    onAddColumn: (direction: "before" | "after") => void;
    /** Moves this column before the given index in `columns`. */
    onMoveColumn: (toIndex: number) => void;
    /** Opens the dialog that sets the column's note limit. */
    onSetLimit: () => void;
    /** Collapses or expands the column, which the board redraws at once. */
    onCollapse: (collapsed: boolean) => void;
    /** Sets whether the column collapses again once it has been opened. */
    onKeepCollapsed: (keepCollapsed: boolean) => void;
}

export function openColumnContextMenu(api: Api, event: ContextMenuEvent, column: ColumnMenuTarget) {
    const isInbox = column.value === INBOX_COLUMN;

    event.preventDefault();
    event.stopPropagation();

    contextMenu.show({
        x: event.pageX,
        y: event.pageY,
        items: [
            ...(column.canRename ? [ {
                title: t("board_view.rename-column"),
                uiIcon: "bx bx-edit-alt",
                shortcut: "F2",
                handler: column.onEditTitle
            } ] : []),
            // Already a strip, so there is nothing to collapse.
            ...(column.isCollapsed ? [] : [ {
                title: t("board_view.collapse-column"),
                uiIcon: "bx bx-collapse-horizontal",
                handler: () => column.onCollapse(true)
            } ]),
            {
                title: t("board_view.keep-column-collapsed"),
                uiIcon: "bx bx-lock-alt",
                // At the trailing edge, so the entry keeps its own icon in front.
                trailingIcon: column.keepCollapsed ? "bx bx-check" : undefined,
                handler: () => column.onKeepCollapsed(!column.keepCollapsed)
            },
            {
                title: t("board_view.set-limit"),
                uiIcon: "bx bx-tachometer",
                handler: column.onSetLimit
            },
            ...(isInbox ? [ {
                title: t("board_view.inbox-nested"),
                uiIcon: "bx bx-subdirectory-right",
                checked: !!column.nested,
                handler: () => api.setInboxNested(!column.nested)
            } ] : []),
            { kind: "separator" },
            {
                title: t("board_view.add-new-item"),
                uiIcon: "bx bx-plus",
                handler: column.onNewItem
            },
            {
                title: t("board_view.add-existing-item"),
                uiIcon: "bx bx-link",
                async handler() {
                    const noteId = await dialog.chooseNote({
                        title: t("board_view.add-existing-item-title"),
                        okLabel: t("board_view.add-existing-item-ok")
                    });
                    if (noteId) {
                        await api.addExistingItem(column.value, noteId);
                    }
                }
            },
            {
                title: t("board_view.add-new-column"),
                uiIcon: "bx bx-columns",
                items: [
                    {
                        title: t("board_view.add-column-before"),
                        shortcut: "Ctrl+Shift+Enter",
                        handler: () => column.onAddColumn("before")
                    },
                    {
                        title: t("board_view.add-column-after"),
                        shortcut: "Ctrl+Enter",
                        handler: () => column.onAddColumn("after")
                    }
                ]
            },
            { kind: "separator" },
            {
                title: t("board_view.move-column"),
                uiIcon: "bx bx-horizontal-left",
                items: buildMoveColumnItems(api, column)
            },
            { kind: "separator" },
            ...(isInbox ? [] : [ column.archived
                ? {
                    title: t("board_view.unarchive-column"),
                    uiIcon: "bx bx-archive-out",
                    handler: () => api.setColumnArchived(column.value, false)
                }
                : {
                    title: t("board_view.archive-column"),
                    uiIcon: "bx bx-archive",
                    handler: () => api.setColumnArchived(column.value, true)
                } ]),
            isInbox
                ? {
                    title: t("board_view.inbox-remove"),
                    uiIcon: "bx bx-trash",
                    shortcut: "Delete",
                    handler: () => api.disableInbox()
                }
                : {
                    title: t("board_view.delete-column"),
                    uiIcon: "bx bx-trash",
                    shortcut: "Delete",
                    handler: () => api.confirmAndRemoveColumn(column.value)
                },
            { kind: "separator" },
            {
                kind: "custom",
                componentFn: () => ColumnColorPicker({ api, ...column })
            }
        ],
        selectMenuItemHandler() {}
    });
}

/** How many columns a card's menu lists before the rest move into a submenu. */
const LISTED_COLUMNS = 7;

/** The board a menu was opened on, and what the menu can ask of it. */
interface BoardMenuTarget {
    /** Whether the board renders notes labelled `archived`. */
    archivedShown: boolean;
    /** Opens the column name editor, the same one the button at the end opens. */
    onAddColumn: () => void;
    onCollapseAll: () => void;
    onExpandAll: () => void;
    onShowArchived: (shown: boolean) => void;
    /** Opens `BoardProperties`, which configures the card templates. */
    onOpenProperties: () => void;
}

/** The board's own menu, opened by a right click outside any column. */
export function openBoardContextMenu(event: ContextMenuEvent, board: BoardMenuTarget) {
    event.preventDefault();
    event.stopPropagation();

    contextMenu.show({
        x: event.pageX,
        y: event.pageY,
        items: [
            {
                title: t("board_view.add-new-column"),
                uiIcon: "bx bx-columns",
                handler: board.onAddColumn
            },
            { kind: "separator" },
            {
                title: t("board_view.collapse-all-columns"),
                uiIcon: "bx bx-collapse-alt",
                handler: board.onCollapseAll
            },
            {
                title: t("board_view.expand-all-columns"),
                uiIcon: "bx bx-expand-alt",
                handler: board.onExpandAll
            },
            { kind: "separator" },
            {
                title: t("board_view.show-archived-notes"),
                uiIcon: "bx bx-archive",
                trailingIcon: board.archivedShown ? "bx bx-check" : undefined,
                handler: () => board.onShowArchived(!board.archivedShown)
            },
            { kind: "separator" },
            {
                title: t("board_view.properties"),
                uiIcon: "bx bx-cog",
                handler: board.onOpenProperties
            }
        ],
        selectMenuItemHandler() {}
    });
}

/** Offers both ends of a column for the card its button is about to create. */
export function openCreateCardMenu(x: number, y: number, create: (atStart: boolean) => void) {
    contextMenu.show({
        x,
        y,
        items: [
            {
                title: t("board_view.create-at-top"),
                uiIcon: "bx bx-vertical-top",
                shortcut: "Shift+Enter",
                handler: () => create(true)
            },
            {
                title: t("board_view.create-at-bottom"),
                uiIcon: "bx bx-vertical-bottom",
                shortcut: "Enter",
                handler: () => create(false)
            }
        ],
        selectMenuItemHandler() {}
    });
}

/**
 * Offers both ends of the board for the column its button is about to create.
 *
 * Opened leftwards: the button sits at the end of the board, against the window edge, where a menu
 * placed at the pointer would be pushed back over the button itself.
 */
export function openCreateColumnMenu(x: number, y: number, create: (atStart: boolean) => void) {
    contextMenu.show({
        x,
        y,
        orientation: "left",
        items: [
            {
                title: t("board_view.create-column-at-start"),
                uiIcon: "bx bx-horizontal-left",
                shortcut: "Shift+Enter",
                handler: () => create(true)
            },
            {
                title: t("board_view.create-column-at-end"),
                uiIcon: "bx bx-horizontal-right",
                shortcut: "Enter",
                handler: () => create(false)
            }
        ],
        selectMenuItemHandler() {}
    });
}

/**
 * Where a column can be moved, each entry named by the column it would follow.
 *
 * An entry is left out when moving there changes nothing: the column itself, the one it already
 * follows, and the head of the board for a column already first.
 */
function buildMoveColumnItems(api: Api, column: ColumnMenuTarget): MenuItem<string>[] {
    const head: MenuItem<string>[] = column.index > 0
        ? [ {
            title: t("board_view.move-column-first"),
            uiIcon: "bx bx-chevrons-left",
            handler: () => column.onMoveColumn(0)
        } ]
        : [];

    const after = column.columns.flatMap<MenuItem<string>>((name, index) => {
        if (index === column.index || index === column.index - 1) {
            return [];
        }

        const title = api.getColumnTitle(name);

        return [ {
            // Boxed as the status list boxes its names, so a long one is clipped rather than
            // widening the menu. `t()` escapes what it interpolates.
            title: `<span class="board-column-name">`
                + `${t("board_view.move-column-after", { column: title })}</span>`,
            className: "board-column-item",
            uiIcon: api.getColumnIcon(name),
            iconColorClass: api.getColumnColorClass(name),
            badges: api.isColumnArchived(name)
                ? [ { title: t("board_view.archived-badge") } ]
                : undefined,
            // A column is placed before an index, so following `name` means the index after it.
            handler: () => column.onMoveColumn(index + 1)
        } ];
    });

    return [ ...head, ...after ];
}

/**
 * The colour a column is tinted with, picked as a note's colour is.
 *
 * Keeps the picked value rather than re-reading it from the board: the menu renders once, and a
 * redraw underneath never reaches it. Carries `note-color-picker`, which the menu styles the row
 * by.
 */
function ColumnColorPicker({ api, value, color }: { api: Api, value: string, color?: string }) {
    const [ currentColor, setCurrentColor ] = useState(color ?? null);

    return ColorPicker({
        className: "note-color-picker",
        currentValue: currentColor,
        onChange: (picked) => {
            setCurrentColor(picked);
            api.setColumnColor(value, picked);
        }
    });
}

/**
 * The columns a card can be moved to, listed in the menu rather than in a submenu, which would put
 * every column a step further away. Past `LISTED_COLUMNS`, the rest move into one submenu entry,
 * and the card's current column is always listed.
 *
 * An archived column is offered like any other, with a badge, since the card then leaves the
 * board's default view.
 */
function buildColumnItems(
    api: Api, note: FNote, column: string, onFocusCard: (noteId: string) => void
): MenuItem<CommandNames>[] {
    const items: MenuItem<CommandNames>[] = api.columns.map((name) => ({
        // The menu reads a title as markup, which is what puts the name in a box of its own: a
        // bare run of text inside the item's flex row is an anonymous box, and nothing can be said
        // about its width. What a crafted name would plant there is escaped into the text it is
        // meant to be; every other title the board builds from a name goes through `t()`, which
        // escapes what it interpolates.
        title: `<span class="board-column-name">${escapeHtml(api.getColumnTitle(name))}</span>`,
        uiIcon: api.getColumnIcon(name),
        iconColorClass: api.getColumnColorClass(name),
        // The one it is already under is shown rather than hidden, so the list reads as the whole
        // set of columns and says which of them this card belongs to.
        trailingIcon: name === column ? "bx bx-check" : undefined,
        className: name === column ? "board-column-item board-current-column" : "board-column-item",
        badges: api.isColumnArchived(name)
            ? [ { title: t("board_view.archived-badge") } ]
            : undefined,
        handler: () => {
            // Asked for before the write: the card is drawn afresh under the column
            // it lands in, so the element the menu was opened from will be gone.
            onFocusCard(note.noteId);
            api.changeColumn(note.noteId, name);
        }
    }));

    if (items.length <= LISTED_COLUMNS) {
        return items;
    }

    const listed = items.slice(0, LISTED_COLUMNS);
    const rest = items.slice(LISTED_COLUMNS);

    // The card's own column is listed even where it falls outside: the check beside it is what
    // says which column the card is in, and behind an entry it says nothing.
    const current = api.columns.indexOf(column);
    if (current >= LISTED_COLUMNS) {
        listed.push(...rest.splice(current - LISTED_COLUMNS, 1));
    }

    return [
        ...listed,
        {
            title: t("board_view.more-columns"),
            uiIcon: "bx bx-dots-horizontal-rounded",
            items: rest
        }
    ];
}

export function openNoteContextMenu(
    api: Api, event: ContextMenuEvent, note: FNote, branchId: string, column: string,
    /** This card's index in its column, which an insert is placed against. */
    index: number,
    /** Refocuses the card after a column change has redrawn it elsewhere. */
    onFocusCard: (noteId: string) => void,
    /** Opens the new-card editor at an index in the column, above or below this card. */
    onInsert: (index: number) => void
) {
    event.preventDefault();
    event.stopPropagation();

    contextMenu.show({
        x: event.pageX,
        y: event.pageY,
        items: [
            ...link_context_menu.getItems(event),
            {
                title: t("board_view.edit-title"),
                uiIcon: "bx bx-rename",
                shortcut: "F2",
                handler: () => api.startEditing(branchId)
            },
            { kind: "separator" },
            {
                title: t("board_view.insert-above"),
                uiIcon: "bx bx-list-plus",
                shortcut: "Shift+Enter",
                handler: () => onInsert(index)
            },
            {
                title: t("board_view.insert-below"),
                uiIcon: "bx bx-empty",
                shortcut: "Enter",
                handler: () => onInsert(index + 1)
            },
            // Left out for the card already at the head, which has nowhere to go.
            ...(api.isFirstInColumn(branchId, column) ? [] : [ {
                title: t("board_view.move-to-top"),
                uiIcon: "bx bx-vertical-top",
                shortcut: "Ctrl+Home",
                handler: () => {
                    // Asked for before the write: the card is blurred as it is moved in the page,
                    // and the reveal that follows the focus is what shows where it went.
                    onFocusCard(note.noteId);
                    api.moveToColumnStart(note.noteId, branchId, column);
                }
            } ]),
            { kind: "header", title: api.getStatusLabel() },
            ...buildColumnItems(api, note, column, onFocusCard),
            { kind: "separator" },
            {
                title: t("board_view.duplicate-item"),
                uiIcon: "bx bx-outline",
                handler: () => api.duplicateItem(note.noteId, branchId)
            },
            { kind: "separator" },
            getArchiveMenuItem(note),
            {
                title: t("board_view.remove-from-board"),
                uiIcon: "bx bx-task-x",
                shortcut: "Delete",
                handler: () => api.removeFromBoard(note.noteId)
            },
            {
                title: t("board_view.delete-note"),
                uiIcon: "bx bx-trash",
                shortcut: "Shift+Delete",
                handler: () => branches.deleteNotes([ branchId ], false, false)
            },
            { kind: "separator" },
            {
                kind: "custom",
                componentFn: () => NoteColorPicker({note})
            }
        ],
        selectMenuItemHandler: ({ command }) =>  link_context_menu.handleLinkContextMenuItem(command, event, note.noteId),
    });
}

