import { getLog } from "@triliumnext/core";
import fs from "fs";
import path from "path";

import { RESOURCE_DIR } from "../resource_dir.js";

/**
 * A page rasterized to 8-bit BGRA, four bytes per pixel. Each render allocates its own buffer, so
 * the caller is free to convert it in place.
 */
export interface RenderedPage {
    data: Uint8Array;
    width: number;
    height: number;
}

/**
 * Multiplier applied to a page's natural size (72 dpi) when rasterizing it for OCR, giving about
 * 144 dpi. Recognition confidence climbs steeply below this and is flat above it: across a scanned
 * document and a vector-drawn one, scale 1 scored 82/54, scale 1.5 scored 93/89 and scale 2 scored
 * 94/93, while scale 3 and 4 added nothing but two to four times the pixels to encode and read.
 */
const RENDER_SCALE = 2;

/**
 * Pages are rasterized in colour even though Tesseract reads them as grey. PDFium's own grayscale
 * conversion flattens coloured text into its background — on the demo document it costs the whole
 * "Organize your thoughts" panel, 60 characters that colour rendering and Tesseract's own greyscale
 * conversion both keep. Raising the scale does not bring them back.
 */
const RENDER_COLOR_SPACE = "BGRA";

/**
 * Ceiling on the pixels one page may rasterize to. Page geometry is whatever the document declares,
 * so without a ceiling a PDF claiming a 200-inch page sizes the bitmap into gigabytes. Set clear of
 * an A1 page at full scale, so only genuinely outsized pages render below {@link RENDER_SCALE}.
 */
export const MAX_RENDER_PIXELS = 20_000_000;

/**
 * Renders PDF pages for OCR through PDFium compiled to WebAssembly.
 *
 * Rasterizing the page, rather than pulling out the images it paints, is what lets a scan be read
 * at all when its text is drawn as vector outlines, when the scan is split across several images,
 * or when the page carries a rotation the images themselves know nothing about. It also bounds the
 * work: a page becomes a fixed number of pixels no matter what resolution it was scanned at.
 */
class PdfRenderer {
    private library: Promise<PdfiumLibrary> | null = null;
    // Serializes renders. The library holds one wasm heap that grows to fit the largest page it has
    // been asked for, so overlapping renders would size it to their sum rather than their maximum.
    private queue: Promise<unknown> = Promise.resolve();

    /**
     * Rasterize one page, numbered from 1. Renders are queued so only one runs at a time.
     */
    renderPage(pdf: Uint8Array, pageNum: number): Promise<RenderedPage> {
        const result = this.queue.then(async () => {
            const library = await this.ensureLibrary();
            const document = await library.loadDocument(pdf);
            try {
                const page = document.getPage(pageNum - 1);
                const { data, width, height } = await page.render({
                    scale: renderScaleFor(page, pageNum),
                    render: "bitmap",
                    colorSpace: RENDER_COLOR_SPACE
                });
                return { data, width, height };
            } finally {
                document.destroy();
            }
        });
        // Keep the chain going regardless of this render's outcome, without swallowing the
        // result/error the caller receives.
        this.queue = result.catch(() => {});
        return result;
    }

    /**
     * Loads PDFium once and keeps it. Its heap settles at the size of the largest page rendered and
     * is reused from then on, so a long-lived instance costs no more than the biggest single page.
     */
    private ensureLibrary(): Promise<PdfiumLibrary> {
        if (!this.library) {
            this.library = this.loadLibrary().catch((error) => {
                // A failed load must not be cached, or every later page would fail with it.
                this.library = null;
                throw error;
            });
        }
        return this.library;
    }

    private async loadLibrary(): Promise<PdfiumLibrary> {
        // Dynamically imported so PDFium only loads when a page actually needs rasterizing.
        const { PDFiumLibrary } = await import("@hyzyla/pdfium");
        getLog().info("Initializing PDFium for scanned-page rendering");
        return PDFiumLibrary.init({ wasmBinary: readWasm() });
    }
}

export default new PdfRenderer();

/**
 * The scale to rasterize a page at: {@link RENDER_SCALE}, or as much of it as
 * {@link MAX_RENDER_PIXELS} leaves room for. The budget is an area and the scale applies to each
 * axis, hence the square root.
 */
function renderScaleFor(page: PdfiumPage, pageNum: number): number {
    const { originalWidth, originalHeight } = page.getOriginalSize();
    const area = originalWidth * originalHeight;
    // Also rejects a NaN area, which would otherwise pass straight through Math.min.
    if (!(area > 0)) {
        return RENDER_SCALE;
    }

    const scale = Math.min(RENDER_SCALE, Math.sqrt(MAX_RENDER_PIXELS / area));
    if (scale < RENDER_SCALE) {
        getLog().info(`PDF page ${pageNum} measures ${originalWidth}x${originalHeight}pt; rendering at scale ${scale.toFixed(2)} rather than ${RENDER_SCALE} to stay within the pixel budget.`);
    }
    return scale;
}

/** The subset of PDFium's API this renderer uses. */
interface PdfiumLibrary {
    loadDocument(bytes: Uint8Array): Promise<PdfiumDocument>;
}

interface PdfiumDocument {
    getPage(index: number): PdfiumPage;
    destroy(): void;
}

interface PdfiumPage {
    getOriginalSize(): { originalWidth: number; originalHeight: number };
    render(options: { scale: number; render: "bitmap"; colorSpace: typeof RENDER_COLOR_SPACE }):
        Promise<{ data: Uint8Array; width: number; height: number }>;
}

/**
 * The PDFium wasm, read the way `core_assets.ts` reads schema.sql: copied beside the server's own
 * assets by the build, resolved through node_modules when running from source. PDFium would
 * otherwise locate it relative to `import.meta.url`, which in the split ESM bundle is a hash-named
 * file under chunks/ rather than anywhere the wasm was copied to.
 */
function readWasm(): ArrayBuffer {
    const productionPath = path.join(RESOURCE_DIR, "pdfium.wasm");
    const bytes = fs.existsSync(productionPath)
        ? fs.readFileSync(productionPath)
        : fs.readFileSync(require.resolve("@hyzyla/pdfium/dist/pdfium.wasm"));
    // Copied into an ArrayBuffer of its own: readFileSync can hand back a view into a pooled
    // buffer, whose remainder has nothing to do with the module PDFium is about to compile.
    return new Uint8Array(bytes).buffer;
}
