"use client";

import { useEffect, useRef } from "react";

export function AnimatedRedBeams() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = canvas.offsetWidth);
    let height = (canvas.height = canvas.offsetHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = canvas.offsetWidth;
      height = canvas.height = canvas.offsetHeight;
    };
    window.addEventListener("resize", handleResize);

    // Beams configuration (Raycast signature angled light pillars)
    const beams = [
      { x: 0.2, width: 80, speed: 0.0008, phase: 0, opacity: 0.35 },
      { x: 0.35, width: 120, speed: 0.0012, phase: 1.5, opacity: 0.5 },
      { x: 0.5, width: 160, speed: 0.0009, phase: 3.0, opacity: 0.65 },
      { x: 0.65, width: 110, speed: 0.0015, phase: 4.2, opacity: 0.45 },
      { x: 0.8, width: 90, speed: 0.001, phase: 2.1, opacity: 0.3 },
    ];

    // Floating particles
    const particles = Array.from({ length: 45 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() * 2 + 0.5,
      speedY: -(Math.random() * 0.4 + 0.1),
      speedX: (Math.random() - 0.5) * 0.2,
      opacity: Math.random() * 0.6 + 0.2,
    }));

    let time = 0;

    const render = () => {
      time += 1;
      ctx.clearRect(0, 0, width, height);

      // Save context for angled transformation
      ctx.save();

      // Render Raycast diagonal glowing pillars
      beams.forEach((beam) => {
        const pulse = Math.sin(time * beam.speed * 20 + beam.phase) * 0.15 + 0.85;
        const currentOpacity = beam.opacity * pulse;

        const startX = width * beam.x + Math.sin(time * beam.speed * 10) * 30;
        const beamW = beam.width * pulse;

        // Linear gradient for each beam (Raycast Red / Crimson #ff3b30 to transparent)
        const grad = ctx.createLinearGradient(
          startX - 200,
          0,
          startX + 200,
          height
        );
        grad.addColorStop(0, `rgba(255, 60, 50, 0)`);
        grad.addColorStop(0.3, `rgba(255, 65, 54, ${currentOpacity * 0.8})`);
        grad.addColorStop(0.5, `rgba(255, 45, 85, ${currentOpacity})`);
        grad.addColorStop(0.7, `rgba(220, 20, 60, ${currentOpacity * 0.6})`);
        grad.addColorStop(1, `rgba(180, 10, 40, 0)`);

        ctx.fillStyle = grad;
        ctx.beginPath();
        // Angled polygon (Raycast diagonal slice)
        const angleOffset = height * 0.45;
        ctx.moveTo(startX - beamW / 2 + angleOffset, 0);
        ctx.lineTo(startX + beamW / 2 + angleOffset, 0);
        ctx.lineTo(startX + beamW / 2 - angleOffset, height);
        ctx.lineTo(startX - beamW / 2 - angleOffset, height);
        ctx.closePath();
        ctx.fill();
      });

      ctx.restore();

      // Render floating micro-particles
      particles.forEach((p) => {
        p.y += p.speedY;
        p.x += p.speedX;
        if (p.y < 0) p.y = height;
        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;

        ctx.fillStyle = `rgba(255, 120, 100, ${p.opacity})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      });

      // Top and bottom smooth dark vignette so text is always high-contrast
      const vignette = ctx.createLinearGradient(0, 0, 0, height);
      vignette.addColorStop(0, "rgba(6, 7, 9, 0.4)");
      vignette.addColorStop(0.4, "rgba(6, 7, 9, 0.15)");
      vignette.addColorStop(0.85, "rgba(6, 7, 9, 0.7)");
      vignette.addColorStop(1, "rgba(6, 7, 9, 1)");

      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, width, height);

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="animated-red-hero-bg">
      <canvas ref={canvasRef} className="animated-red-canvas" />
    </div>
  );
}
