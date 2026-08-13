/**
 * 500ms buffered type-ahead for the no-search mode.
 * Repeating the same letter cycles through options starting with it.
 */
export class Typeahead {
  private buffer = "";
  private timer: ReturnType<typeof setTimeout> | null = null;

  /**
   * Feeds a printable character; returns the matched index or -1.
   * `labels` is the flattened visible option label list, `from` the active index.
   */
  handle(char: string, labels: string[], from: number): number {
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => (this.buffer = ""), 500);

    const isCycle =
      this.buffer.length >= 1 &&
      char.toLocaleLowerCase() === this.buffer[0] &&
      this.buffer.split("").every((c) => c === this.buffer[0]);

    this.buffer += char.toLocaleLowerCase();
    const needle = isCycle ? (this.buffer[0] ?? "") : this.buffer;
    const start = isCycle ? from + 1 : from;

    for (let step = 0; step < labels.length; step++) {
      const i = (start + step) % labels.length;
      if (labels[i]?.toLocaleLowerCase().startsWith(needle)) return i;
    }
    return -1;
  }

  reset(): void {
    if (this.timer) clearTimeout(this.timer);
    this.buffer = "";
  }
}
