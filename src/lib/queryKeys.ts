// React Query 쿼리 키를 한곳에서 관리한다. useAuth/useFavorites가 서로를
// import하면 순환참조가 생기므로 두 훅이 공유하는 키는 이 파일에 둔다.
export const SESSION_QUERY_KEY = ["auth", "session"] as const;
export const FAVORITES_QUERY_KEY = ["favorites"] as const;
