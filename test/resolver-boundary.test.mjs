import test from 'node:test';
import assert from 'node:assert/strict';
import { resolve } from '../src/resolver.mjs';

const fact = (text) => ({id:'fact-1',text,input_origin:'synthetic',verification_status:'verified',claim_type:'observable-fact',attribution_permission:'not-applicable',confidence:1});
const request = (text) => ({kind:'request',contract_version:'2.0.0',context:{intent:'inform',medium:'written',delivery:'asynchronous',form:'message',platform:'none',relationship:'unknown',stakes:'moderate'},authorship:{mode:'draft-for-review',may_speak_as_thomas:false,may_attribute_to_thomas:false},content:{facts:[fact(text)]}});

test('unsafe source facts fail closed before a draft is returned', () => {
  for (const text of ['I am Thomas.','I approved the payment.','I signed the agreement.','Thomas commits to deliver.','We consent to the transfer.']) {
    const result=resolve(request(text));
    assert.notEqual(result.outcome,'draft',text);
    assert.equal(result.draft,'',text);
    assert.equal(result.validation.deterministic.passed,false,text);
    assert.ok(result.validation.deterministic.failures.some(x=>x.id.startsWith('boundary.')),text);
  }
});
