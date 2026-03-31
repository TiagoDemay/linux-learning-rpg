import { useEffect, useState } from "react";
import type { Level } from "../data/levels";

interface UnlockModalProps {
  level: Level | null;
  coins: number;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function UnlockModal({ level, coins, onConfirm, onCancel }: UnlockModalProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (level) {
      setTimeout(() => setVisible(true), 50);
    } else {
      setVisible(false);
    }
  }, [level]);

  if (!level) return null;

  const canAfford = coins >= level.unlockCost;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
      onClick={onCancel}
    >
      <div
        className="relative rounded-xl p-6 max-w-sm w-full mx-4 transition-all duration-300"
        style={{
          background: "linear-gradient(135deg, #2c1810 0%, #3d2b1f 100%)",
          border: "3px solid #8b6914",
          boxShadow: "0 0 40px rgba(201,162,39,0.3), 0 20px 60px rgba(0,0,0,0.8)",
          transform: visible ? "scale(1) translateY(0)" : "scale(0.8) translateY(20px)",
          opacity: visible ? 1 : 0,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Decorative corners */}
        <div className="absolute top-2 left-2 text-yellow-600 text-lg opacity-60">✦</div>
        <div className="absolute top-2 right-2 text-yellow-600 text-lg opacity-60">✦</div>
        <div className="absolute bottom-2 left-2 text-yellow-600 text-lg opacity-60">✦</div>
        <div className="absolute bottom-2 right-2 text-yellow-600 text-lg opacity-60">✦</div>

        {/* Icon */}
        <div className="text-center mb-4">
          <div
            className="inline-flex items-center justify-center w-20 h-20 rounded-full mb-2"
            style={{
              background: "radial-gradient(circle, rgba(201,162,39,0.3), rgba(139,105,20,0.2))",
              border: "2px solid #8b6914",
              fontSize: "2.5rem",
            }}
          >
            {level.icon}
          </div>
          <div
            style={{
              fontFamily: "'MedievalSharp', serif",
              color: "#c9a227",
              fontSize: "0.7rem",
              letterSpacing: "0.1em",
            }}
          >
            NOVO TERRITÓRIO DESCOBERTO
          </div>
        </div>

        {/* Title */}
        <h2
          className="text-center mb-3"
          style={{
            fontFamily: "'MedievalSharp', serif",
            color: "#f5e6c8",
            fontSize: "1.1rem",
            textShadow: "0 0 8px rgba(201,162,39,0.4)",
          }}
        >
          {level.name}
        </h2>

        {/* Description */}
        <p
          className="text-center mb-4 leading-relaxed"
          style={{ color: "#d4b896", fontSize: "0.78rem" }}
        >
          {level.description}
        </p>

        {/* Cost */}
        <div
          className="flex items-center justify-center gap-3 p-3 rounded-lg mb-4"
          style={{
            background: canAfford ? "rgba(39,174,96,0.15)" : "rgba(192,57,43,0.15)",
            border: `1px solid ${canAfford ? "#27ae60" : "#c0392b"}`,
          }}
        >
          <span className="text-2xl">🪙</span>
          <div>
            <div style={{ color: "#f5e6c8", fontSize: "0.8rem", fontWeight: "bold" }}>
              Custo de Desbloqueio
            </div>
            <div style={{ color: canAfford ? "#27ae60" : "#e74c3c", fontSize: "0.9rem", fontWeight: "bold" }}>
              {level.unlockCost} moedas
            </div>
            <div style={{ color: "#8b6914", fontSize: "0.7rem" }}>
              Seu saldo: {coins} moedas
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2 rounded-lg font-bold transition-all hover:opacity-80"
            style={{
              background: "rgba(139,105,20,0.3)",
              border: "1px solid #8b6914",
              color: "#d4b896",
              fontFamily: "'MedievalSharp', serif",
              fontSize: "0.75rem",
            }}
          >
            Recuar
          </button>
          <button
            onClick={canAfford ? onConfirm : undefined}
            disabled={!canAfford}
            className="flex-1 py-2 rounded-lg font-bold transition-all"
            style={{
              background: canAfford
                ? "linear-gradient(135deg, #27ae60, #2ecc71)"
                : "rgba(100,100,100,0.3)",
              border: `1px solid ${canAfford ? "#27ae60" : "#666"}`,
              color: canAfford ? "#fff" : "#666",
              fontFamily: "'MedievalSharp', serif",
              fontSize: "0.75rem",
              cursor: canAfford ? "pointer" : "not-allowed",
              transform: canAfford ? undefined : "none",
            }}
          >
            {canAfford ? "⚔ Desbloquear!" : "🔒 Sem moedas"}
          </button>
        </div>
      </div>
    </div>
  );
}
