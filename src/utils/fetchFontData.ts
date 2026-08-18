export async function fetchFontData(url: string | URL): Promise<ArrayBuffer> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(
      `Failed to fetch font (${res.status} ${res.statusText}): ${url}`
    );
  }
  return res.arrayBuffer();
}
