import { queryOptions } from "@tanstack/react-query";
import { getMovies } from "../api/movies/get-movies";
import { searchMovies } from "../api/movies/search-movies";
import { getMovieDetail } from "../api/movies/get-movie-detail";

export function movieListQueryOptions(page = 1) {
  return queryOptions({
    queryKey: ["movies", "list", { page }] as const,
    queryFn: ({ signal }) => getMovies({ page, signal }),
  });
}

export function movieSearchQueryOptions(query: string, page = 1) {
  const normalizedQuery = query.trim();
  return queryOptions({
    queryKey: ["movies", "search", { query: normalizedQuery, page }] as const,
    queryFn: ({ signal }) =>
      searchMovies({ query: normalizedQuery, page, signal }),
    enabled: normalizedQuery.length > 0,
  });
}

export function movieDetailQueryOptions(movieId: number) {
  return queryOptions({
    queryKey: ["movies", "detail", movieId] as const,
    queryFn: ({ signal }) => getMovieDetail(movieId, signal),
    enabled: Number.isInteger(movieId) && movieId > 0,
    staleTime: 30 * 1000,
  });
}
