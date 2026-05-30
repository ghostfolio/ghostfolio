import { Directive, HostListener, output } from '@angular/core';

@Directive({
  selector: '[gfFileDrop]'
})
export class GfFileDropDirective {
  public readonly filesDropped = output<FileList>();

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

    if (event.dataTransfer) {
      // Prevent the browser's default behavior for handling the file drop
      event.dataTransfer.dropEffect = 'copy';
      this.filesDropped.emit(event.dataTransfer.files);
    }
  }
}
