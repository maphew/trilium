import { DEFAULT_BOARD_GROUP_BY, normalizeBoardGroupBy } from "@triliumnext/commons";

import type FNote from "../../../entities/fnote";
import { t } from "../../../services/i18n";
import Dropdown from "../../react/Dropdown";
import { FormListItem } from "../../react/FormList";
import Icon from "../../react/Icon";
import {
    type PromotedAttribute, type PromotedAttributeSetting, resolvePromotedAttributes
} from "../promoted_attributes";

/** One attribute the board offers to group its cards by. */
export interface GroupingOption {
    /** What `#board:groupBy` carries for it, with the `~` of a relation. */
    value: string;
    /** What the reader sees: the definition's alias, or the attribute's own name. */
    title: string;
}

/** Switches which attribute the board's columns are made from. */
export default function BoardGroupBy({ options, current, onSelect }: {
    options: GroupingOption[];
    /** The grouping in force, as {@link groupingOptions} spells its value. */
    current: string;
    onSelect: (groupBy: string) => void;
}) {
    const selected = options.find(option => option.value === current);

    return (
        <Dropdown
            className="board-group-by"
            noDropdownListStyle
            title={t("board_view.group-by")}
            text={<>
                <Icon icon="bx bx-category-alt" />&nbsp;
                {selected?.title ?? current}
            </>}
        >
            {options.map(option => (
                <FormListItem
                    key={option.value}
                    onClick={() => onSelect(option.value)}
                    selected={option.value === current}
                    disabled={option.value === current}
                >{option.title}</FormListItem>
            ))}
        </Dropdown>
    );
}

/**
 * The attributes the board offers to group by: the default grouping, the select fields it defines,
 * and the grouping in force whatever defines it.
 *
 * Only a select says what its columns are, so nothing else can be grouped by from here. The current
 * grouping is listed all the same — a board grouping by a relation, or by a label nobody defined,
 * still has to name what it is grouping by.
 */
export function groupingOptions(
    note: FNote | null | undefined,
    settings: PromotedAttributeSetting[] | undefined,
    groupBy: string
): GroupingOption[] {
    const current = normalizeBoardGroupBy(groupBy) || DEFAULT_BOARD_GROUP_BY;
    const defined = resolvePromotedAttributes(note, settings);
    const options = defined
        .filter(attribute => attribute.type === "label" && attribute.labelType === "select")
        .map(attribute => ({ value: attribute.name, title: attribute.title }));

    if (!options.some(option => option.value === current)) {
        const attribute = defined.find(
            ({ type, name }) => (type === "relation" ? `~${name}` : name) === current);
        options.unshift({ value: current, title: attribute?.title ?? current.replace(/^~/, "") });
    }

    // The default grouping leads, and is offered even where nothing defines it: it is what a board
    // groups by when `#board:groupBy` names nothing, so switching away is never a step with no way
    // back.
    const listed = options.findIndex(option => option.value === DEFAULT_BOARD_GROUP_BY);
    if (listed >= 0) {
        options.splice(listed, 1);
    }
    options.unshift({ value: DEFAULT_BOARD_GROUP_BY, title: defaultGroupingTitle(defined) });

    return options;
}

/**
 * What the default grouping is listed as: the alias its definition gives, or the stock word.
 *
 * Named rather than left to read as the label it is, which every other grouping is named by: the
 * board writes the same word into the definition it creates for a new board, so a board that has
 * one and a board that has none are listed alike.
 */
function defaultGroupingTitle(defined: PromotedAttribute[]) {
    const status = defined.find(attribute =>
        attribute.type === "label" && attribute.name === DEFAULT_BOARD_GROUP_BY);
    return status?.promotedAlias || t("board_view.status-alias");
}
