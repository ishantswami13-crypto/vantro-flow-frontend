import React, { useRef } from 'react';

export default function TiltCard({ children, className = '', style = {}, intensity = 10, gloss = true }) {
  const ref = useRef(null);
  const glossRef = useRef(null);

  const handleMouseMove = (e) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    const tiltX = (y - 0.5) * -intensity;
    const tiltY = (x - 0.5) * intensity;
    el.style.transform = `perspective(900px) rotateX(${tiltX}deg) rotateY(${tiltY}deg) translateZ(10px)`;
    if (glossRef.current) {
      glossRef.current.style.background = `radial-gradient(circle at ${x * 100}% ${y * 100}%, rgba(255,255,255,0.18) 0%, transparent 65%)`;
      glossRef.current.style.opacity = '1';
    }
  };

  const handleMouseLeave = () => {
    const el = ref.current;
    if (!el) return;
    el.style.transform = 'perspective(900px) rotateX(0deg) rotateY(0deg) translateZ(0px)';
    if (glossRef.current) glossRef.current.style.opacity = '0';
  };

  return (
    <div
      ref={ref}
      className={`tilt-card ${className}`}
      style={{ ...style, transition: 'transform 0.12s ease-out', transformStyle: 'preserve-3d', willChange: 'transform' }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {gloss && (
        <div
          ref={glossRef}
          style={{
            position: 'absolute', inset: 0, borderRadius: 'inherit',
            pointerEvents: 'none', opacity: 0,
            transition: 'opacity 0.3s ease', zIndex: 1,
          }}
        />
      )}
      {children}
    </div>
  );
}
