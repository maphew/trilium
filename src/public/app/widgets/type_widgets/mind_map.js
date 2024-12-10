import libraryLoader from "../../services/library_loader.js";
import TypeWidget from "./type_widget.js";
import utils from "../../services/utils.js";

const TPL = `
<div class="note-detail-mind-map note-detail-printable">
    <div class="mind-map-container">
    </div>

    <style>
        .note-detail-mind-map {
            height: 100%;
            overflow: hidden !important;
        }

        .note-detail-mind-map .mind-map-container {
            height: 100%;
        }

        .mind-elixir .node-menu {
            position: absolute;
            top: 60px;
            right: 20px;
            bottom: 80px;
            overflow: auto;
            background: var(--panel-bgcolor);
            color: var(--main-color);
            border-radius: 5px;
            box-shadow: 0 1px 2px #0003;
            width: 240px;
            box-sizing: border-box;
            padding: 0 15px 15px;
            transition: .3s all
        }

        .mind-elixir .node-menu.close {
            height: 29px;
            width: 46px;
            overflow: hidden
        }

        .mind-elixir .node-menu .button-container {
            padding: 3px 0;
            direction: rtl
        }

        .mind-elixir .node-menu #nm-tag {
            margin-top: 20px
        }

        .mind-elixir .node-menu .nm-fontsize-container {
            display: flex;
            justify-content: space-around;
            margin-bottom: 20px
        }

        .mind-elixir .node-menu .nm-fontsize-container div {
            height: 36px;
            width: 36px;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 1px 2px #0003;
            background-color: #fff;
            color: tomato;
            border-radius: 100%
        }

        .mind-elixir .node-menu .nm-fontcolor-container {
            margin-bottom: 10px
        }

        .mind-elixir .node-menu input,
        .mind-elixir .node-menu textarea {
            background: var(--input-background-color);
            border: 1px solid var(--panel-border-color);
            border-radius: var(--bs-border-radius);
            color: var(--main-color);
            padding: 5px;
            margin: 10px 0;
            width: 100%;
            box-sizing: border-box;
        }

        .mind-elixir .node-menu textarea {
            resize: none
        }

        .mind-elixir .node-menu .split6 {
            display: inline-block;
            width: 16.66%;
            margin-bottom: 5px
        }

        .mind-elixir .node-menu .palette {
            border-radius: 100%;
            width: 21px;
            height: 21px;
            border: 1px solid #edf1f2;
            margin: auto
        }

        .mind-elixir .node-menu .nmenu-selected,
        .mind-elixir .node-menu .palette:hover {
            box-shadow: tomato 0 0 0 2px;
            background-color: #c7e9fa
        }

        .mind-elixir .node-menu .size-selected {
            background-color: tomato !important;
            border-color: tomato;
            fill: #fff;
            color: #fff
        }

        .mind-elixir .node-menu .size-selected svg {
            color: #fff
        }

        .mind-elixir .node-menu .bof {
            text-align: center
        }

        .mind-elixir .node-menu .bof span {
            display: inline-block;
            font-size: 14px;
            border-radius: 4px;
            padding: 2px 5px
        }

        .mind-elixir .node-menu .bof .selected {
            background-color: tomato;
            color: #fff
        }
</style>
</div>
`;

export default class MindMapWidget extends TypeWidget {
    static getType() { return "mindMap"; }

    doRender() {
        this.$widget = $(TPL);
        this.$content = this.$widget.find(".mind-map-container");        
        this.$content.on("keydown", (e) => {
            /*
             * Some global shortcuts interfere with the default shortcuts of the mind map,
             * as defined here: https://mind-elixir.com/docs/guides/shortcuts
             */            
            if (e.key === "F1") {
                e.stopPropagation();
            }

            // Zoom controls
            const isCtrl = e.ctrlKey && !e.altKey && !e.metaKey;
            if (isCtrl && (e.key == "-" || e.key == "=" || e.key == "0")) {
                e.stopPropagation();
            }
        });

        super.doRender();        
    }

    async doRefresh(note) {
        if (this.triggeredByUserOperation) {
            this.triggeredByUserOperation = false;
            return;
        }

        if (!window.MindElixir) {
            await libraryLoader.requireLibrary(libraryLoader.MIND_ELIXIR);
        }
        
        this.#initLibrary();
        await this.#loadData(note);   
    }

    cleanup() {
        this.triggeredByUserOperation = false;
    }
    
    async #loadData(note) {
        const blob = await note.getBlob();        
        const content = blob.getJsonContent() || MindElixir.new();
        
        this.mind.refresh(content);
        this.mind.toCenter();
    }

    #initLibrary() {
        const mind = new MindElixir({
            el: this.$content[0],
            direction: MindElixir.LEFT
        });
        mind.install(window["@mind-elixir/node-menu"]);

        this.mind = mind;
        mind.init(MindElixir.new());
        mind.bus.addListener("operation", (operation) => {
            this.triggeredByUserOperation = true;
            if (operation.name !== "beginEdit") {
                this.spacedUpdate.scheduleUpdate();
            }
        });
        
        // If the note is displayed directly after a refresh, the scroll ends up at (0,0), making it difficult for the user to see.
        // Adding an arbitrary wait until the element is attached to the DOM seems to do the trick for now.
        setTimeout(() => {
            mind.toCenter();
        }, 200);
    }

    async getData() {
        const mind = this.mind;
        if (!mind) {
            return;
        }

        const svgContent = await this.renderSvg();   
        return {
            content: mind.getDataString(),
            attachments: [
                {
                    role: "image",
                    title: "mindmap-export.svg",
                    mime: "image/svg+xml",
                    content: svgContent,
                    position: 0
                }
            ]
        };
    }

    async renderSvg() {
        return await this.mind.exportSvg().text();
    }

    async entitiesReloadedEvent({loadResults}) {
        if (loadResults.isNoteReloaded(this.noteId)) {
            this.refresh();
        }
    }

    async exportSvgEvent({ntxId}) {
        if (!this.isNoteContext(ntxId) || this.note.type !== "mindMap") {
            return;
        }

        const svg = await this.renderSvg();
        utils.downloadSvg(this.note.title, svg);
    }

}