export type Product = {
  id: string
  slug: string
  category: string
  name: string
  description: string
  inside: string
  decor: string
  price: string
  leadTimeHours: number | null
  ttk: {
    kbju: {
      proteins: string | null
      fats: string | null
      carbs: string | null
      kcal: string | null
    }
  } | null
  photos: Array<{
    id: string
    path: string
    title: string
  }>
}

export type Review = {
  id: string
  name: string
  text: string
  rating: number
  createdAt: string
}
