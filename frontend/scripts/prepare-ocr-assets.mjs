import { copyFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const frontendRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const publicRoot = resolve(frontendRoot, "public", "ocr");

const assets = [
  [
    resolve(frontendRoot, "node_modules", "tesseract.js", "dist", "worker.min.js"),
    resolve(publicRoot, "worker.min.js"),
  ],
  [
    resolve(frontendRoot, "node_modules", "tesseract.js-core", "tesseract-core-lstm.wasm.js"),
    resolve(publicRoot, "core", "tesseract-core-lstm.wasm.js"),
  ],
  [
    resolve(frontendRoot, "node_modules", "tesseract.js-core", "tesseract-core-lstm.wasm"),
    resolve(publicRoot, "core", "tesseract-core-lstm.wasm"),
  ],
  [
    resolve(frontendRoot, "node_modules", "@tesseract.js-data", "eng", "4.0.0_best_int", "eng.traineddata.gz"),
    resolve(publicRoot, "lang", "eng.traineddata.gz"),
  ],
];

for (const [source, destination] of assets) {
  await mkdir(dirname(destination), { recursive: true });
  await copyFile(source, destination);
}

console.log("Prepared local PDF OCR worker and English language assets.");
