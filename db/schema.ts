import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
export const settings = sqliteTable('settings', { id: text('id').primaryKey(), value: text('value').notNull() });
export const oauthStates = sqliteTable('oauth_states', { id: text('id').primaryKey(), user: text('user').notNull(), verifier: text('verifier').notNull(), expires: integer('expires').notNull() });
export const snapshots = sqliteTable('snapshots', { id: text('id').primaryKey(), user: text('user').notNull(), value: text('value').notNull(), updated: integer('updated').notNull() });
