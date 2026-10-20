import * as Router from '@koa/router';
import * as fs from 'fs';
import * as path from 'path';

const router = new Router();

export interface CustomQuery {
	query: string;
	description: string;
	fixed_key?: string;
}

router.get('/', async ctx => {
	const customQueries: Record<string, CustomQuery> = {};

	// Parse environment variable configurations (e.g. TWK_custom_queries__name__query)
	Object.keys(process.env).forEach(key => {
		if (key.startsWith('TWK_custom_queries__')) {
			const parts = key.replace('TWK_custom_queries__', '').split('__');
			if (parts.length === 2) {
				const [queryName, prop] = parts;
				if (!customQueries[queryName]) {
					customQueries[queryName] = { query: '', description: queryName };
				}
				if (prop === 'query') customQueries[queryName].query = process.env[key] || '';
				if (prop === 'description') customQueries[queryName].description = process.env[key] || '';
				if (prop === 'fixed_key') customQueries[queryName].fixed_key = process.env[key];
			}
		}
	});

	ctx.body = customQueries;
});

export default router;
