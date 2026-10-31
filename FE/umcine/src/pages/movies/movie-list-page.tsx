import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { movieListQueryOptions } from "../../queries/movie-query-options";
import RequestStatus from "../../components/movies/request-status";

import CardSizeControl from "../../components/movies/card-size-control";
import MovieGrid from "../../components/movies/movie-grid";
import Pagination from "../../components/movies/pagination";

export function MovieListPage() {
  const [currentPage, setCurrentPage] = useState(1);

  return (
    <main className="min-h-screen bg-zinc-50 pb-20 pt-8">
      <CardSizeControl />

      <MovieListResults
        currentPage={currentPage}
        onPageChange={setCurrentPage}
      />
    </main>
  );
}

function MovieListResults({
  currentPage,
  onPageChange,
}: {
  currentPage: number;
  onPageChange: (page: number) => void;
}) {
  const { data, isPending, isError, error, refetch } = useQuery(
    movieListQueryOptions(currentPage),
  );
  const errorMessage = isError
    ? error.message === "TMDB 환경 변수가 필요해요."
      ? error.message
      : "영화 목록을 불러오지 못했어요."
    : undefined;
  if (isPending || isError)
    return (
      <RequestStatus
        loading={isPending}
        error={errorMessage}
        onRetry={() => {
          void refetch();
        }}
      />
    );
  if (!data?.results.length)
    return (
      <p role="status" className="p-10 text-center">
        표시할 영화가 없어요.
      </p>
    );
  return (
    <>
      <MovieGrid movies={data.results} />
      <Pagination
        currentPage={data.page}
        totalPages={data.total_pages}
        onPageChange={onPageChange}
      />
    </>
  );
}
