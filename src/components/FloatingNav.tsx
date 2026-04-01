import React, { useState } from "react";

const navItems = [
  { label: "Shop",    href: "/shop" },
  { label: "About",   href: "/about" },
  { label: "Studios", href: "/studios" },
  { label: "Contact", href: "/contact" },
];

interface FloatingNavProps {
  onShopNavigate?: () => void;
  onStudiosNavigate?: () => void;
}

const FloatingNav: React.FC<FloatingNavProps> = ({ onShopNavigate, onStudiosNavigate }) => {
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);

  const onSamePage = (href: string) =>
    typeof window !== "undefined" && window.location.pathname === href;

  const handleClick = (href: string, customHandler?: () => void) => {
    if (onSamePage(href)) {
      window.location.reload();
      return;
    }
    if (customHandler) {
      customHandler();
    } else {
      window.location.href = href;
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        left: "1.5rem",
        top: "50%",
        transform: "translateY(-50%)",
        zIndex: 100,
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        gap: "0.75rem",
      }}
    >
      {/* Trigger pill — vertical capsule */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: "58px",
          height: "58px",
          borderRadius: "50%",
          background: "rgba(255,255,255,0.08)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          border: open
            ? "1px solid rgba(255,255,255,0.4)"
            : "1px solid rgba(255,255,255,0.18)",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 0,
          boxShadow: open
            ? "0 0 0 5px rgba(255,255,255,0.05), 0 12px 40px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.15)"
            : "0 8px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)",
          transition: "all 0.35s cubic-bezier(0.4,0,0.2,1)",
          transform: open ? "scale(1.08)" : "scale(1)",
          outline: "none",
          flexShrink: 0,
          overflow: "hidden",
          position: "relative",
        }}
        aria-label="Toggle navigation"
      >
        {/* Glass shimmer overlay */}
        <div style={{
          position: "absolute",
          inset: 0,
          borderRadius: "50%",
          background: "linear-gradient(135deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0) 60%)",
          pointerEvents: "none",
        }} />
        <img
          src="/brand/nav_trigger.png"
          alt="menu"
          style={{
            width: "38px",
            height: "38px",
            objectFit: "cover",
            borderRadius: "50%",
            opacity: open ? 0.75 : 1,
            transition: "opacity 0.3s ease",
          }}
        />
      </button>

      {/* Expanded menu — slides in from the left */}
      <div
        style={{
          overflow: "hidden",
          maxWidth: open ? "220px" : "0px",
          opacity: open ? 1 : 0,
          transition: "max-width 0.4s cubic-bezier(0.4,0,0.2,1), opacity 0.3s ease",
          pointerEvents: open ? "auto" : "none",
        }}
      >
        <div
          style={{
            background: "rgba(12,12,12,0.65)",
            backdropFilter: "blur(28px)",
            WebkitBackdropFilter: "blur(28px)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "1.25rem",
            padding: "0.4rem",
            display: "flex",
            flexDirection: "column",
            gap: "2px",
            boxShadow: "0 16px 48px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)",
            whiteSpace: "nowrap",
          }}
        >
          {navItems.map((item) => {
            const customHandler =
              item.label === "Shop" ? onShopNavigate :
              item.label === "Studios" ? onStudiosNavigate :
              undefined;
            const sharedStyle: React.CSSProperties = {
              display: "flex",
              alignItems: "center",
              gap: "0.65rem",
              padding: "0.65rem 1.1rem",
              color: hovered === item.label ? "rgba(255,255,255,1)" : "rgba(255,255,255,0.7)",
              fontSize: "0.78rem",
              fontWeight: 600,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              borderRadius: "0.85rem",
              textDecoration: "none",
              background: hovered === item.label ? "rgba(255,255,255,0.1)" : "transparent",
              transition: "all 0.15s ease",
              boxShadow: hovered === item.label ? "inset 0 1px 0 rgba(255,255,255,0.1)" : "none",
              cursor: "pointer",
              border: "none",
              width: "100%",
              textAlign: "left",
            };
            const dot = (
              <span
                style={{
                  width: "5px",
                  height: "5px",
                  borderRadius: "50%",
                  background: hovered === item.label ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.3)",
                  flexShrink: 0,
                  transition: "background 0.15s ease",
                }}
              />
            );
            return (
              <button
                key={item.label}
                onMouseEnter={() => setHovered(item.label)}
                onMouseLeave={() => setHovered(null)}
                onClick={() => handleClick(item.href, customHandler)}
                style={sharedStyle}
              >
                {dot}
                {item.label}
              </button>
            );
          })}

          {/* Subtle divider + branding */}
          <div style={{
            margin: "0.3rem 0.8rem 0.2rem",
            height: "1px",
            background: "rgba(255,255,255,0.07)",
          }} />
          <div style={{
            padding: "0.4rem 1.1rem",
            fontSize: "0.6rem",
            letterSpacing: "0.2em",
            color: "rgba(255,255,255,0.2)",
            textTransform: "uppercase",
            fontWeight: 600,
          }}>
            ROGU3
          </div>
        </div>
      </div>
    </div>
  );
};

export default FloatingNav;
