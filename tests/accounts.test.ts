import assert from 'node:assert/strict';
import { test } from 'node:test';
import { activeUser, credentials, assertAdmin, assertLearnerTarget } from '../lib/accounts/policy.ts';
import { createAccount, updateAccount } from '../lib/accounts/service.ts';
const admin={id:'admin',email:'owner@example.com',role:'admin' as const};
const learner={id:'learner',email:'learner@example.com',role:'learner' as const};
test('profile is required and blocked users cannot authenticate',()=>{
  assert.equal(activeUser(learner,null),null);
  assert.equal(activeUser(learner,{id:'learner',role:'learner',disabled:true}),null);
  assert.equal(activeUser(learner,{id:'other',role:'admin',disabled:false}),null);
  assert.equal(activeUser(learner,{id:'learner',role:'owner',disabled:false}),null);
  assert.deepEqual(activeUser(learner,{id:'learner',role:'learner',disabled:false}),learner);
});
test('email/password validation preserves passwords and requires strong new passwords',()=>{
  assert.deepEqual(credentials({email:' USER@example.com ',password:' valid password '}),{email:'user@example.com',password:' valid password '});
  for (const input of [null,{}, {email:'invalid',password:'long-password'}, {email:'u@example.com',password:'short'}]) assert.throws(()=>credentials(input,true));
  assert.equal(credentials({email:'u@example.com',password:'short'}).password,'short');
});
test('admin authorization and immutable admin accounts',()=>{
  assert.throws(()=>assertAdmin(null)); assert.throws(()=>assertAdmin(learner)); assert.doesNotThrow(()=>assertAdmin(admin));
  assert.throws(()=>assertLearnerTarget(admin,admin)); assert.throws(()=>assertLearnerTarget(admin,null));
  assert.doesNotThrow(()=>assertLearnerTarget(admin,learner));
});
test('account operations stop before provider call for unauthorized actors and forward provider failures',async()=>{
  let calls=0;
  const backend={
    create:async()=>{calls++;throw new Error('EMAIL_EXISTS');},
    find:async()=>learner,
    setDisabled:async()=>{calls++;},
    resetPassword:async()=>{calls++;throw new Error('PROVIDER_UNAVAILABLE');},
  };
  await assert.rejects(createAccount(learner,{email:'u@example.com',password:'long-password'},backend)); assert.equal(calls,0);
  await assert.rejects(createAccount(admin,{email:'u@example.com',password:'long-password'},backend),/EMAIL_EXISTS/);
  await assert.rejects(updateAccount(admin,'learner',{action:'password',password:'long-password'},backend),/PROVIDER_UNAVAILABLE/);
  await assert.rejects(updateAccount(admin,'learner',{action:'role',role:'admin'},backend));
  await updateAccount(admin,'learner',{action:'disable'},backend); assert.equal(calls,3);
});
