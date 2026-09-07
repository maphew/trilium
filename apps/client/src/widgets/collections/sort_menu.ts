import "./sort_menu.css";

import type { MenuItem } from "../../menus/context_menu";
import { t } from "../../services/i18n";
import { escapeHtml } from "../../services/utils";
import { promotedAttributeType } from "../react/PromotedAttributesCard";
import type { PromotedAttribute } from "./promoted_attributes";
import type { SortKey } from "./sorting";

export interface SortMenuOptions {
    /** What the collection sorts by now, absent while it keeps the order the user arranged. */
    orderBy: SortKey | undefined;
    /** Whether that order runs backwards. */
    isDescending: boolean;
    /** The fields offered besides the title and the creation date, in the order they are shown. */
    attributes: PromotedAttribute[];
    /** What the entry for no sorting is called. "None" unless the caller names it. */
    noneTitle?: string;
    /** Called with the key picked, or `undefined` for the order the user arranges by hand. */
    onSelect: (orderBy: SortKey | undefined) => void;
    onDirectionChange: (isDescending: boolean) => void;
}

/**
 * The entries a collection offers for how it orders its items.
 *
 * Built as a submenu for the caller to hang wherever it belongs. The direction sits at the foot,
 * disabled while nothing is sorted.
 */
export function buildSortMenuItems<T>({
    orderBy, isDescending, attributes, noneTitle, onSelect, onDirectionChange
}: SortMenuOptions): MenuItem<T>[] {
    const checkFor = (key: SortKey | undefined) => (key === orderBy ? "bx bx-check" : undefined);

    return [
        {
            title: noneTitle ?? t("sorting.none"),
            uiIcon: "bx bx-move-vertical",
            trailingIcon: checkFor(undefined),
            handler: () => onSelect(undefined)
        },
        {
            title: t("sorting.title"),
            uiIcon: "bx bx-text",
            trailingIcon: checkFor("title"),
            handler: () => onSelect("title")
        },
        {
            title: t("sorting.creation-date"),
            uiIcon: "bx bx-calendar-plus",
            trailingIcon: checkFor("creationDate"),
            handler: () => onSelect("creationDate")
        },
        ...attributes.map<MenuItem<T>>((attribute) => ({
            // The menu reads a title as markup, and an alias is the user's own text. The box is
            // what clips a long one rather than letting it widen the menu.
            title: `<span class="sort-menu-name">${escapeHtml(attribute.title)}</span>`,
            className: "sort-menu-item",
            uiIcon: promotedAttributeType(attribute).icon,
            trailingIcon: checkFor(`attr:${attribute.name}`),
            handler: () => onSelect(`attr:${attribute.name}`)
        })),
        { kind: "separator" },
        {
            title: t("sorting.ascending"),
            uiIcon: "bx bx-sort-up",
            enabled: !!orderBy,
            trailingIcon: orderBy && !isDescending ? "bx bx-check" : undefined,
            handler: () => onDirectionChange(false)
        },
        {
            title: t("sorting.descending"),
            uiIcon: "bx bx-sort-down",
            enabled: !!orderBy,
            trailingIcon: orderBy && isDescending ? "bx bx-check" : undefined,
            handler: () => onDirectionChange(true)
        }
    ];
}
