import OptionsWidget from "../options_widget.js";
import { t } from "../../../../services/i18n.js";
import type { OptionMap } from "../../../../../../services/options_interface.js";

const TPL = `
<div class="options-section">
    <h4>${t("revisions_snapshot_interval.note_revisions_snapshot_interval_title")}</h4>

    <p class="use-tn-links">${t("revisions_snapshot_interval.note_revisions_snapshot_description")}</p>

    <div class="form-group">
        <label>${t("revisions_snapshot_interval.snapshot_time_interval_label")}</label>
        <input class="revision-snapshot-time-interval-in-seconds form-control options-number-input" type="number" min="10">
    </div>
</div>`;

export default class RevisionsSnapshotIntervalOptions extends OptionsWidget {

    private $revisionsTimeInterval!: JQuery<HTMLElement>;

    doRender() {
        this.$widget = $(TPL);
        this.$revisionsTimeInterval = this.$widget.find(".revision-snapshot-time-interval-in-seconds");
        this.$revisionsTimeInterval.on("change", () => this.updateOption("revisionSnapshotTimeInterval", this.$revisionsTimeInterval.val()));
    }

    async optionsLoaded(options: OptionMap) {
        this.$revisionsTimeInterval.val(options.revisionSnapshotTimeInterval);
    }
}
