import React, { useRef, useEffect } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import gsap from "gsap";

const BUBBLE = 240;
const RING_R = 108;
const CIRC = 2 * Math.PI * RING_R;

interface LoadingScreenProps {
  onComplete?: () => void;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({ onComplete }) => {
  const canvasRef   = useRef<HTMLCanvasElement>(null);
  const wrapRef     = useRef<HTMLDivElement>(null);
  const ringRef     = useRef<SVGCircleElement>(null);
  const img2dRef    = useRef<HTMLImageElement>(null);
  const overlayRef  = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    // ── Three.js: eye logo spinning inside bubble ──────────────────────────
    const canvas = canvasRef.current;
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setSize(BUBBLE, BUBBLE);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const scene  = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
    camera.position.set(0, 0, 5);

    scene.add(new THREE.AmbientLight(0xffffff, 2.2));
    const dir = new THREE.DirectionalLight(0xffffff, 2.5);
    dir.position.set(3, 5, 5);
    scene.add(dir);
    const rim = new THREE.DirectionalLight(0xaaddff, 1.2);
    rim.position.set(-4, 2, -3);
    scene.add(rim);

    let pivot: THREE.Group | null = null;
    let frameId: number;

    const animate = () => {
      frameId = requestAnimationFrame(animate);
      if (pivot) pivot.rotation.y += 0.018;
      renderer.render(scene, camera);
    };
    animate();

    // ── Morph sequence ─────────────────────────────────────────────────────
    const doMorph = () => {
      const tl = gsap.timeline();

      // 1. Fade 3D out, 2D eye image in
      tl.to(canvas, { opacity: 0, duration: 0.35, ease: "power2.out" })
        .to(img2dRef.current, { opacity: 1, duration: 0.35, ease: "power2.in" }, "-=0.15")

        // 2. Brief pause so the 2D image is visible
        .addLabel("shrink", "+=0.25")

        // 3. Shrink bubble to nav-button size and slide to its screen position
        // Nav button: left:1.5rem(24px), top:50%, size:58px  →  center x = 53, center y = vh/2
        // Bubble center: vw/2, vh/2  →  dx = 53 - vw/2, dy = 0
        .to(wrapRef.current, {
          x: 53 - window.innerWidth / 2,
          y: 0,
          width: 58,
          height: 58,
          duration: 0.75,
          ease: "power3.inOut",
          label: "shrink",
        })

        // 4. Fade the SVG ring out as it shrinks (it disappears into the button)
        .to(".loading-ring-svg", { opacity: 0, duration: 0.3, ease: "power2.out" }, "shrink")

        // 5. Full-screen overlay fades in → navigate
        .to(overlayRef.current, {
          opacity: 1,
          duration: 0.4,
          ease: "power2.inOut",
          onComplete: () => {
            if (onComplete) {
              onComplete();
            } else {
              sessionStorage.setItem("rogu3_loaded", "1");
              window.location.href = "/onboarding";
            }
          },
        }, "+=0.1");
    };

    // ── Load GLB — ring tracks real download progress ──────────────────────
    const loader = new GLTFLoader();
    loader.load(
      "/brand/Rogu3 eye logo .glb",
      (gltf) => {
        // File fully loaded — mount model
        const model = gltf.scene;
        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        model.position.sub(center);
        pivot = new THREE.Group();
        pivot.add(model);
        scene.add(pivot);
        // Snap ring to 100%, brief pause so user sees it complete, then morph
        if (ringRef.current) ringRef.current.style.strokeDashoffset = "0";
        setTimeout(doMorph, 400);
      },
      (e) => {
        // e.total is 0 when the server sends no Content-Length header;
        // fall back to an indeterminate slow-fill so the ring still moves
        const p = e.total > 0 ? e.loaded / e.total : null;
        if (ringRef.current) {
          if (p !== null) {
            ringRef.current.style.strokeDashoffset = String(CIRC * (1 - p));
          } else {
            // Indeterminate: slowly creep to 90% using elapsed time as proxy
            const elapsed = performance.now();
            const soft = 1 - Math.exp(-elapsed / 30000); // asymptote toward 90%
            ringRef.current.style.strokeDashoffset = String(CIRC * (1 - soft * 0.9));
          }
        }
      },
      (err) => {
        console.error("GLB load error", err);
        doMorph(); // don't block the user on error
      }
    );

    return () => {
      cancelAnimationFrame(frameId);
      renderer.dispose();
    };
  }, []);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "#050505",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      {/* Wrapper — GSAP animates this to the nav-button position */}
      <div
        ref={wrapRef}
        style={{
          position: "relative",
          width: BUBBLE,
          height: BUBBLE,
          flexShrink: 0,
        }}
      >
        {/* Progress ring SVG */}
        <svg
          className="loading-ring-svg"
          width={BUBBLE}
          height={BUBBLE}
          style={{ position: "absolute", inset: 0, zIndex: 2, pointerEvents: "none" }}
        >
          {/* Track */}
          <circle
            cx={BUBBLE / 2}
            cy={BUBBLE / 2}
            r={RING_R}
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="1.5"
          />
          {/* Animated fill */}
          <circle
            ref={ringRef}
            cx={BUBBLE / 2}
            cy={BUBBLE / 2}
            r={RING_R}
            fill="none"
            stroke="rgba(255,255,255,0.6)"
            strokeWidth="1.5"
            strokeDasharray={CIRC}
            strokeDashoffset={CIRC}
            strokeLinecap="round"
            transform={`rotate(-90, ${BUBBLE / 2}, ${BUBBLE / 2})`}
            style={{ transition: "none" }}
          />
        </svg>

        {/* Glass bubble */}
        <div
          style={{
            position: "absolute",
            inset: "10px",
            borderRadius: "50%",
            background: "rgba(255,255,255,0.06)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            border: "1px solid rgba(255,255,255,0.18)",
            boxShadow:
              "0 12px 60px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.22)",
            overflow: "hidden",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {/* Glass shimmer */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: "50%",
              background:
                "linear-gradient(135deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0) 55%)",
              pointerEvents: "none",
              zIndex: 1,
            }}
          />

          {/* Three.js canvas — 3D eye logo */}
          <canvas
            ref={canvasRef}
            width={BUBBLE}
            height={BUBBLE}
            style={{ display: "block", borderRadius: "50%" }}
          />

          {/* 2D nav_trigger image — fades in after morph */}
          <img
            ref={img2dRef}
            src="/brand/nav_trigger.png"
            alt="ROGU3"
            style={{
              position: "absolute",
              width: "80%",
              height: "80%",
              objectFit: "cover",
              borderRadius: "50%",
              opacity: 0,
              zIndex: 2,
            }}
          />
        </div>
      </div>

      {/* Full-screen dark overlay for exit transition */}
      <div
        ref={overlayRef}
        style={{
          position: "fixed",
          inset: 0,
          background: "#050505",
          opacity: 0,
          pointerEvents: "none",
          zIndex: 50,
        }}
      />
    </div>
  );
};

export default LoadingScreen;
