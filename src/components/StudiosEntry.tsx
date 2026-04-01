import React, { useRef, useState } from "react";
import gsap from "gsap";
import LoadingScreen from "./LoadingScreen";

const StudiosEntry: React.FC = () => {
  const [loadingDone, setLoadingDone] = useState(false);
  const loadingWrapRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const handleComplete = () => {
    // Screen is black — fade loading layer out, content in simultaneously
    gsap.to(loadingWrapRef.current, { opacity: 0, duration: 0.15,
      onComplete: () => setLoadingDone(true),
    });
    gsap.to(contentRef.current, {
      opacity: 1,
      y: 0,
      duration: 0.8,
      delay: 0.1,
      ease: "power3.out",
    });
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "#050505" }}>

      {/* Loading layer */}
      {!loadingDone && (
        <div ref={loadingWrapRef} style={{ position: "absolute", inset: 0, zIndex: 10 }}>
          <LoadingScreen onComplete={handleComplete} />
        </div>
      )}

      {/* Studios content — sits under loading, fades in after */}
      <div
        ref={contentRef}
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0,
          transform: "translateY(20px)",
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
          minHeight: "100vh",
          padding: "clamp(2rem, 5vw, 5rem)",
          color: "#f5f5f7",
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          zIndex: 1,
        }}
      >
        <p style={{ fontSize: "0.72rem", letterSpacing: "0.28em", textTransform: "uppercase", opacity: 0.4, marginBottom: "0.75rem" }}>
          Creative Division
        </p>
        <h1 style={{ fontSize: "clamp(3.5rem, 9vw, 9rem)", fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 0.92, margin: "0 0 1.5rem" }}>
          Studios
        </h1>
        <p style={{ fontSize: "1rem", opacity: 0.5, maxWidth: "44ch", lineHeight: 1.6, marginBottom: "2.5rem" }}>
          Where the work gets made. Film, design, and direction — coming soon.
        </p>
        <a href="/onboarding" style={{ fontSize: "0.72rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(255,255,255,0.35)", textDecoration: "none", fontWeight: 600 }}>
          ← Back
        </a>
      </div>
    </div>
  );
};

export default StudiosEntry;
