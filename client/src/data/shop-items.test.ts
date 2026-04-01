import { describe, it, expect } from "vitest";
import { SHOP_ITEMS, getShopItem, SHOP_CATEGORIES } from "./shop-items";

describe("shop-items", () => {
  it("deve ter 9 itens definidos", () => {
    expect(SHOP_ITEMS.length).toBe(9);
  });

  it("todos os itens devem ter id, name, price, type e category", () => {
    for (const item of SHOP_ITEMS) {
      expect(item.id).toBeTruthy();
      expect(item.name).toBeTruthy();
      expect(item.price).toBeGreaterThan(0);
      expect(["permanent", "consumable"]).toContain(item.type);
      expect(["terminal", "knowledge", "boost"]).toContain(item.category);
    }
  });

  it("itens consumíveis devem ter maxStack definido", () => {
    const consumables = SHOP_ITEMS.filter((i) => i.type === "consumable");
    for (const item of consumables) {
      expect(item.maxStack).toBeDefined();
      expect(item.maxStack).toBeGreaterThan(0);
    }
  });

  it("itens permanentes não devem ter maxStack", () => {
    const permanents = SHOP_ITEMS.filter((i) => i.type === "permanent");
    for (const item of permanents) {
      expect(item.maxStack).toBeUndefined();
    }
  });

  it("getShopItem deve retornar o item correto por id", () => {
    const item = getShopItem("autocomplete");
    expect(item).toBeDefined();
    expect(item?.name).toBe("Grimório do Autocomplete");
    expect(item?.type).toBe("permanent");
    expect(item?.price).toBe(30);
  });

  it("getShopItem deve retornar undefined para id inexistente", () => {
    const item = getShopItem("nao-existe" as never);
    expect(item).toBeUndefined();
  });

  it("deve ter 3 categorias definidas", () => {
    expect(SHOP_CATEGORIES.length).toBe(3);
    const ids = SHOP_CATEGORIES.map((c) => c.id);
    expect(ids).toContain("terminal");
    expect(ids).toContain("knowledge");
    expect(ids).toContain("boost");
  });

  it("cada categoria deve ter ao menos 1 item", () => {
    for (const cat of SHOP_CATEGORIES) {
      const items = SHOP_ITEMS.filter((i) => i.category === cat.id);
      expect(items.length).toBeGreaterThan(0);
    }
  });

  it("reveal-hint deve ser consumível com maxStack 10", () => {
    const item = getShopItem("reveal-hint");
    expect(item?.type).toBe("consumable");
    expect(item?.maxStack).toBe(10);
  });

  it("skip-challenge deve custar 50 moedas", () => {
    const item = getShopItem("skip-challenge");
    expect(item?.price).toBe(50);
  });

  it("double-coins deve ser consumível com maxStack 5", () => {
    const item = getShopItem("double-coins");
    expect(item?.type).toBe("consumable");
    expect(item?.maxStack).toBe(5);
  });

  it("todos os ids de itens devem ser únicos", () => {
    const ids = SHOP_ITEMS.map((i) => i.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });
});
