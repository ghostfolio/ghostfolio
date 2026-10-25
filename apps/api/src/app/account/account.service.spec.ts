import { PortfolioChangedEvent } from '@ghostfolio/api/events/portfolio-changed.event';

import { ConflictException } from '@nestjs/common';
import { Account, Prisma } from '@prisma/client';

import { AccountService } from './account.service';

describe('AccountService', () => {
  describe('deleteAccount', () => {
    let service: AccountService;
    let deleteAccountMock: jest.Mock;
    let emitMock: jest.Mock;

    const where: Prisma.AccountWhereUniqueInput = {
      id_userId: {
        id: 'account-id',
        userId: 'user-id'
      }
    };

    const account = {
      id: 'account-id',
      userId: 'user-id'
    } as Account;

    beforeEach(() => {
      deleteAccountMock = jest.fn();
      emitMock = jest.fn();

      service = Object.assign(Object.create(AccountService.prototype), {
        prismaService: {
          account: {
            delete: deleteAccountMock
          }
        },
        eventEmitter: {
          emit: emitMock
        }
      }) as AccountService;
    });

    it('returns a conflict when a foreign key prevents account deletion', async () => {
      deleteAccountMock.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError(
          'Foreign key constraint failed',
          {
            code: 'P2003',
            clientVersion: 'test'
          }
        )
      );

      let thrown: unknown;

      try {
        await service.deleteAccount(where);
      } catch (error) {
        thrown = error;
      }

      expect(thrown).toBeInstanceOf(ConflictException);
      expect((thrown as ConflictException).getStatus()).toBe(409);
      expect((thrown as Error).message).toContain(
        'still referenced by a cash transfer or another record'
      );
      expect(emitMock).not.toHaveBeenCalled();
    });

    it('propagates errors other than foreign key violations', async () => {
      const error = new Error('Database unavailable');
      deleteAccountMock.mockRejectedValue(error);

      await expect(service.deleteAccount(where)).rejects.toBe(error);

      expect(emitMock).not.toHaveBeenCalled();
    });

    it('emits the portfolio change event after successful deletion', async () => {
      deleteAccountMock.mockResolvedValue(account);

      await expect(service.deleteAccount(where)).resolves.toBe(account);

      expect(deleteAccountMock).toHaveBeenCalledWith({ where });
      expect(emitMock).toHaveBeenCalledTimes(1);
      expect(emitMock).toHaveBeenCalledWith(
        PortfolioChangedEvent.getName(),
        expect.objectContaining({ userId: account.userId })
      );
    });
  });
});
