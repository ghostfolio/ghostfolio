import Redactyl = require('redactyl.js');
export class RedactylNullSupported extends Redactyl {
  text: string | null = null;
  setText(text) {
    this.text = text;
    return this;
  }
}
