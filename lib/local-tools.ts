import { tool } from 'ai';
import { z } from 'zod';

const store = new Map<string, string>();

export const memoryTools = {
  'memory_get': tool({
    description: '指定されたキーのメモリを取得する',
    parameters: z.object({ key: z.string().describe('取得したいメモリのキー') }),
    execute: async ({ key }) => {
      return { value: store.get(key) ?? null };
    },
  }),
  'memory_set': tool({
    description: '指定されたキーにメモリを書き込む',
    parameters: z.object({ key: z.string().describe('保存するキー'), value: z.string().describe('保存する値') }),
    execute: async ({ key, value }) => {
      store.set(key, value);
      return { status: 'ok' };
    },
  }),
} as const; 