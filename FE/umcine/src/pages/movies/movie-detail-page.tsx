import { Link, useParams } from "@tanstack/react-router";

import BookmarkButton from "../../components/movies/bookmark-button";
import { useQuery } from "@tanstack/react-query";
import { movieDetailQueryOptions } from "../../queries/movie-query-options";
import { getMovieDetailErrorMessage } from "../../utils/movies/get-movie-detail-error-message";
import {
  getTmdbPosterUrl,
  getTmdbBackdropUrl,
} from "../../utils/movies/tmdb-image";
import MovieImage from "../../components/movies/movie-image";
import RequestStatus from "../../components/movies/request-status";

export function MovieDetailPage() {
  const { movieId } = useParams({
    from: "/movies/$movieId",
  });

  const id = Number(movieId);
  const isValidMovieId = Number.isInteger(id) && id > 0;
  const {
    data: movie,
    isPending,
    isError,
    error,
    refetch,
  } = useQuery(movieDetailQueryOptions(id));
  if (!isValidMovieId)
    return (
      <main className="p-12 text-center" role="alert">
        올바르지 않은 영화 번호예요.
      </main>
    );
  if (isPending || isError)
    return (
      <RequestStatus
        loading={isPending}
        error={isError ? getMovieDetailErrorMessage(error) : undefined}
        onRetry={() => {
          void refetch();
        }}
      />
    );

  if (!movie) {
    return (
      <main className="flex min-h-[70vh] items-center justify-center bg-zinc-50 px-6">
        <div className="text-center">
          <div className="mb-5 text-6xl">🎬</div>

          <h1 className="text-2xl font-black tracking-tight text-zinc-950">
            영화를 찾을 수 없어요.
          </h1>

          <p className="mt-3 text-sm text-zinc-500">
            존재하지 않거나 잘못된 영화 주소입니다.
          </p>

          <Link
            to="/"
            className="mt-7 inline-flex rounded-xl bg-zinc-950 px-6 py-3 text-sm font-bold text-white transition hover:bg-zinc-800"
          >
            영화 목록으로 돌아가기
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-50">
      {/* Hero */}
      <section className="relative overflow-hidden bg-black">
        <div className="absolute inset-0">
          <MovieImage
            src={getTmdbBackdropUrl(movie.backdrop_path)}
            alt=""
            className="h-full w-full object-cover object-center opacity-55"
          />

          <div className="absolute inset-0 bg-gradient-to-r from-black via-black/75 to-black/30" />

          <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/20" />
        </div>

        <div className="relative mx-auto flex min-h-[520px] max-w-7xl items-end px-5 pb-12 pt-28 sm:px-8 lg:px-10 lg:pb-16">
          <div className="max-w-3xl">
            <Link
              to="/"
              className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-white/70 transition hover:text-white"
            >
              <span aria-hidden="true">←</span>
              영화 목록
            </Link>

            <p className="mb-3 text-sm font-semibold tracking-[0.15em] text-white/60">
              {movie.original_title}
            </p>

            <h1 className="text-4xl font-black tracking-[-0.04em] text-white sm:text-5xl lg:text-6xl">
              {movie.title}
            </h1>

            <div className="mt-5 flex flex-wrap items-center gap-2 text-sm text-white/75">
              <span>{movie.release_date || "개봉일 미정"}</span>

              <span className="text-white/30">•</span>

              <span>{formatRuntime(movie.runtime)}</span>

              <span className="text-white/30">•</span>

              <span>{movie.genres.map((genre) => genre.name).join(" · ")}</span>
            </div>

            <p className="mt-4 text-sm text-white/75">
              ★ {movie.vote_average.toFixed(1)} · 평가{" "}
              {movie.vote_count.toLocaleString()}개
            </p>
            {/* Zustand Bookmark */}
            <BookmarkButton
              movieId={movie.id}
              variant="text"
              className="mt-7"
            />
          </div>
        </div>
      </section>

      {/* Detail */}
      <section className="mx-auto grid max-w-7xl gap-10 px-5 py-12 sm:px-8 lg:grid-cols-[240px_1fr] lg:px-10 lg:py-16">
        <div className="mx-auto w-full max-w-[240px] lg:mx-0">
          <MovieImage
            src={getTmdbPosterUrl(movie.poster_path)}
            alt={`${movie.title} 포스터`}
            className="aspect-[2/3] w-full rounded-2xl object-cover shadow-xl"
          />
        </div>

        <div className="flex flex-col justify-center">
          <p className="mb-3 text-xs font-bold tracking-[0.2em] text-zinc-400">
            UMCINE MOVIE
          </p>

          <h2 className="text-3xl font-black tracking-[-0.03em] text-zinc-950">
            {movie.tagline || movie.title}
          </h2>

          <p className="mt-6 max-w-3xl text-base leading-8 text-zinc-600">
            {movie.overview || "줄거리 정보가 없어요."}
          </p>

          <div className="mt-7 flex flex-wrap gap-2">
            {movie.genres.map((genre) => (
              <span
                key={genre.id}
                className="rounded-full bg-zinc-200/70 px-4 py-2 text-xs font-semibold text-zinc-700"
              >
                {genre.name}
              </span>
            ))}
          </div>

          <div className="mt-10 grid max-w-xl grid-cols-2 gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-zinc-200 bg-white p-4">
              <p className="text-xs font-medium text-zinc-400">개봉일</p>

              <p className="mt-2 text-sm font-bold text-zinc-900">
                {movie.release_date || "개봉일 미정"}
              </p>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-white p-4">
              <p className="text-xs font-medium text-zinc-400">상영 시간</p>

              <p className="mt-2 text-sm font-bold text-zinc-900">
                {formatRuntime(movie.runtime)}
              </p>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-white p-4">
              <p className="text-xs font-medium text-zinc-400">장르</p>

              <p className="mt-2 text-sm font-bold text-zinc-900">
                {movie.genres[0]?.name ?? "장르 정보 없음"}
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function formatRuntime(minutes: number | null): string {
  if (!minutes) return "상영 시간 미정";
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return [hours ? `${hours}시간` : "", remainder ? `${remainder}분` : ""]
    .filter(Boolean)
    .join(" ");
}
