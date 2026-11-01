import assert from 'node:assert/strict';
import { test } from 'node:test';
import { loginDestination } from '../lib/auth.ts';
test('login redirect retains safe deep links and rejects external targets',()=>{
 assert.equal(loginDestination('/achievements'),'/login?next=%2Fachievements');
 assert.equal(loginDestination('/tu-vung/lesson-1?mode=test'),'/login?next=%2Ftu-vung%2Flesson-1%3Fmode%3Dtest');
 assert.equal(loginDestination('//evil.example'),'/login?next=%2F');
});
