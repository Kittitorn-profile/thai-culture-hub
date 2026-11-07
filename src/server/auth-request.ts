export async function readAuthBody(
  request: Pick<Request, 'json'>
): Promise<Record<string, unknown>> {
  const value: unknown = await request.json().catch(() => null);
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
