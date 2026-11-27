import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

const HOLIDAY_INDICES = new Set([4, 14, 21, 27]);

function CalendarGridFallback() {
  return (
    <div
      className="grid h-full w-full grid-cols-6 gap-2 p-6"
      aria-label="Architectural calendar matrix"
    >
      {Array.from({ length: 30 }).map((_, idx) => {
        const col = idx % 6;
        const isWeekend = col === 5;
        const isHoliday = HOLIDAY_INDICES.has(idx);
        return (
          <div
            key={idx}
            className={`rounded-sm border transition-transform duration-300 ${
              isHoliday
                ? "border-primary bg-primary/80"
                : isWeekend
                  ? "border-border bg-muted/60"
                  : "border-border bg-card"
            }`}
          />
        );
      })}
    </div>
  );
}

function detectWebGL() {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

export default function ChronosMonolith() {
  const containerRef = useRef(null);
  const [webglAvailable] = useState(detectWebGL);

  useEffect(() => {
    if (!webglAvailable) return;
    const container = containerRef.current;
    if (!container) return;

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });

    const width = container.clientWidth || 480;
    const height = container.clientHeight || 360;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(36, width / height, 0.1, 100);
    camera.position.set(0, 0.4, 9.2);

    const ambientLight = new THREE.AmbientLight(0xf6f4ef, 1.35);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xfff5e8, 2.2);
    keyLight.position.set(5, 7, 6);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0xc84b31, 0.9);
    rimLight.position.set(-6, -3, 4);
    scene.add(rimLight);

    const group = new THREE.Group();
    group.rotation.x = -0.22;
    group.rotation.y = 0.28;
    scene.add(group);

    const tileGeo = new THREE.BoxGeometry(0.72, 0.72, 0.16);
    const workMat = new THREE.MeshStandardMaterial({ color: 0x232220, roughness: 0.45, metalness: 0.15 });
    const weekendMat = new THREE.MeshStandardMaterial({ color: 0xd8cfc0, roughness: 0.7, metalness: 0.05 });
    const holidayMat = new THREE.MeshStandardMaterial({ color: 0xc84b31, roughness: 0.35, metalness: 0.3 });

    const tiles = [];
    const cols = 6;
    const rows = 5;
    const spacing = 0.92;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const idx = r * cols + c;
        const isHoliday = HOLIDAY_INDICES.has(idx);
        const isWeekend = c === cols - 1;
        const mat = isHoliday ? holidayMat : isWeekend ? weekendMat : workMat;

        const mesh = new THREE.Mesh(tileGeo, mat);
        mesh.position.set(
          (c - (cols - 1) / 2) * spacing,
          ((rows - 1) / 2 - r) * spacing,
          isHoliday ? 0.14 : 0
        );
        mesh.userData = {
          baseZ: isHoliday ? 0.14 : 0,
          phase: c * 0.45 + r * 0.35,
        };
        group.add(mesh);
        tiles.push(mesh);
      }
    }

    const pointer = { x: 0, y: 0 };
    const handlePointerMove = (e) => {
      const rect = container.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
      pointer.y = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
    };
    container.addEventListener("pointermove", handlePointerMove);

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || 480;
      const h = container.clientHeight || 360;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", handleResize);

    let frameId = 0;
    const clock = new THREE.Clock();

    const renderFrame = () => {
      const t = clock.getElapsedTime();
      if (!prefersReducedMotion) {
        group.rotation.y += (0.28 + pointer.x * 0.22 - group.rotation.y) * 0.05;
        group.rotation.x += (-0.22 - pointer.y * 0.16 - group.rotation.x) * 0.05;

        for (const tile of tiles) {
          tile.position.z = tile.userData.baseZ + Math.sin(t * 1.4 + tile.userData.phase) * 0.06;
        }
      }
      renderer.render(scene, camera);
      frameId = requestAnimationFrame(renderFrame);
    };
    renderFrame();

    return () => {
      cancelAnimationFrame(frameId);
      container.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("resize", handleResize);
      tileGeo.dispose();
      workMat.dispose();
      weekendMat.dispose();
      holidayMat.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [webglAvailable]);

  if (!webglAvailable) {
    return <CalendarGridFallback />;
  }

  return (
    <div
      ref={containerRef}
      className="h-full w-full cursor-grab active:cursor-grabbing"
      aria-label="Interactive 3D calendar matrix"
    />
  );
}
