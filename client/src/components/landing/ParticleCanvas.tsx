import { useEffect, useRef } from "react";

interface Particle {
  x: number; y: number; vx: number; vy: number; size: number; opacity: number;
}

export function ParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let animId: number;
    let particles: Particle[] = [];
    let frame = 0;
    const SKIP = 4;
    const MAX = 22;
    const LINE_DIST = 90;
    const LINE_LIMIT = 12;

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas!.width = window.innerWidth * dpr;
      canvas!.height = window.innerHeight * dpr;
      canvas!.style.width = `${window.innerWidth}px`;
      canvas!.style.height = `${window.innerHeight}px`;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    let rt: ReturnType<typeof setTimeout>;
    function debounceR() {
      clearTimeout(rt);
      rt = setTimeout(() => { resize(); createP(); }, 200);
    }

    function createP() {
      particles = [];
      const n = Math.min(MAX, Math.floor(window.innerWidth / 60));
      for (let i = 0; i < n; i++) {
        particles.push({
          x: Math.random() * window.innerWidth,
          y: Math.random() * window.innerHeight,
          vx: (Math.random() - 0.5) * 0.15,
          vy: (Math.random() - 0.5) * 0.15,
          size: Math.random() * 1.5 + 0.5,
          opacity: Math.random() * 0.2 + 0.06,
        });
      }
    }

    function draw() {
      frame++;
      if (frame % SKIP !== 0) { animId = requestAnimationFrame(draw); return; }
      const w = window.innerWidth, h = window.innerHeight;
      ctx!.clearRect(0, 0, w, h);
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        if (i < LINE_LIMIT) {
          for (let j = i + 1; j < Math.min(particles.length, LINE_LIMIT * 2); j++) {
            const dx = p.x - particles[j].x, dy = p.y - particles[j].y;
            const d = Math.sqrt(dx * dx + dy * dy);
            if (d < LINE_DIST) {
              ctx!.beginPath(); ctx!.moveTo(p.x, p.y); ctx!.lineTo(particles[j].x, particles[j].y);
              ctx!.strokeStyle = `rgba(16,185,129,${(0.03 * (1 - d / LINE_DIST)).toFixed(3)})`;
              ctx!.lineWidth = 0.4; ctx!.stroke();
            }
          }
        }
        ctx!.beginPath(); ctx!.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx!.fillStyle = `rgba(16,185,129,${p.opacity})`; ctx!.fill();
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = w; if (p.x > w) p.x = 0;
        if (p.y < 0) p.y = h; if (p.y > h) p.y = 0;
      }
      animId = requestAnimationFrame(draw);
    }

    resize(); createP(); draw();
    window.addEventListener("resize", debounceR, { passive: true });
    return () => { cancelAnimationFrame(animId); clearTimeout(rt); window.removeEventListener("resize", debounceR); };
  }, []);

  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-0" style={{ willChange: "transform" }} aria-hidden="true" />;
}
