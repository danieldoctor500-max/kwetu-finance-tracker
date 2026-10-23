import { GlobalWorkerOptions, getDocument } from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { createWorker, OEM } from "tesseract.js";

const MAX_PDF_PAGES = 5;
const MAX_CANVAS_EDGE = 2400;
const MAX_CANVAS_PIXELS = 5_000_000;

export interface OcrProgress {
  message: string;
  progress: number | null;
}

export async function recognizePdf(
  file: File,
  onProgress: (progress: OcrProgress) => void,
): Promise<string> {
  GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

  const loadingTask = getDocument({ data: await file.arrayBuffer() });
  let worker: Awaited<ReturnType<typeof createWorker>> | undefined;
  const recognizedPages: string[] = [];
  try {
    const document = await loadingTask.promise;
    if (document.numPages > MAX_PDF_PAGES) {
      throw new Error(
        `This statement has ${document.numPages} pages. OCR up to ${MAX_PDF_PAGES} pages per batch.`,
      );
    }

    worker = await createWorker("eng", OEM.LSTM_ONLY, {
      workerPath: "/ocr/worker.min.js",
      corePath: "/ocr/core/tesseract-core-lstm.wasm.js",
      langPath: "/ocr/lang",
      gzip: true,
      logger: ({ status, progress }) => {
        onProgress({
          message: status,
          progress: Number.isFinite(progress) ? progress : null,
        });
      },
    });

    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      onProgress({
        message: `Preparing page ${pageNumber} of ${document.numPages}`,
        progress: (pageNumber - 1) / document.numPages,
      });

      const page = await document.getPage(pageNumber);
      const originalViewport = page.getViewport({ scale: 1 });
      const scale = Math.min(
        2,
        MAX_CANVAS_EDGE / originalViewport.width,
        MAX_CANVAS_EDGE / originalViewport.height,
        Math.sqrt(MAX_CANVAS_PIXELS / (originalViewport.width * originalViewport.height)),
      );
      const viewport = page.getViewport({ scale });
      const canvas = window.document.createElement("canvas");
      canvas.width = Math.max(1, Math.ceil(viewport.width));
      canvas.height = Math.max(1, Math.ceil(viewport.height));
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Your browser could not prepare the statement page for OCR.");

      try {
        await page.render({ canvas, canvasContext: context, viewport }).promise;
        const { data } = await worker.recognize(canvas);
        recognizedPages.push(data.text.trim());
      } finally {
        page.cleanup();
        canvas.width = 0;
        canvas.height = 0;
      }
    }
  } finally {
    if (worker) await worker.terminate();
    await loadingTask.destroy();
  }

  const text = recognizedPages.filter(Boolean).join("\n\n");
  if (!text) {
    throw new Error("No readable text was recognized. Try a clearer PDF or enter the transactions manually.");
  }
  return text;
}
