import type {
  Collection,
  CollectionId,
  Product,
  ProductCategory,
  ProductCategoryId,
  ProductId,
} from "@lua/types";
import type { MenuRepository } from "../repositories/menuRepository";
import type { MockStore } from "./store";

export class MockMenuRepository implements MenuRepository {
  constructor(private readonly store: MockStore) {}

  async listCategories(): Promise<ProductCategory[]> {
    return [...this.store.categories].sort((a, b) => a.sortOrder - b.sortOrder);
  }

  async listProducts(filter?: { categoryId?: ProductCategoryId }): Promise<Product[]> {
    if (!filter?.categoryId) return [...this.store.products];
    return this.store.products.filter((p) => p.categoryId === filter.categoryId);
  }

  async getProduct(id: ProductId): Promise<Product | null> {
    return this.store.products.find((p) => p.id === id) ?? null;
  }

  async listCollections(): Promise<Collection[]> {
    return [...this.store.collections];
  }

  async getCollection(id: CollectionId): Promise<Collection | null> {
    return this.store.collections.find((c) => c.id === id) ?? null;
  }
}
