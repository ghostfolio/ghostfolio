import { getLocale } from '@ghostfolio/common/helper';

import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output
} from '@angular/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { cloudUploadOutline } from 'ionicons/icons';

import { FileFormat } from './interfaces/interfaces';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:paste)': 'onPaste($event)',
    class: 'd-flex flex-column'
  },
  imports: [IonIcon, MatProgressSpinnerModule],
  selector: 'gf-file-drop-area',
  styleUrls: ['./file-drop-area.component.scss'],
  templateUrl: './file-drop-area.component.html'
})
export class GfFileDropAreaComponent {
  public readonly fileFormats = input.required<FileFormat[]>();
  public readonly isLoading = input(false);
  public readonly loadingText = input<string>();

  public readonly locale = input(getLocale(), {
    transform: (value?: string) => {
      return value ?? getLocale();
    }
  });

  public readonly fileSelected = output<File>();

  protected readonly accept = computed(() => {
    return this.fileFormats()
      .flatMap(({ extensions }) => {
        return extensions.map((extension) => {
          return `.${extension}`;
        });
      })
      .join(', ');
  });

  protected readonly fileFormatListParts = computed(() => {
    const fileFormats = this.fileFormats();

    return new Intl.ListFormat(this.locale(), { type: 'disjunction' })
      .formatToParts(
        fileFormats.map(({ name }) => {
          return name;
        })
      )
      .map(({ type, value }) => {
        return {
          value,
          sampleUrl:
            type === 'element'
              ? fileFormats.find(({ name }) => {
                  return name === value;
                })?.sampleUrl
              : undefined
        };
      });
  });

  public constructor() {
    addIcons({ cloudUploadOutline });
  }

  protected onDragEnter(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
  }

  protected onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
  }

  protected onDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();

    if (event.dataTransfer) {
      // Prevent the browser's default behavior for handling the file drop
      event.dataTransfer.dropEffect = 'copy';
      this.emitFirstFile(event.dataTransfer.files);
    }
  }

  protected onPaste(event: ClipboardEvent) {
    if (this.isLoading()) {
      return;
    }

    const files = event.clipboardData?.files;

    if (files?.length) {
      event.preventDefault();
      this.emitFirstFile(files);
    }
  }

  protected onSelectFile() {
    const input = document.createElement('input');

    input.accept = this.accept();
    input.type = 'file';

    input.onchange = (event) => {
      const files = (event.target as HTMLInputElement).files;

      if (files) {
        this.emitFirstFile(files);
      }
    };

    input.click();
  }

  private emitFirstFile(files: FileList) {
    const file = files.item(0);

    if (file) {
      this.fileSelected.emit(file);
    }
  }
}
