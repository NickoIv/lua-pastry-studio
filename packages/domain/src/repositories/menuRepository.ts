import type {
  Collection,
  CollectionId,
  Product,
  ProductCategory,
  ProductCategoryId,
  ProductId,
} from "@lua/types";

export interface MenuRepository {
  listCategories(): Promise<ProductCategory[]>;
  listProducts(filter?: { categoryId?: ProductCategoryId }): Promise<Product[]>;
  getProduct(id: ProductId): Promise<Product | null>;
  listCollections(): Promise<Collection[]>;
  getCollection(id: CollectionId): Promise<Collection | null>;
}
