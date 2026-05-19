export const HEALTHZ_ENDPOINT = '/healthz';

export async function getHealth(): Promise<{ status: string }> {
  const res = await fetch(HEALTHZ_ENDPOINT);
  if (!res.ok) throw new Error(`healthz ${res.status}`);
  return res.json();
}
