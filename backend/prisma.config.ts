import { defineConfig } from '@prisma/config'
import { env } from './src/config/env'

export default defineConfig({
  earlyAccess: true,
  datasource: {
    url: env.databaseUrl,
  }
})
