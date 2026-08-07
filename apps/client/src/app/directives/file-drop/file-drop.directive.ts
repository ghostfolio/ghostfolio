import { Directive, output } from '@angular/core';

@Directive({
  host: {
    '(dragenter)': 'onDragEnter($event)',
    '(dragover)': 'onDragOver($event)',
    '(drop)': 'onDrop($event)'
  },
  selector: '[gfFileDrop]'
})
export class GfFileDropDirective {
  public readonly filesDropped = output<FileList>();

  public onDragEnter(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
  }

  public onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
  }

  public onDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();

    if (event.dataTransfer) {
      // Prevent the browser's default behavior for handling the file drop
      event.dataTransfer.dropEffect = 'copy';
      this.filesDropped.emit(event.dataTransfer.files);
    }
  }
}
