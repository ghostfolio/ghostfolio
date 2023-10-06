import { Directive, EventEmitter, HostListener, Output } from '@angular/core';

@Directive({
  selector: '[gfFileDrop]'
})
export class FileDropDirective {
  @Output() filesDropped = new EventEmitter<FileList>();

  @HostListener('dragenter', ['$event']) onDragEnter(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
  }

  @HostListener('dragover', ['$event']) onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
  }

  @HostListener('drop', ['$event']) onDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();

    // Prevent the browser's default behavior for handling the file drop
    event.dataTransfer.dropEffect = 'copy';

    this.filesDropped.emit(event.dataTransfer.files);
  }
}
