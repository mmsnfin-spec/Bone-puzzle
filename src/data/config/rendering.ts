/** Renderer-independent values; Three.js objects are created only in the scene. */
export const RENDERING_CONFIG = {
  background: "#050505",
  dpr: [1, 1.5] as [number, number],
  camera: { near: 0.1, far: 120, minimumZoom: 18, maximumZoom: 230, maximumPolarAngle: Math.PI * 0.85 },
  views: {
    gameplay: { target: [0, -0.5, 0.8], offset: [0, 18, 18], height: 13.4, width: 13 },
    anatomy: { target: [0, 1.3, 0], offset: [0, 8.9, 24], height: 10.5, width: 9.5 },
  },
  lights: { ambient: 0.48, key: { position: [-7, 9, 9] as [number, number, number], intensity: 1.7 }, fill: { position: [5, 2, -4] as [number, number, number], intensity: 0.45, color: "#b5bfd3" } },
  materials: {
    normal: { color: "#d5d0c2", roughness: 0.82 },
    selected: { color: "#f0e4cc", roughness: 0.78, emissive: "#65523b", emissiveIntensity: 0.12 },
    placed: { color: "#ddd7c8", roughness: 0.82 },
    guide: { color: "#aab5c5", transparent: true, depthWrite: false, roughness: 0.85 },
  },
} as const;
