/** @type { import("drizzle-kit").Config } */
export default {
  schema: "./db/schema.js",
  out: "./drizzle",
  dialect: "sqlite",
  dbCredentials: {
    url: "./sqlite.db",
  }
};
