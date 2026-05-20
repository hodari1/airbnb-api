import { PrismaClient } from './generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'
import 'dotenv/config'

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL!,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000, // ✅ 10 seconds — gives Neon time to wake up
})
const adapter = new PrismaPg(pool)

const prisma = new PrismaClient({ adapter })

export default prisma