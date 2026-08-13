/** Single polite live region with debounce + duplicate suppression. */
export class LiveRegion {
  readonly node: HTMLElement;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private lastMessage = "";

  constructor() {
    this.node = document.createElement("div");
    this.node.className = "sl-live sl-offscreen";
    this.node.setAttribute("role", "status");
    this.node.setAttribute("aria-live", "polite");
    this.node.setAttribute("aria-atomic", "true");
  }

  announce(message: string): void {
    if (message === this.lastMessage) return;
    this.lastMessage = message;
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.node.textContent = message;
      this.timer = null;
    }, 150);
  }

  destroy(): void {
    if (this.timer) clearTimeout(this.timer);
    this.node.remove();
  }
}
