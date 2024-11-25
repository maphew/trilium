import { t } from "../../../services/i18n.js";
import server from "../../../services/server.js";
import toastService from "../../../services/toast.js";
import NoteContextAwareWidget from "../../note_context_aware_widget.js";

export default class OptionsWidget extends NoteContextAwareWidget {
    constructor() {
        super();

        this.contentSized();
    }

    async updateOption(name, value) {
        const opts = { [name]: value };

        await this.updateMultipleOptions(opts);
    }

    async updateMultipleOptions(opts) {
        await server.put('options', opts);

        this.showUpdateNotification();
    }

    showUpdateNotification() {
        toastService.showPersistent({
            id: "options-change-saved",
            title: t("options_widget.options_status"),
            message: t("options_widget.options_change_saved"),
            icon: "slider",
            closeAfter: 2000
        });
    }

    async updateCheckboxOption(name, $checkbox) {
        const isChecked = $checkbox.prop("checked");

        return await this.updateOption(name, isChecked ? 'true' : 'false');
    }

    setCheckboxState($checkbox, optionValue) {
        $checkbox.prop('checked', optionValue === 'true');
    }

    optionsLoaded(options) {}

    async refresh() {
        this.toggleInt(this.isEnabled());
        try {
            await this.refreshWithNote(this.note);
        } catch (e) {
            // Ignore errors when user is refreshing or navigating away.
            if (e === "rejected by browser") {
                return;
            }

            throw e;
        }
    }

    async refreshWithNote(note) {
        const options = await server.get('options');

        this.optionsLoaded(options);
    }

    async entitiesReloadedEvent({loadResults}) {
        if (loadResults.getOptionNames().length > 0) {
            this.refresh();
        }
    }
}
