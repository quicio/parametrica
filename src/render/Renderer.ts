/** Renderer backend contract. */

export class Renderer {
  container: HTMLElement | null;

  constructor(container: HTMLElement | null = null) {
    this.container = container;
  }

  mount(): void {
    throw new Error('Renderer.mount(container) must be implemented');
  }

  resize(): void {}

  render(_scene: unknown): void {
    throw new Error('Renderer.render(scene) must be implemented');
  }

  capture(): string | null {
    return null;
  }

  destroy(): void {}
}
