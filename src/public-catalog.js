import { pathways as demoPathways, courses } from './demo-catalog.js';
import { publishedGrace } from './published-grace.js';

export const pathways = [publishedGrace.profile, ...demoPathways.map(profile => ({ ...profile, dataSource: 'demo' }))];
export { courses, publishedGrace };
