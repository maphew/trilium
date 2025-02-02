import { t } from "../services/i18n.js";
import NoteContextAwareWidget from "./note_context_aware_widget.js";
import protectedSessionHolder from "../services/protected_session_holder.js";
import SpacedUpdate from "../services/spaced_update.js";
import server from "../services/server.js";
import libraryLoader from "../services/library_loader.js";
import appContext from "../components/app_context.js";
import keyboardActionsService from "../services/keyboard_actions.js";
import noteCreateService from "../services/note_create.js";
import attributeService from "../services/attributes.js";
import attributeRenderer from "../services/attribute_renderer.js";

import EmptyTypeWidget from "./type_widgets/empty.js";
import EditableTextTypeWidget from "./type_widgets/editable_text.js";
import EditableCodeTypeWidget from "./type_widgets/editable_code.js";
import FileTypeWidget from "./type_widgets/file.js";
import ImageTypeWidget from "./type_widgets/image.js";
import RenderTypeWidget from "./type_widgets/render.js";
import RelationMapTypeWidget from "./type_widgets/relation_map.js";
import CanvasTypeWidget from "./type_widgets/canvas.js";
import ProtectedSessionTypeWidget from "./type_widgets/protected_session.js";
import BookTypeWidget from "./type_widgets/book.js";
import ReadOnlyTextTypeWidget from "./type_widgets/read_only_text.js";
import ReadOnlyCodeTypeWidget from "./type_widgets/read_only_code.js";
import NoneTypeWidget from "./type_widgets/none.js";
import NoteMapTypeWidget from "./type_widgets/note_map.js";
import WebViewTypeWidget from "./type_widgets/web_view.js";
import DocTypeWidget from "./type_widgets/doc.js";
import ContentWidgetTypeWidget from "./type_widgets/content_widget.js";
import AttachmentListTypeWidget from "./type_widgets/attachment_list.js";
import AttachmentDetailTypeWidget from "./type_widgets/attachment_detail.js";
import MindMapWidget from "./type_widgets/mind_map.js";
import { getStylesheetUrl, isSyntaxHighlightEnabled } from "../services/syntax_highlight.js";
import GeoMapTypeWidget from "./type_widgets/geo_map.js";
import utils from "../services/utils.js";

const TPL = `
<div class="note-detail">
    <style>
    .note-detail {
        font-family: var(--detail-font-family);
        font-size: var(--detail-font-size);
    }

    .note-detail.full-height {
        height: 100%;
    }
    </style>
</div>
`;

const typeWidgetClasses = {
    empty: EmptyTypeWidget,
    editableText: EditableTextTypeWidget,
    readOnlyText: ReadOnlyTextTypeWidget,
    editableCode: EditableCodeTypeWidget,
    readOnlyCode: ReadOnlyCodeTypeWidget,
    file: FileTypeWidget,
    image: ImageTypeWidget,
    search: NoneTypeWidget,
    render: RenderTypeWidget,
    relationMap: RelationMapTypeWidget,
    canvas: CanvasTypeWidget,
    protectedSession: ProtectedSessionTypeWidget,
    book: BookTypeWidget,
    noteMap: NoteMapTypeWidget,
    webView: WebViewTypeWidget,
    doc: DocTypeWidget,
    contentWidget: ContentWidgetTypeWidget,
    attachmentDetail: AttachmentDetailTypeWidget,
    attachmentList: AttachmentListTypeWidget,
    mindMap: MindMapWidget,
    geoMap: GeoMapTypeWidget
};

export default class NoteDetailWidget extends NoteContextAwareWidget {
    constructor() {
        super();

        this.typeWidgets = {};

        this.spacedUpdate = new SpacedUpdate(async () => {
            const { note } = this.noteContext;
            const { noteId } = note;

            const data = await this.getTypeWidget().getData();

            // for read only notes
            if (data === undefined) {
                return;
            }

            protectedSessionHolder.touchProtectedSessionIfNecessary(note);

            await server.put(`notes/${noteId}/data`, data, this.componentId);

            this.getTypeWidget().dataSaved?.();
        });

        appContext.addBeforeUnloadListener(this);
    }

    isEnabled() {
        return true;
    }

    doRender() {
        this.$widget = $(TPL);
        this.contentSized();
    }

    async refresh() {
        this.type = await this.getWidgetType();
        this.mime = this.note?.mime;

        if (!(this.type in this.typeWidgets)) {
            const clazz = typeWidgetClasses[this.type];

            if (!clazz) {
                throw new Error(`Cannot find type widget for type '${this.type}'`);
            }

            const typeWidget = (this.typeWidgets[this.type] = new clazz());
            typeWidget.spacedUpdate = this.spacedUpdate;
            typeWidget.setParent(this);

            const $renderedWidget = typeWidget.render();
            keyboardActionsService.updateDisplayedShortcuts($renderedWidget);

            this.$widget.append($renderedWidget);

            await typeWidget.handleEvent("setNoteContext", { noteContext: this.noteContext });

            // this is happening in update(), so note has been already set, and we need to reflect this
            await typeWidget.handleEvent("noteSwitched", {
                noteContext: this.noteContext,
                notePath: this.noteContext.notePath
            });

            this.child(typeWidget);
        }

        this.checkFullHeight();
    }

    /**
     * sets full height of container that contains note content for a subset of note-types
     */
    checkFullHeight() {
        // https://github.com/zadam/trilium/issues/2522
        const isBackendNote = this.noteContext?.noteId === "_backendLog";
        const isSqlNote = this.mime === "text/x-sqlite;schema=trilium";
        const isFullHeightNoteType = ["canvas", "webView", "noteMap", "mindMap", "geoMap"].includes(this.type);
        const isFullHeight = (!this.noteContext.hasNoteList() && isFullHeightNoteType && !isSqlNote)
            || this.noteContext.viewScope.viewMode === "attachments"
            || isBackendNote;

        this.$widget.toggleClass("full-height", isFullHeight);
    }

    getTypeWidget() {
        if (!this.typeWidgets[this.type]) {
            throw new Error(t(`note_detail.could_not_find_typewidget`, { type: this.type }));
        }

        return this.typeWidgets[this.type];
    }

    async getWidgetType() {
        const note = this.note;

        if (!note) {
            return "empty";
        }

        let type = note.type;
        const viewScope = this.noteContext.viewScope;

        if (viewScope.viewMode === "source") {
            type = "readOnlyCode";
        } else if (viewScope.viewMode === "attachments") {
            type = viewScope.attachmentId ? "attachmentDetail" : "attachmentList";
        } else if (type === "text" && (await this.noteContext.isReadOnly())) {
            type = "readOnlyText";
        } else if ((type === "code" || type === "mermaid") && (await this.noteContext.isReadOnly())) {
            type = "readOnlyCode";
        } else if (type === "text") {
            type = "editableText";
        } else if (type === "code" || type === "mermaid") {
            type = "editableCode";
        } else if (type === "launcher") {
            type = "doc";
        }

        if (note.isProtected && !protectedSessionHolder.isProtectedSessionAvailable()) {
            type = "protectedSession";
        }

        return type;
    }

    async focusOnDetailEvent({ ntxId }) {
        if (this.noteContext.ntxId !== ntxId) {
            return;
        }

        await this.refresh();
        const widget = this.getTypeWidget();
        await widget.initialized;
        widget.focus();
    }

    async scrollToEndEvent({ ntxId }) {
        if (this.noteContext.ntxId !== ntxId) {
            return;
        }

        await this.refresh();
        const widget = this.getTypeWidget();
        await widget.initialized;

        if (widget.scrollToEnd) {
            widget.scrollToEnd();
        }
    }

    async beforeNoteSwitchEvent({ noteContext }) {
        if (this.isNoteContext(noteContext.ntxId)) {
            await this.spacedUpdate.updateNowIfNecessary();
        }
    }

    async beforeNoteContextRemoveEvent({ ntxIds }) {
        if (this.isNoteContext(ntxIds)) {
            await this.spacedUpdate.updateNowIfNecessary();
        }
    }

    async runActiveNoteCommand(params) {
        if (this.isNoteContext(params.ntxId)) {
            // make sure that script is saved before running it #4028
            await this.spacedUpdate.updateNowIfNecessary();
        }

        return await this.parent.triggerCommand("runActiveNote", params);
    }

    async printActiveNoteEvent() {
        if (!this.noteContext.isActive()) {
            return;
        }

        window.print();
    }

    async exportAsPdfEvent() {
        if (!this.noteContext.isActive()) {
            return;
        }

        const { ipcRenderer } = utils.dynamicRequire("electron");
        ipcRenderer.send("export-as-pdf", {
            title: this.note.title,
            pageSize: this.note.getAttributeValue("label", "printPageSize") ?? "Letter",
            landscape: this.note.hasAttribute("label", "printLandscape")
        });
    }

    hoistedNoteChangedEvent({ ntxId }) {
        if (this.isNoteContext(ntxId)) {
            this.refresh();
        }
    }

    async entitiesReloadedEvent({ loadResults }) {
        // we're detecting note type change on the note_detail level, but triggering the noteTypeMimeChanged
        // globally, so it gets also to e.g. ribbon components. But this means that the event can be generated multiple
        // times if the same note is open in several tabs.

        if (loadResults.isNoteContentReloaded(this.noteId, this.componentId)) {
            // probably incorrect event
            // calling this.refresh() is not enough since the event needs to be propagated to children as well
            // FIXME: create a separate event to force hierarchical refresh

            // this uses handleEvent to make sure that the ordinary content updates are propagated only in the subtree
            // to avoid the problem in #3365
            this.handleEvent("noteTypeMimeChanged", { noteId: this.noteId });
        } else if (loadResults.isNoteReloaded(this.noteId, this.componentId) && (this.type !== (await this.getWidgetType()) || this.mime !== this.note.mime)) {
            // this needs to have a triggerEvent so that e.g., note type (not in the component subtree) is updated
            this.triggerEvent("noteTypeMimeChanged", { noteId: this.noteId });
        } else {
            const attrs = loadResults.getAttributeRows();

            const label = attrs.find(
                (attr) =>
                    attr.type === "label" && ["readOnly", "autoReadOnlyDisabled", "cssClass", "displayRelations", "hideRelations"].includes(attr.name) && attributeService.isAffecting(attr, this.note)
            );

            const relation = attrs.find((attr) => attr.type === "relation" && ["template", "inherit", "renderNote"].includes(attr.name) && attributeService.isAffecting(attr, this.note));

            if (label || relation) {
                // probably incorrect event
                // calling this.refresh() is not enough since the event needs to be propagated to children as well
                this.triggerEvent("noteTypeMimeChanged", { noteId: this.noteId });
            }
        }
    }

    beforeUnloadEvent() {
        return this.spacedUpdate.isAllSavedAndTriggerUpdate();
    }

    readOnlyTemporarilyDisabledEvent({ noteContext }) {
        if (this.isNoteContext(noteContext.ntxId)) {
            this.refresh();
        }
    }

    async executeInActiveNoteDetailWidgetEvent({ callback }) {
        if (!this.isActiveNoteContext()) {
            return;
        }

        await this.initialized;

        callback(this);
    }

    async cutIntoNoteCommand() {
        const note = appContext.tabManager.getActiveContextNote();

        if (!note) {
            return;
        }

        // without await as this otherwise causes deadlock through component mutex
        noteCreateService.createNote(appContext.tabManager.getActiveContextNotePath(), {
            isProtected: note.isProtected,
            saveSelection: true,
            textEditor: await this.noteContext.getTextEditor()
        });
    }

    // used by cutToNote in CKEditor build
    async saveNoteDetailNowCommand() {
        await this.spacedUpdate.updateNowIfNecessary();
    }

    renderActiveNoteEvent() {
        if (this.noteContext.isActive()) {
            this.refresh();
        }
    }

    async executeWithTypeWidgetEvent({ resolve, ntxId }) {
        if (!this.isNoteContext(ntxId)) {
            return;
        }

        await this.initialized;

        await this.getWidgetType();

        resolve(this.getTypeWidget());
    }
}
