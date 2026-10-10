import type { Product, ProductModel } from '@/types/api'

export function filterProducts(products: Product[], query: string): Product[] {
  const needle = query.trim().toLocaleLowerCase()
  if (!needle) return products
  return products.filter((product) => `${product.name} ${product.id}`.toLocaleLowerCase().includes(needle))
}

export function latestPublishedModel(models: ProductModel[]): ProductModel | null {
  return models
    .filter((model) => Boolean(model.publishedAt))
    .sort((left, right) => right.version - left.version)[0] ?? null
}

export function modelState(model: ProductModel): 'published' | 'draft' {
  return model.publishedAt ? 'published' : 'draft'
}
