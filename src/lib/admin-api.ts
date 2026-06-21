export class AdminApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'AdminApiError';
    this.status = status;
  }
}

type AdminApiOptions = Omit<RequestInit, 'body' | 'headers'> & {
  accessToken: string;
  body?: BodyInit | Record<string, unknown>;
  headers?: HeadersInit;
};

function isJsonBody(body: AdminApiOptions['body']) {
  return !!body && !(body instanceof FormData) && !(body instanceof Blob);
}

export async function adminApiRequest<TResponse>(
  input: string,
  { accessToken, body, headers, ...init }: AdminApiOptions
) {
  const requestHeaders = new Headers(headers);

  if (accessToken) {
    requestHeaders.set('Authorization', `Bearer ${accessToken}`);
  }

  if (isJsonBody(body) && !requestHeaders.has('Content-Type')) {
    requestHeaders.set('Content-Type', 'application/json');
  }

  const requestBody: BodyInit | undefined = isJsonBody(body)
    ? JSON.stringify(body)
    : (body as BodyInit | undefined);

  const response = await fetch(input, {
    ...init,
    headers: requestHeaders,
    body: requestBody,
  });
  const data = (await response.json().catch(() => ({}))) as TResponse & { message?: string };

  if (!response.ok) {
    throw new AdminApiError(data.message ?? 'เกิดข้อผิดพลาดจาก API', response.status);
  }

  return data;
}
