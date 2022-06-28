const request = require('supertest');
const buildApp = require('../../app');
const UserRepo = require('../../repos/user-repo');
const pool = require('../../pool');

const { randomBytes } = require('crypto');
const { default: migrate } = require('node-pg-migrate');
const format = require('pg-format');

beforeAll(async () => {
  // Random role name to connect to PG as
  // Be sure to start with a letter
  const roleName = 'a' + randomBytes(4).toString('hex');

  await pool.connect({
    host: 'localhost',
    port: 5432,
    database: 'socialnetwork-test',
    user: 'postgres',
    password: 'password',
  });

  // Create a new role
  await pool.query(`
  CREATE ROLE ${roleName} WITH LOGIN PASSWORD '${roleName}'
`);

  // Create a schema with the same name
  await pool.query(`
  CREATE SCHEMA ${roleName} AUTHORIZATION ${roleName};
`);

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
});

afterAll(() => {
  return pool.close();
});

it('create a user', async () => {
  const startingCount = await UserRepo.count();

  await request(buildApp())
    .post('/users')
    .send({ username: 'testuser', bio: 'test bio' })
    .expect(200);

  const finishCount = await UserRepo.count();
  expect(finishCount - startingCount).toEqual(1);
});
