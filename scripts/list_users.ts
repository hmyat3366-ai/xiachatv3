import { db } from '../server/db.js';

const users = db.prepare('SELECT id, name, email, username, auth_provider, email_verified, onboarding_completed, created_at FROM users').all();
console.log('Total Users:', users.length);
console.log(JSON.stringify(users, null, 2));
