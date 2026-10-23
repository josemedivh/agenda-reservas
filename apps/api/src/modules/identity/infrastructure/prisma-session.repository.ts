import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service.js';
import { SessionRepository, type NewSession, type StoredSession } from '../application/ports.js';

@Injectable()
export class PrismaSessionRepository extends SessionRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async create(session: NewSession): Promise<void> {
    await this.prisma.session.create({ data: session });
  }

  findByTokenHash(tokenHash: string): Promise<StoredSession | null> {
    return this.prisma.session.findUnique({
      where: { tokenHash },
      select: { id: true, userId: true, expiresAt: true },
    });
  }

  async deleteByTokenHash(tokenHash: string): Promise<void> {
    await this.prisma.session.deleteMany({ where: { tokenHash } });
  }
}
