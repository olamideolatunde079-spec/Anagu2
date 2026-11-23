import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { AdministrativeConfig } from './entities/administrative-config.entity';
import { AuditService } from '../audit/audit.service';
import { UserRole } from '../auth/entities/user.entity';
import { UpsertAdminConfigDto } from './dto/admin-config.dto';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(AdministrativeConfig)
    private readonly configRepo: Repository<AdministrativeConfig>,
    private readonly dataSource: DataSource,
    private readonly auditService: AuditService,
  ) {}

  async listConfigs(category?: string) {
    const configs = await this.configRepo.find({
      where: category ? { category: category as AdministrativeConfig['category'] } : {},
      order: { category: 'ASC', configKey: 'ASC' },
    });
    return configs.map((c) => ({
      ...c,
      configValue: c.isSensitive ? { masked: true } : c.configValue,
    }));
  }

  async upsertConfig(key: string, dto: UpsertAdminConfigDto, adminId: string) {
    let existing = await this.configRepo.findOne({ where: { configKey: key } });
    if (!existing && !dto.category) {
      throw new NotFoundException(`Config key "${key}" does not exist; supply category to create it.`);
    }

    const previousValue = existing?.configValue ?? null;
    if (!existing) {
      existing = this.configRepo.create({
        configKey: key,
        category: dto.category!,
        configValue: dto.configValue,
        description: dto.description ?? null,
        isSensitive: dto.isSensitive ?? false,
        updatedBy: adminId,
      });
    } else {
      existing.configValue = dto.configValue;
      if (dto.description !== undefined) existing.description = dto.description;
      if (dto.isSensitive !== undefined) existing.isSensitive = dto.isSensitive;
      existing.updatedBy = adminId;
    }

    const saved = await this.configRepo.save(existing);

    await this.auditService.log({
      entityType: 'administrative_config',
      entityId: saved.id,
      eventType: 'CONFIG_UPDATED',
      actorRole: UserRole.LAND_ADMINISTRATOR,
      actorId: adminId,
      metadata: { configKey: key, previousValue, newValue: dto.isSensitive ? '[MASKED]' : dto.configValue },
    });

    return saved;
  }

  async getOverviewStats() {
    const [appCounts, parcelCounts, titleCounts, marketCounts] = await Promise.all([
      this.dataSource.query(
        `SELECT status, COUNT(*)::int AS count FROM applications GROUP BY status`,
      ),
      this.dataSource.query(
        `SELECT status, COUNT(*)::int AS count FROM parcels GROUP BY status`,
      ),
      this.dataSource.query(
        `SELECT
           COUNT(*)::int AS total_titles,
           COUNT(*) FILTER (WHERE is_revoked = FALSE)::int AS active_titles,
           COUNT(*) FILTER (WHERE is_revoked = TRUE)::int AS revoked_titles
         FROM land_titles`,
      ),
      this.dataSource.query(
        `SELECT
           (SELECT COUNT(*)::int FROM marketplace_listings WHERE status = 'ACTIVE') AS active_listings,
           (SELECT COUNT(*)::int FROM land_transfers WHERE status = 'COMPLETED') AS completed_transfers,
           (SELECT COALESCE(SUM(commission_amount), 0)::text FROM platform_commissions WHERE status = 'COLLECTED') AS collected_commissions`,
      ),
    ]);

    return {
      applicationsByStatus: appCounts,
      parcelsByStatus: parcelCounts,
      titles: titleCounts[0] ?? { total_titles: 0, active_titles: 0, revoked_titles: 0 },
      marketplace: marketCounts[0] ?? { active_listings: 0, completed_transfers: 0, collected_commissions: '0' },
      generatedAt: new Date().toISOString(),
    };
  }
}
