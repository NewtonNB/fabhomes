export interface ApiResponse<T = any> {
  success: boolean
  message?: string
  data: T
}

export interface PaginatedResponse<T> {
  data: T[]
  meta: {
    current_page: number
    from: number
    last_page: number
    per_page: number
    to: number
    total: number
  }
  links: {
    first: string
    last: string
    prev: string | null
    next: string | null
  }
}

export interface PaginationParams {
  page?: number
  per_page?: number
}

export interface SortParams {
  sort_by?: string
  sort_order?: 'asc' | 'desc'
}
