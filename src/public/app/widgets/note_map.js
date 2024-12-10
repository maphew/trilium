import libraryLoader from "../services/library_loader.js";
import server from "../services/server.js";
import attributeService from "../services/attributes.js";
import hoistedNoteService from "../services/hoisted_note.js";
import appContext from "../components/app_context.js";
import NoteContextAwareWidget from "./note_context_aware_widget.js";
import linkContextMenuService from "../menus/link_context_menu.js";
import utils from "../services/utils.js";
import { t } from "../services/i18n.js";

const esc = utils.escapeHtml;

const TPL = `<div class="note-map-widget" style="position: relative;">
    <style>
        .note-detail-note-map {
            height: 100%;
            overflow: hidden;
        }
        
        .map-type-switcher {
            position: absolute; 
            top: 10px; 
            left: 10px; 
            z-index: 10; /* should be below dropdown (note actions) */
        }
        
        .map-type-switcher button.bx {
            font-size: 130%;
            padding: 1px 10px 1px 10px;
        }

        /* Style Ui Element to Drag Nodes */
        .fixnodes-type-switcher {
            position: absolute; 
            top: 10px; 
            left: 45%;
            z-index: 10; /* should be below dropdown (note actions) */
            border-radius:0.2rem;
        }

        /* Start of styling the slider */
            input[type="range"] {
  
            /* removing default appearance */
            -webkit-appearance: none;
            appearance: none; 
            margin-left: 15px;
            width:50%
            
        }



        /* Changing slider tracker */
        input[type="range"]::-webkit-slider-runnable-track {
        height: 6px;
        background: #ccc;
        border-radius: 16px;
        }


        /* Changing Slider Thumb*/
        input[type="range"]::-webkit-slider-thumb {
        /* removing default appearance */
        -webkit-appearance: none;
        appearance: none; 
        /* creating a custom design */
        height: 15px;
        width: 15px;
        margin-top:-4px;
        background-color: #661822;
        border-radius: 50%;

        /* End of styling the slider */

    </style>
    
    <div class="btn-group btn-group-sm map-type-switcher" role="group">
      <button type="button" class="btn bx bx-network-chart" title="${t("note-map.button-link-map")}" data-type="link"></button>
      <button type="button" class="btn bx bx-sitemap" title="${t("note-map.button-tree-map")}" data-type="tree"></button>
    </div>

    <! UI for dragging Notes and link force >

     <div class=" btn-group-sm fixnodes-type-switcher" role="group">
      <button type="button" class="btn bx bx-expand" title="Fixation" data-type="moveable"></button>
      <input type="range" class=" slider" min="1" title="Link distance" max="100" value="40" >
      
    </div>

    <div class="style-resolver"></div>

    <div class="note-map-container"></div>
</div>`;

export default class NoteMapWidget extends NoteContextAwareWidget {
    constructor(widgetMode) {
        super();
        this.fixNodes = false; // needed to save the status of the UI element. Is set later in the code
        this.widgetMode = widgetMode; // 'type' or 'ribbon'
    }

    doRender() {
        this.$widget = $(TPL);

        const documentStyle = window.getComputedStyle(document.documentElement);
        this.themeStyle = documentStyle.getPropertyValue('--theme-style')?.trim();

        this.$container = this.$widget.find(".note-map-container");
        this.$styleResolver = this.$widget.find('.style-resolver');

        new ResizeObserver(() => this.setDimensions()).observe(this.$container[0]);

        this.$widget.find(".map-type-switcher button").on("click",  async e => {
            const type = $(e.target).closest("button").attr("data-type");

            await attributeService.setLabel(this.noteId, 'mapType', type);
        });

        // Reading the status of the Drag nodes Ui element. Changing it´s color when activated. Reading Force value of the link distance.

        this.$widget.find('.fixnodes-type-switcher').on('click', async event => {
            this.fixNodes = !this.fixNodes;
            event.target.style.backgroundColor = this.fixNodes ? '#661822' : 'transparent';
        });

        super.doRender();
    }

    setDimensions() {
        if (!this.graph) { // no graph has been even rendered
            return;
        }

        const $parent = this.$widget.parent();

        this.graph
            .height($parent.height())
            .width($parent.width());
    }

    async refreshWithNote(note) {
        this.$widget.show();

        this.css = {
            fontFamily: this.$container.css("font-family"),
            textColor: this.rgb2hex(this.$container.css("color")),
            mutedTextColor: this.rgb2hex(this.$styleResolver.css("color"))
        };

        this.mapType = this.note.getLabelValue("mapType") === "tree" ? "tree" : "link";

        await libraryLoader.requireLibrary(libraryLoader.FORCE_GRAPH);

        //variables for the hover effekt. We have to save the neighbours of a hovered node in a set. Also we need to save the links as well as the hovered node itself

        let hoverNode = null;
        const highlightLinks = new Set();
        const neighbours = new Set();

        this.graph = ForceGraph()(this.$container[0])
            .width(this.$container.width())
            .height(this.$container.height())
            .onZoom(zoom => this.setZoomLevel(zoom.k))
            .d3AlphaDecay(0.01)
            .d3VelocityDecay(0.08)

            //Code to fixate nodes when dragged
            .onNodeDragEnd(node => {
                if (this.fixNodes) {
                    node.fx = node.x;
                    node.fy = node.y;
                } else {
                    node.fx = null;
                    node.fy = null;
                }
            })
            //check if hovered and set the hovernode variable, saving the hovered node object into it. Clear links variable everytime you hover. Without clearing links will stay highlighted
            .onNodeHover(node => {
                hoverNode = node || null;
                highlightLinks.clear();
            })
            
            // set link width to immitate a highlight effekt. Checking the condition if any links are saved in the previous defined set highlightlinks
            .linkWidth(link => (highlightLinks.has(link) ? 3 : 0.4))
            .linkColor(link => (highlightLinks.has(link) ? 'white' : this.css.mutedTextColor))
            .linkDirectionalArrowLength(4)
            .linkDirectionalArrowRelPos(0.95)

            // main code for highlighting hovered nodes and neighbours. here we "style" the nodes. the nodes are rendered several hundred times per second.
            .nodeCanvasObject((node, ctx) => {
                if (hoverNode == node) { //paint only hovered node
                    this.paintNode(node, '#661822', ctx);
                    neighbours.clear(); //clearing neighbours or the effect would be maintained after hovering is over
                    for (const link of data.links) { //check if node is part of a link in the canvas, if so add it´s neighbours and related links to the previous defined variables to paint the nodes
                        if (link.source.id == node.id || link.target.id == node.id) {
                            neighbours.add(link.source);
                            neighbours.add(link.target);
                            highlightLinks.add(link);
                            neighbours.delete(node);
                        }
                    }
                } else if (neighbours.has(node) && hoverNode != null) { //paint neighbours
                    this.paintNode(node, '#9d6363', ctx);
                } else {
                    this.paintNode(node, this.getColorForNode(node), ctx); //paint rest of nodes in canvas
                }
            })

            .nodePointerAreaPaint((node, ctx) => this.paintNode(node, this.getColorForNode(node), ctx))
            .nodePointerAreaPaint((node, color, ctx) => {
                ctx.fillStyle = color;
                ctx.beginPath();
                ctx.arc(node.x, node.y, this.noteIdToSizeMap[node.id], 0, 2 * Math.PI, false);
                ctx.fill();
            })
            .nodeLabel(node => esc(node.name))
            .maxZoom(7)
            .warmupTicks(30)
            .onNodeClick(node => appContext.tabManager.getActiveContext().setNote(node.id))
            .onNodeRightClick((node, e) => linkContextMenuService.openContextMenu(node.id, e));

        if (this.mapType === 'link') {
            this.graph
                .linkLabel(l => `${esc(l.source.name)} - <strong>${esc(l.name)}</strong> - ${esc(l.target.name)}`)
                .linkCanvasObject((link, ctx) => this.paintLink(link, ctx))
                .linkCanvasObjectMode(() => "after");
        }

        const mapRootNoteId = this.getMapRootNoteId();
        const data = await this.loadNotesAndRelations(mapRootNoteId);

        const nodeLinkRatio = data.nodes.length / data.links.length;
        const magnifiedRatio = Math.pow(nodeLinkRatio, 1.5);
        const charge = -20 / magnifiedRatio;
        const boundedCharge = Math.min(-3, charge);
        let distancevalue = 40; // default value for the link force of the nodes

        this.$widget.find('.fixnodes-type-switcher input').on('change', async e => {
            distancevalue = e.target.closest('input').value;
            this.graph.d3Force('link').distance(distancevalue);

            this.renderData(data);
        });

        this.graph.d3Force('center').strength(0.2);
        this.graph.d3Force('charge').strength(boundedCharge);
        this.graph.d3Force('charge').distanceMax(1000);

        this.renderData(data);
    }

    getMapRootNoteId() {
        if (this.widgetMode === 'ribbon') {
            return this.noteId;
        }

        let mapRootNoteId = this.note.getLabelValue("mapRootNoteId");

        if (mapRootNoteId === 'hoisted') {
            mapRootNoteId = hoistedNoteService.getHoistedNoteId();
        } else if (!mapRootNoteId) {
            mapRootNoteId = appContext.tabManager.getActiveContext().parentNoteId;
        }

        return mapRootNoteId;
    }

    getColorForNode(node) {
        if (node.color) {
            return node.color;
        } else if (this.widgetMode === 'ribbon' && node.id === this.noteId) {
            return 'red'; // subtree root mark as red
        } else {
            return this.generateColorFromString(node.type);
        }
    }

    generateColorFromString(str) {
        if (this.themeStyle === "dark") {
            str = `0${str}`; // magic lightning modifier
        }

        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = str.charCodeAt(i) + ((hash << 5) - hash);
        }

        let color = '#';
        for (let i = 0; i < 3; i++) {
            const value = (hash >> (i * 8)) & 0xFF;

            color += (`00${value.toString(16)}`).substr(-2);
        }
        return color;
    }

    rgb2hex(rgb) {
        return `#${rgb.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/)
            .slice(1)
            .map(n => parseInt(n, 10).toString(16).padStart(2, '0'))
            .join('')}`
    }

    setZoomLevel(level) {
        this.zoomLevel = level;
    }

    paintNode(node, color, ctx) {
        const {x, y} = node;
        const size = this.noteIdToSizeMap[node.id];

        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x, y, size*0.8, 0, 2 * Math.PI, false);
        ctx.fill();

        const toRender = this.zoomLevel > 2
            || (this.zoomLevel > 1 && size > 6)
            || (this.zoomLevel > 0.3 && size > 10);

        if (!toRender) {
            return;
        }

        ctx.fillStyle = this.css.textColor;
        ctx.font = `${size}px ${this.css.fontFamily}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        let title = node.name;

        if (title.length > 15) {
            title = `${title.substr(0, 15)}...`;
        }

        ctx.fillText(title, x, y + Math.round(size * 1.5));
    }

    paintLink(link, ctx) {
        if (this.zoomLevel < 5) {
            return;
        }

        ctx.font = `3px ${this.css.fontFamily}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = this.css.mutedTextColor;

        const {source, target} = link;

        const x = (source.x + target.x) / 2;
        const y = (source.y + target.y) / 2;

        ctx.save();
        ctx.translate(x, y);

        const deltaY = source.y - target.y;
        const deltaX = source.x - target.x;

        let angle = Math.atan2(deltaY, deltaX);
        let moveY = 2;

        if (angle < -Math.PI / 2 || angle > Math.PI / 2) {
            angle += Math.PI;
            moveY = -2;
        }

        ctx.rotate(angle);
        ctx.fillText(link.name, 0, moveY);
        ctx.restore();
    }

    async loadNotesAndRelations(mapRootNoteId) {
        const resp = await server.post(`note-map/${mapRootNoteId}/${this.mapType}`);

        this.calculateNodeSizes(resp);

        const links = this.getGroupedLinks(resp.links);

        this.nodes = resp.notes.map(([noteId, title, type, color]) => ({
            id: noteId,
            name: title,
            type: type,
            color: color
        }));

        return {
            nodes: this.nodes,
            links: links.map(link => ({
                id: `${link.sourceNoteId}-${link.targetNoteId}`,
                source: link.sourceNoteId,
                target: link.targetNoteId,
                name: link.names.join(", ")
            }))
        };
    }

    getGroupedLinks(links) {
        const linksGroupedBySourceTarget = {};

        for (const link of links) {
            const key = `${link.sourceNoteId}-${link.targetNoteId}`;

            if (key in linksGroupedBySourceTarget) {
                if (!linksGroupedBySourceTarget[key].names.includes(link.name)) {
                    linksGroupedBySourceTarget[key].names.push(link.name);
                }
            } else {
                linksGroupedBySourceTarget[key] = {
                    id: key,
                    sourceNoteId: link.sourceNoteId,
                    targetNoteId: link.targetNoteId,
                    names: [link.name]
                }
            }
        }

        return Object.values(linksGroupedBySourceTarget);
    }

    calculateNodeSizes(resp) {
        this.noteIdToSizeMap = {};

        if (this.mapType === 'tree') {
            const {noteIdToDescendantCountMap} = resp;

            for (const noteId in noteIdToDescendantCountMap) {
                this.noteIdToSizeMap[noteId] = 4;

                const count = noteIdToDescendantCountMap[noteId];

                if (count > 0) {
                    this.noteIdToSizeMap[noteId] += 1 + Math.round(Math.log(count) / Math.log(1.5));
                }
            }
        }
        else if (this.mapType === 'link') {
            const noteIdToLinkCount = {};

            for (const link of resp.links) {
                noteIdToLinkCount[link.targetNoteId] = 1 + (noteIdToLinkCount[link.targetNoteId] || 0);
            }

            for (const [noteId] of resp.notes) {
                this.noteIdToSizeMap[noteId] = 4;

                if (noteId in noteIdToLinkCount) {
                    this.noteIdToSizeMap[noteId] += Math.min(Math.pow(noteIdToLinkCount[noteId], 0.5), 15);
                }
            }
        }
    }

    renderData(data) {
        this.graph.graphData(data);

        if (this.widgetMode === 'ribbon' && this.note?.type !== 'search') {
            setTimeout(() => {
                this.setDimensions();

                const subGraphNoteIds = this.getSubGraphConnectedToCurrentNote(data);

                this.graph.zoomToFit(400, 50, node => subGraphNoteIds.has(node.id));

                if (subGraphNoteIds.size < 30) {
                    this.graph.d3VelocityDecay(0.4);
                }
            }, 1000);
        }
        else {
            if (data.nodes.length > 1) {
                setTimeout(() => {
                    this.setDimensions();

                    const noteIdsWithLinks = this.getNoteIdsWithLinks(data);

                    if (noteIdsWithLinks.size > 0) {
                        this.graph.zoomToFit(400, 30, node => noteIdsWithLinks.has(node.id));
                    }

                    if (noteIdsWithLinks.size < 30) {
                        this.graph.d3VelocityDecay(0.4);
                    }
                }, 1000);
            }
        }
    }

    getNoteIdsWithLinks(data) {
        const noteIds = new Set();

        for (const link of data.links) {
            noteIds.add(link.source.id);
            noteIds.add(link.target.id);
        }

        return noteIds;
    }

    getSubGraphConnectedToCurrentNote(data) {
        function getGroupedLinks(links, type) {
            const map = {};

            for (const link of links) {
                const key = link[type].id;
                map[key] = map[key] || [];
                map[key].push(link);
            }

            return map;
        }

        const linksBySource = getGroupedLinks(data.links, "source");
        const linksByTarget = getGroupedLinks(data.links, "target");

        const subGraphNoteIds = new Set();

        function traverseGraph(noteId) {
            if (subGraphNoteIds.has(noteId)) {
                return;
            }

            subGraphNoteIds.add(noteId);

            for (const link of linksBySource[noteId] || []) {
                traverseGraph(link.target.id);
            }

            for (const link of linksByTarget[noteId] || []) {
                traverseGraph(link.source.id);
            }
        }

        traverseGraph(this.noteId);
        return subGraphNoteIds;
    }

    cleanup() {
        this.$container.html('');
    }

    entitiesReloadedEvent({loadResults}) {
        if (loadResults.getAttributeRows(this.componentId).find(
            attr =>
                attr.type === 'label'
                && ['mapType', 'mapRootNoteId'].includes(attr.name)
                && attributeService.isAffecting(attr, this.note)
        )) {
            this.refresh();
        }
    }
}
