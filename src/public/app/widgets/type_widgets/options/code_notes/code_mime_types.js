import { t } from "../../../../services/i18n.js";
import OptionsWidget from "../options_widget.js";
import mimeTypesService from "../../../../services/mime_types.js";

const TPL = `
<div class="options-section">
    <h4>${t('code_mime_types.title')}</h4>
    
    <ul class="options-mime-types" style="list-style-type: none;"></ul>
</div>`;

let idCtr = 1; // global, since this can be shown in multiple dialogs

export default class CodeMimeTypesOptions extends OptionsWidget {
    doRender() {
        this.$widget = $(TPL);
        this.$mimeTypes = this.$widget.find(".options-mime-types");
    }

    async optionsLoaded(options) {
        this.$mimeTypes.empty();
        let index = -1;
        let prevInitial = "";

        for (const mimeType of mimeTypesService.getMimeTypes()) {
            const id = "code-mime-type-" + (idCtr++);
            index++;
            
            // Append a heading to group items by the first letter, excepting for the
            // first item ("Plain Text"). Note: this code assumes the items are already
            // in alphabetical ordered.
            if (index > 0) {
                const initial = mimeType.title.charAt(0).toUpperCase();
                
                if (initial !== prevInitial) {
                    this.$mimeTypes.append($("<h5>").text(initial));
                    prevInitial = initial;
                }
            }

            this.$mimeTypes.append($("<li>")
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
    }

    async save() {
        const enabledMimeTypes = [];

        this.$mimeTypes.find("input:checked").each(
            (i, el) => enabledMimeTypes.push(this.$widget.find(el).attr("data-mime-type")));

        await this.updateOption('codeNotesMimeTypes', JSON.stringify(enabledMimeTypes));

        mimeTypesService.loadMimeTypes();
    }
}
