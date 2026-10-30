import test from 'node:test';
import assert from 'node:assert/strict';
import { validate_user } from '../../src/users.js';
const input={username:'staff.test',full_name:'Nhân viên',role:'staff',status:'active',password:'12345'};
test('user validation accepts exactly staff/admin and requires a password only on creation',()=>{
  assert.ok(validate_user(input,true));
  for(const role of ['editor','owner','',null]) assert.equal(validate_user({...input,role},true),undefined);
  const {password,...update}=input;
  assert.ok(validate_user(update,false));assert.equal(validate_user(update,true),undefined);
  for(const password of ['', '1234', 'x'.repeat(201),12345]) assert.equal(validate_user({...input,password},true),undefined);
  for(const username of ['a','bad name',"a';--"]) assert.equal(validate_user({...input,username},true),undefined);
  assert.equal(validate_user({...input,status:'pending'},false),undefined);
});
