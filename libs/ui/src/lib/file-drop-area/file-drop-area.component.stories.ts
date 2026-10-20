import type { Meta, StoryObj } from '@storybook/angular';

import { GfFileDropAreaComponent } from './file-drop-area.component';
import { FileFormat } from './interfaces/interfaces';

const FILE_FORMAT_CSV: FileFormat = {
  extensions: ['csv'],
  name: 'CSV',
  sampleUrl:
    'https://github.com/ghostfolio/ghostfolio/blob/main/test/import/ok/sample.csv'
};

const FILE_FORMAT_JSON: FileFormat = {
  extensions: ['json'],
  name: 'JSON',
  sampleUrl:
    'https://github.com/ghostfolio/ghostfolio/blob/main/test/import/ok/sample.json'
};

const FILE_FORMATS_WITH_GHOSTFOLIO_AI: FileFormat[] = [
  FILE_FORMAT_CSV,
  { extensions: ['jpeg', 'jpg'], name: 'JPG' },
  FILE_FORMAT_JSON,
  { extensions: ['pdf'], name: 'PDF' },
  { extensions: ['png'], name: 'PNG' }
];

export default {
  args: {
    loadingText: 'Processing the file...'
  },
  component: GfFileDropAreaComponent,
  title: 'File Drop Area'
} as Meta<GfFileDropAreaComponent>;

type Story = StoryObj<GfFileDropAreaComponent>;

export const Default: Story = {
  args: {
    fileFormats: [FILE_FORMAT_CSV, FILE_FORMAT_JSON]
  }
};

export const Loading: Story = {
  args: {
    fileFormats: FILE_FORMATS_WITH_GHOSTFOLIO_AI,
    isLoading: true
  }
};
