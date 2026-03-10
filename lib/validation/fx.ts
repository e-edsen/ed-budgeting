import { z } from 'zod';

const fxResponseSchema = z
  .object({
    usdToIdr: z.number().finite().positive(),
    lastUpdatedAt: z.number().int().nonnegative().nullable(),
    isStale: z.boolean(),
  })
  .strict();

export type FxResponse = z.infer<typeof fxResponseSchema>;

export function parseFxResponse(value: unknown): FxResponse | null {
  const parsed = fxResponseSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}
