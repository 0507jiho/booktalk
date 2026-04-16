import { httpsCallable } from 'firebase/functions';
import { functions } from '@/services/firebase/config';

export interface AladinBook {
  title: string;
  author: string;
  publisher: string;
  cover: string;
  isbn13: string;
  itemId: number;
  description: string;
}

interface AladinSearchResponse {
  totalResults: number;
  item: AladinBook[];
}

const searchFn = httpsCallable<{ query: string; start: number }, AladinSearchResponse>(
  functions,
  'aladinSearch'
);

const lookupFn = httpsCallable<{ isbn: string }, AladinBook | null>(
  functions,
  'aladinLookup'
);

export async function searchBooks(query: string, start = 1): Promise<AladinSearchResponse> {
  const res = await searchFn({ query, start });
  return res.data;
}

export async function getBookByIsbn(isbn: string): Promise<AladinBook | null> {
  const res = await lookupFn({ isbn });
  return res.data;
}
