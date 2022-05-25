const pool = require('../pool');

class UserRepo {
  static async find() {
    const { rows } = await pool.query('SELECT * FROM users;');

    const parsedRows = rows.map((row) => {
      const replaced = {};

      for (let key in row) {
        const camelCase = key.replace(/([-_][a-z])/gi, ($1) =>
          $1.toUpperCase().replace('_', '')
        );

        replaced[camelCase] = row[key];
      }

      return replaced;
    });

    return parsedRows;
  }

  static async findById() {}

  static async insert() {}

  static async update() {}

  static async delete() {}
}

module.exports = UserRepo;
