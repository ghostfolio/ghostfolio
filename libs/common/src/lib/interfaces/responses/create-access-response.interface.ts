import { Access } from '@prisma/client';

export interface CreateAccessResponse extends Omit<Access, 'hashedApiToken'> {
  apiToken?: string;
}
