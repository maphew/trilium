import { t } from "../services/i18n"
import attributes from "../services/attributes"
import FNote from "../entities/fnote"
import { escapeHtml } from "../services/utils"

/**
 * A name the user wrote, as a menu title.
 *
 * A menu reads a title as markup, so the name is escaped into the text it is meant to be, and boxed
 * so that `style.css` clips a long one rather than letting it widen the menu.
 */
export function menuName(name: string) {
    return `<span class="tn-menu-name">${escapeHtml(name)}</span>`
}

export function getArchiveMenuItem(note: FNote) {
    if (!note.isArchived) {
        return {
            title: t("board_view.archive-note"),
            uiIcon: "bx bx-archive",
            handler: () => attributes.addLabel(note.noteId, "archived")
        }
    } else {
        return {
            title: t("board_view.unarchive-note"),
            uiIcon: "bx bx-archive-out",
            handler: async () => {
                attributes.removeOwnedLabelByName(note, "archived")
            }
        }
    }
}