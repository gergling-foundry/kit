import z from "zod";

export const TscDiagnosticSchema = z.object({
  filePath: z.string().min(1),
  line: z.coerce.number().int().positive(),
  column: z.coerce.number().int().positive(),
  severity: z.enum(['error', 'warning']),
  code: z.string().regex(/^TS\d+$/),
  message: z.string(),
});

export type TscDiagnostic = z.infer<typeof TscDiagnosticSchema>;
