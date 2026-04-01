import React, { useRef, useLayoutEffect, useEffect } from "react";
import gsap from "gsap";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import FloatingNav from "./FloatingNav";

interface HeroProps {
  isDarkMode: boolean;
}

const Hero: React.FC<HeroProps> = ({ isDarkMode }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const rotationVelocityRef = useRef(0);
  const lastDeltaXRef = useRef(0);

  const isDraggingRef = useRef(false);
  const lastPointerXRef = useRef(0);
  const lastPointerYRef = useRef(0);
  const dragRotationYRef = useRef(0);
  const cameraTargetZRef = useRef(0); // overwritten in useEffect once DEPTH_START is known
  // 'x' = locked to ROGU3 rotation, 'y' = locked to hallway depth, null = undecided
  const gestureAxisRef = useRef<"x" | "y" | null>(null);
  const swipeStartXRef = useRef(0);
  const swipeStartYRef = useRef(0);
  // Store refs for cleanup and animation
  const rogueRef = useRef<THREE.Object3D | null>(null);
  const logoMeshRef = useRef<THREE.Mesh | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const segmentsRef = useRef<THREE.Group[]>([]);
  const loadOverlayRef = useRef<HTMLDivElement>(null);
  const loadedCountRef = useRef(0);
  const textureCacheRef = useRef<THREE.Texture[]>([]);

  // --- CONFIGURATION ---
  // Tuned to match the reference design's density and scale
  const TUNNEL_WIDTH = 24;
  const TUNNEL_HEIGHT = 16;
  const SEGMENT_DEPTH = 5; // Short depth for "square-ish" floor tiles
  const NUM_SEGMENTS = 20;
  const FOG_DENSITY = 0.025;

  // Grid Divisions
  const FLOOR_COLS = 3; // Number of columns on floor/ceiling
  const WALL_ROWS = 3; // Number of rows on walls

  // Derived dimensions
  const COL_WIDTH = TUNNEL_WIDTH / FLOOR_COLS;
  const ROW_HEIGHT = TUNNEL_HEIGHT / WALL_ROWS;

  const imageUrls = [
    "/brand/Placeholder_H1.webp",
    "/brand/Placeholder_H2.webp",
    "/brand/Placeholder_H3.webp",
    "/brand/Placeholder_H4.webp",
    "/brand/Placeholder_H5.webp",
    "/brand/Placeholder_H6.webp",
    "/brand/Placeholder_H7.webp",
    "/brand/Placeholder_H9.webp",
    "/brand/PlaceholderH10.webp",
    "/brand/Placeholder_H11.webp",
    "/brand/Placeholder_rogu3demon.webp",
    "/brand/P_rogu3.webp",
    "/brand/Pink_ai.webp",
  ];

  // Helper: Create a segment with grid lines and filled cells
  const createSegment = (
    zPos: number,
    camoTex: THREE.Texture | null = null,
  ) => {
    const group = new THREE.Group();
    group.position.z = zPos;

    const w = TUNNEL_WIDTH / 2;
    const h = TUNNEL_HEIGHT / 2;
    const d = SEGMENT_DEPTH;

    // --- 0. Camo wall panels (perspective-correct, render behind grid lines) ---
    if (camoTex) {
      const TILE = 25; // world units per camo tile — tune for scale

      const makeMat = (rX: number, rY: number) => {
        const t = camoTex.clone();
        t.needsUpdate = true;
        t.repeat.set(rX, rY);
        const m = new THREE.MeshBasicMaterial({
          map: t,
          color: 0x555555,
          side: THREE.FrontSide,
        });
        m.polygonOffset = true;
        m.polygonOffsetFactor = 1;
        m.polygonOffsetUnits = 1;
        return m;
      };

      // Floor
      const floor = new THREE.Mesh(
        new THREE.PlaneGeometry(TUNNEL_WIDTH, d),
        makeMat(TUNNEL_WIDTH / TILE, d / TILE),
      );
      floor.rotation.x = -Math.PI / 2;
      floor.position.set(0, -h, -d / 2);
      group.add(floor);

      // Ceiling
      const ceil = new THREE.Mesh(
        new THREE.PlaneGeometry(TUNNEL_WIDTH, d),
        makeMat(TUNNEL_WIDTH / TILE, d / TILE),
      );
      ceil.rotation.x = Math.PI / 2;
      ceil.position.set(0, h, -d / 2);
      group.add(ceil);

      // Left wall
      const leftWall = new THREE.Mesh(
        new THREE.PlaneGeometry(d, TUNNEL_HEIGHT),
        makeMat(d / TILE, TUNNEL_HEIGHT / TILE),
      );
      leftWall.rotation.y = Math.PI / 2;
      leftWall.position.set(-w, 0, -d / 2);
      group.add(leftWall);

      // Right wall
      const rightWall = new THREE.Mesh(
        new THREE.PlaneGeometry(d, TUNNEL_HEIGHT),
        makeMat(d / TILE, TUNNEL_HEIGHT / TILE),
      );
      rightWall.rotation.y = -Math.PI / 2;
      rightWall.position.set(w, 0, -d / 2);
      group.add(rightWall);
    }

    // --- 1. Grid Lines ---
    // Start with default light mode colors; these will be updated by useEffect immediately on mount
    const lineMaterial = new THREE.LineBasicMaterial({
      color: 0xb0b0b0,
      transparent: true,
      opacity: 0.5,
    });
    const lineGeo = new THREE.BufferGeometry();
    const vertices: number[] = [];

    // A. Longitudinal Lines (Z-axis)
    // Floor & Ceiling (varying X)
    for (let i = 0; i <= FLOOR_COLS; i++) {
      const x = -w + i * COL_WIDTH;
      // Floor line
      vertices.push(x, -h, 0, x, -h, -d);
      // Ceiling line
      vertices.push(x, h, 0, x, h, -d);
    }
    // Walls (varying Y) - excluding top/bottom corners already drawn
    for (let i = 1; i < WALL_ROWS; i++) {
      const y = -h + i * ROW_HEIGHT;
      // Left Wall line
      vertices.push(-w, y, 0, -w, y, -d);
      // Right Wall line
      vertices.push(w, y, 0, w, y, -d);
    }

    // B. Latitudinal Lines (Ring at z=0)
    // Floor (Bottom edge)
    vertices.push(-w, -h, 0, w, -h, 0);
    // Ceiling (Top edge)
    vertices.push(-w, h, 0, w, h, 0);
    // Left Wall (Left edge)
    vertices.push(-w, -h, 0, -w, h, 0);
    // Right Wall (Right edge)
    vertices.push(w, -h, 0, w, h, 0);

    lineGeo.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(vertices, 3),
    );
    const lines = new THREE.LineSegments(lineGeo, lineMaterial);
    group.add(lines);

    // Initial population of images
    populateImages(group, w, h, d);

    return group;
  };

  // Helper: Populate images in a segment — uses pre-cached textures, no repeat fetches
  const populateImages = (
    group: THREE.Group,
    w: number,
    h: number,
    d: number,
  ) => {
    const cellMargin = 0.4;
    const cache = textureCacheRef.current;

    const addImg = (
      pos: THREE.Vector3,
      rot: THREE.Euler,
      wd: number,
      ht: number,
    ) => {
      if (cache.length === 0) return; // textures not ready yet

      const tex = cache[Math.floor(Math.random() * cache.length)];

      const img = tex.image as HTMLImageElement;
      const imgAspect = img.width / img.height;
      const slotAspect = wd / ht;

      // Cover: fill the full panel, crop texture to avoid stretching
      const planeW = wd - cellMargin;
      const planeH = ht - cellMargin;

      const t = tex.clone();
      t.needsUpdate = true;
      if (imgAspect > slotAspect) {
        // image wider than slot — crop sides
        t.repeat.set(slotAspect / imgAspect, 1);
      } else {
        // image taller than slot — crop top/bottom
        t.repeat.set(1, imgAspect / slotAspect);
      }
      t.offset.set((1 - t.repeat.x) / 2, (1 - t.repeat.y) / 2);
      t.wrapS = THREE.ClampToEdgeWrapping;
      t.wrapT = THREE.ClampToEdgeWrapping;

      const mat = new THREE.MeshBasicMaterial({
        map: t,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
      });

      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(planeW, planeH), mat);
      mesh.position.copy(pos);
      mesh.rotation.copy(rot);
      mesh.name = "slab_image";
      group.add(mesh);

      mat.opacity = 0.85;
    };

    // Logic: Iterate slots, but skip if the previous slot was filled.
    // Threshold adjusted to 0.80 (20%) to compensate for skipped slots and maintain density.

    // Floor
    let lastFloorIdx = -999;
    for (let i = 0; i < FLOOR_COLS; i++) {
      // Must be at least 2 slots away from last image to avoid adjacency (i > last + 1)
      if (i > lastFloorIdx + 1) {
        if (Math.random() > 0.8) {
          addImg(
            new THREE.Vector3(-w + i * COL_WIDTH + COL_WIDTH / 2, -h, -d / 2),
            new THREE.Euler(-Math.PI / 2, 0, 0),
            COL_WIDTH,
            d,
          );
          lastFloorIdx = i;
        }
      }
    }

    // Ceiling
    let lastCeilIdx = -999;
    for (let i = 0; i < FLOOR_COLS; i++) {
      if (i > lastCeilIdx + 1) {
        if (Math.random() > 0.88) {
          // Keep ceiling sparser
          addImg(
            new THREE.Vector3(-w + i * COL_WIDTH + COL_WIDTH / 2, h, -d / 2),
            new THREE.Euler(Math.PI / 2, 0, 0),
            COL_WIDTH,
            d,
          );
          lastCeilIdx = i;
        }
      }
    }

    // Left Wall
    let lastLeftIdx = -999;
    for (let i = 0; i < WALL_ROWS; i++) {
      if (i > lastLeftIdx + 1) {
        if (Math.random() > 0.8) {
          addImg(
            new THREE.Vector3(-w, -h + i * ROW_HEIGHT + ROW_HEIGHT / 2, -d / 2),
            new THREE.Euler(0, Math.PI / 2, 0),
            d,
            ROW_HEIGHT,
          );
          lastLeftIdx = i;
        }
      }
    }

    // Right Wall
    let lastRightIdx = -999;
    for (let i = 0; i < WALL_ROWS; i++) {
      if (i > lastRightIdx + 1) {
        if (Math.random() > 0.8) {
          addImg(
            new THREE.Vector3(w, -h + i * ROW_HEIGHT + ROW_HEIGHT / 2, -d / 2),
            new THREE.Euler(0, -Math.PI / 2, 0),
            d,
            ROW_HEIGHT,
          );
          lastRightIdx = i;
        }
      }
    }
  };

  // --- INITIAL SETUP ---
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    // Reveal overlay once critical assets are ready (texture + ROGU3 GLB)
    // Fallback after 10s so slow connections don't stay dark forever
    const tryReveal = () => {
      loadedCountRef.current += 1;
      if (loadedCountRef.current >= 2) {
        gsap.to(loadOverlayRef.current, {
          opacity: 0,
          duration: 0.9,
          ease: "power2.out",
          onComplete: () => {
            if (loadOverlayRef.current)
              loadOverlayRef.current.style.pointerEvents = "none";
          },
        });
      }
    };
    // Safari can be slow on the 80MB GLB — force reveal after 10s regardless of load state
    const fallbackTimer = setTimeout(() => {
      if (loadedCountRef.current < 2) {
        loadedCountRef.current = 1; // bump so the next tryReveal() hits >= 2
        tryReveal();
      }
    }, 10000);

    // THREE JS SETUP
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const ambientLight = new THREE.AmbientLight(0xffffff, 1.8);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 2.5);
    directionalLight.position.set(3, 6, 8);
    scene.add(directionalLight);

    const fillLight = new THREE.PointLight(0xffffff, 1.5, 100);
    fillLight.position.set(0, 2, -8);
    scene.add(fillLight);
    scene.fog = new THREE.FogExp2(0x050505, FOG_DENSITY);

    const loader = new GLTFLoader();

    loader.load("/products/Rogu3_char.glb", (gltf) => {
      const rogue = gltf.scene;
      rogue.position.set(0, 1, -30);
      rogue.scale.set(1.5, 1.5, 1.5);
      rogueRef.current = rogue;
      scene.add(rogue);
      tryReveal(); // asset 1 ready
    });

    // 3D text logo at the end of the hallway — auto-rotating in place
    const logoLoader = new GLTFLoader();
    logoLoader.load("/brand/Rogu3 text logo .glb", (gltf) => {
      const logo = gltf.scene;

      // Center the geometry so it spins around its own center, not the world origin
      const box = new THREE.Box3().setFromObject(logo);
      const center = box.getCenter(new THREE.Vector3());
      logo.position.sub(center);

      const pivot = new THREE.Group();
      pivot.add(logo);
      pivot.position.set(0, 0, -2215); // end marker — camera stops at -1000, logo sits 15 units ahead
      pivot.scale.set(2, 2, 2);

      logoMeshRef.current = pivot as unknown as THREE.Mesh;
      scene.add(pivot);
    });

    const width = window.innerWidth;
    const height = window.innerHeight;
    const camera = new THREE.PerspectiveCamera(70, width / height, 0.1, 1000);
    const DEPTH_START = 10;
    const DEPTH_END = -2212; // camera hard stop — 3 units from logo, walls off-screen at this distance
    camera.position.set(0, 0, DEPTH_START);
    cameraTargetZRef.current = DEPTH_START; // keep ref in sync so camera doesn't immediately fly
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    rendererRef.current = renderer;

    const canvas = renderer.domElement;

    // ── DESKTOP: wheel drives depth, no click required ──────────────────────
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      // Horizontal trackpad swipe → rotate ROGU3 (fires whenever deltaX is present)
      if (Math.abs(e.deltaX) > 2) {
        dragRotationYRef.current += e.deltaX * 0.004;
        rotationVelocityRef.current = e.deltaX * 0.0015;
      }
      // Vertical scroll → hallway depth (only when vertical is dominant)
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        cameraTargetZRef.current = Math.max(
          DEPTH_END,
          Math.min(DEPTH_START, cameraTargetZRef.current - e.deltaY * 0.05),
        );
      }
    };

    // ── MOBILE: touch swipe — axis-locked, no tap required ──────────────────
    const resetTouch = () => {
      isDraggingRef.current = false;
      gestureAxisRef.current = null;
    };

    const handleTouchStart = (e: TouchEvent) => {
      // Ignore multi-touch — iPad pinch/zoom causes corrupt tracking
      if (e.touches.length > 1) {
        resetTouch();
        return;
      }
      e.preventDefault();
      const t = e.touches[0];
      swipeStartXRef.current = t.clientX;
      swipeStartYRef.current = t.clientY;
      lastPointerXRef.current = t.clientX;
      lastPointerYRef.current = t.clientY;
      gestureAxisRef.current = null;
      isDraggingRef.current = true;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDraggingRef.current || e.touches.length > 1) return;
      e.preventDefault();
      const t = e.touches[0];
      if (!t) return;
      const deltaX = t.clientX - lastPointerXRef.current;
      const deltaY = t.clientY - lastPointerYRef.current;
      lastPointerXRef.current = t.clientX;
      lastPointerYRef.current = t.clientY;
      if (!gestureAxisRef.current) {
        const cumX = Math.abs(t.clientX - swipeStartXRef.current);
        const cumY = Math.abs(t.clientY - swipeStartYRef.current);
        if (cumX > 8 || cumY > 8) {
          gestureAxisRef.current = cumX >= cumY ? "x" : "y";
        }
      }
      if (gestureAxisRef.current === "x") {
        // Real-time finger tracking — rotation follows the finger directly
        dragRotationYRef.current += deltaX * 0.009;
        lastDeltaXRef.current = deltaX;
      } else if (gestureAxisRef.current === "y") {
        cameraTargetZRef.current = Math.max(
          DEPTH_END,
          Math.min(DEPTH_START, cameraTargetZRef.current + deltaY * 0.3),
        );
      }
    };

    const handleTouchEnd = (_e: TouchEvent) => {
      if (!isDraggingRef.current) return;
      if (gestureAxisRef.current === "x") {
        // Small momentum from last frame only — not total swipe distance
        rotationVelocityRef.current = lastDeltaXRef.current * 0.005;
        lastDeltaXRef.current = 0;
      }
      resetTouch();
    };

    const handleTouchCancel = () => resetTouch();

    // Safety net — catches touches that end outside the canvas on iOS
    window.addEventListener("touchend", handleTouchEnd as EventListener, {
      passive: true,
    });
    window.addEventListener("touchcancel", handleTouchCancel, {
      passive: true,
    });

    canvas.addEventListener("wheel", handleWheel, { passive: false });
    canvas.addEventListener("touchstart", handleTouchStart, { passive: false });
    canvas.addEventListener("touchmove", handleTouchMove, { passive: false });
    canvas.addEventListener("touchend", handleTouchEnd as EventListener, {
      passive: true,
    });
    canvas.addEventListener("touchcancel", handleTouchCancel, {
      passive: true,
    });
    // Pre-load all gallery textures once — segments reuse from cache, no repeat fetches
    const tl = new THREE.TextureLoader();
    let pendingTextures = imageUrls.length;
    imageUrls.forEach((url) => {
      tl.load(url, (tex) => {
        tex.minFilter = THREE.LinearFilter;
        tex.generateMipmaps = false;
        textureCacheRef.current.push(tex);
        pendingTextures -= 1;
        // Rebuild segment images once all textures are ready
        if (pendingTextures === 0) {
          segmentsRef.current.forEach((seg) => {
            const w = TUNNEL_WIDTH / 2;
            const h = TUNNEL_HEIGHT / 2;
            populateImages(seg, w, h, SEGMENT_DEPTH);
          });
        }
      });
    });

    // Load camo texture once, then build all segments
    const camoTex = new THREE.TextureLoader().load(
      "/brand/tunnel_bg.png",
      () => tryReveal(), // asset 2 ready
    );
    camoTex.wrapS = THREE.RepeatWrapping;
    camoTex.wrapT = THREE.RepeatWrapping;

    const segments: THREE.Group[] = [];
    for (let i = 0; i < NUM_SEGMENTS; i++) {
      const z = -i * SEGMENT_DEPTH;
      const segment = createSegment(z, camoTex);
      scene.add(segment);
      segments.push(segment);
    }
    segmentsRef.current = segments;

    // Animation Loop
    let frameId: number;
    const animate = () => {
      frameId = requestAnimationFrame(animate);
      if (!cameraRef.current || !sceneRef.current || !rendererRef.current)
        return;

      dragRotationYRef.current += rotationVelocityRef.current;
      rotationVelocityRef.current *= 0.88;

      if (rogueRef.current) {
        rogueRef.current.rotation.y = dragRotationYRef.current;
      }

      if (logoMeshRef.current) {
        logoMeshRef.current.rotation.y += 0.008;
      }

      const dz = cameraTargetZRef.current - cameraRef.current.position.z;
      if (Math.abs(dz) < 0.05) {
        cameraRef.current.position.z = cameraTargetZRef.current;
      } else {
        cameraRef.current.position.z += dz * 0.1;
      }

      // Bidirectional Infinite Logic
      const tunnelLength = NUM_SEGMENTS * SEGMENT_DEPTH;
      const camZ = cameraRef.current.position.z;

      segmentsRef.current.forEach((segment) => {
        // 1. Moving Forward
        if (segment.position.z > camZ + SEGMENT_DEPTH) {
          let minZ = 0;
          segmentsRef.current.forEach(
            (s) => (minZ = Math.min(minZ, s.position.z)),
          );
          segment.position.z = minZ - SEGMENT_DEPTH;

          // Re-populate
          const toRemove: THREE.Object3D[] = [];
          segment.traverse((c) => {
            if (c.name === "slab_image") toRemove.push(c);
          });
          toRemove.forEach((c) => {
            segment.remove(c);
            if (c instanceof THREE.Mesh) {
              c.geometry.dispose();
              if (c.material.map) c.material.map.dispose();
              c.material.dispose();
            }
          });
          const w = TUNNEL_WIDTH / 2;
          const h = TUNNEL_HEIGHT / 2;
          const d = SEGMENT_DEPTH;
          populateImages(segment, w, h, d);
        }

        // 2. Moving Backward
        if (segment.position.z < camZ - tunnelLength - SEGMENT_DEPTH) {
          let maxZ = -999999;
          segmentsRef.current.forEach(
            (s) => (maxZ = Math.max(maxZ, s.position.z)),
          );
          segment.position.z = maxZ + SEGMENT_DEPTH;

          // Re-populate
          const toRemove: THREE.Object3D[] = [];
          segment.traverse((c) => {
            if (c.name === "slab_image") toRemove.push(c);
          });
          toRemove.forEach((c) => {
            segment.remove(c);
            if (c instanceof THREE.Mesh) {
              c.geometry.dispose();
              if (c.material.map) c.material.map.dispose();
              c.material.dispose();
            }
          });
          const w = TUNNEL_WIDTH / 2;
          const h = TUNNEL_HEIGHT / 2;
          const d = SEGMENT_DEPTH;
          populateImages(segment, w, h, d);
        }
      });

      rendererRef.current.render(sceneRef.current, cameraRef.current);
    };
    animate();

    const handleResize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      canvas.removeEventListener("wheel", handleWheel);
      canvas.removeEventListener("touchstart", handleTouchStart);
      canvas.removeEventListener("touchmove", handleTouchMove);
      canvas.removeEventListener("touchend", handleTouchEnd as EventListener);
      canvas.removeEventListener("touchcancel", handleTouchCancel);
      window.removeEventListener("touchend", handleTouchEnd as EventListener);
      window.removeEventListener("touchcancel", handleTouchCancel);
      window.removeEventListener("resize", handleResize);
      clearTimeout(fallbackTimer);
      cancelAnimationFrame(frameId);
      renderer.dispose();
    };
  }, []); // Run once on mount

  // --- THEME UPDATE EFFECT ---
  useEffect(() => {
    if (!sceneRef.current) return;

    const bgHex = isDarkMode ? 0x050505 : 0xffffff;
    const fogHex = isDarkMode ? 0x050505 : 0xffffff;

    // Light mode: Light Grey lines (0xb0b0b0), higher opacity
    // Dark mode: Medium Grey lines (0x555555) for visibility, slightly adjusted opacity
    const lineHex = isDarkMode ? 0x555555 : 0xb0b0b0;
    const lineOp = isDarkMode ? 0.35 : 0.5;

    sceneRef.current.background = new THREE.Color(bgHex);
    if (sceneRef.current.fog) {
      (sceneRef.current.fog as THREE.FogExp2).color.setHex(fogHex);
    }

    // Apply to existing grid lines
    segmentsRef.current.forEach((segment) => {
      segment.children.forEach((child) => {
        if (child instanceof THREE.LineSegments) {
          const mat = child.material as THREE.LineBasicMaterial;
          mat.color.setHex(lineHex);
          mat.opacity = lineOp;
          mat.needsUpdate = true;
        }
      });
    });
  }, [isDarkMode]);

  // Text Entrance Animation
  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        contentRef.current,
        { opacity: 0, y: 30, scale: 0.95 },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 1.2,
          ease: "power3.out",
          delay: 0.5,
        },
      );
    }, containerRef);
    return () => ctx.revert();
  }, []);

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-screen overflow-hidden transition-colors duration-700 ${isDarkMode ? "bg-[#050505]" : "bg-white"}`}
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full block"
        style={{ touchAction: "none" }}
      />
      {/* Top-left wordmark — home button */}
      <a
        href="/onboarding"
        aria-label="ROGU3 Home"
        style={{
          position: "fixed",
          top: 0,
          left: "1.5rem",
          zIndex: 100,
          textDecoration: "none",
        }}
      >
        <img
          src="/brand/RS_wordlogo.PNG"
          alt="ROGU3"
          style={{
            display: "block",
            marginTop: "-2rem",
            height: "300px",
            width: "auto",
            objectFit: "contain",
            opacity: 0.9,
          }}
        />
      </a>
      <FloatingNav />
      {/* Loading overlay — hides canvas until hallway texture + ROGU3 are both ready */}
      <div
        ref={loadOverlayRef}
        style={{
          position: "absolute",
          inset: 0,
          background: "#050505",
          zIndex: 90,
          pointerEvents: "auto",
        }}
      />
    </div>
  );
};

export default Hero;
