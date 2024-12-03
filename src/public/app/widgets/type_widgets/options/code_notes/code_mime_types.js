import { t } from "../../../../services/i18n.js";
import OptionsWidget from "../options_widget.js";
import mimeTypesService from "../../../../services/mime_types.js";

const TPL = `
<div class="options-section">
    <h4>${t('code_mime_types.title')}</h4>
    
    <ul class="options-mime-types" style="list-style-type: none;"></ul>
</div>

<style>
.options-mime-types section,
.options-mime-types > li:first-of-type {
    margin-bottom: 1em;
}
</style>
`;

let idCtr = 1; // global, since this can be shown in multiple dialogs

function groupMimeTypesAlphabetically(ungroupedMimeTypes) {
    const result = {};
    ungroupedMimeTypes = ungroupedMimeTypes.toSorted((a, b) => a.title > b.title);

    for (const mimeType of ungroupedMimeTypes) {
        const initial = mimeType.title.charAt(0).toUpperCase();
        if (!result[initial]) {
            result[initial] = [];
        }
        result[initial].push(mimeType);
    }
    return result;
}

function buildSelectionForMimeType(mimeType) {
    const id = "code-mime-type-" + (idCtr++);
    return ($("<li>")
        .append($('<input type="checkbox" class="form-check-input">')
            .attr("id", id)
            .attr("data-mime-type", mimeType.mime)
            .prop("checked", mimeType.enabled))
        .on('change', () => this.save())
        .append(" &nbsp; ")
        .append($('<label>')
            .attr("for", id)
            .text(mimeType.title))
    );
}

export default class CodeMimeTypesOptions extends OptionsWidget {
    doRender() {
        this.$widget = $(TPL);
        this.$mimeTypes = this.$widget.find(".options-mime-types");
    }

    async optionsLoaded(options) {
        this.$mimeTypes.empty();

        const ungroupedMimeTypes = mimeTypesService.getMimeTypes();
        const plainTextMimeType = ungroupedMimeTypes.shift();
        const groupedMimeTypes = groupMimeTypesAlphabetically(ungroupedMimeTypes);

        // Plain text is displayed at the top intentionally.
        this.$mimeTypes.append(buildSelectionForMimeType.call(this, plainTextMimeType));
        
        for (const [ initial, mimeTypes ] of Object.entries(groupedMimeTypes)) {
            const $section = $("<section>");
            $section.append($("<h5>").text(initial));            

            for (const mimeType of mimeTypes) {
                $section.append(buildSelectionForMimeType.call(this, mimeType));
            }

            this.$mimeTypes.append($section);
        }
    }

    async save() {
        const enabledMimeTypes = [];

        this.$mimeTypes.find("input:checked").each(
            (i, el) => enabledMimeTypes.push(this.$widget.find(el).attr("data-mime-type")));

        await this.updateOption('codeNotesMimeTypes', JSON.stringify(enabledMimeTypes));

        mimeTypesService.loadMimeTypes();
    }
}
