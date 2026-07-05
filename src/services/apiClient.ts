const BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";

export async function apiFetch<T>(
  url: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${BASE_URL}${url}`, options);

  if (!response.ok) {
    const bodyText = await response.text();
    throw new Error(`API ${response.status}: ${bodyText}`);
  }

  return response.json() as Promise<T>;
}
