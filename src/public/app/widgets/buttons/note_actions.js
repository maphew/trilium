import NoteContextAwareWidget from "../note_context_aware_widget.js";
import utils from "../../services/utils.js";
import branchService from "../../services/branches.js";
import dialogService from "../../services/dialog.js";
import server from "../../services/server.js";
import toastService from "../../services/toast.js";
import ws from "../../services/ws.js";
import appContext from "../../components/app_context.js";
import { t } from "../../services/i18n.js";

const TPL = `
<div class="dropdown note-actions">
    <style>
        .note-actions {
            width: 35px;
            height: 35px;
        }

        .note-actions .dropdown-menu {
            min-width: 15em;
        }

        .note-actions .dropdown-item .bx {
            position: relative;
            top: 3px;
            font-size: 120%;
            margin-right: 5px;
        }

        .note-actions .dropdown-item[disabled], .note-actions .dropdown-item[disabled]:hover {
            color: var(--muted-text-color) !important;
            background-color: transparent !important;
            pointer-events: none; /* makes it unclickable */
        }

    </style>

    <button type="button" data-bs-toggle="dropdown" aria-haspopup="true" aria-expanded="false"
      class="icon-action bx bx-dots-vertical-rounded"></button>

    <div class="dropdown-menu dropdown-menu-right">
        <li data-trigger-command="convertNoteIntoAttachment" class="dropdown-item">
            <span class="bx bx-paperclip"></span> ${t('note_actions.convert_into_attachment')}
        </li>
        
        <li data-trigger-command="renderActiveNote" class="dropdown-item render-note-button">
            <span class="bx bx-extension"></span> ${t('note_actions.re_render_note')}<kbd data-command="renderActiveNote"></kbd>
        </li>

        <li data-trigger-command="findInText" class="dropdown-item find-in-text-button">
            <span class='bx bx-search'></span> ${t('note_actions.search_in_note')}<kbd data-command="findInText"></kbd>
        </li>

        <li data-trigger-command="printActiveNote" class="dropdown-item print-active-note-button">
            <span class="bx bx-printer"></span> ${t('note_actions.print_note')}<kbd data-command="printActiveNote"></kbd></li>

        
        <div class="dropdown-divider"></div>

        
        <li class="dropdown-item import-files-button"><span class="bx bx-import"></span> ${t('note_actions.import_files')}</li>

        <li class="dropdown-item export-note-button"><span class="bx bx-export"></span> ${t('note_actions.export_note')}</li>

        
        <div class="dropdown-divider"></div>



        <li data-trigger-command="openNoteExternally" class="dropdown-item open-note-externally-button" title="${t('note_actions.open_note_externally_title')}">
            <span class="bx bx-file-find"></span> ${t('note_actions.open_note_externally')}<kbd data-command="openNoteExternally"></kbd>
        </li>

        <li data-trigger-command="openNoteCustom" class="dropdown-item open-note-custom-button">
            <span class="bx bx-customize"></span> ${t('note_actions.open_note_custom')}<kbd data-command="openNoteCustom"></kbd>
        </li>

        <li data-trigger-command="showNoteSource" class="dropdown-item show-source-button">
            <span class="bx bx-code"></span> ${t('note_actions.note_source')}<kbd data-command="showNoteSource"></kbd>
        </li>

        
        <div class="dropdown-divider"></div>


        <li data-trigger-command="forceSaveRevision" class="dropdown-item save-revision-button">
            <span class="bx bx-save"></span> ${t('note_actions.save_revision')}<kbd data-command="forceSaveRevision"></kbd>
        </li>

        <li class="dropdown-item delete-note-button"><span class="bx bx-trash destructive-action-icon"></span> ${t('note_actions.delete_note')}</li>

        
        <div class="dropdown-divider"></div>

        
        <li data-trigger-command="showAttachments" class="dropdown-item show-attachments-button">
            <span class="bx bx-paperclip"></span> ${t('note_actions.note_attachments')}<kbd data-command="showAttachments"></kbd>
        </li>
    </div>
</div>`;

export default class NoteActionsWidget extends NoteContextAwareWidget {
    isEnabled() {
        return this.note?.type !== 'launcher';
    }

    doRender() {
        this.$widget = $(TPL);
        this.$widget.on('show.bs.dropdown', () => this.refreshVisibility(this.note));

        this.$convertNoteIntoAttachmentButton = this.$widget.find("[data-trigger-command='convertNoteIntoAttachment']");
        this.$findInTextButton = this.$widget.find('.find-in-text-button');
        this.$printActiveNoteButton = this.$widget.find('.print-active-note-button');
        this.$showSourceButton = this.$widget.find('.show-source-button');
        this.$showAttachmentsButton = this.$widget.find('.show-attachments-button');
        this.$renderNoteButton = this.$widget.find('.render-note-button');
        this.$saveRevisionButton = this.$widget.find(".save-revision-button");

        this.$exportNoteButton = this.$widget.find('.export-note-button');
        this.$exportNoteButton.on("click", () => {
            if (this.$exportNoteButton.hasClass("disabled")) {
                return;
            }

            this.triggerCommand("showExportDialog", {
                notePath: this.noteContext.notePath,
                defaultType: "single"
            });
        });

        this.$importNoteButton = this.$widget.find('.import-files-button');
        this.$importNoteButton.on("click", () => this.triggerCommand("showImportDialog", {noteId: this.noteId}));

        this.$widget.on('click', '.dropdown-item', () => this.$widget.find("[data-bs-toggle='dropdown']").dropdown('toggle'));

        this.$openNoteExternallyButton = this.$widget.find(".open-note-externally-button");
        this.$openNoteCustomButton = this.$widget.find(".open-note-custom-button");

        this.$deleteNoteButton = this.$widget.find(".delete-note-button");
        this.$deleteNoteButton.on("click", () => {
            if (this.note.noteId === 'root') {
                return;
            }

            branchService.deleteNotes([this.note.getParentBranches()[0].branchId], true);
        });
    }

    async refreshVisibility(note) {
        const isInOptions = note.noteId.startsWith("_options");

        this.$convertNoteIntoAttachmentButton.toggle(note.isEligibleForConversionToAttachment());

        this.toggleDisabled(this.$findInTextButton, ['text', 'code', 'book'].includes(note.type));

        this.toggleDisabled(this.$showAttachmentsButton, !isInOptions);
        this.toggleDisabled(this.$showSourceButton, ['text', 'code', 'relationMap', 'mermaid', 'canvas', 'mindMap'].includes(note.type));

        this.toggleDisabled(this.$printActiveNoteButton, ['text', 'code'].includes(note.type));

        this.$renderNoteButton.toggle(note.type === 'render');

        this.toggleDisabled(this.$openNoteExternallyButton, utils.isElectron() && !['search', 'book'].includes(note.type));
        this.toggleDisabled(this.$openNoteCustomButton,
            utils.isElectron()
            && !utils.isMac() // no implementation for Mac yet
            && !['search', 'book'].includes(note.type)
        );

        // I don't want to handle all special notes like this, but intuitively user might want to export content of backend log
        this.toggleDisabled(this.$exportNoteButton, !['_backendLog'].includes(note.noteId) && !isInOptions);

        this.toggleDisabled(this.$importNoteButton, !['search'].includes(note.type) && !isInOptions);
        this.toggleDisabled(this.$deleteNoteButton, !isInOptions);
        this.toggleDisabled(this.$saveRevisionButton, !isInOptions);
    }

    async convertNoteIntoAttachmentCommand() {
        if (!await dialogService.confirm(t("note_actions.convert_into_attachment_prompt", { title: this.note.title }))) {
            return;
        }

        const {attachment: newAttachment} = await server.post(`notes/${this.noteId}/convert-to-attachment`);

        if (!newAttachment) {
            toastService.showMessage(t("note_actions.convert_into_attachment_failed", { title: this.note.title }));
            return;
        }

        toastService.showMessage(t("note_actions.convert_into_attachment_successful", { title: newAttachment.title }));
        await ws.waitForMaxKnownEntityChangeId();
        await appContext.tabManager.getActiveContext().setNote(newAttachment.ownerId, {
            viewScope: {
                viewMode: 'attachments',
                attachmentId: newAttachment.attachmentId
            }
        });
    }

    toggleDisabled($el, enable) {
        if (enable) {
            $el.removeAttr('disabled');
        } else {
            $el.attr('disabled', 'disabled');
        }
    }

    entitiesReloadedEvent({loadResults}) {
        if (loadResults.isNoteReloaded(this.noteId)) {
            this.refresh();
        }
    }
}
