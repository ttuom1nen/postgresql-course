const { randomBytes } = require('crypto');
const format = require('pg-format');
const { default: migrate } = require('node-pg-migrate');
const pool = require('../pool');

const DEFAULT_OPTIONS = {
  host: 'localhost',
  port: 5432,
  database: 'socialnetwork-test',
  user: 'postgres',
  password: 'password',
};

class Context {
  static async build() {
    // Random role name to connect to PG as
    // Be sure to start with a letter
    const roleName = 'a' + randomBytes(4).toString('hex');

    await pool.connect(DEFAULT_OPTIONS);

    // Create a new role
    await pool.query(
      // %I = Identifier, %L = Literal value
      format('CREATE ROLE %I WITH LOGIN PASSWORD %L;', roleName, roleName)
    );

    // Create a schema with the same name
    await pool.query(
      format('CREATE SCHEMA %I AUTHORIZATION %I;', roleName, roleName)
    );

    // Disconnect from PG
    await pool.close();

    // Run migrations in the new schema
    await migrate({
      schema: roleName,
      direction: 'up',
      log: () => {},
      noLock: true,
      dir: 'migrations',
      databaseUrl: {
        host: 'localhost',
        port: 5432,
        database: 'socialnetwork-test',
        user: roleName,
        password: roleName,
      },
    });

    // Connect to PG as the new role
    await pool.connect({
      host: 'localhost',
      port: 5432,
      database: 'socialnetwork-test',
      user: roleName,
      password: roleName,
    });

    return new Context(roleName);
  }

  constructor(roleName) {
    this.roleName = roleName;
  }

  async reset() {
    return pool.query(`
      DELETE FROM users;
    `);
  }

  async close() {
    // Disconnect from pg
    await pool.close();

    // Reconnect as root user
    await pool.connect(DEFAULT_OPTIONS);

    // Delete the role and schema we created
    await pool.query(format('DROP SCHEMA %I CASCADE;', this.roleName));
    await pool.query(format('DROP ROLE %I;', this.roleName));

    // Disconnect
    await pool.close();
  }
}

module.exports = Context;
