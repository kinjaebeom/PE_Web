import assert from 'node:assert/strict';
import { createServer } from '../FE/umcine/node_modules/vite/dist/node/index.js';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const requests = [];
const originalFetch = globalThis.fetch;
const originalBaseUrl = process.env.VITE_TMDB_API_BASE_URL;
const originalToken = process.env.VITE_TMDB_ACCESS_TOKEN;
process.env.VITE_TMDB_API_BASE_URL = 'https://api.themoviedb.org/3';
process.env.VITE_TMDB_ACCESS_TOKEN = 'test-only-token';
// Test fixture transport only. Never send or log the user's TMDB token.
globalThis.fetch = async (input) => {
  const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url);
  requests.push({ path: url.pathname, query: url.search });
  if (url.searchParams.get('query') === 'error-case') {
    return new Response(JSON.stringify({ status_message: 'Test authentication error' }), { status: 401, headers: { 'content-type': 'application/json' } });
  }
  const id = Number(url.pathname.split('/').at(-1));
  const detail = Number.isInteger(id);
  const movie = { id: detail ? id : Number(url.searchParams.get('page')) * 100, title: 'Fixture movie', original_title: 'Fixture movie', overview: '', poster_path: null, backdrop_path: null, release_date: '', vote_average: 8, vote_count: 1, genre_ids: [] };
  return new Response(JSON.stringify(detail ? { ...movie, genres: [], runtime: 135, tagline: '' } : { page: Number(url.searchParams.get('page')), results: [movie], total_pages: 8, total_results: 160 }), { headers: { 'content-type': 'application/json' } });
};

let server;
let client;
const checks = [];
try {
  server = await createServer({ root: fileURLToPath(new URL('../FE/umcine/', import.meta.url)), server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' });
  const options = await server.ssrLoadModule('/src/queries/movie-query-options.ts');
  ({ queryClient: client } = await server.ssrLoadModule('/src/config/query-client.ts'));
  assert.equal(client.getDefaultOptions().queries.staleTime, 60_000);
  assert.equal(client.getDefaultOptions().queries.gcTime, undefined);
  assert.equal(options.movieDetailQueryOptions(550).staleTime, 30_000);
  checks.push('Global staleTime 60s, detail override 30s, no custom gcTime');

  assert.deepEqual(options.movieListQueryOptions(1).queryKey, ['movies', 'list', { page: 1 }]);
  assert.deepEqual(options.movieSearchQueryOptions('  Spider-Man  ', 2).queryKey, ['movies', 'search', { query: 'Spider-Man', page: 2 }]);
  assert.deepEqual(options.movieDetailQueryOptions(550).queryKey, ['movies', 'detail', 550]);
  assert.equal(options.movieSearchQueryOptions('   ').enabled, false);
  for (const id of [NaN, -1, 0, 1.5]) assert.equal(options.movieDetailQueryOptions(id).enabled, false);
  checks.push('Distinct keys include every request parameter; enabled guards blank search and invalid IDs');

  const first = await client.fetchQuery(options.movieListQueryOptions(1));
  const second = await client.fetchQuery(options.movieListQueryOptions(2));
  const count = requests.length;
  const again = await client.fetchQuery(options.movieListQueryOptions(1));
  assert.equal(requests.length, count);
  assert.deepEqual(again, first);
  assert.notDeepEqual(first, second);
  assert.ok(client.getQueryData(options.movieListQueryOptions(1).queryKey));
  assert.ok(client.getQueryData(options.movieListQueryOptions(2).queryKey));
  checks.push('Actual QueryClient 1 → 2 → 1 uses fresh cached page 1 without another transport call');

  await client.fetchQuery(options.movieSearchQueryOptions('Spider-Man', 1));
  await client.fetchQuery(options.movieSearchQueryOptions('Batman', 1));
  await client.fetchQuery(options.movieSearchQueryOptions('Spider-Man', 2));
  assert.equal(client.getQueryCache().findAll({ queryKey: ['movies', 'search'] }).length, 3);
  checks.push('Search term and page changes create separate caches');

  await client.fetchQuery(options.movieDetailQueryOptions(550));
  await client.fetchQuery(options.movieDetailQueryOptions(155));
  assert.equal(client.getQueryCache().findAll({ queryKey: ['movies', 'detail'] }).length, 2);
  checks.push('Movie IDs create independent detail caches');

  await assert.rejects(client.fetchQuery({ ...options.movieSearchQueryOptions('error-case'), retry: false }));
  const state = client.getQueryState(options.movieSearchQueryOptions('error-case').queryKey);
  assert.equal(state.status, 'error');
  checks.push('HTTP failure remains a query error and is not treated as an empty success');

  const result = { passed: true, transport: 'test fixtures, no live TMDB calls', checks, requests };
  await mkdir(new URL('../.verification/', import.meta.url), { recursive: true });
  await writeFile(new URL('../.verification/week06-query-contracts.json', import.meta.url), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
} finally {
  client?.clear();
  await server?.close();
  globalThis.fetch = originalFetch;
  if (originalBaseUrl === undefined) delete process.env.VITE_TMDB_API_BASE_URL;
  else process.env.VITE_TMDB_API_BASE_URL = originalBaseUrl;
  if (originalToken === undefined) delete process.env.VITE_TMDB_ACCESS_TOKEN;
  else process.env.VITE_TMDB_ACCESS_TOKEN = originalToken;
}
