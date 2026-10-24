/** Read-only scene instrumentation. Mounted exclusively in development E2E builds. */
import { useEffect } from "react";
import { useThree } from "@react-three/fiber";
import { Box3, Mesh, Raycaster, Vector2, Vector3 } from "three";
import { usePuzzle } from "../hooks/usePuzzle";
export default function SceneProbe() {
  const { bones: handBones } = usePuzzle();
  const { scene, camera, gl } = useThree();
  useEffect(() => {
    const project = (v: Vector3) => {
      const p = v.clone().project(camera),
        r = gl.domElement.getBoundingClientRect();
      return {
        x: r.x + ((p.x + 1) * r.width) / 2,
        y: r.y + ((1 - p.y) * r.height) / 2,
      };
    };
    const snapshot = () => {
      const result: Record<string, unknown> = {};
      scene.updateMatrixWorld(true);
      scene.traverse((o) => {
        if (o instanceof Mesh && o.userData.boneId) {
          const id = o.userData.boneId;
          const b = handBones.find((b) => b.id === id)!;
          const p = o.getWorldPosition(new Vector3());
          const box = new Box3().setFromObject(o);
          const projected = [];
          for (const x of [box.min.x, box.max.x])
            for (const y of [box.min.y, box.max.y])
              for (const z of [box.min.z, box.max.z])
                projected.push(project(new Vector3(x, y, z)));
          result[id] = {
            position: p.toArray(),
            rotation: o.getWorldQuaternion(o.quaternion.clone()).toArray(),
            screen: project(p),
            target: project(new Vector3(...b.targetPosition)),
            minY: box.min.y,
            bounds: {
              left: Math.min(...projected.map((p) => p.x)),
              right: Math.max(...projected.map((p) => p.x)),
              top: Math.min(...projected.map((p) => p.y)),
              bottom: Math.max(...projected.map((p) => p.y)),
            },
          };
        }
      });
      return result;
    };
    const hit = (x: number, y: number) => {
      const r = gl.domElement.getBoundingClientRect(),
        ray = new Raycaster();
      ray.setFromCamera(
        new Vector2(
          ((x - r.x) / r.width) * 2 - 1,
          (-(y - r.y) / r.height) * 2 + 1,
        ),
        camera,
      );
      return (
        ray
          .intersectObjects(scene.children, true)
          .find((i) => i.object.userData.boneId)?.object.userData.boneId ?? null
      );
    };
    const probe = {
      snapshot,
      hit,
      stats: () => ({
        ...(scene.userData.runtimeMetrics ?? {}),
        drawCalls: gl.info.render.calls,
        triangles: gl.info.render.triangles,
        geometries: gl.info.memory.geometries,
        textures: gl.info.memory.textures,
      }),
      camera: () => ({
        position: camera.position.toArray(),
        quaternion: camera.quaternion.toArray(),
        zoom: camera.zoom,
      }),
    };
    Object.assign(window, { __boneProbe: probe });
    return () => {
      delete (window as unknown as Record<string, unknown>).__boneProbe;
    };
  }, [scene, camera, gl, handBones]);
  return null;
}
