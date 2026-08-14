"use client";

import { useEffect, useRef } from "react";

export function PremiumHeroBackground() {
  const containerRef = useRef<HTMLDivElement | null>(null);
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

    // Mouse coordinates for interactive spotlight
    let mouseX = width / 2;
    let mouseY = 150;

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      mouseX = e.clientX - rect.left;
      mouseY = e.clientY - rect.top;
    };
    window.addEventListener("mousemove", handleMouseMove);

    // Magic UI Flickering grid nodes (subtle, clean, elegant)
    const gridSize = 44;
    const cols = Math.ceil(width / gridSize);
    const rows = Math.ceil(height / gridSize);
    const gridNodes: { x: number; y: number; opacity: number; targetOpacity: number; speed: number }[] = [];

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (Math.random() > 0.85) {
          gridNodes.push({
            x: c * gridSize,
            y: r * gridSize,
            opacity: 0,
            targetOpacity: Math.random() * 0.3 + 0.05,
            speed: Math.random() * 0.015 + 0.005,
          });
        }
      }
    }

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // 1. Draw clean subtle background grid lines
      ctx.strokeStyle = "rgba(255, 255, 255, 0.02)";
      ctx.lineWidth = 1;

      for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // 2. Draw Magic UI Flickering grid tiles
      gridNodes.forEach((node) => {
        if (Math.abs(node.opacity - node.targetOpacity) < 0.02) {
          node.targetOpacity = Math.random() > 0.6 ? Math.random() * 0.28 + 0.04 : 0;
        }
        node.opacity += (node.targetOpacity - node.opacity) * node.speed;

        if (node.opacity > 0.01) {
          ctx.fillStyle = `rgba(255, 79, 64, ${node.opacity})`;
          ctx.fillRect(node.x, node.y, gridSize, gridSize);
        }
      });

      // 3. Interactive Cursor Spotlight Glow
      const spotlightGrad = ctx.createRadialGradient(
        mouseX,
        mouseY,
        0,
        mouseX,
        mouseY,
        400
      );
      spotlightGrad.addColorStop(0, "rgba(255, 79, 64, 0.12)");
      spotlightGrad.addColorStop(0.5, "rgba(255, 79, 64, 0.03)");
      spotlightGrad.addColorStop(1, "rgba(0, 0, 0, 0)");

      ctx.fillStyle = spotlightGrad;
      ctx.fillRect(0, 0, width, height);

      // 4. Central ambient red aura behind hero headline
      const centerAura = ctx.createRadialGradient(
        width / 2,
        height * 0.32,
        0,
        width / 2,
        height * 0.32,
        480
      );
      centerAura.addColorStop(0, "rgba(255, 60, 50, 0.14)");
      centerAura.addColorStop(0.5, "rgba(255, 40, 40, 0.04)");
      centerAura.addColorStop(1, "rgba(0, 0, 0, 0)");

      ctx.fillStyle = centerAura;
      ctx.fillRect(0, 0, width, height);

      // 5. Smooth dark fade-out to bottom
      const bottomFade = ctx.createLinearGradient(0, height * 0.55, 0, height);
      bottomFade.addColorStop(0, "rgba(6, 7, 9, 0)");
      bottomFade.addColorStop(1, "rgba(6, 7, 9, 1)");
      ctx.fillStyle = bottomFade;
      ctx.fillRect(0, height * 0.55, width, height * 0.45);

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div ref={containerRef} className="premium-hero-bg">
      <canvas ref={canvasRef} className="premium-hero-canvas" />
    </div>
  );
}
