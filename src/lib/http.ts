export const json = (status: number, data: unknown) => ({
  statusCode: status,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(data),
});

export const badRequest = (message: string) => json(400, { message });
export const internalError = (err: unknown) => json(500, { message: (err as any)?.message || String(err) });
