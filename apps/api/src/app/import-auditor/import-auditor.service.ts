import { Injectable } from '@nestjs/common';

@Injectable()
export class ImportAuditorService {
  public getHealth(): { status: string } {
    return { status: 'OK' };
  }
}
