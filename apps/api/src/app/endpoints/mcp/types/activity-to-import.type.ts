import type { z } from 'zod';

import type { IMPORT_ACTIVITIES_PARAMETERS } from '../mcp.schemas';

export type ActivityToImport = z.infer<
  typeof IMPORT_ACTIVITIES_PARAMETERS
>['activities'][number];
