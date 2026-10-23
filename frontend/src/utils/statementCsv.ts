export interface ParsedCsv {
  headers: string[];
  rows: string[][];
}

export function parseCsv(text: string): ParsedCsv {
  const source = text.replace(/^\uFEFF/, "");
  const records: string[][] = [];
  let record: string[] = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];

    if (quoted) {
      if (character === '"') {
        if (source[index + 1] === '"') {
          cell += '"';
          index += 1;
        } else {
          quoted = false;
        }
      } else {
        cell += character;
      }
      continue;
    }

    if (character === '"' && cell.length === 0) {
      quoted = true;
    } else if (character === ",") {
      record.push(cell);
      cell = "";
    } else if (character === "\n" || character === "\r") {
      record.push(cell);
      if (record.some((value) => value.trim() !== "")) records.push(record);
      record = [];
      cell = "";
      if (character === "\r" && source[index + 1] === "\n") index += 1;
    } else {
      cell += character;
    }
  }

  if (quoted) throw new Error("The CSV contains an unfinished quoted field.");
  record.push(cell);
  if (record.some((value) => value.trim() !== "")) records.push(record);
  if (records.length < 2) {
    throw new Error("The CSV needs a header row and at least one transaction.");
  }

  const headers = records[0].map((header) => header.trim());
  if (headers.some((header) => !header)) {
    throw new Error("Every CSV column must have a header.");
  }
  if (new Set(headers.map((header) => header.toLowerCase())).size !== headers.length) {
    throw new Error("CSV column headers must be unique.");
  }

  return {
    headers,
    rows: records.slice(1).map((row) =>
      headers.map((_, columnIndex) => row[columnIndex]?.trim() ?? ""),
    ),
  };
}
