import type { ProductView } from "@/shared/types/modelTypes/Product";

export interface ModelGroup {
  modelId: string;
  modelName: string;
  brandName?: string;
  familyName?: string;
  categoryName?: string;
  totalStock: number;
  variants: ProductView[];
}

/**
 * Groups a flat list of ProductView (variants) by their modelId.
 * The resulting groups are sorted by brandName → modelName ascending.
 */
export function groupProductsByModel(products: ProductView[]): ModelGroup[] {
  const map = new Map<string, ModelGroup>();

  for (const p of products) {
    if (!map.has(p.modelId)) {
      map.set(p.modelId, {
        modelId: p.modelId,
        modelName: p.modelName,
        brandName: p.brandName,
        familyName: p.familyName,
        categoryName: p.categoryName,
        totalStock: 0,
        variants: [],
      });
    }
    const group = map.get(p.modelId)!;
    group.totalStock += p.stock;
    group.variants.push(p);
  }

  return Array.from(map.values()).sort((a, b) => {
    const brandCmp = (a.brandName ?? "").localeCompare(b.brandName ?? "");
    if (brandCmp !== 0) return brandCmp;
    return a.modelName.localeCompare(b.modelName);
  });
}
