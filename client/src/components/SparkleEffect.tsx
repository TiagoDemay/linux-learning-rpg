import { useEffect, useState } from "react";

interface Particle {
  id: number;
  x: number;
  y: number;
  emoji: string;
  size: number;
  angle: number;
  speed: number;
}

interface SparkleEffectProps {
  active: boolean;
  message?: string;
  onDone?: () => void;
}

const EMOJIS = ["✨", "⭐", "💫", "🌟", "🎉", "🪙", "🏆"];

export default function SparkleEffect({ active, message, onDone }: SparkleEffectProps) {
  const [particles, setParticles] = useState<Particle[]>([]);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!active) return;

    setVisible(true);
    const newParticles: Particle[] = Array.from({ length: 30 }, (_, i) => ({
      id: i,
      x: 30 + Math.random() * 40,
      y: 20 + Math.random() * 60,
      emoji: EMOJIS[Math.floor(Math.random() * EMOJIS.length)],
      size: 1 + Math.random() * 2,
      angle: Math.random() * 360,
      speed: 0.5 + Math.random() * 1.5,
    }));
    setParticles(newParticles);

    const timer = setTimeout(() => {
      setVisible(false);
      setParticles([]);
      onDone?.();
    }, 3000);

    return () => clearTimeout(timer);
  }, [active]);

  if (!active && !visible) return null;

  return (
    <div
      className="fixed inset-0 z-50 pointer-events-none"
      style={{ opacity: visible ? 1 : 0, transition: "opacity 0.5s" }}
    >
      {/* Dark overlay */}
      <div
        className="absolute inset-0"
        style={{ background: "rgba(0,0,0,0.3)" }}
      />

      {/* Center message */}
      {message && (
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center z-10"
          style={{
            animation: "pop-in 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards",
          }}
        >
          <div
            className="px-8 py-6 rounded-2xl"
            style={{
              background: "linear-gradient(135deg, #2c1810, #3d2b1f)",
              border: "3px solid #c9a227",
              boxShadow: "0 0 40px rgba(201,162,39,0.5)",
            }}
          >
            <div className="text-5xl mb-3">🏆</div>
            <div
              style={{
                fontFamily: "'MedievalSharp', serif",
                color: "#c9a227",
                fontSize: "1.2rem",
                textShadow: "0 0 10px rgba(201,162,39,0.6)",
              }}
            >
              {message}
            </div>
          </div>
        </div>
      )}

      {/* Particles */}
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            fontSize: `${p.size}rem`,
            animation: `particle-burst ${p.speed + 1}s ease-out forwards`,
            animationDelay: `${Math.random() * 0.3}s`,
            transform: `rotate(${p.angle}deg)`,
          }}
        >
          {p.emoji}
        </div>
      ))}

      <style>{`
        @keyframes particle-burst {
          0% { transform: scale(0) rotate(0deg); opacity: 1; }
          30% { transform: scale(1.5) rotate(120deg) translate(0, -20px); opacity: 1; }
          100% { transform: scale(0.5) rotate(360deg) translate(${Math.random() > 0.5 ? "" : "-"}${30 + Math.random() * 50}px, -${50 + Math.random() * 100}px); opacity: 0; }
        }
        @keyframes pop-in {
          0% { transform: translate(-50%, -50%) scale(0); opacity: 0; }
          70% { transform: translate(-50%, -50%) scale(1.1); opacity: 1; }
          100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
