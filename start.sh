#!/bin/sh
# Initialize database schema if not exists on PostgreSQL
node scripts/db-init-pg.js

# Start Next.js production server
exec npm run start
