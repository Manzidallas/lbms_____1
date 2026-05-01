export const LIBRARY_GENRES = [
  'All',
  'Fiction',
  'Non-Fiction',
  'Science',
  'History',
  'Romance',
  'Mystery',
  'Thriller',
  'Fantasy',
  'Sci-Fi',
  'Self-Improvement',
  'Business',
  'Money / Investing',
  'Biography',
  'Poetry',
  'Kids',
] as const

export type LibraryGenre = (typeof LIBRARY_GENRES)[number]
