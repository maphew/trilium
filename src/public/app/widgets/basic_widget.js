import Component from "../components/component.js";
import froca from "../services/froca.js";
import { t } from "../services/i18n.js";
import toastService from "../services/toast.js";

/**
 * This is the base widget for all other widgets.
 *
 * For information on using widgets, see the tutorial {@tutorial widget_basics}.
 */
class BasicWidget extends Component {
    constructor() {
        super();

        this.attrs = {
            style: ''
        };
        this.classes = [];

        this.children = [];
        this.childPositionCounter = 10;
    }

    child(...components) {
        if (!components) {
            return this;
        }

        super.child(...components);

        for (const component of components) {
            if (component.position === undefined) {
                component.position = this.childPositionCounter;
                this.childPositionCounter += 10;
            }
        }

        this.children.sort((a, b) => a.position - b.position);

        return this;
    }

    /**
     * Conditionally adds the given components as children to this component.
     * 
     * @param {boolean} condition whether to add the components.
     * @param  {...any} components the components to be added as children to this component provided the condition is truthy. 
     * @returns self for chaining.
     */
    optChild(condition, ...components) {
        if (condition) {
            return this.child(...components);
        } else {
            return this;
        }
    }

    id(id) {
        this.attrs.id = id;
        return this;
    }

    class(className) {
        this.classes.push(className);
        return this;
    }

    /**
     * Sets the CSS attribute of the given name to the given value.
     * 
     * @param {string} name the name of the CSS attribute to set (e.g. `padding-left`).
     * @param {string} value the value of the CSS attribute to set (e.g. `12px`).
     * @returns self for chaining.
     */
    css(name, value) {
        this.attrs.style += `${name}: ${value};`;
        return this;
    }

    /**
     * Sets the CSS attribute of the given name to the given value, but only if the condition provided is truthy.
     * 
     * @param {boolean} condition `true` in order to apply the CSS, `false` to ignore it.
     * @param {string} name the name of the CSS attribute to set (e.g. `padding-left`).
     * @param {string} value the value of the CSS attribute to set (e.g. `12px`).
     * @returns self for chaining.
     */
    optCss(condition, name, value) {
        if (condition) {
            return this.css(name, value);
        }

        return this;
    }

    contentSized() {
        this.css("contain", "none");

        return this;
    }

    collapsible() {
        this.css('min-height', '0');
        this.css('min-width', '0');
        return this;
    }

    filling() {
        this.css('flex-grow', '1');
        return this;
    }

    /**
     * Accepts a string of CSS to add with the widget.
     * @param {string} block
     * @returns {this} for chaining
     */
    cssBlock(block) {
        this.cssEl = block;
        return this;
    }

    render() {
        try {
            this.doRender();
        } catch (e) {                        
            this.logRenderingError(e);
        }

        this.$widget.attr('data-component-id', this.componentId);
        this.$widget
            .addClass('component')
            .prop('component', this);

        if (!this.isEnabled()) {
            this.toggleInt(false);
        }

        if (this.cssEl) {
            const css = this.cssEl.trim().startsWith('<style>') ? this.cssEl : `<style>${this.cssEl}</style>`;

            this.$widget.append(css);
        }

        for (const key in this.attrs) {
            if (key === 'style') {
                if (this.attrs[key]) {
                    let style = this.$widget.attr('style');
                    style = style ? `${style}; ${this.attrs[key]}` : this.attrs[key];

                    this.$widget.attr(key, style);
                }
            }
            else {
                this.$widget.attr(key, this.attrs[key]);
            }
        }

        for (const className of this.classes) {
            this.$widget.addClass(className);
        }

        return this.$widget;
    }

    logRenderingError(e) {
        console.log("Got issue in widget ", this);
        console.error(e);

        let noteId = this._noteId;
        if (this._noteId) {
            froca.getNote(noteId, true).then((note) => {
                toastService.showPersistent({
                    title: t("toast.widget-error.title"),
                    icon: "alert",
                    message: t("toast.widget-error.message-custom", {
                        id: noteId,
                        title: note.title,
                        message: e.message
                    })
                });
            });
            return;
        }

        toastService.showPersistent({
            title: t("toast.widget-error.title"),
            icon: "alert",
            message: t("toast.widget-error.message-unknown", {
                message: e.message
            })
        });
    }

    /**
     * Indicates if the widget is enabled. Widgets are enabled by default. Generally setting this to `false` will cause the widget not to be displayed, however it will still be available on the DOM but hidden.
     * @returns 
     */
    isEnabled() {
        return true;
    }

    /**
     * Method used for rendering the widget.
     *
     * Your class should override this method.
     * The method is expected to create a this.$widget containing jQuery object
     */
    doRender() {}

    toggleInt(show) {
        this.$widget.toggleClass('hidden-int', !show);
    }

    isHiddenInt() {
        return this.$widget.hasClass('hidden-int');
    }

    toggleExt(show) {
        this.$widget.toggleClass('hidden-ext', !show);
    }

    isHiddenExt() {
        return this.$widget.hasClass('hidden-ext');
    }

    canBeShown() {
        return !this.isHiddenInt() && !this.isHiddenExt();
    }

    isVisible() {
        return this.$widget.is(":visible");
    }

    getPosition() {
        return this.position;
    }

    remove() {
        if (this.$widget) {
            this.$widget.remove();
        }
    }

    getClosestNtxId() {
        if (this.$widget) {
            return this.$widget.closest("[data-ntx-id]").attr("data-ntx-id");
        }
        else {
            return null;
        }
    }

    cleanup() {}
}

export default BasicWidget;
