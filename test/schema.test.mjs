import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import Ajv2020 from 'ajv/dist/2020.js';
import { resolve } from '../src/resolver.mjs';

const root = new URL('../', import.meta.url);
const load = async path => JSON.parse(await readFile(new URL(path, root), 'utf8'));
const fact={id:'fact-1',text:'The build passed.',input_origin:'user-provided',verification_status:'verified',claim_type:'observable-fact',attribution_permission:'not-applicable',confidence:1};
const request={kind:'request',contract_version:'2.0.0',context:{intent:'recommend',medium:'written',delivery:'asynchronous',form:'message',platform:'chat'},reader_conditions:{knowledge:'familiar',decision_authority:'advisory',information_need:'evaluate',evidence_threshold:'supported',available_attention:'brief',domain_vocabulary:'shared',likely_objections:[],requested_action:'consider',accessibility_needs:[]},authorship:{mode:'draft-for-review',may_speak_as_thomas:false,may_attribute_to_thomas:false},content:{facts:[fact]},constraints:{sensitivity:'public',locale:'en-US'}};

test('strict schema validates unresolved request and resolved response as different shapes', async()=>{
 const validate=new Ajv2020({strict:true,allErrors:true}).compile(await load('src/schema.json'));
 assert.equal(validate(request),true,JSON.stringify(validate.errors));
 const response=resolve(request);
 assert.equal(validate(response),true,JSON.stringify(validate.errors));
 assert.equal(typeof request.context.intent,'string');
 assert.equal(response.resolved_context.intent.provenance,'user-specified');
});

test('schema fails closed on malformed, unknown, unsafe, and already-resolved request context',async()=>{
 const validate=new Ajv2020({strict:true,allErrors:true}).compile(await load('src/schema.json'));
 for(const value of [{},'anything',{...request,context:{...request.context,platform:'unknown-network'}},{...request,authorship:{...request.authorship,may_speak_as_thomas:true}},{...request,contract_version:'3.0.0'},{...request,context:{...request.context,intent:{value:'recommend',provenance:'user-specified'}}}]) assert.equal(validate(value),false,`unexpectedly valid: ${JSON.stringify(value)}`);
});

test('provenance metadata combinations are enforced',async()=>{
 const validate=new Ajv2020({strict:true,allErrors:true}).compile(await load('src/schema.json'));
 const response=resolve(request);
 response.resolved_context.intent={value:'recommend',provenance:'inferred'};
 assert.equal(validate(response),false,'inference requires confidence and rule id');
 response.resolved_context.intent={value:'recommend',provenance:'inferred',confidence:.9,rule_id:'infer.intent.recommend'};
 assert.equal(validate(response),true,JSON.stringify(validate.errors));
 response.resolved_context.intent={value:'recommend',provenance:'user-specified',confidence:.9,rule_id:'spoofed'};
 assert.equal(validate(response),false,'non-inferred provenance prohibits inference metadata');
});

test('claim origin, type, and attribution combinations are enforced',async()=>{
 const validate=new Ajv2020({strict:true,allErrors:true}).compile(await load('src/schema.json'));
 assert.equal(validate({...request,content:{facts:[{...fact,claim_type:'third-party-attribution',input_origin:'synthetic',attribution_permission:'not-applicable'}]}}),false);
 assert.equal(validate({...request,content:{facts:[{...fact,claim_type:'third-party-attribution',input_origin:'public-source',attribution_permission:'explicitly-permitted'}]}}),true,JSON.stringify(validate.errors));
});

test('response outcome semantics and immutable status are enforced',async()=>{
 const validate=new Ajv2020({strict:true,allErrors:true}).compile(await load('src/schema.json'));
 const draft=resolve(request);
 assert.equal(validate({...draft,authorized_to_publish:true}),false);
 assert.equal(validate({...draft,outcome:'refused',refusal_reasons:['unsafe']}),false,'refused must have empty draft');
 const needs=resolve({...request,constraints:{max_words:1}});
 assert.equal(needs.outcome,'needs_input');
 assert.equal(validate({...needs,draft:'Masquerading as success'}),false);
 const refused=resolve({...request,operation:'publish'});
 assert.equal(validate(refused),true,JSON.stringify(validate.errors));
 const {authorship_status,...missingStatus}=draft;
 assert.equal(validate(missingStatus),false);
});

test('schema and resolver use email as the single canonical platform id',async()=>{
 const validate=new Ajv2020({strict:true,allErrors:true}).compile(await load('src/schema.json'));
 assert.equal(validate({...request,context:{...request.context,platform:'email'}}),true,JSON.stringify(validate.errors));
 assert.equal(validate({...request,context:{...request.context,platform:'email-platform'}}),false);
 assert.equal(resolve({...request,compatibility_preset:'email',context:{}}).resolved_context.platform.value,'email');
});

test('resolver rejects reversed spoken rate ranges',()=>{
 const spoken={target_duration_seconds:30,speaking_rate_wpm_min:180,speaking_rate_wpm_max:100,interaction:'monologue',editability:'editable',audiovisual_context:'audio-only',cueing_mode:'verbatim',interruption_likelihood:'low',output_mode:'verbatim'};
 const result=resolve({...request,context:{...request.context,medium:'spoken'},spoken});
 assert.equal(result.outcome,'needs_input');
 assert.ok(result.unresolved.some(x=>x.id==='spoken.invalid-rate-range'));
});
