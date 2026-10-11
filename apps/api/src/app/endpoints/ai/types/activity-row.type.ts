import { z } from 'zod';

import { ACTIVITY_ROWS_OUTPUT } from '../ai.schemas';

export type ActivityRow = z.infer<typeof ACTIVITY_ROWS_OUTPUT>['rows'][number];
