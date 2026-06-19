import { useEffect, useRef } from "react";

/* Animated neon city street banner — draws a cross-sectional city skyline
   with glowing windows, animated cars, and street lamps using Canvas 2D. */
export default function CityStreetScene({ height = 180 }: { height?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = canvas.offsetWidth;
    const H = height;
    canvas.width = W;
    canvas.height = H;

    /* Buildings config */
    const BUILDINGS = [
      { x: 0, w: 60, h: 110, color: "#1e3a8a", win: "#60a5fa" },
      { x: 65, w: 45, h: 80, color: "#1d4ed8", win: "#93c5fd" },
      { x: 115, w: 55, h: 145, color: "#4c1d95", win: "#a78bfa" },
      { x: 175, w: 40, h: 95, color: "#3b0764", win: "#c4b5fd" },
      { x: 220, w: 70, h: 120, color: "#064e3b", win: "#34d399" },
      { x: 295, w: 50, h: 160, color: "#1e3a8a", win: "#60a5fa" },
      { x: 350, w: 45, h: 90, color: "#78350f", win: "#fbbf24" },
      { x: 400, w: 65, h: 130, color: "#7c2d12", win: "#fb923c" },
      { x: 470, w: 40, h: 75, color: "#1e1b4b", win: "#818cf8" },
      { x: 515, w: 80, h: 155, color: "#134e4a", win: "#2dd4bf" },
      { x: 600, w: 55, h: 100, color: "#713f12", win: "#fde68a" },
      { x: 660, w: 48, h: 120, color: "#1d4ed8", win: "#7dd3fc" },
      { x: 712, w: 65, h: 88, color: "#4c1d95", win: "#ddd6fe" },
      { x: 782, w: 55, h: 135, color: "#064e3b", win: "#6ee7b7" },
      { x: 840, w: 40, h: 95, color: "#1e3a8a", win: "#60a5fa" },
      { x: 885, w: 70, h: 150, color: "#3b0764", win: "#e879f9" },
      { x: 960, w: 55, h: 110, color: "#78350f", win: "#f59e0b" },
      { x: 1020, w: 50, h: 80, color: "#134e4a", win: "#14b8a6" },
      { x: 1075, w: 75, h: 140, color: "#1e1b4b", win: "#a5b4fc" },
      { x: 1155, w: 45, h: 100, color: "#7c2d12", win: "#fdba74" },
      { x: 1205, w: 60, h: 165, color: "#4c1d95", win: "#c4b5fd" },
    ];

    /* Cars */
    const CARS = Array.from({ length: 6 }, (_, i) => ({
      x: (i * 220 + Math.random() * 100) % W,
      y: H - 18,
      speed: 0.8 + Math.random() * 1.2,
      color: ["#f5a524", "#3b82f6", "#22c55e", "#ec4899", "#e11d48", "#0ea5e9"][i % 6],
      dir: i % 2 === 0 ? 1 : -1,
      w: 22 + Math.random() * 10,
    }));

    let t = 0;

    function draw() {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, W, H);

      /* Sky gradient */
      const sky = ctx.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, "#050d1e");
      sky.addColorStop(1, "#0a1428");
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, W, H);

      /* Buildings */
      BUILDINGS.forEach(b => {
        const by = H - 30 - b.h;
        ctx.fillStyle = b.color;
        ctx.fillRect(b.x, by, b.w, b.h);

        /* Neon outline */
        ctx.strokeStyle = b.win + "88";
        ctx.lineWidth = 1;
        ctx.strokeRect(b.x, by, b.w, b.h);

        /* Windows */
        for (let wy = by + 8; wy < H - 30; wy += 14) {
          for (let wx = b.x + 5; wx < b.x + b.w - 5; wx += 12) {
            const pulse = 0.5 + 0.5 * Math.sin(t * 0.03 + wx * 0.1 + wy * 0.07);
            ctx.fillStyle = b.win + Math.floor(80 + 80 * pulse).toString(16);
            ctx.fillRect(wx, wy, 7, 8);
          }
        }

        /* Roof antenna */
        ctx.strokeStyle = b.win;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(b.x + b.w / 2, by);
        ctx.lineTo(b.x + b.w / 2, by - 12);
        ctx.stroke();
        const antennaGlow = 0.5 + 0.5 * Math.sin(t * 0.08 + b.x);
        ctx.fillStyle = b.win;
        ctx.globalAlpha = antennaGlow;
        ctx.beginPath();
        ctx.arc(b.x + b.w / 2, by - 13, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      });

      /* Road */
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(0, H - 30, W, 30);

      /* Road markings */
      ctx.fillStyle = "#f5a524";
      ctx.globalAlpha = 0.3;
      for (let rx = (t * 1.5) % 60; rx < W; rx += 60) {
        ctx.fillRect(rx, H - 17, 35, 3);
      }
      ctx.globalAlpha = 1;

      /* Sidewalk */
      ctx.fillStyle = "#1e293b";
      ctx.fillRect(0, H - 35, W, 8);

      /* Street lamps */
      for (let lx = 80; lx < W; lx += 160) {
        ctx.strokeStyle = "#94a3b8";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(lx, H - 35);
        ctx.lineTo(lx, H - 80);
        ctx.lineTo(lx + 15, H - 80);
        ctx.stroke();
        const lampGlow = 0.7 + 0.3 * Math.sin(t * 0.05 + lx);
        ctx.shadowBlur = 12;
        ctx.shadowColor = `rgba(245,165,36,${lampGlow})`;
        ctx.fillStyle = `rgba(255,220,120,${lampGlow})`;
        ctx.beginPath();
        ctx.arc(lx + 15, H - 80, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      /* Cars */
      CARS.forEach(car => {
        car.x += car.speed * car.dir;
        if (car.dir > 0 && car.x > W + 40) car.x = -40;
        if (car.dir < 0 && car.x < -40) car.x = W + 40;

        ctx.fillStyle = car.color;
        ctx.fillRect(car.x, car.y - 10, car.w, 10);

        /* Headlights */
        ctx.shadowBlur = 12;
        ctx.shadowColor = car.color;
        ctx.fillStyle = "#fff8";
        if (car.dir > 0) {
          ctx.fillRect(car.x + car.w - 3, car.y - 7, 4, 5);
        } else {
          ctx.fillRect(car.x - 1, car.y - 7, 4, 5);
        }
        ctx.shadowBlur = 0;
      });

      t++;
      frameRef.current = requestAnimationFrame(draw);
    }

    frameRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frameRef.current);
  }, [height]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full rounded-xl"
      style={{ height, display: "block" }}
    />
  );
}
