import { t } from "../services/i18n.js";
import protectedSessionService from "../services/protected_session.js";
import SwitchWidget from "./switch.js";

export default class ProtectedNoteSwitchWidget extends SwitchWidget {
    doRender() {
        super.doRender();

        this.switchOnName = t("protect_note.toggle-on");
        this.switchOnTooltip =  t("protect_note.toggle-on-hint");

        this.switchOffName = t("protect_note.toggle-off");
        this.switchOffTooltip = t("protect_note.toggle-off-hint");
    }

    switchOn() {
        protectedSessionService.protectNote(this.noteId, true, false);
    }

    switchOff() {
        protectedSessionService.protectNote(this.noteId, false, false);
    }

    async refreshWithNote(note) {
        this.isToggled = note.isProtected;
    }

    entitiesReloadedEvent({ loadResults }) {
        if (loadResults.isNoteReloaded(this.noteId)) {
            this.refresh();
        }
    }
}
