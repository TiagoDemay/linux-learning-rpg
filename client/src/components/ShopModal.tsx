import { useState } from "react";
import { SHOP_ITEMS, SHOP_CATEGORIES, type ShopItem, type ShopItemId } from "../data/shop-items";

interface ShopModalProps {
  open: boolean;
  coins: number;
  purchasedItems: ShopItemId[];
  consumableStock: Record<string, number>;
  onBuy: (item: ShopItem) => void | Promise<void>;
  onClose: () => void;
}

export default function ShopModal({
  open,
  coins,
  purchasedItems,
  consumableStock,
  onBuy,
  onClose,
}: ShopModalProps) {
  const [activeCategory, setActiveCategory] = useState<string>("terminal");
  const [selectedItem, setSelectedItem] = useState<ShopItem | null>(null);
  const [buyFeedback, setBuyFeedback] = useState<string | null>(null);

  if (!open) return null;

  const filteredItems = SHOP_ITEMS.filter((i) => i.category === activeCategory);

  const isPurchased = (item: ShopItem) => {
    if (item.type === "permanent") return purchasedItems.includes(item.id);
    return false;
  };

  const getStock = (item: ShopItem) => {
    if (item.type === "consumable") return consumableStock[item.id] ?? 0;
    return null;
  };

  const canBuy = (item: ShopItem) => {
    if (coins < item.price) return false;
    if (item.type === "permanent" && purchasedItems.includes(item.id)) return false;
    if (item.type === "consumable" && item.maxStack) {
      const stock = consumableStock[item.id] ?? 0;
      if (stock >= item.maxStack) return false;
    }
    return true;
  };

  const handleBuy = (item: ShopItem) => {
    if (!canBuy(item)) return;
    onBuy(item);
    setBuyFeedback(`${item.icon} ${item.name} adquirido!`);
    setTimeout(() => setBuyFeedback(null), 2500);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.75)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="relative rounded-xl overflow-hidden flex flex-col"
        style={{
          width: "min(820px, 96vw)",
          maxHeight: "90vh",
          background: "linear-gradient(160deg, #1a0d06 0%, #2c1810 60%, #1a0d06 100%)",
          border: "3px solid #8b6914",
          boxShadow: "0 0 40px rgba(139,105,20,0.4), inset 0 0 60px rgba(0,0,0,0.3)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 flex-shrink-0"
          style={{
            background: "linear-gradient(135deg, #2c1810, #3d2b1f)",
            borderBottom: "2px solid #8b6914",
          }}
        >
          <div className="flex items-center gap-3">
            <span style={{ fontSize: "2rem" }}>🐧</span>
            <div>
              <div
                style={{
                  fontFamily: "'MedievalSharp', serif",
                  color: "#f5c842",
                  fontSize: "1.1rem",
                  textShadow: "0 0 10px rgba(245,200,66,0.4)",
                }}
              >
                Loja do Tux
              </div>
              <div style={{ color: "#a89060", fontSize: "0.7rem" }}>
                Adquira ferramentas e conhecimentos para sua jornada
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {/* Coin display */}
            <div
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
              style={{ background: "rgba(139,105,20,0.3)", border: "1px solid #8b6914" }}
            >
              <span style={{ fontSize: "1.1rem" }}>🪙</span>
              <span style={{ color: "#f5c842", fontWeight: "bold", fontSize: "0.9rem" }}>
                {coins}
              </span>
              <span style={{ color: "#a89060", fontSize: "0.7rem" }}>moedas</span>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center transition-all hover:scale-110"
              style={{
                background: "rgba(180,40,40,0.3)",
                border: "1px solid #8b2020",
                color: "#ff8080",
                fontSize: "1rem",
                cursor: "pointer",
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Buy feedback toast */}
        {buyFeedback && (
          <div
            className="absolute top-20 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg z-10 text-sm font-bold"
            style={{
              background: "rgba(39,174,96,0.9)",
              border: "1px solid #27ae60",
              color: "#fff",
              animation: "pop-in 0.3s ease-out",
              whiteSpace: "nowrap",
            }}
          >
            ✅ {buyFeedback}
          </div>
        )}

        {/* Category tabs */}
        <div
          className="flex gap-1 px-4 pt-3 flex-shrink-0"
          style={{ borderBottom: "1px solid rgba(139,105,20,0.3)" }}
        >
          {SHOP_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => { setActiveCategory(cat.id); setSelectedItem(null); }}
              className="px-4 py-2 rounded-t-lg text-sm font-bold transition-all"
              style={{
                background:
                  activeCategory === cat.id
                    ? "rgba(139,105,20,0.4)"
                    : "rgba(139,105,20,0.1)",
                border:
                  activeCategory === cat.id
                    ? "1px solid #8b6914"
                    : "1px solid transparent",
                borderBottom: activeCategory === cat.id ? "1px solid transparent" : "none",
                color: activeCategory === cat.id ? "#f5c842" : "#a89060",
                fontFamily: "'MedievalSharp', serif",
                fontSize: "0.7rem",
                cursor: "pointer",
              }}
            >
              {cat.icon} {cat.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Item list */}
          <div className="flex-1 overflow-y-auto p-4 grid gap-3" style={{ gridTemplateColumns: "1fr 1fr" }}>
            {filteredItems.map((item) => {
              const purchased = isPurchased(item);
              const stock = getStock(item);
              const affordable = canBuy(item);
              const isSelected = selectedItem?.id === item.id;

              return (
                <div
                  key={item.id}
                  onClick={() => setSelectedItem(item)}
                  className="rounded-lg p-3 cursor-pointer transition-all"
                  style={{
                    background: isSelected
                      ? "rgba(139,105,20,0.35)"
                      : purchased
                      ? "rgba(39,174,96,0.12)"
                      : "rgba(139,105,20,0.15)",
                    border: isSelected
                      ? "2px solid #c9a227"
                      : purchased
                      ? "1px solid rgba(39,174,96,0.5)"
                      : "1px solid rgba(139,105,20,0.4)",
                    opacity: !affordable && !purchased ? 0.65 : 1,
                    transform: isSelected ? "scale(1.02)" : "scale(1)",
                  }}
                >
                  <div className="flex items-start gap-2">
                    <span style={{ fontSize: "1.6rem", lineHeight: 1, flexShrink: 0 }}>
                      {item.icon}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div
                        className="font-bold mb-0.5 truncate"
                        style={{
                          fontFamily: "'MedievalSharp', serif",
                          color: purchased ? "#27ae60" : "#f5c842",
                          fontSize: "0.68rem",
                        }}
                      >
                        {item.name}
                      </div>
                      <div style={{ color: "#c4a87a", fontSize: "0.62rem", lineHeight: 1.3 }}>
                        {item.description}
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center gap-1">
                          <span style={{ fontSize: "0.85rem" }}>🪙</span>
                          <span
                            style={{
                              color: coins >= item.price ? "#f5c842" : "#ff6b6b",
                              fontWeight: "bold",
                              fontSize: "0.72rem",
                            }}
                          >
                            {item.price}
                          </span>
                        </div>
                        {purchased && item.type === "permanent" && (
                          <span
                            className="px-1.5 py-0.5 rounded text-xs"
                            style={{ background: "rgba(39,174,96,0.3)", color: "#27ae60", fontSize: "0.58rem" }}
                          >
                            ✓ Ativo
                          </span>
                        )}
                        {item.type === "consumable" && (
                          <span
                            className="px-1.5 py-0.5 rounded text-xs"
                            style={{
                              background: "rgba(139,105,20,0.3)",
                              color: "#c9a227",
                              fontSize: "0.58rem",
                            }}
                          >
                            Estoque: {stock}/{item.maxStack}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Detail panel */}
          <div
            className="flex-shrink-0 p-4 flex flex-col"
            style={{
              width: "240px",
              borderLeft: "1px solid rgba(139,105,20,0.4)",
              background: "rgba(0,0,0,0.2)",
            }}
          >
            {selectedItem ? (
              <>
                <div className="text-center mb-4">
                  <div style={{ fontSize: "3rem", lineHeight: 1, marginBottom: "8px" }}>
                    {selectedItem.icon}
                  </div>
                  <div
                    style={{
                      fontFamily: "'MedievalSharp', serif",
                      color: "#f5c842",
                      fontSize: "0.8rem",
                      marginBottom: "4px",
                    }}
                  >
                    {selectedItem.name}
                  </div>
                  <div
                    className="px-2 py-0.5 rounded inline-block text-xs"
                    style={{
                      background:
                        selectedItem.type === "permanent"
                          ? "rgba(74,144,226,0.3)"
                          : "rgba(230,126,34,0.3)",
                      border:
                        selectedItem.type === "permanent"
                          ? "1px solid #4a90e2"
                          : "1px solid #e67e22",
                      color:
                        selectedItem.type === "permanent" ? "#74b9ff" : "#f39c12",
                      fontSize: "0.6rem",
                    }}
                  >
                    {selectedItem.type === "permanent" ? "⚡ Permanente" : "🔁 Consumível"}
                  </div>
                </div>

                <div
                  className="rounded-lg p-3 mb-4 flex-1"
                  style={{
                    background: "rgba(139,105,20,0.15)",
                    border: "1px solid rgba(139,105,20,0.3)",
                  }}
                >
                  <div style={{ color: "#d4b896", fontSize: "0.68rem", lineHeight: 1.5 }}>
                    {selectedItem.longDescription}
                  </div>
                </div>

                <div
                  className="rounded-lg p-3 mb-4 text-center"
                  style={{
                    background: "rgba(139,105,20,0.2)",
                    border: "1px solid #8b6914",
                  }}
                >
                  <div style={{ color: "#a89060", fontSize: "0.62rem", marginBottom: "4px" }}>
                    Preço
                  </div>
                  <div className="flex items-center justify-center gap-1">
                    <span style={{ fontSize: "1.2rem" }}>🪙</span>
                    <span
                      style={{
                        color: coins >= selectedItem.price ? "#f5c842" : "#ff6b6b",
                        fontWeight: "bold",
                        fontSize: "1.1rem",
                      }}
                    >
                      {selectedItem.price}
                    </span>
                  </div>
                  {coins < selectedItem.price && (
                    <div style={{ color: "#ff6b6b", fontSize: "0.6rem", marginTop: "4px" }}>
                      Faltam {selectedItem.price - coins} moedas
                    </div>
                  )}
                </div>

                <button
                  onClick={() => handleBuy(selectedItem)}
                  disabled={!canBuy(selectedItem)}
                  className="w-full py-2.5 rounded-lg font-bold transition-all"
                  style={{
                    background: canBuy(selectedItem)
                      ? "linear-gradient(135deg, #8b6914, #c9a227)"
                      : isPurchased(selectedItem)
                      ? "rgba(39,174,96,0.3)"
                      : "rgba(100,100,100,0.3)",
                    border: canBuy(selectedItem)
                      ? "1px solid #c9a227"
                      : isPurchased(selectedItem)
                      ? "1px solid #27ae60"
                      : "1px solid #555",
                    color: canBuy(selectedItem)
                      ? "#fff"
                      : isPurchased(selectedItem)
                      ? "#27ae60"
                      : "#888",
                    fontFamily: "'MedievalSharp', serif",
                    fontSize: "0.72rem",
                    cursor: canBuy(selectedItem) ? "pointer" : "not-allowed",
                    transform: canBuy(selectedItem) ? "scale(1)" : "scale(0.98)",
                  }}
                >
                  {isPurchased(selectedItem) && selectedItem.type === "permanent"
                    ? "✓ Já Adquirido"
                    : !canBuy(selectedItem) && !isPurchased(selectedItem)
                    ? coins < selectedItem.price
                      ? "🔒 Moedas Insuficientes"
                      : "Estoque Cheio"
                    : `🛒 Comprar por ${selectedItem.price} 🪙`}
                </button>
              </>
            ) : (
              <div
                className="flex-1 flex flex-col items-center justify-center text-center"
                style={{ color: "#6b5040" }}
              >
                <div style={{ fontSize: "3rem", marginBottom: "12px", opacity: 0.5 }}>🐧</div>
                <div style={{ fontFamily: "'MedievalSharp', serif", fontSize: "0.7rem" }}>
                  Selecione um item para ver detalhes
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div
          className="px-6 py-3 flex-shrink-0 text-center"
          style={{
            borderTop: "1px solid rgba(139,105,20,0.3)",
            color: "#6b5040",
            fontSize: "0.62rem",
          }}
        >
          💡 Itens permanentes ficam ativos para sempre · Consumíveis têm uso limitado · Ganhe moedas completando desafios
        </div>
      </div>

      <style>{`
        @keyframes pop-in {
          0% { transform: translateX(-50%) scale(0.8); opacity: 0; }
          100% { transform: translateX(-50%) scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
