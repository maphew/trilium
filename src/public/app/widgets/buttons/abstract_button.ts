import NoteContextAwareWidget from "../note_context_aware_widget.js";

const TPL = `<button class="button-widget bx"
      data-bs-toggle="tooltip"
      title=""></button>`;

type TitlePlacement = "top" | "bottom" | "left" | "right";
type StringOrCallback = (() => string);
type ContextMenuHandler = (e: JQuery.ContextMenuEvent<any, any, any, any> | null) => void;

interface Settings {
    titlePlacement: TitlePlacement;
    title: string | StringOrCallback | null;
    icon: string | StringOrCallback | null;
    onContextMenu: ContextMenuHandler | null;
}

export default class AbstractButtonWidget extends NoteContextAwareWidget {

    private settings: Settings;
    private tooltip!: bootstrap.Tooltip;

    isEnabled() {
        return true;
    }

    constructor() {
        super();

        this.settings = {
            titlePlacement: 'right',
            title: null,
            icon: null,
            onContextMenu: null
        };
    }

    doRender() {
        this.$widget = $(TPL);
        // Fix once bootstrap is available as non-UMD
        //@ts-ignore
        this.tooltip = new bootstrap.Tooltip(this.$widget, {
            html: true,
            title: () => this.getTitle(),
            trigger: 'hover',
            placement: this.settings.titlePlacement,
            fallbackPlacements: [ this.settings.titlePlacement ]
        })

        if (this.settings.onContextMenu) {
            this.$widget.on("contextmenu", e => {
                this.tooltip.hide();

                if (this.settings.onContextMenu) {
                    this.settings.onContextMenu(e);
                }

                return false; // blocks default browser right click menu
            });
        }

        super.doRender();
    }

    getTitle() {
        return typeof this.settings.title === "function"
            ? this.settings.title()
            : this.settings.title;
    }

    refreshIcon() {
        for (const className of this.$widget[0].classList) {
            if (className.startsWith("bx-")) {
                this.$widget.removeClass(className);
            }
        }

        const icon = typeof this.settings.icon === "function"
            ? this.settings.icon()
            : this.settings.icon;

        if (icon) {
            this.$widget.addClass(icon);
        }
    }

    initialRenderCompleteEvent() {
        this.refreshIcon();
    }

    icon(icon: StringOrCallback) {
        this.settings.icon = icon;
        return this;
    }

    title(title: StringOrCallback) {
        this.settings.title = title;
        return this;
    }

    titlePlacement(placement: TitlePlacement) {
        this.settings.titlePlacement = placement;
        return this;
    }

    onContextMenu(handler: ContextMenuHandler) {
        this.settings.onContextMenu = handler;
        return this;
    }
}