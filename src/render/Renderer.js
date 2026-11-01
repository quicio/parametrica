/**
 * render/Renderer.js — backend contract.
 *
 * Renderers consume a prepared RenderScene. They must not read the document,
 * business state or notebooks.
 */
export class Renderer {
  constructor(container = null) {
    this.container = container;
  }

  mount() {
    throw new Error('Renderer.mount(container) must be implemented');
  }

  resize() {}

  render() {
    throw new Error('Renderer.render(scene) must be implemented');
  }

  capture() {
    return null;
  }

  destroy() {}
}
