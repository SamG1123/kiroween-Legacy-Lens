import { readFileSync } from 'fs';
import { join } from 'path';
import { getPool, closePool } from './config';

interface Migration {
  id: number;
  name: string;
  filename: string;
}

const migrations: Migration[] = [
  { id: 1, name: 'create_projects_table', filename: '001_create_projects_table.sql' },
  { id: 2, name: 'create_analyses_table', filename: '002_create_analyses_table.sql' },
];

async function createMigrationsTable(): Promise<void> {
  const pool = getPool();
  const query = `
    CREATE TABLE IF NOT EXISTS migrations (
      id INTEGER PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      executed_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `;
  await pool.query(query);
}

async function getExecutedMigrations(): Promise<number[]> {
  const pool = getPool();
  const result = await pool.query('SELECT id FROM migrations ORDER BY id');
  return result.rows.map(row => row.id);
}

async function executeMigration(migration: Migration): Promise<void> {
  const pool = getPool();
  const migrationPath = join(__dirname, 'migrations', migration.filename);
  
  console.log(`Executing migration ${migration.id}: ${migration.name}...`);
  
  try {
    const sql = readFileSync(migrationPath, 'utf-8');
    
    // Execute migration in a transaction
    await pool.query('BEGIN');
    await pool.query(sql);
    await pool.query(
      'INSERT INTO migrations (id, name, executed_at) VALUES ($1, $2, NOW())',
      [migration.id, migration.name]
    );
    await pool.query('COMMIT');
    
    console.log(`✓ Migration ${migration.id} completed successfully`);
  } catch (error) {
    await pool.query('ROLLBACK');
    console.error(`✗ Migration ${migration.id} failed:`, error);
    throw error;
  }
}

export async function runMigrations(): Promise<void> {
  try {
    console.log('Starting database migrations...');
    
    // Create migrations tracking table
    await createMigrationsTable();
    
    // Get list of already executed migrations
    const executedMigrations = await getExecutedMigrations();
    
    // Execute pending migrations
    let executedCount = 0;
    for (const migration of migrations) {
      if (!executedMigrations.includes(migration.id)) {
        await executeMigration(migration);
        executedCount++;
      } else {
        console.log(`- Migration ${migration.id} already executed, skipping`);
      }
    }
    
    if (executedCount === 0) {
      console.log('No pending migrations');
    } else {
      console.log(`\n✓ Successfully executed ${executedCount} migration(s)`);
    }
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}

export async function rollbackLastMigration(): Promise<void> {
  const pool = getPool();
  
  try {
    console.log('Rolling back last migration...');
    
    // Get the last executed migration
    const result = await pool.query(
      'SELECT id, name FROM migrations ORDER BY id DESC LIMIT 1'
    );
    
    if (result.rows.length === 0) {
      console.log('No migrations to rollback');
      return;
    }
    
    const lastMigration = result.rows[0];
    console.log(`Rolling back migration ${lastMigration.id}: ${lastMigration.name}`);
    
    // Note: Rollback logic would need to be implemented per migration
    // For now, we'll just remove the migration record
    await pool.query('BEGIN');
    
    // Drop tables in reverse order
    if (lastMigration.id === 2) {
      await pool.query('DROP TABLE IF EXISTS analyses CASCADE');
    } else if (lastMigration.id === 1) {
      await pool.query('DROP TABLE IF EXISTS projects CASCADE');
    }
    
    await pool.query('DELETE FROM migrations WHERE id = $1', [lastMigration.id]);
    await pool.query('COMMIT');
    
    console.log(`✓ Rollback completed successfully`);
  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('Rollback failed:', error);
    throw error;
  }
}

// CLI interface
if (require.main === module) {
  const command = process.argv[2];
  
  (async () => {
    try {
      if (command === 'up' || !command) {
        await runMigrations();
      } else if (command === 'down') {
        await rollbackLastMigration();
      } else {
        console.error('Unknown command. Use "up" or "down"');
        process.exit(1);
      }
    } catch (error) {
      console.error('Migration script failed:', error);
      process.exit(1);
    } finally {
      await closePool();
    }
  })();
}
