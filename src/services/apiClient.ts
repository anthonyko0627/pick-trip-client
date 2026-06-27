export async function apiFetch<T>(
  url: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(url, options);

  if (!response.ok) {
    const bodyText = await response.text();
    throw new Error(`API ${response.status}: ${bodyText}`);
  }

  return response.json() as Promise<T>;
}
