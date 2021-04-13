import { Settings, User } from '@prisma/client';

export type UserWithSettings = User & { Settings: Settings };
