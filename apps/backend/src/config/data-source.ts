import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

const isProduction = process.env.NODE_ENV === 'production';
const databaseUrl = process.env.DATABASE_URL;
const password = process.env.DATABASE_APP_PASSWORD ?? process.env.POSTGRES_PASSWORD;

if (isProduction && !databaseUrl && !password) {
  throw new Error('DATABASE_URL or POSTGRES_PASSWORD must be configured in production.');
}

export const AppDataSource = new DataSource({
  type: 'postgres',
  ...(databaseUrl
    ? { url: databaseUrl }
    : {
        host:     process.env.POSTGRES_HOST ?? 'localhost',
        port:     parseInt(process.env.POSTGRES_PORT ?? '5433', 10),
        database: process.env.POSTGRES_DB   ?? 'anagu',
        username: process.env.DATABASE_APP_USER ?? process.env.POSTGRES_USER ?? 'anagu_admin',
        password: password ?? '',
      }),
  entities:   [path.join(__dirname, '../**/*.entity{.ts,.js}')],
  migrations: [path.join(__dirname, '../migrations/*{.ts,.js}')],
  ssl: isProduction ? { rejectUnauthorized: false } : false,
  synchronize: false,
  logging: process.env.NODE_ENV === 'development',
});
