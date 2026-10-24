import test from "node:test";
import assert from "node:assert/strict";
import { canAutoReply, normalizedMessage } from "./policy.mjs";
const allowed={enabled:true,paused:false,permission:true,category:"positive",dailyCount:0,dailyLimit:5,duplicate:false};
test("permits only enabled, authorized, unique actions within the daily limit",()=>{
  assert.equal(canAutoReply(allowed),true);
  for(const change of [{paused:true},{permission:false},{duplicate:true},{dailyCount:5},{category:"complaint"},{category:"sensitive"}]) assert.equal(canAutoReply({...allowed,...change}),false);
});
test("normalizes duplicate message text",()=>assert.equal(normalizedMessage("Hello, World!"),"hello world"));
