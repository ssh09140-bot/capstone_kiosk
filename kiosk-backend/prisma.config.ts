import { defineConfig } from '@prisma/client/scripts/config';

export default defineConfig({
  seed: 'tsx prisma/seed.ts',
});
