# UMC PE 6주차 Frontend — TanStack Query

작업 브랜치: week06. 기존 FE/umcine의 React·TypeScript·Vite·TanStack Router·Zustand·Tailwind·ky 구조를 유지했다. 5주차의 직접 useEffect 요청을 TanStack Query v5로 전환하고 queryOptions 선택 미션을 구현했다.

**인증 진행 상태: 3/4.** 사용자가 인증 1, 2, 3 촬영을 확인했으며, 이미지 파일은 사용자가 Notion에 직접 첨부한다. 인증 4는 확인 대기다. 자동화 도구의 브라우저 열기 작업이 승인 검토의 사용량 한도로 실행되지 않아, 6주차 실제 화면·React Query Devtools·Network 확인은 아직 완료로 기록하지 않는다. 코드 빌드와 테스트 응답 기반 QueryClient 검증 결과는 별도로 기록한다.

## 1. TanStack Query 적용 이유

5주차에는 요청마다 data/isLoading/errorMessage/attempt를 직접 저장하고 useEffect cleanup과 retry 함수를 작성했다. 이번에는 서버 응답과 요청 상태·캐시를 useQuery에 맡겨 중복 상태 관리를 줄였다. 서버 상태인 영화 정보는 Query cache에서, 클라이언트 상태인 북마크와 카드 크기는 기존 Zustand/localStorage에서 관리한다. 현재 목록 페이지 번호도 기존처럼 React state로 유지한다.

## 2. QueryClient와 Provider

QueryClient는 렌더링마다 만들지 않고 모듈에서 한 번 생성했다. 이를 QueryClientProvider로 RouterProvider 바깥에 연결해 화면 이동 중에도 같은 cache를 사용한다. React Query Devtools는 개발 모드에서만 표시하고 initialIsOpen은 false로 두었다.

### 전역 설정

```tsx
import { QueryClient } from "@tanstack/react-query";

const ONE_MINUTE = 60 * 1000;

// Keep one cache for the lifetime of the application, across route changes.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: ONE_MINUTE,
    },
  },
});
```

### 기존 Router와 함께 연결

```tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { queryClient } from "./config/query-client";
import { createRouter, RouterProvider } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import "./index.css";

const router = createRouter({
  routeTree,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  </StrictMode>,
);
```

## 3. 필수 미션 및 선택 미션: queryOptions 분리

목록/검색/상세별 queryKey, queryFn, enabled와 staleTime을 작은 factory 함수로 모았다. 화면은 useQuery(movieListQueryOptions(page))처럼 필요한 설정을 가져온다. 기존 ky API 함수는 유지하고 Query가 제공하는 AbortSignal을 전달한다.

```tsx
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
```

### Query Key 설계

| 화면 | 실제 Query Key | 포함한 값의 이유 |
| --- | --- | --- |
| 목록 | ["movies", "list", { page }] | 페이지별 영화 배열이 다름 |
| 검색 | ["movies", "search", { query, page }] | 검색어 및 검색 페이지별 결과가 다름 |
| 상세 | ["movies", "detail", movieId] | 영화별 상세 데이터가 다름 |

기존 검색에도 페이지 이동 기능이 있어 query뿐 아니라 page를 포함했다. 모든 요청에 ["movies"]만 사용하는 방식은 목록·검색·상세를 같은 cache entry로 취급할 수 있으므로 사용하지 않았다.

## 4. 목록 useQuery

직접 관리하던 서버 응답/loading/error/attempt state와 useEffect를 제거했다. 기존 MovieGrid/Pagination/CardSizeControl은 재사용했다. isPending으로 초기 로딩을 표시하고, isError로 오류를 표시하며, 결과 배열이 비면 기존 빈 결과 문구를 보여준다. 다시 시도는 refetch를 사용한다.

```tsx
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
```

## 5. 검색 useQuery와 enabled

URL의 query는 trim만 적용하며 원래 대소문자는 유지한다. 검색어가 바뀌면 페이지 상태를 1로 초기화하는 기존 구조를 유지했다. 빈 검색어에도 hook은 일관되게 호출하되 enabled:false로 요청을 막고 검색 안내 UI를 먼저 표시한다.

핵심 호출:

```tsx
const { data, isLoading, isError, isSuccess, refetch } = useQuery(
  movieSearchQueryOptions(query, page),
);
```

검색어 없음 → 검색 안내, isLoading → 로딩, isError → 오류와 다시 시도, 성공한 results가 [] → 빈 결과, 나머지는 기존 검색 카드 UI로 표시한다. 조건부 query이므로 로딩에는 isLoading을 사용한다.

## 6. 상세 useQuery와 개별 staleTime

URL의 movieId를 Number로 변환하고 Number.isInteger(id) && id > 0을 검사한다. options의 enabled에도 같은 조건을 적용해 잘못된 값은 API를 호출하지 않는다. 기존 잘못된 ID 안내와 404 구분, 상세 디자인·포스터·장르·줄거리·북마크 버튼을 유지했다.

핵심 호출:

```tsx
const id = Number(movieId);
const isValidMovieId = Number.isInteger(id) && id > 0;
const { data: movie, isPending, isError, error, refetch } = useQuery(
  movieDetailQueryOptions(id),
);
```

상세 options의 staleTime:30*1000이 전역 60초를 override한다. API의 404는 기존 getMovieDetailErrorMessage를 통해 '영화를 찾을 수 없어요.'로 표시한다. useQuery의 기본 자동 재시도와 ky의 재시도가 있을 수 있어 실패 문구가 표시되기까지 잠시 걸릴 수 있다.

## 7. 요청 상태 핵심 키워드

- queryKey: cache entry를 식별하는 배열이다. queryFn의 결과를 바꾸는 page/query/movieId를 key에도 포함해야 다른 데이터를 구분할 수 있다.
- queryFn: 서버 데이터를 반환하는 Promise 함수다. 실제 TMDB 호출은 기존 API 함수에 위임한다.
- enabled: 검색어가 있거나 ID가 유효할 때만 자동 실행하도록 제어한다. enabled:false라도 refetch를 직접 호출하면 실행할 수 있으므로 비활성 화면에는 실행 버튼을 노출하지 않는다.
- isPending: 아직 성공한 데이터가 없는 pending 상태다. enabled:false이고 cache도 없으면 요청 중이 아니어도 true일 수 있다.
- isLoading: isPending && isFetching으로, 첫 데이터가 없으면서 실제 요청 중일 때 true다. 빈 검색어의 비활성 query를 무한 로딩으로 표시하지 않도록 검색에서 사용했다.
- isError: 최종 요청 상태가 error인 경우다. 기존 오류 UI와 refetch 버튼에 연결했다.
- isSuccess: 요청 상태가 success인 경우다. 검색 결과 배열을 성공 데이터에서 읽는다.
- isFetching: 초기 요청뿐 아니라 background 재조회도 포함한다. 기존 cache가 있으면 데이터를 표시하면서 background로 요청할 수 있다.

## 8. staleTime / gcTime / cache 재사용

| 개념 | 이번 구현 기준 설명 |
| --- | --- |
| staleTime | 마지막 데이터 갱신 후 fresh로 간주하는 시간. 목록/검색 60초, 상세 30초 |
| fresh | 아직 staleTime이 지나지 않은 데이터. 같은 key 재마운트 시 기본 동작상 불필요한 자동 요청을 줄임 |
| stale | fresh 시간이 지난 데이터. 즉시 삭제되는 것이 아니며 이후 마운트/포커스/재연결 등의 조건에서 재조회될 수 있음 |
| inactive | 해당 query를 사용하는 observer가 없는 상태 |
| gcTime | inactive query를 제거하기까지의 대기 시간. 별도 설정하지 않아 브라우저 기본 5분 유지 |
| 개별 override | 상세의 staleTime 30초가 전역 60초보다 우선 |

staleTime이 지났다는 이유만으로 즉시 요청하거나 데이터를 삭제하는 것은 아니다. gcTime도 active query를 일정 시간마다 지우는 설정이 아니다. fresh여도 명시적인 refetch나 invalidation 등은 별도의 재조회 동작을 유발할 수 있다.

Query cache는 현재 앱 실행의 메모리에 있다. 북마크처럼 localStorage에 persist하지 않았다. 브라우저 새로고침은 QueryClient를 다시 만들 수 있으므로 fresh cache 이동 검증은 앱의 Pagination으로 1→2→1 이동하며 진행한다. 브라우저 HTTP cache의 응답 재사용과 QueryClient가 요청 자체를 생략하는 동작은 구분한다.

## 9. 구현 및 검증 결과

| 항목 | 상태 |
| --- | --- |
| 기존 코드·Router·TMDB client·store 분석 | 완료 |
| week06 브랜치 유지 | 완료 |
| pnpm 패키지 설치 | 완료, react-query / devtools 5.105.0 |
| Provider·개발용 Devtools | 구현 완료 |
| 목록/검색/상세 useQuery | 구현 완료 |
| 각 요청 변수 기반 key 분리 | 구현 완료 |
| 검색 및 상세 enabled | 구현 완료 |
| 전역 60초 / 상세 30초 | 구현 완료 |
| loading/error/empty/success | 기존 컴포넌트·문구 재사용 |
| 북마크·카드 크기·Router·기존 API 함수 | 기존 코드 유지 |
| 선택 queryOptions 리팩터링 | 완료 |
| pnpm install --frozen-lockfile | 성공 |
| pnpm build | 성공 |
| pnpm lint | 성공 |
| 테스트 응답을 이용한 실제 QueryClient 검증 | 아래 6개 묶음 통과 |
| 6주차 실제 UI 및 Devtools/Network 인증 | 사용자 확인 대기 |

재실행 명령:

```powershell
Set-Location 'C:\Users\proce\OneDrive\문서\ChatGPT\UMC11th\FE\umcine'
pnpm install --frozen-lockfile
pnpm build
pnpm lint
pnpm dev --port 5173 --strictPort
```

캐시 로직 검증은 저장소 루트에서 실행한다.

```powershell
node scripts/verify-week06-query-contracts.mjs
```

이 스크립트는 테스트 토큰·테스트 응답을 프로세스 안에서만 사용한다. 실제 .env를 변경하지 않고 TMDB나 브라우저에 접속하지 않는다. Vite SSR 로딩과 실제 QueryClient/API 함수로 다음을 확인했다.

1. 전역 60초, 상세 30초, custom gcTime 미설정.
2. 요청 종류·변수별 key 및 enabled 조건.
3. 1→2→1에서 첫 페이지 fresh cache 재사용으로 추가 transport 호출이 없음.
4. 검색어/검색 페이지별 cache가 다르게 생성됨.
5. 영화 ID별 상세 cache가 다르게 생성됨.
6. HTTP 실패가 빈 결과 성공으로 처리되지 않고 error로 남음.

이 결과는 브라우저 Network 인증을 대신하지 않는다. 실제 TMDB 화면·북마크 회귀 등 브라우저에서의 최종 확인은 사용자 인증 과정에서 이어서 확인해야 한다.

## 10. 수정·추가 파일

```text
수정
FE/umcine/package.json
FE/umcine/pnpm-lock.yaml
FE/umcine/src/main.tsx
FE/umcine/src/pages/movies/movie-list-page.tsx
FE/umcine/src/pages/movies/search-page.tsx
FE/umcine/src/pages/movies/movie-detail-page.tsx

추가
FE/umcine/src/config/query-client.ts
FE/umcine/src/queries/movie-query-options.ts
scripts/verify-week06-query-contracts.mjs
WEEK06_FRONTEND_NOTION_SUBMISSION.md
```

기존 5주차 문서와 BE/study, BE/movie는 수정하지 않았다. 실제 .env와 토큰도 수정하지 않았다. commit/push는 수행하지 않았다.

## 11. 인증샷 — 아직 촬영 완료 아님

### 인증 1. 목록 + Query Cache

[인증샷 1 삽입]

사용자 확인: 완료 (사용자 확인 메시지 기준, 이미지 직접 첨부 필요)

### 인증 2. 검색 + Query Key

[인증샷 2 삽입]

사용자 확인: 완료 (사용자 확인 메시지 기준, 이미지 직접 첨부 필요)

### 인증 3. 상세 + detail Query

[인증샷 3 삽입]

사용자 확인: 완료 (사용자 확인 메시지 기준, 이미지 직접 첨부 필요)

### 인증 4. Cache 재사용 + Network

[인증샷 4 삽입]

사용자 확인: 보완 필요 — 제출 사진에서 page 1/2 캐시는 확인했으나 Console 필터가 사용되었고 page 2가 활성 상태임. Network 필터와 1→2→1 fresh 재접근 증빙으로 같은 사진을 교체할 예정.

한 번에 한 인증만 준비하고 사용자가 '확인'이라고 답하면 다음으로 진행한다. 사용자 촬영 완료 여부를 자동 테스트 결과로 대신하지 않는다.

## 12. 학습 후기 초안

useEffect로 data와 요청 상태를 직접 관리하던 코드에서 useQuery로 옮기며 서버 상태와 클라이언트 상태의 역할을 나누었다. 북마크와 UI 설정은 Zustand에 두고 서버에서 받은 영화 정보만 Query cache에서 관리했다. 검색에 이미 페이지 이동 기능이 있었기 때문에 검색어와 page를 모두 key에 포함해야 한다는 점을 코드에 반영했다. 테스트 응답을 사용한 QueryClient 검증에서 1→2→1 이동 시 첫 페이지 데이터를 다시 요청하지 않고 재사용하는 것을 확인했다. 실제 Devtools와 Network를 통한 화면 확인은 사용자 인증 완료 후 결과를 추가할 예정이다.

## 13. 실제 트러블슈팅

### pnpm install 권한 오류

- 이슈: 샌드박스에서 pnpm install --frozen-lockfile 실행 시 EPERM 심볼릭 링크 오류 발생.
- 원인: pnpm store의 프로젝트 등록용 symlink를 샌드박스 권한으로 만들 수 없었음.
- 해결: 기존 lockfile을 유지한 채 권한 범위 밖에서 같은 설치 명령을 재실행했고 성공.
- 배운 점: 환경 권한 오류를 패키지나 앱 코드 오류와 구분하고, 불필요한 lockfile 재생성이나 package manager 변경을 하지 않아야 함.

별도의 TypeScript/빌드/lint 코드 오류는 이번 검증에서 발생하지 않았다. 브라우저 자동 승인 검토의 사용량 한도는 실행 도구 제약으로 별도 기록했으며 앱 오류로 기록하지 않았다.

## 참고 자료

- [TanStack Query Options](https://tanstack.com/query/latest/docs/framework/react/guides/query-options)
- [TanStack Query Disabling Queries](https://tanstack.com/query/latest/docs/framework/react/guides/disabling-queries)
- [TanStack Query Important Defaults](https://tanstack.com/query/latest/docs/framework/react/guides/important-defaults)
- [React Query Devtools](https://tanstack.com/query/latest/docs/framework/react/devtools)
