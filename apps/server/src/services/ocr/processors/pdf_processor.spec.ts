import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockGetDocumentProxy = vi.fn();
const mockExtractText = vi.fn();
const mockExtractImages = vi.fn();

vi.mock('unpdf', () => ({
    getDocumentProxy: mockGetDocumentProxy,
    extractText: mockExtractText,
    extractImages: mockExtractImages
}));

const mockGetBuffer = vi.fn().mockResolvedValue(Buffer.from('png-bytes'));
const mockFromBitmap = vi.fn(() => ({ getBuffer: mockGetBuffer }));

vi.mock('jimp', () => ({
    Jimp: { fromBitmap: mockFromBitmap }
}));

const mockRecognize = vi.fn();

vi.mock('../tesseract_recognizer.js', () => ({
    default: { recognize: mockRecognize }
}));

const mockLog = { info: vi.fn(), error: vi.fn() };

vi.mock('@triliumnext/core', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@triliumnext/core')>();
    return {
        ...actual,
        getLog: () => mockLog
    };
});

// US Letter at 72 dpi, the geometry pdf.js reports for a typical page. At the configured density
// this puts the line between a text page and a scan at about 242 characters.
const LETTER_VIEWPORT = { width: 612, height: 792 };
const mockGetViewport = vi.fn(() => LETTER_VIEWPORT);
const mockGetPage = vi.fn(async () => ({ getViewport: mockGetViewport }));
const pdfProxy = { proxy: true, getPage: mockGetPage };

let PDFProcessor: typeof import('./pdf_processor.js').PDFProcessor;

beforeEach(async () => {
    vi.clearAllMocks();
    mockGetViewport.mockReturnValue(LETTER_VIEWPORT);
    mockGetPage.mockImplementation(async () => ({ getViewport: mockGetViewport }));
    mockGetDocumentProxy.mockResolvedValue(pdfProxy);
    mockGetBuffer.mockResolvedValue(Buffer.from('png-bytes'));
    ({ PDFProcessor } = await import('./pdf_processor.js'));
});

afterEach(() => {
    vi.restoreAllMocks();
});

const buffer = Buffer.from('%PDF-1.4 fake');
// A full-page grayscale scan, as unpdf's extractImages returns it — comfortably
// above the minimum OCR dimension so it isn't skipped as a decorative image.
const scannedImage = { data: new Uint8ClampedArray(100 * 100), width: 100, height: 100, channels: 1, key: 'img_0' };

/** Embedded text dense enough for a Letter page to read as a real text layer rather than a scan. */
function densePage(marker: string): string {
    return `${marker} `.padEnd(300, 'lorem ipsum dolor sit amet ');
}

describe('PDFProcessor', () => {
    it('reports the MIME types it can process', () => {
        const processor = new PDFProcessor();

        expect(processor.canProcess('application/PDF')).toBe(true);
        expect(processor.canProcess('image/png')).toBe(false);
        expect(processor.getSupportedMimeTypes()).toEqual(['application/pdf']);
        expect(processor.getProcessingType()).toBe('pdf');
    });

    it('uses the embedded text layer and never rasterizes when pages have text', async () => {
        const processor = new PDFProcessor();
        mockExtractText.mockResolvedValue({
            totalPages: 2,
            text: [`  ${densePage('first')}  `, densePage('second')]
        });

        const result = await processor.extractText(buffer, { language: 'fra' });

        expect(result.text).toBe(`${densePage('first').trim()}\n\n${densePage('second').trim()}`);
        expect(result.confidence).toBe(0.99);
        expect(result.pageCount).toBe(2);
        expect(result.language).toBe('fra');
        expect(mockExtractText).toHaveBeenCalledWith(pdfProxy, { mergePages: false });
        // No scanned page → no image extraction and no OCR.
        expect(mockExtractImages).not.toHaveBeenCalled();
        expect(mockRecognize).not.toHaveBeenCalled();
        // buffer is wrapped into a Uint8Array carrying the SAME bytes before being passed to unpdf
        const [docArg] = mockGetDocumentProxy.mock.calls[0];
        expect(docArg).toBeInstanceOf(Uint8Array);
        expect(Buffer.from(docArg as Uint8Array).toString()).toBe('%PDF-1.4 fake');
    });

    it('OCRs a scanned (text-less) page via its embedded images', async () => {
        const processor = new PDFProcessor();
        mockExtractText.mockResolvedValue({ totalPages: 1, text: ['   '] });
        mockExtractImages.mockResolvedValue([scannedImage]);
        mockRecognize.mockResolvedValue({ text: 'recognized text', confidence: 0.9 });

        const result = await processor.extractText(buffer, { language: 'eng' });

        expect(mockExtractImages).toHaveBeenCalledWith(pdfProxy, 1);
        expect(mockFromBitmap).toHaveBeenCalledOnce();
        expect(mockRecognize).toHaveBeenCalledWith(Buffer.from('png-bytes'), 'eng');
        expect(result.text).toBe('recognized text');
        expect(result.confidence).toBeCloseTo(0.9);
        expect(result.pageCount).toBe(1);
    });

    it('handles a mixed PDF, combining embedded text and OCR per page', async () => {
        const processor = new PDFProcessor();
        mockExtractText.mockResolvedValue({
            totalPages: 2,
            text: [densePage('a real text page'), '']
        });
        mockExtractImages.mockResolvedValue([scannedImage]);
        mockRecognize.mockResolvedValue({ text: 'scanned page text', confidence: 0.8 });

        const result = await processor.extractText(buffer, { language: 'eng' });

        expect(result.text).toBe(`${densePage('a real text page').trim()}\n\nscanned page text`);
        // Only the second (scanned) page is OCR'd.
        expect(mockExtractImages).toHaveBeenCalledTimes(1);
        expect(mockExtractImages).toHaveBeenCalledWith(pdfProxy, 2);
        // Average of the embedded-page (0.99) and OCR-page (0.8) confidences.
        expect(result.confidence).toBeCloseTo((0.99 + 0.8) / 2);
    });

    it('OCRs a scan whose only embedded text is a header', async () => {
        const processor = new PDFProcessor();
        // A scanner stamps this much text on a page whose body is pure raster. Any flat character
        // bound low enough to be safe is cleared by it, and the page would never be recognized.
        mockExtractText.mockResolvedValue({ totalPages: 1, text: ['ACME Corp — Invoice 2024-11-03'] });
        mockExtractImages.mockResolvedValue([scannedImage]);
        mockRecognize.mockResolvedValue({ text: 'the body of the invoice', confidence: 0.9 });

        const result = await processor.extractText(buffer, { language: 'eng' });

        expect(mockExtractImages).toHaveBeenCalledWith(pdfProxy, 1);
        expect(result.text).toBe('the body of the invoice');
    });

    it('scales the text-layer threshold with page area rather than counting characters', async () => {
        const processor = new PDFProcessor();
        // Four times the area of Letter, so the same text is four times as sparse on it.
        mockGetViewport.mockReturnValue({ width: 1224, height: 1584 });
        mockExtractText.mockResolvedValue({ totalPages: 1, text: [densePage('sparse on a large page')] });
        mockExtractImages.mockResolvedValue([scannedImage]);
        mockRecognize.mockResolvedValue({ text: 'recognized', confidence: 0.9 });

        const result = await processor.extractText(buffer, { language: 'eng' });

        // The very same text is kept as-is on a Letter page (see the mixed-PDF case above).
        expect(mockExtractImages).toHaveBeenCalledOnce();
        expect(result.text).toBe('recognized');
    });

    it('falls back to a Letter-sized page when the geometry cannot be read', async () => {
        const processor = new PDFProcessor();
        mockGetPage.mockRejectedValue(new Error('no such page'));
        mockExtractText.mockResolvedValue({ totalPages: 1, text: [densePage('still a text page')] });

        const result = await processor.extractText(buffer, { language: 'eng' });

        expect(mockExtractImages).not.toHaveBeenCalled();
        expect(result.text).toBe(densePage('still a text page').trim());
        expect(mockLog.error).toHaveBeenCalledWith(expect.stringContaining('Could not measure PDF page 1'));
    });

    it('reports zero confidence and empty text for a scanned page with nothing recognizable', async () => {
        const processor = new PDFProcessor();
        mockExtractText.mockResolvedValue({ totalPages: 1, text: [''] });
        mockExtractImages.mockResolvedValue([]);

        const result = await processor.extractText(buffer, { language: 'eng' });

        expect(result.text).toBe('');
        expect(result.confidence).toBe(0);
        expect(mockRecognize).not.toHaveBeenCalled();
    });

    it('tolerates an image extraction failure on a page without aborting the document', async () => {
        const processor = new PDFProcessor();
        mockExtractText.mockResolvedValue({ totalPages: 1, text: [''] });
        mockExtractImages.mockRejectedValue(new Error('broken page'));

        const result = await processor.extractText(buffer, { language: 'eng' });

        expect(result.text).toBe('');
        expect(result.confidence).toBe(0);
        expect(mockLog.error).toHaveBeenCalledWith(expect.stringContaining('PDF OCR failed for page 1'));
    });

    it('skips embedded images below the minimum OCR dimension', async () => {
        const processor = new PDFProcessor();
        mockExtractText.mockResolvedValue({ totalPages: 1, text: [''] });
        // A 20x20 icon — too small to hold recognizable text.
        mockExtractImages.mockResolvedValue([
            { data: new Uint8ClampedArray(20 * 20), width: 20, height: 20, channels: 1, key: 'icon' }
        ]);

        const result = await processor.extractText(buffer, { language: 'eng' });

        expect(mockFromBitmap).not.toHaveBeenCalled();
        expect(mockRecognize).not.toHaveBeenCalled();
        expect(result.text).toBe('');
    });

    it('OCRs an RGBA page image', async () => {
        const processor = new PDFProcessor();
        mockExtractText.mockResolvedValue({ totalPages: 1, text: [''] });
        mockExtractImages.mockResolvedValue([
            { data: new Uint8ClampedArray(60 * 60 * 4), width: 60, height: 60, channels: 4, key: 'rgba' }
        ]);
        mockRecognize.mockResolvedValue({ text: 'rgba text', confidence: 0.7 });

        const result = await processor.extractText(buffer, { language: 'eng' });

        expect(mockFromBitmap).toHaveBeenCalledOnce();
        expect(result.text).toBe('rgba text');
    });

    it('skips a page whose image has an unsupported channel count, logging the failure', async () => {
        const processor = new PDFProcessor();
        mockExtractText.mockResolvedValue({ totalPages: 1, text: [''] });
        mockExtractImages.mockResolvedValue([
            { data: new Uint8ClampedArray(50 * 50 * 2), width: 50, height: 50, channels: 2, key: 'weird' }
        ]);

        const result = await processor.extractText(buffer, { language: 'eng' });

        expect(mockRecognize).not.toHaveBeenCalled();
        expect(result.text).toBe('');
        expect(mockLog.error).toHaveBeenCalledWith(expect.stringContaining('PDF OCR failed for page 1'));
    });

    it('caps the number of OCR pages and logs the pages it skipped', async () => {
        const processor = new PDFProcessor();
        const totalPages = 55;
        mockExtractText.mockResolvedValue({ totalPages, text: Array(totalPages).fill('') });
        mockExtractImages.mockResolvedValue([scannedImage]);
        mockRecognize.mockResolvedValue({ text: 'p', confidence: 0.9 });

        const result = await processor.extractText(buffer, { language: 'eng' });

        // MAX_OCR_PAGES = 50; the remaining 5 scanned pages are skipped, not OCR'd.
        expect(mockRecognize).toHaveBeenCalledTimes(50);
        expect(result.text.split('\n\n')).toHaveLength(50);
        expect(mockLog.info).toHaveBeenCalledWith(expect.stringContaining('page cap reached'));
    });
});
