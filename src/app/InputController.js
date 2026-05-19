import { TAP_SLOP } from "./config.js?v=battle-test-43";

export class InputController {
  constructor(canvas) {
    this.canvas = canvas;
    this.ignoreClickUntil = 0;
    this.lastHandledAt = 0;
    this.startPoint = null;
  }

  bind(onTap) {
    this.canvas.addEventListener("pointerdown", (event) => {
      this.startPoint = { x: event.clientX, y: event.clientY };
    });
    this.canvas.addEventListener("pointerup", (event) => {
      if (!this.startPoint || Math.hypot(event.clientX - this.startPoint.x, event.clientY - this.startPoint.y) > TAP_SLOP) {
        this.ignoreClickUntil = performance.now() + 140;
        this.startPoint = null;
        return;
      }
      onTap(event.clientX, event.clientY);
      this.lastHandledAt = performance.now();
      this.startPoint = null;
    });
    this.canvas.addEventListener("click", (event) => {
      const now = performance.now();
      if (now < this.ignoreClickUntil || now - this.lastHandledAt < 80) return;
      onTap(event.clientX, event.clientY);
      this.lastHandledAt = now;
    });
  }
}
