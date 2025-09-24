import { FluoraOperation } from '@/types/operations.js';
import { z } from 'zod';

// Tool execution schemas
export const CallServerToolSchema = z.object({
  operation: z.literal(FluoraOperation.CALL_SERVER_TOOL),
  serverId: z.string(),
  toolName: z.string(),
  args: z.record(z.unknown()),
});
