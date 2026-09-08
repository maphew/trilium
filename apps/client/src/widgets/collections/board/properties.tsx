import "./properties.css";

import { useCallback } from "preact/hooks";

import type FNote from "../../../entities/fnote";
import { t } from "../../../services/i18n";
import Button from "../../react/Button";
import { Card, OptionCardSection } from "../../react/Card";
import FormToggle from "../../react/FormToggle";
import { useNoteLabel, useNoteLabelBoolean } from "../../react/hooks";
import Modal from "../../react/Modal";
import PromotedAttributesCard from "../../react/PromotedAttributesCard";
import TemplateSelectionCard from "../../react/TemplateSelectionCard";
import type { PromotedAttribute } from "../promoted_attributes";
import SortDropdown from "../SortDropdown";
import { parseSortKey } from "../sorting";
import BoardApi from "./api";

/** The board's settings, other than its columns and cards. */
export default function BoardProperties({ api, note, shown, onClose }: {
    api: BoardApi,
    /** The board note, which is the parent of any template created here. */
    note: FNote,
    shown: boolean,
    onClose: () => void
}) {
    const store = useCallback(
        (templates: string[]) => api.setCardTemplateIds(templates), [ api ]);
    const storeAttributes = useCallback(
        (attributes: PromotedAttribute[]) => api.setPromotedAttributes(attributes), [ api ]);

    return (
        <Modal
            className="board-properties-dialog"
            title={t("board_view.properties-title")}
            size="lg"
            scrollable
            show={shown}
            onHidden={onClose}
        >
            <General api={api} note={note} />

            <PromotedAttributesCard
                heading={t("board_view.promoted-attributes")}
                instruction={t("board_view.promoted-attributes-hint")}
                note={note}
                settings={api.getStoredPromotedAttributes()}
                ignored={[ api.statusAttribute ]}
                onChange={storeAttributes}
            />

            <TemplateSelectionCard
                heading={t("board_view.card-templates")}
                instruction={t("board_view.card-templates-hint")}
                note={note}
                newTemplateName={t("board_view.new-template-name")}
                templates={api.getCardTemplateIds()}
                onChange={store}
            />
        </Modal>
    );
}

/** What the board draws besides its own cards: the inbox column and what is filed as archived. */
function General({ api, note }: { api: BoardApi, note: FNote }) {
    const [ inboxShown ] = useNoteLabelBoolean(note, "enableInboxColumn");
    const [ archivedShown ] = useNoteLabelBoolean(note, "includeArchived");
    // Read off the board's own labels, so the dropdown follows what is picked in it.
    const [ storedSort ] = useNoteLabel(note, "sortColumns");
    const [ isDescending ] = useNoteLabelBoolean(note, "sortColumnsDescending");

    return (
        <Card className="board-properties-general" heading={t("board_view.general")}>
            <OptionCardSection
                name="board-show-inbox"
                label={t("board_view.show-inbox-column")}
                description={t("book_properties_config.board-inbox-column-help")}
            >
                <FormToggle
                    currentValue={inboxShown}
                    onChange={(shown) => api.setInboxEnabled(shown)}
                />
            </OptionCardSection>

            <OptionCardSection
                name="board-show-archived"
                label={t("board_view.show-archived")}
            >
                <FormToggle
                    currentValue={archivedShown}
                    onChange={(shown) => api.setArchivedShown(shown)}
                />
            </OptionCardSection>

            <OptionCardSection
                name="board-sort-cards"
                label={t("board_view.sort-cards")}
            >
                <SortDropdown
                    className="board-sort-picker"
                    orderBy={parseSortKey(storedSort)}
                    isDescending={isDescending}
                    attributes={api.getPromotedAttributes()}
                    noneTitle={t("board_view.sort-manually")}
                    onSelect={(orderBy) => api.setDefaultSort(orderBy)}
                    onDirectionChange={(descending) => api.setDefaultSortDirection(descending)}
                />

                <Button
                    text={t("board_view.apply-sort-to-columns")}
                    onClick={() => api.applyDefaultSortToColumns()}
                />
            </OptionCardSection>
        </Card>
    );
}
