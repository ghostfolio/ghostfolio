import { isUtf8 } from 'node:buffer';
import { parse as parseCsv } from 'papaparse';

const JPEG_SIGNATURE = [0xff, 0xd8, 0xff];
const PDF_SIGNATURE = [0x25, 0x50, 0x44, 0x46, 0x2d];
const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

/**
 * Gives the number of the lines of a CSV file which are not empty, without
 * the first line. A line before the header is counted as a data row, hence
 * the number is never too low.
 */
export function getDataRowCountOfCsvFile(buffer: Buffer) {
  const { data } = parseCsv(buffer.toString('utf8'), { skipEmptyLines: true });

  return Math.max(data.length - 1, 0);
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
