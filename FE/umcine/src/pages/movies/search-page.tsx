import { Link, useNavigate, useSearch } from "@tanstack/react-router";

import { useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { movieSearchQueryOptions } from "../../queries/movie-query-options";
import RequestStatus from "../../components/movies/request-status";
import MovieImage from "../../components/movies/movie-image";
import { getTmdbPosterUrl } from "../../utils/movies/tmdb-image";
import Pagination from "../../components/movies/pagination";

import BookmarkButton from "../../components/movies/bookmark-button";

export function SearchPage() {
  const { query } = useSearch({
    from: "/search",
  });

  const navigate = useNavigate({
    from: "/search",
  });

  const normalizedQuery = query?.trim() ?? "";

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);

    const nextQuery = String(formData.get("query") ?? "").trim();

    navigate({
      search: nextQuery
        ? {
            query: nextQuery,
          }
        : {},
    });
  }

  return (
    <main className="min-h-screen bg-zinc-50">
      <section className="mx-auto max-w-7xl px-5 pb-20 pt-10 sm:px-8 lg:px-10">
        {/* Hero */}
        <div className="relative mb-10 overflow-hidden rounded-[32px] bg-zinc-950 px-7 py-12 text-white shadow-xl sm:px-12 sm:py-14">
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/5 blur-3xl" />

          <div className="absolute -bottom-24 left-1/3 h-56 w-56 rounded-full bg-zinc-500/10 blur-3xl" />

          <div className="relative z-10">
            <p className="mb-3 text-xs font-bold tracking-[0.28em] text-zinc-400">
              UMCINE SEARCH
            </p>

            <h1 className="text-3xl font-black tracking-[-0.04em] sm:text-4xl">
              어떤 영화를 찾고 있나요?
            </h1>

            <p className="mt-4 max-w-xl text-sm leading-6 text-zinc-400 sm:text-base">
              영화 제목이나 원제를 검색하고 원하는 작품의 상세 정보를
              확인해보세요.
            </p>
          </div>
        </div>

        {/* Search Bar */}
        <form
          onSubmit={handleSubmit}
          className="mx-auto mb-10 flex max-w-3xl items-center gap-2 rounded-2xl border border-zinc-200 bg-white p-2 shadow-sm transition-shadow focus-within:shadow-md"
        >
          <div className="flex flex-1 items-center gap-3 px-3">
            <span className="text-xl text-zinc-400" aria-hidden="true">
              🔍
            </span>

            <input
              key={query ?? ""}
              name="query"
              aria-label="검색어"
              type="search"
              defaultValue={query ?? ""}
              placeholder="영화 제목 또는 원제를 검색해보세요"
              className="w-full bg-transparent py-3 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 sm:text-base"
            />
          </div>

          <button
            type="submit"
            className="
              shrink-0
              rounded-xl
              bg-zinc-950
              px-6
              py-3
              text-sm
              font-bold
              text-white
              shadow-sm
              transition
              duration-200
              hover:-translate-y-0.5
              hover:bg-zinc-800
              hover:shadow-md
              active:translate-y-0
              active:scale-[0.98]
            "
          >
            검색
          </button>
        </form>

        {/* 검색어 없음 */}
        <SearchResults key={normalizedQuery} query={normalizedQuery} />
      </section>
    </main>
  );
}

function SearchResults({ query }: { query: string }) {
  const [page, setPage] = useState(1);
  return <SearchResultPage query={query} page={page} onPageChange={setPage} />;
}
function SearchResultPage({
  query,
  page,
  onPageChange,
}: {
  query: string;
  page: number;
  onPageChange: (page: number) => void;
}) {
  const { data, isLoading, isError, isSuccess, refetch } = useQuery(
    movieSearchQueryOptions(query, page),
  );
  // A disabled query can be pending without fetching. Show the search prompt first.
  if (!query)
    return (
      <div className="flex min-h-[300px] flex-col items-center justify-center rounded-3xl border border-dashed border-zinc-300 bg-white px-6 text-center">
        <div className="mb-4 text-5xl">🎬</div>

        <h2 className="text-xl font-bold text-zinc-900">
          찾고 싶은 영화를 검색해보세요
        </h2>

        <p className="mt-2 text-sm leading-6 text-zinc-500">
          영화 제목 또는 영문 원제를 입력하면
          <br />
          일치하는 영화를 찾아드릴게요.
        </p>
      </div>
    );
  if (isLoading || isError)
    return (
      <RequestStatus
        loading={isLoading}
        error={isError ? "검색 결과를 불러오지 못했어요." : undefined}
        onRetry={() => {
          void refetch();
        }}
      />
    );
  const searchResults = isSuccess ? data.results : [];

  return (
    <>
      {/* Result Header */}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="mb-1 text-sm font-medium text-zinc-500">
            Search Result
          </p>

          <h2 className="text-2xl font-bold text-zinc-950">
            ‘{query}’ 검색 결과
          </h2>
        </div>

        <span className="rounded-full bg-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700">
          영화 {data?.total_results ?? 0}편
        </span>
      </div>

      {/* 검색 결과 없음 */}
      {searchResults.length === 0 ? (
        <div className="flex min-h-[300px] flex-col items-center justify-center rounded-3xl bg-white px-6 text-center shadow-sm">
          <div className="mb-4 text-5xl">🥲</div>

          <h3 className="text-xl font-bold text-zinc-900">
            검색 결과가 없어요
          </h3>

          <p className="mt-2 text-sm text-zinc-500">
            다른 영화 제목이나 원제로 다시 검색해보세요.
          </p>
        </div>
      ) : (
        /* Movie Grid */
        <ul className="grid list-none grid-cols-1 gap-6 p-0 md:grid-cols-2 xl:grid-cols-3">
          {searchResults.map((movie) => (
            <li
              key={movie.id}
              className="group relative overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl"
            >
              {/* Bookmark */}
              <BookmarkButton
                movieId={movie.id}
                className="absolute right-4 top-4 z-10"
              />

              {/* Poster */}
              <Link
                to="/movies/$movieId"
                params={{
                  movieId: String(movie.id),
                }}
                className="block overflow-hidden"
              >
                <MovieImage
                  src={getTmdbPosterUrl(movie.poster_path)}
                  alt={`${movie.title} 포스터`}
                  className="aspect-[2/3] w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                />
              </Link>

              {/* Movie Info */}
              <div className="flex min-h-[280px] flex-col p-5">
                <div className="mb-4">
                  <p className="mb-2 text-xs font-semibold tracking-wide text-zinc-400">
                    {movie.release_date || "개봉일 미정"}
                  </p>

                  <h3 className="text-xl font-bold leading-tight text-zinc-950">
                    {movie.title}
                  </h3>

                  <p className="mt-1 text-sm text-zinc-500">
                    {movie.original_title}
                  </p>
                </div>

                {/* Genre */}
                <div className="mb-4 flex flex-wrap gap-2">
                  <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs text-zinc-600">
                    ★ {movie.vote_average.toFixed(1)} · 평가{" "}
                    {movie.vote_count.toLocaleString()}개
                  </span>
                </div>

                {/* Overview */}
                <p className="mb-6 line-clamp-3 text-sm leading-6 text-zinc-600">
                  {movie.overview}
                </p>

                <Link
                  to="/movies/$movieId"
                  params={{
                    movieId: String(movie.id),
                  }}
                  className="mt-auto flex items-center justify-center rounded-xl bg-zinc-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800"
                >
                  상세 정보 보기
                  <span className="ml-2" aria-hidden="true">
                    →
                  </span>
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
      {data && (
        <Pagination
          currentPage={data.page}
          totalPages={data.total_pages}
          onPageChange={onPageChange}
        />
      )}
    </>
  );
}
