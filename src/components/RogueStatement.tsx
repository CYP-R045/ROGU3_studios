import React, { useEffect, useRef, useState } from "react";
import gsap from "gsap";

type GalleryKey = "studios" | "contact";

const GALLERY_IMAGES: Record<GalleryKey, string[]> = {
  studios: [
    "/studios/IMG_0853.jpg",
    "/studios/IMG_6932.jpeg",
    "/studios/RRR.jpeg",
    "/studios/Screenshot 2026-09-10 at 23.57.17.jpeg",
    "/studios/Screenshot 2026-09-10 at 23.58.28.jpeg",
    "/studios/Screenshot 2026-09-10 at 23.59.54.jpeg",
    "/studios/Screenshot 2026-09-11 at 00.06.45.jpeg",
  ].map(encodeURI),
  contact: [
    "/brand/Placeholder_H3.webp",
    "/brand/Placeholder_H5.webp",
    "/brand/Placeholder_H1.webp",
    "/brand/Placeholder_H4.webp",
    "/brand/Placeholder_H2.webp",
  ],
};

const MENU_ITEMS: { key: GalleryKey; label: string }[] = [
  { key: "studios", label: "Studios" },
  { key: "contact", label: "Reach out" },
];

const RogueStatement: React.FC = () => {
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [activeKey, setActiveKey] = useState<GalleryKey>("studios");
  const [zoomedSrc, setZoomedSrc] = useState<string | null>(null);

  const textRef = useRef<HTMLParagraphElement>(null);
  const galleryRef = useRef<HTMLDivElement>(null);
  const imagesRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const prevOpenRef = useRef(false);
  const prevKeyRef = useRef<GalleryKey>("studios");

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (galleryOpen && activeKey === "studios") {
      video.play().catch(() => {});
    } else {
      video.pause();
      if (!galleryOpen) video.currentTime = 0;
    }
  }, [galleryOpen, activeKey]);

  useEffect(() => {
    const justOpened = galleryOpen && !prevOpenRef.current;
    const justClosed = !galleryOpen && prevOpenRef.current;
    const switchedTab = galleryOpen && prevOpenRef.current && activeKey !== prevKeyRef.current;

    const images = imagesRef.current ? gsap.utils.toArray(imagesRef.current.children) : [];

    if (justOpened) {
      gsap
        .timeline()
        .to(textRef.current, { opacity: 0, x: -40, duration: 0.5, ease: "power3.inOut" })
        .set(galleryRef.current, { pointerEvents: "auto" })
        .fromTo(galleryRef.current, { opacity: 0 }, { opacity: 1, duration: 0.4 }, "-=0.2")
        .fromTo(
          images,
          { opacity: 0, x: 40 },
          {
            opacity: (i: number) => Math.max(1 - i * 0.12, 0.35),
            x: 0,
            stagger: 0.06,
            duration: 0.6,
            ease: "power3.out",
          },
          "-=0.15"
        );
    } else if (switchedTab) {
      gsap.fromTo(
        images,
        { opacity: 0, x: 40 },
        {
          opacity: (i: number) => Math.max(1 - i * 0.12, 0.35),
          x: 0,
          stagger: 0.05,
          duration: 0.5,
          ease: "power3.out",
        }
      );
    } else if (justClosed) {
      gsap
        .timeline()
        .to(galleryRef.current, { opacity: 0, duration: 0.35, ease: "power3.inOut" })
        .set(galleryRef.current, { pointerEvents: "none" })
        .to(textRef.current, { opacity: 1, x: 0, duration: 0.5, ease: "power3.out" }, "-=0.1");
    }

    prevOpenRef.current = galleryOpen;
    prevKeyRef.current = activeKey;
  }, [galleryOpen, activeKey]);

  const openGallery = (key: GalleryKey) => {
    setActiveKey(key);
    setGalleryOpen(true);
  };

  const closeGallery = () => setGalleryOpen(false);

  useEffect(() => {
    if (!zoomedSrc) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setZoomedSrc(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [zoomedSrc]);

  return (
    <div style={{ position: "relative" }}>
      <p
        ref={textRef}
        style={{
          fontSize: "clamp(1.5rem, 3.1vw, 2.75rem)",
          fontWeight: 500,
          color: "rgba(245,245,247,0.4)",
          maxWidth: "48ch",
          lineHeight: 1.3,
          letterSpacing: "-0.01em",
          marginBottom: "2.5rem",
        }}
      >
        Rogu3 is built from imagination, not a script. On his own, he has no
        fixed form — he's whatever you need him to be. The{" "}
        <button type="button" className="inline-link" onClick={() => openGallery("studios")}>
          Studios
        </button>{" "}
        exist to give that shape a body: content, animation, thinking, and{" "}
        <a href="/shop" className="inline-link">
          fashion
        </a>{" "}
        pulled out of thought and put into the real world. Got something in
        mind, or need a hand?{" "}
        <button type="button" className="inline-link" onClick={() => openGallery("contact")}>
          Reach out
        </button>
        .
      </p>

      <div
        ref={galleryRef}
        style={{
          position: "fixed",
          inset: 0,
          opacity: 0,
          pointerEvents: "none",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          background: "#050505",
          zIndex: 200,
          overflow: "hidden",
        }}
      >
        <video
          ref={videoRef}
          src="/studios/video/IMG_0148.mp4"
          muted
          loop
          playsInline
          preload="none"
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            opacity: activeKey === "studios" ? 1 : 0,
            transition: "opacity 0.4s ease",
            zIndex: 0,
          }}
        />

        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(5,5,5,0.5)",
            zIndex: 1,
          }}
        />

        <button
          type="button"
          onClick={closeGallery}
          className="inline-link"
          style={{
            position: "absolute",
            top: "2rem",
            right: "2rem",
            fontSize: "0.72rem",
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            zIndex: 2,
          }}
        >
          Close ✕
        </button>

        <div style={{ position: "absolute", top: "2rem", left: "2rem", display: "flex", gap: "1.5rem", zIndex: 2 }}>
          {MENU_ITEMS.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => openGallery(item.key)}
              style={{
                background: "none",
                border: "none",
                padding: 0,
                margin: 0,
                font: "inherit",
                color: "#f5f5f7",
                cursor: "pointer",
                fontSize: "0.72rem",
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                opacity: activeKey === item.key ? 1 : 0.4,
                transition: "opacity 0.2s ease",
              }}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div
          ref={imagesRef}
          className="rogue-gallery-scroll"
          style={{
            position: "relative",
            zIndex: 2,
            display: "flex",
            alignItems: "center",
            gap: "3vw",
            overflowX: "auto",
            overflowY: "hidden",
            scrollSnapType: "x proximity",
            padding: "0 8vw",
            WebkitOverflowScrolling: "touch",
            scrollbarWidth: "none",
          }}
        >
          {GALLERY_IMAGES[activeKey].map((src, i) => (
            <div key={activeKey + i} style={{ flex: "none", scrollSnapAlign: "center" }}>
              <img
                src={src}
                alt=""
                className="rogue-gallery-img"
                onClick={() => setZoomedSrc(src)}
                style={{
                  display: "block",
                  height: "72vh",
                  maxHeight: "680px",
                  width: "auto",
                  maxWidth: "82vw",
                  objectFit: "cover",
                  borderRadius: "6px",
                  boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
                }}
              />
            </div>
          ))}
        </div>

        {activeKey === "contact" && (
          <a
            href="/contact"
            className="inline-link"
            style={{
              position: "absolute",
              bottom: "2.5rem",
              left: "50%",
              transform: "translateX(-50%)",
              fontSize: "0.85rem",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              zIndex: 2,
            }}
          >
            Get in touch →
          </a>
        )}
      </div>

      {zoomedSrc && (
        <div
          className="rogue-zoom-overlay"
          onClick={() => setZoomedSrc(null)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 300,
            background: "rgba(0,0,0,0.85)",
            backdropFilter: "blur(6px)",
            WebkitBackdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "zoom-out",
          }}
        >
          <img
            src={zoomedSrc}
            alt=""
            style={{
              maxWidth: "92vw",
              maxHeight: "90vh",
              borderRadius: "8px",
              boxShadow: "0 30px 100px rgba(0,0,0,0.7)",
            }}
          />
        </div>
      )}
    </div>
  );
};

export default RogueStatement;
