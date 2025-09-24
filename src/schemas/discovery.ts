import { z } from 'zod';
import { FluoraOperation } from '../types/operations.js';

// Discovery schemas
export const SearchServerSchema = z.object({
  operation: z.literal(FluoraOperation.SEARCH_FLUORA),
  name: z.string().optional(),
});

export const ListServersSchema = z.object({
  operation: z.literal(FluoraOperation.LIST_SERVERS),
  category: z.string().optional(),
});

export const GetServerInfoSchema = z.object({
  operation: z.literal(FluoraOperation.GET_SERVER_INFO),
  serverId: z.string(),
});

export const ListToolsSchema = z.object({
  operation: z.literal(FluoraOperation.LIST_TOOLS),
  serverId: z.string(),
});
