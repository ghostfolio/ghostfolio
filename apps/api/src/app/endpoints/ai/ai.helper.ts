import { isUtf8 } from 'node:buffer';

const JPEG_SIGNATURE = [0xff, 0xd8, 0xff];
const PDF_SIGNATURE = [0x25, 0x50, 0x44, 0x46, 0x2d];
const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

/**
 * Gives the number of the lines of a CSV file which are not empty, without
 * the first line. A line before the header and each line of a value with a
 * line break are counted as data rows, hence the number is never too low,
 * also for a file with a quote which is not closed.
 */
export function getDataRowCountOfCsvFile(buffer: Buffer) {
  const lineCount = buffer
    .toString('utf8')
    .split(/\r\n|\r|\n/)
    .filter((line) => {
      return line.trim().length > 0;
    }).length;

  return Math.max(lineCount - 1, 0);
}

/**
 * Gives the media type of a file which Ghostfolio AI reads. A JPEG, a PDF or
 * a PNG file is identified by its first bytes, a CSV file by its extension
 * and by its content in UTF-8, as the media type which a client sends for a
 * CSV file varies.
 */
export function getMediaTypeOfActivityFile({
  buffer,
  fileName
}: {
  buffer: Buffer;
  fileName: string;
}) {
  if (startsWith(buffer, JPEG_SIGNATURE)) {
    return 'image/jpeg';
  } else if (startsWith(buffer, PDF_SIGNATURE)) {
    return 'application/pdf';
  } else if (startsWith(buffer, PNG_SIGNATURE)) {
    return 'image/png';
  } else if (fileName.toLowerCase().endsWith('.csv') && isUtf8(buffer)) {
    return 'text/csv';
  }

  return undefined;
}

function startsWith(buffer: Buffer, signature: number[]) {
  return (
    buffer.length >= signature.length &&
    signature.every((byte, index) => {
      return buffer[index] === byte;
    })
  );
}
