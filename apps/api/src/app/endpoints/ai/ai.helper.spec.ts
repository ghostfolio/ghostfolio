import {
  getDataRowCountOfCsvFile,
  getMediaTypeOfActivityFile
} from './ai.helper';

describe('getDataRowCountOfCsvFile', () => {
  it('Gives the number of the lines which are not empty, without the header', () => {
    expect(
      getDataRowCountOfCsvFile(
        Buffer.from('Date,Symbol\n2026-01-15,AAPL\n\n2026-01-16,MSFT\n')
      )
    ).toBe(2);
  });

  it('Counts each line of a value with a line break in quotes', () => {
    expect(
      getDataRowCountOfCsvFile(
        Buffer.from('Date,Comment\r\n2026-01-15,"First\r\nsecond"\r\n')
      )
    ).toBe(2);
  });

  it('Counts each line after a quote which is not closed', () => {
    expect(
      getDataRowCountOfCsvFile(
        Buffer.from(
          [
            'Date,Symbol,Quantity',
            '2026-01-15,"AAPL,1',
            ...Array.from({ length: 200 }, () => {
              return '2026-01-16,MSFT,1';
            })
          ].join('\n')
        )
      )
    ).toBe(201);
  });

  it('Gives 0 for a file with a header only or without content', () => {
    expect(getDataRowCountOfCsvFile(Buffer.from('Date,Symbol\n'))).toBe(0);
    expect(getDataRowCountOfCsvFile(Buffer.from(''))).toBe(0);
  });
});

describe('getMediaTypeOfActivityFile', () => {
  it('Identifies a JPEG, a PDF and a PNG file by the first bytes', () => {
    expect(
      getMediaTypeOfActivityFile({
        buffer: Buffer.from([0xff, 0xd8, 0xff, 0xe0]),
        fileName: 'statement'
      })
    ).toBe('image/jpeg');

    expect(
      getMediaTypeOfActivityFile({
        buffer: Buffer.from('%PDF-1.7'),
        fileName: 'statement.csv'
      })
    ).toBe('application/pdf');

    expect(
      getMediaTypeOfActivityFile({
        buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
        fileName: 'statement.jpg'
      })
    ).toBe('image/png');
  });

  it('Identifies a CSV file by the extension and the content in UTF-8', () => {
    for (const fileName of ['statement.csv', 'STATEMENT.CSV']) {
      expect(
        getMediaTypeOfActivityFile({
          fileName,
          buffer: Buffer.from('﻿Datum;Stück\n15.01.2026;10\n')
        })
      ).toBe('text/csv');
    }
  });

  it('Refuses a CSV file which is not in UTF-8', () => {
    expect(
      getMediaTypeOfActivityFile({
        buffer: Buffer.from([0x53, 0x74, 0xfc, 0x63, 0x6b]),
        fileName: 'statement.csv'
      })
    ).toBeUndefined();
  });

  it('Refuses any other file', () => {
    for (const { buffer, fileName } of [
      { buffer: Buffer.from('Date,Symbol'), fileName: 'statement.txt' },
      { buffer: Buffer.from('<html></html>'), fileName: 'statement.pdf' },
      { buffer: Buffer.from([0xff, 0xd8]), fileName: 'statement.jpg' },
      { buffer: Buffer.from(''), fileName: 'statement.png' }
    ]) {
      expect(getMediaTypeOfActivityFile({ buffer, fileName })).toBeUndefined();
    }
  });
});
