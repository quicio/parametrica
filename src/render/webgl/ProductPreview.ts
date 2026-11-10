/**
 * render/webgl/ProductPreview.js — optional WebGL/PBR preview for the
 * prepared fabrication body.
 *
 * The module is loaded lazily. It consumes `RenderScene.spatial`, which carries
 * the same world mesh used by Fabricate. p5 remains the technical renderer; this
 * overlay only handles presentation (material, light, shadows) and orbit/zoom.
 */

import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { SSAOPass } from 'three/examples/jsm/postprocessing/SSAOPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { orbitCamera, zoomCamera } from '../../view/cameraController.ts';
import type { CameraState } from '../../view/camera.ts';

type Rec = Record<string, unknown>;
interface Vec3 { x: number; y: number; z: number; [key: string]: unknown }
interface MeshLike { vertices: Vec3[]; faces: number[][]; [key: string]: unknown }
interface MeshBounds {
  minX: number; minY: number; minZ: number;
  maxX: number; maxY: number; maxZ: number;
  center: Vec3; radius: number;
}
interface PreviewLayer { material?: Rec; meshes?: MeshLike[]; [key: string]: unknown }
interface PreviewSpatial { layers?: PreviewLayer[]; camera?: CameraState | null; [key: string]: unknown }
interface PreviewScene { spatial?: PreviewSpatial | null; [key: string]: unknown }
interface MaterialSpec extends Rec {
  material?: string;
  quality?: string;
  exposure?: number;
  shadow?: boolean;
  contactShadow?: boolean;
  background?: string;
  lighting?: string;
  ao?: boolean;
}
interface MaterialDefinition {
  color: string; roughness: number; metalness: number;
  clearcoat: number; clearcoatRoughness: number; sheen: number;
}
interface QualityDefinition { dpr: number; shadow: number }
interface DragState { x: number; y: number; yaw: number; pitch: number }
interface PreviewApp {
  document: { view: { camera: CameraState; [key: string]: unknown } };
  productPreview?: ProductPreview | null;
  notify?(message: string, kind?: string): void;
  scheduleSessionSave?(): void;
  setProductPreviewEnabled?(enabled: boolean, options?: { notify?: boolean }): unknown;
  [key: string]: unknown;
}


const MATERIALS: Readonly<Record<string, Readonly<MaterialDefinition>>> = Object.freeze({
  clay: {
    color: '#c98a6b',
    roughness: 0.9,
    metalness: 0,
    clearcoat: 0,
    clearcoatRoughness: 1,
    sheen: 0.1,
  },
  ceramic: {
    color: '#eee9df',
    roughness: 0.38,
    metalness: 0,
    clearcoat: 0.45,
    clearcoatRoughness: 0.28,
    sheen: 0.2,
  },
  matte: {
    color: '#d8d8d6',
    roughness: 0.96,
    metalness: 0,
    clearcoat: 0,
    clearcoatRoughness: 1,
    sheen: 0,
  },
  custom: {
    color: '#e6dfd2',
    roughness: 0.55,
    metalness: 0,
    clearcoat: 0.2,
    clearcoatRoughness: 0.4,
    sheen: 0.1,
  },
});

const QUALITY: Readonly<Record<string, Readonly<QualityDefinition>>> = Object.freeze({
  draft: { dpr: 1, shadow: 1024 },
  standard: { dpr: 1.5, shadow: 2048 },
  high: { dpr: 2, shadow: 4096 },
});

export class ProductPreview {
  app: PreviewApp;
  container: HTMLElement;
  root: HTMLDivElement;
  canvas: HTMLCanvasElement;
  ready: boolean;
  active: boolean;
  renderer: THREE.WebGLRenderer | null = null;
  scene!: THREE.Scene;
  camera!: THREE.PerspectiveCamera;
  environment!: THREE.Texture;
  hemisphere!: THREE.HemisphereLight;
  key!: THREE.DirectionalLight;
  fill!: THREE.DirectionalLight;
  rim!: THREE.DirectionalLight;
  ground!: THREE.Mesh;
  material!: THREE.MeshPhysicalMaterial;
  mesh: THREE.Mesh | null;
  meshKey: MeshLike | null;
  bounds: MeshBounds | null;
  materialSpec: MaterialSpec | null;
  cameraState: CameraState | null;
  dragState: DragState | null;
  pendingFrame: number;
  resizeObserver: ResizeObserver | null;
  contextLost: boolean;
  composer: EffectComposer | null;
  ssao: SSAOPass | null;
  useAo: boolean;
  aoSize: { w: number; h: number };
  frameTimes: number[];
  qualityOverride: string | null;
  lastQuality: string | null;
  degraded: boolean;
  onPointerDown: (event: PointerEvent) => void;
  onPointerMove: (event: PointerEvent) => void;
  onPointerUp: (event: PointerEvent) => void;
  onWheel: (event: WheelEvent) => void;
  onContextLost: (event: Event) => void;
  onContextRestored: () => void;

  constructor(app: PreviewApp, container: HTMLElement) {
    this.app = app;
    this.container = container;
    this.root = document.createElement('div');
    this.root.className = 'product-preview-layer';
    this.root.hidden = true;
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'product-preview-canvas';
    this.canvas.setAttribute('role', 'img');
    this.canvas.setAttribute('aria-label', 'Product preview of the prepared fabrication body');
    this.root.appendChild(this.canvas);
    container.appendChild(this.root);

    this.ready = false;
    this.active = false;
    this.mesh = null;
    this.meshKey = null;
    this.bounds = null;
    this.materialSpec = null;
    this.cameraState = null;
    this.dragState = null;
    this.pendingFrame = 0;
    this.resizeObserver = null;
    this.contextLost = false;
    this.composer = null;
    this.ssao = null;
    this.useAo = false;
    this.aoSize = { w: 1, h: 1 };
    this.frameTimes = [];
    this.qualityOverride = null;
    this.lastQuality = null;
    this.degraded = false;

    this.onPointerDown = (event) => this.handlePointerDown(event);
    this.onPointerMove = (event) => this.handlePointerMove(event);
    this.onPointerUp = (event) => this.handlePointerUp(event);
    this.onWheel = (event) => this.handleWheel(event);
    this.onContextLost = (event) => this.handleContextLost(event);
    this.onContextRestored = () => this.handleContextRestored();
  }

  mount(): boolean {
    if (this.ready) return true;
    try {
      this.renderer = new THREE.WebGLRenderer({
        canvas: this.canvas,
        antialias: true,
        alpha: false,
        preserveDrawingBuffer: true,
        powerPreference: 'high-performance',
      });
    } catch (error) {
      this.renderer = null;
      throw error;
    }
    this.renderer!.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer!.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer!.toneMappingExposure = 1;
    this.renderer!.shadowMap.enabled = true;
    this.renderer!.shadowMap.type = THREE.PCFSoftShadowMap;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#070809');
    this.camera = new THREE.PerspectiveCamera(35, 1, 0.1, 10000);
    this.camera.up.set(0, 0, 1);

    this.environment = this.createEnvironment();
    this.scene.environment = this.environment;

    this.hemisphere = new THREE.HemisphereLight(0xcfe0ff, 0x201914, 0.65);
    this.scene.add(this.hemisphere);

    this.key = new THREE.DirectionalLight(0xfff4e8, 2.3);
    this.key.castShadow = true;
    this.key.shadow.bias = -0.00015;
    this.key.shadow.normalBias = 0.02;
    this.scene.add(this.key);
    this.scene.add(this.key.target);

    this.fill = new THREE.DirectionalLight(0xb8d4ff, 0.85);
    this.scene.add(this.fill);
    this.scene.add(this.fill.target);

    this.rim = new THREE.DirectionalLight(0xffffff, 1.1);
    this.scene.add(this.rim);
    this.scene.add(this.rim.target);

    this.ground = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.ShadowMaterial({ color: 0x000000, opacity: 0.28, transparent: true }),
    );
    this.ground.receiveShadow = true;
    this.scene.add(this.ground);

    this.setupComposer();

    this.material = new THREE.MeshPhysicalMaterial({
      color: MATERIALS.ceramic!.color,
      roughness: MATERIALS.ceramic!.roughness,
      metalness: 0,
      clearcoat: MATERIALS.ceramic!.clearcoat,
      clearcoatRoughness: MATERIALS.ceramic!.clearcoatRoughness,
      sheen: MATERIALS.ceramic!.sheen,
      side: THREE.DoubleSide,
    });

    this.canvas.addEventListener('webglcontextlost', this.onContextLost, false);
    this.canvas.addEventListener('webglcontextrestored', this.onContextRestored, false);
    this.canvas.addEventListener('pointerdown', this.onPointerDown);
    this.canvas.addEventListener('pointermove', this.onPointerMove);
    this.canvas.addEventListener('pointerup', this.onPointerUp);
    this.canvas.addEventListener('pointercancel', this.onPointerUp);
    this.canvas.addEventListener('pointerleave', this.onPointerUp);
    this.canvas.addEventListener('wheel', this.onWheel, { passive: false });

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(this.container);
    this.resize();
    this.ready = true;
    return true;
  }

  createEnvironment(): THREE.Texture {
    const pmrem = new THREE.PMREMGenerator(this.renderer!);
    try {
      return pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    } finally {
      pmrem.dispose();
    }
  }

  setActive(active: boolean): void {
    const next = active === true && this.ready;
    this.active = next;
    this.root.hidden = !next;
    if (next) {
      this.resize();
      this.requestRender();
    } else {
      this.dragState = null;
    }
  }

  update(scene: PreviewScene | null | undefined): void {
    if (!this.ready) return;
    const spatial = scene?.spatial ?? null;
    const layer = spatial?.layers?.[0] ?? null;
    const mesh = layer?.meshes?.[0] ?? null;
    if (!spatial || !layer || !mesh) {
      this.setActive(false);
      return;
    }
    this.setActive(true);
    this.syncMesh(mesh);
    this.syncMaterial(layer.material ?? this.materialSpec);
    this.syncCamera(spatial.camera ?? null);
    this.requestRender();
  }

  syncMesh(mesh: MeshLike): void {
    if (this.meshKey === mesh) return;
    this.meshKey = mesh;
    if (this.mesh) {
      this.scene.remove(this.mesh);
      this.mesh.geometry?.dispose();
      this.mesh = null;
    }
    const geometry = buildGeometry(mesh);
    if (!geometry) {
      this.bounds = null;
      return;
    }
    this.bounds = boundsOfMesh(mesh);
    this.mesh = new THREE.Mesh(geometry, this.material);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    this.scene.add(this.mesh);
    this.placeStudio();
  }

  syncMaterial(spec: MaterialSpec | null | undefined): void {
    const material = MATERIALS[spec?.material ?? 'ceramic'] ?? MATERIALS.ceramic!;
    this.materialSpec = spec ?? { ...material, material: 'ceramic' };
    if (spec?.quality !== this.lastQuality) {
      this.lastQuality = spec?.quality ?? null;
      this.qualityOverride = null;
      this.degraded = false;
      this.frameTimes = [];
    }
    const quality = QUALITY[this.qualityOverride ?? spec?.quality ?? 'standard'] ?? QUALITY.standard!;
    this.material.color.set(material.color);
    this.material.roughness = material.roughness;
    this.material.metalness = material.metalness;
    this.material.clearcoat = material.clearcoat;
    this.material.clearcoatRoughness = material.clearcoatRoughness;
    this.material.sheen = material.sheen;
    this.material.needsUpdate = true;
    this.renderer!.toneMappingExposure = Number(spec?.exposure) || 1;
    this.renderer!.shadowMap.enabled = spec?.shadow !== false;
    this.ground.visible = spec?.contactShadow !== false;
    this.key.castShadow = spec?.shadow !== false;
    this.renderer!.setPixelRatio(Math.min(window.devicePixelRatio || 1, quality.dpr));
    if (this.key.shadow.mapSize.x !== quality.shadow) {
      this.key.shadow.mapSize.set(quality.shadow, quality.shadow);
      if (this.key.shadow.map) {
        this.key.shadow.map.dispose();
        this.key.shadow.map = null;
      }
    }
    this.scene.background = new THREE.Color(spec?.background || '#070809');
    this.applyLighting(spec?.lighting ?? 'studio');
    this.useAo = spec?.ao === true;
    if (this.useAo && this.ssao) {
      this.ssao.kernelRadius = Math.max(0.05, (this.bounds?.radius ?? 10) * 0.06);
      this.ssao.minDistance = 0.002;
      this.ssao.maxDistance = Math.max(0.05, (this.bounds?.radius ?? 10) * 0.2);
    }
  }

  setupComposer(): void {
    if (!this.renderer || this.composer) return;
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.ssao = new SSAOPass(this.scene, this.camera, this.aoSize.w, this.aoSize.h, 24);
    this.ssao.output = SSAOPass.OUTPUT.Default;
    this.composer.addPass(this.ssao);
    this.composer.addPass(new OutputPass());
  }

  applyLighting(lighting: string): void {
    if (lighting === 'soft') {
      this.key.intensity = 1.6;
      this.fill.intensity = 1.35;
      this.rim.intensity = 0.65;
      this.hemisphere.intensity = 0.85;
    } else if (lighting === 'directional') {
      this.key.intensity = 3.0;
      this.fill.intensity = 0.3;
      this.rim.intensity = 0.25;
      this.hemisphere.intensity = 0.25;
    } else {
      this.key.intensity = 2.3;
      this.fill.intensity = 0.85;
      this.rim.intensity = 1.1;
      this.hemisphere.intensity = 0.65;
    }
  }

  syncCamera(cameraState: CameraState | null | undefined): void {
    this.cameraState = cameraState ?? null;
    if (!this.bounds || !this.camera) return;
    const center = new THREE.Vector3(this.bounds.center.x, this.bounds.center.y, this.bounds.center.z);
    const yaw = Number(cameraState?.yaw) || 0;
    const pitch = Number(cameraState?.pitch) || 0;
    const fov = Number(cameraState?.fov) || 320;
    const forward = new THREE.Vector3(
      Math.cos(pitch) * Math.cos(yaw),
      Math.cos(pitch) * Math.sin(yaw),
      Math.sin(pitch),
    );
    const radius = Math.max(1, this.bounds.radius);
    const distance = Math.max(radius * 0.4, (radius / Math.sin(THREE.MathUtils.degToRad(17.5))) * (fov / 320) * 1.12);
    this.camera.position.copy(center).addScaledVector(forward, -distance);
    this.camera.lookAt(center);
    this.camera.near = Math.max(0.05, radius * 0.002);
    this.camera.far = Math.max(100, radius * 80);
    this.camera.updateProjectionMatrix();
  }

  placeStudio(): void {
    if (!this.bounds) return;
    const { center, radius, minZ } = this.bounds;
    const c = new THREE.Vector3(center.x, center.y, center.z);
    this.key.position.set(c.x - radius * 1.8, c.y - radius * 2.2, c.z + radius * 3.0);
    this.key.target.position.copy(c);
    this.key.target.updateMatrixWorld();
    this.fill.position.set(c.x + radius * 2.6, c.y - radius * 0.8, c.z + radius * 1.4);
    this.fill.target.position.copy(c);
    this.fill.target.updateMatrixWorld();
    this.rim.position.set(c.x + radius * 1.2, c.y + radius * 2.8, c.z + radius * 1.8);
    this.rim.target.position.copy(c);
    this.rim.target.updateMatrixWorld();

    const shadowCamera = this.key.shadow.camera;
    shadowCamera.left = -radius * 2.2;
    shadowCamera.right = radius * 2.2;
    shadowCamera.top = radius * 2.2;
    shadowCamera.bottom = -radius * 2.2;
    shadowCamera.near = Math.max(0.1, radius * 0.1);
    shadowCamera.far = radius * 8;
    shadowCamera.updateProjectionMatrix();

    this.ground.position.set(center.x, center.y, minZ - radius * 0.01);
    this.ground.scale.set(radius * 5, radius * 5, 1);
  }

  resize(): void {
    if (!this.ready) return;
    const rect = this.container.getBoundingClientRect();
    const width = Math.max(1, Math.floor(rect.width));
    const height = Math.max(1, Math.floor(rect.height));
    this.renderer!.setSize(width, height, false);
    this.aoSize = { w: width, h: height };
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.composer?.setSize(width, height);
    this.ssao?.setSize(width, height);
    this.requestRender();
  }

  requestRender(): void {
    if (!this.ready || !this.active || this.pendingFrame) return;
    this.pendingFrame = requestAnimationFrame(() => {
      this.pendingFrame = 0;
      if (!this.active || !this.ready) return;
      const started = performance.now();
      this.renderFrame();
      this.trackFrame(performance.now() - started);
    });
  }

  trackFrame(elapsed: number): void {
    if (!Number.isFinite(elapsed) || elapsed < 0 || this.degraded) return;
    this.frameTimes.push(elapsed);
    if (this.frameTimes.length > 20) this.frameTimes.shift();
    if (this.frameTimes.length < 12) return;
    const average = this.frameTimes.reduce((sum, value) => sum + value, 0) / this.frameTimes.length;
    if (average <= 45) return;
    this.degraded = true;
    this.qualityOverride = 'draft';
    this.lastQuality = 'draft';
    this.frameTimes = [];
    this.syncMaterial({ ...(this.materialSpec ?? {}), quality: 'draft' });
    this.resize();
    this.app.notify?.('Product preview reduced to draft detail to keep interaction responsive.', 'info');
  }

  renderFrame(): void {
    if (this.useAo && this.composer) this.composer.render();
    else this.renderer!.render(this.scene, this.camera);
  }

  benchmark({ frames = 60 }: { frames?: number } = {}): Promise<Rec> | null {
    if (!this.ready) return null;
    const times: number[] = [];
    const gl = this.renderer!.getContext();
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    const gpuRenderer = debugInfo
      ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)
      : gl.getParameter(gl.RENDERER);
    const gpuVendor = debugInfo
      ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL)
      : gl.getParameter(gl.VENDOR);
    let previous = performance.now();
    return new Promise((resolve) => {
      const tick = (now: number): void => {
        times.push(now - previous);
        previous = now;
        this.renderFrame();
        // Wait for the GPU so the sample is not just command submission.
        this.renderer!.getContext().finish();
        if (times.length < frames) {
          requestAnimationFrame(tick);
          return;
        }
        const sorted = [...times].sort((a, b) => a - b);
        const meshTriangles = Math.round(
          (this.mesh?.geometry?.attributes?.position?.count ?? 0) / 3,
        );
        resolve({
          frames,
          avgMs: times.reduce((sum, value) => sum + value, 0) / times.length,
          p95Ms: sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))],
          maxMs: sorted[sorted.length - 1],
          triangles: Math.max(this.renderer!.info.render.triangles, meshTriangles),
          calls: Math.max(
            this.renderer!.info.render.calls,
            this.useAo ? (this.composer?.passes?.length ?? 0) : 0,
          ),
          shadowMap: this.key.shadow.mapSize.x,
          dpr: this.renderer!.getPixelRatio(),
          ao: this.useAo,
          quality: this.lastQuality,
          gpuRenderer,
          gpuVendor,
          usedJSHeapSize: (performance as unknown as { memory?: { usedJSHeapSize?: number } }).memory?.usedJSHeapSize ?? null,
        });
      };
      requestAnimationFrame(tick);
    });
  }

  handlePointerDown(event: PointerEvent): void {
    if (!this.active || event.button !== 0) return;
    this.canvas.setPointerCapture?.(event.pointerId);
    this.dragState = {
      x: event.clientX,
      y: event.clientY,
      yaw: this.app.document.view.camera.yaw,
      pitch: this.app.document.view.camera.pitch,
    };
    event.preventDefault();
  }

  handlePointerMove(event: PointerEvent): void {
    if (!this.dragState) return;
    const dx = event.clientX - this.dragState.x;
    const dy = event.clientY - this.dragState.y;
    const next = orbitCamera(this.app.document.view.camera, { yaw: this.dragState.yaw, pitch: this.dragState.pitch }, dx, dy);
    this.app.document.view.camera.yaw = next.yaw;
    this.app.document.view.camera.pitch = next.pitch;
    this.syncCamera(this.app.document.view.camera);
    this.requestRender();
    event.preventDefault();
  }

  handlePointerUp(event: PointerEvent): void {
    if (!this.dragState) return;
    this.dragState = null;
    this.canvas.releasePointerCapture?.(event.pointerId);
    this.app.scheduleSessionSave?.();
  }

  handleWheel(event: WheelEvent): void {
    if (!this.active) return;
    event.preventDefault();
    const next = zoomCamera(this.app.document.view.camera, event.deltaY);
    this.app.document.view.camera.fov = next.fov;
    this.syncCamera(this.app.document.view.camera);
    this.requestRender();
    this.app.scheduleSessionSave?.();
  }

  handleContextLost(event: Event): void {
    event.preventDefault();
    this.contextLost = true;
    const app = this.app;
    app.productPreview = null;
    app.setProductPreviewEnabled?.(false, { notify: false });
    app.notify?.('Product preview lost its WebGL context; using Technical preview.', 'error');
    this.destroy();
  }

  handleContextRestored(): void {
    this.contextLost = false;
  }

  capture(): string | null {
    if (!this.ready) return null;
    this.renderFrame();
    return this.canvas.toDataURL('image/png');
  }

  destroy(): void {
    if (this.pendingFrame) cancelAnimationFrame(this.pendingFrame);
    this.pendingFrame = 0;
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    this.canvas.removeEventListener('webglcontextlost', this.onContextLost);
    this.canvas.removeEventListener('webglcontextrestored', this.onContextRestored);
    this.canvas.removeEventListener('pointerdown', this.onPointerDown);
    this.canvas.removeEventListener('pointermove', this.onPointerMove);
    this.canvas.removeEventListener('pointerup', this.onPointerUp);
    this.canvas.removeEventListener('pointercancel', this.onPointerUp);
    this.canvas.removeEventListener('pointerleave', this.onPointerUp);
    this.canvas.removeEventListener('wheel', this.onWheel);
    if (this.mesh) {
      this.scene.remove(this.mesh);
      this.mesh.geometry?.dispose();
      this.mesh = null;
    }
    this.composer?.dispose?.();
    this.composer = null;
    this.ssao = null;
    this.material?.dispose();
    this.ground?.geometry?.dispose();
    const groundMaterial = this.ground?.material;
    if (Array.isArray(groundMaterial)) groundMaterial.forEach((material) => material.dispose());
    else groundMaterial?.dispose();
    this.environment?.dispose?.();
    this.renderer?.dispose();
    this.renderer = null;
    this.root.remove();
    this.ready = false;
    this.active = false;
  }
}

function buildGeometry(mesh: MeshLike | null | undefined): THREE.BufferGeometry | null {
  const vertices = Array.isArray(mesh?.vertices) ? mesh.vertices : [];
  const faces = Array.isArray(mesh?.faces) ? mesh.faces : [];
  if (vertices.length < 3 || faces.length < 1) return null;
  const positions = new Float32Array(vertices.length * 3);
  for (let i = 0; i < vertices.length; i++) {
    const point = vertices[i];
    positions[i * 3] = Number(point?.x) || 0;
    positions[i * 3 + 1] = Number(point?.y) || 0;
    positions[i * 3 + 2] = Number(point?.z) || 0;
  }
  const indices = [];
  for (const face of faces) {
    if (!Array.isArray(face) || face.length < 3) continue;
    for (let i = 1; i < face.length - 1; i++) {
      indices.push(face[0]!, face[i]!, face[i + 1]!);
    }
  }
  if (!indices.length) return null;
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

function boundsOfMesh(mesh: MeshLike | null | undefined): MeshBounds | null {
  let minX = Infinity; let minY = Infinity; let minZ = Infinity;
  let maxX = -Infinity; let maxY = -Infinity; let maxZ = -Infinity;
  for (const point of mesh?.vertices ?? []) {
    if (!Number.isFinite(point?.x) || !Number.isFinite(point?.y) || !Number.isFinite(point?.z)) continue;
    minX = Math.min(minX, point.x); maxX = Math.max(maxX, point.x);
    minY = Math.min(minY, point.y); maxY = Math.max(maxY, point.y);
    minZ = Math.min(minZ, point.z); maxZ = Math.max(maxZ, point.z);
  }
  if (!Number.isFinite(minX)) return null;
  const center = { x: (minX + maxX) / 2, y: (minY + maxY) / 2, z: (minZ + maxZ) / 2 };
  const radius = Math.max(
    0.001,
    0.5 * Math.hypot(maxX - minX, maxY - minY, maxZ - minZ),
  );
  return { minX, minY, minZ, maxX, maxY, maxZ, center, radius };
}
