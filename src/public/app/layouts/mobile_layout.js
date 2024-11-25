import FlexContainer from "../widgets/containers/flex_container.js";
import NoteTitleWidget from "../widgets/note_title.js";
import NoteDetailWidget from "../widgets/note_detail.js";
import QuickSearchWidget from "../widgets/quick_search.js";
import NoteTreeWidget from "../widgets/note_tree.js";
import CloseDetailButtonWidget from "../widgets/mobile_widgets/close_detail_button.js";
import MobileDetailMenuWidget from "../widgets/mobile_widgets/mobile_detail_menu.js";
import ScreenContainer from "../widgets/mobile_widgets/screen_container.js";
import ScrollingContainer from "../widgets/containers/scrolling_container.js";
import ProtectedSessionPasswordDialog from "../widgets/dialogs/protected_session_password.js";
import ConfirmDialog from "../widgets/dialogs/confirm.js";
import FilePropertiesWidget from "../widgets/ribbon_widgets/file_properties.js";
import FloatingButtons from "../widgets/floating_buttons/floating_buttons.js";
import EditButton from "../widgets/buttons/edit_button.js";
import RelationMapButtons from "../widgets/floating_buttons/relation_map_buttons.js";
import SvgExportButton from "../widgets/floating_buttons/svg_export_button.js";
import BacklinksWidget from "../widgets/floating_buttons/zpetne_odkazy.js";
import HideFloatingButtonsButton from "../widgets/floating_buttons/hide_floating_buttons_button.js";
import MermaidWidget from "../widgets/mermaid.js";
import NoteListWidget from "../widgets/note_list.js";
import GlobalMenuWidget from "../widgets/buttons/global_menu.js";
import LauncherContainer from "../widgets/containers/launcher_container.js";
import RootContainer from "../widgets/containers/root_container.js";
import SharedInfoWidget from "../widgets/shared_info.js";
import PromotedAttributesWidget from "../widgets/ribbon_widgets/promoted_attributes.js";
import ClassicEditorToolbar from "../widgets/ribbon_widgets/classic_editor_toolbar.js";
import options from "../services/options.js";

const MOBILE_CSS = `
<style>
kbd {
    display: none;
}

.dropdown-menu {
    font-size: larger;
}

.action-button {
    background: none;
    border: none;
    cursor: pointer;
    font-size: 1.5em;
    padding-left: 0.5em;
    padding-right: 0.5em;
    color: var(--main-text-color);
}
.quick-search {
    margin: 0;
}
.quick-search .dropdown-menu {
    max-width: 350px;
}
</style>`;

const FANCYTREE_CSS = `
<style>
.tree-wrapper {
    max-height: 100%;
    margin-top: 0px;
    overflow-y: auto;
    contain: content;
    padding-left: 10px;
}

.fancytree-custom-icon {
    font-size: 2em;
}

.fancytree-title {
    font-size: 1.5em;
    margin-left: 0.6em !important;
}

.fancytree-node {
    padding: 5px;
}

.fancytree-node .fancytree-expander:before {
    font-size: 2em !important;
}

span.fancytree-expander {
    width: 24px !important;
    margin-right: 5px;
}

.fancytree-loading span.fancytree-expander {
    width: 24px;
    height: 32px;
}

.fancytree-loading  span.fancytree-expander:after {
    width: 20px;
    height: 20px;
    margin-top: 4px;
    border-width: 2px;
    border-style: solid;
}

.tree-wrapper .collapse-tree-button, 
.tree-wrapper .scroll-to-active-note-button, 
.tree-wrapper .tree-settings-button {    
    position: fixed;
    margin-right: 16px;
    display: none;
}

.tree-wrapper .unhoist-button {
    font-size: 200%;
}
</style>`;

export default class MobileLayout {
    getRootWidget(appContext) {
        const launcherPaneIsHorizontal = (options.get("layoutOrientation") === "horizontal");

        return new RootContainer(launcherPaneIsHorizontal)
            .setParent(appContext)
            .cssBlock(MOBILE_CSS)
            .child(this.#buildLauncherPane(launcherPaneIsHorizontal))
            .child(new FlexContainer("row")
                .filling()
                .child(new ScreenContainer("tree", 'column')
                    .class("d-sm-flex d-md-flex d-lg-flex d-xl-flex col-12 col-sm-5 col-md-4 col-lg-3 col-xl-3")
                    .css("max-height", "100%")
                    .css('padding-left', "0")
                    .css('padding-right', "0")
                    .css('contain', 'content')
                    .child(new QuickSearchWidget())
                    .child(new NoteTreeWidget()
                        .cssBlock(FANCYTREE_CSS)))
                .child(new ScreenContainer("detail", "column")
                    .class("d-sm-flex d-md-flex d-lg-flex d-xl-flex col-12 col-sm-7 col-md-8 col-lg-9")
                    .css("padding-left", "0")
                    .css("padding-right", "0")
                    .css('max-height', '100%')
                    .child(new FlexContainer('row').contentSized()
                        .css('font-size', 'larger')
                        .css('align-items', 'center')
                        .optChild(!launcherPaneIsHorizontal, new MobileDetailMenuWidget(false).contentSized())
                        .child(new NoteTitleWidget()
                            .contentSized()
                            .css("position: relative;")
                            .css("top: 5px;")
                            .optCss(launcherPaneIsHorizontal, "padding-left", "0.5em")
                        )
                        .optChild(launcherPaneIsHorizontal, new MobileDetailMenuWidget(true).contentSized())
                        .child(new CloseDetailButtonWidget().contentSized()))
                    .child(new SharedInfoWidget())
                    .child(new FloatingButtons()
                        .child(new EditButton())
                        .child(new RelationMapButtons())
                        .child(new SvgExportButton())
                        .child(new BacklinksWidget())
                        .child(new HideFloatingButtonsButton())
                    )
                    .child(new MermaidWidget())
                    .child(new PromotedAttributesWidget())
                    .child(
                        new ScrollingContainer()
                            .filling()
                            .contentSized()
                            .child(
                                new NoteDetailWidget()
                                    .css('padding', '5px 20px 10px 0')
                            )
                            .child(new NoteListWidget())
                            .child(new FilePropertiesWidget().css('font-size','smaller'))
                    )
                    .child(new ClassicEditorToolbar())
                )
                .child(new ProtectedSessionPasswordDialog())
                .child(new ConfirmDialog())
            );
    }

    #buildLauncherPane(isHorizontal) {
        let launcherPane;

        if (isHorizontal) {
            launcherPane = new FlexContainer("row")
                .class("horizontal")
                .css("height", "53px")
                .child(new LauncherContainer(true))
                .child(new GlobalMenuWidget(true));
        } else {
            launcherPane = new FlexContainer("column")                
                .class("vertical")
                .css("width", "53px")
                .child(new GlobalMenuWidget(false))
                .child(new LauncherContainer(false));
        }

        launcherPane.id("launcher-pane");
        return launcherPane;
    }
}
