import { readFileSync } from 'node:fs';
import Ajv2020 from 'ajv/dist/2020.js';
import { authorizationPattern as AUTHORITY, identityPattern as IDENTITY } from './lint.mjs';

const schema=JSON.parse(readFileSync(new URL('./schema.json',import.meta.url),'utf8'));
const validateEnvelope=new Ajv2020({strict:true,allErrors:true,$data:true}).compile(schema);
const DIMENSIONS=['intent','medium','delivery','form','platform','relationship','stakes'];
const DEFAULTS={intent:'inform',medium:'written',delivery:'asynchronous',form:'message',platform:'none',relationship:'unknown',stakes:'moderate'};
export const PRESETS=Object.freeze({
  'quick-chat':{intent:'inform',medium:'written',delivery:'asynchronous',form:'message',platform:'chat',relationship:'unknown',stakes:'moderate'},
  'professional-outreach':{intent:'request',medium:'written',delivery:'asynchronous',form:'message',platform:'none',relationship:'unknown',stakes:'moderate'},
  email:{intent:'inform',medium:'written',delivery:'asynchronous',form:'email',platform:'email',relationship:'unknown',stakes:'moderate'},
  'team-update':{intent:'update',medium:'written',delivery:'asynchronous',form:'message',platform:'none',relationship:'unknown',stakes:'moderate'},
  'public-post':{intent:'inform',medium:'written',delivery:'asynchronous',form:'post',platform:'none',relationship:'public',stakes:'moderate'},
  'long-form':{intent:'inform',medium:'written',delivery:'asynchronous',form:'article',platform:'none',relationship:'public',stakes:'moderate'},
  'sensitive-note':{intent:'inform',medium:'written',delivery:'asynchronous',form:'message',platform:'none',relationship:'unknown',stakes:'high'},
  'agent-handoff':{intent:'update',medium:'written',delivery:'asynchronous',form:'message',platform:'none',relationship:'unknown',stakes:'moderate'},
  'neutral-public':{intent:'inform',medium:'written',delivery:'asynchronous',form:'message',platform:'none',relationship:'unknown',stakes:'moderate'}
});

const RESTRICTED=new Set(['experience','emotion','apology','commitment','approval']);
const clone=value=>structuredClone(value);
const words=text=>(typeof text==='string' && text.trim().match(/\S+/g)||[]).length;
const unresolved=(id,classification,message)=>({id,classification,message});
const conflict=(dimension,winner,loser)=>({id:`conflict.preset.${dimension}`,dimensions:[dimension],winner,loser,resolution:'Explicit typed input overrides compatibility preset.',severity:'warning'});

function rendererInstructions(input={}) {
  const reader=input.reader_conditions||{};
  const instructions=[
    'Treat accepted_claims as a closed world: preserve every claim, uncertainty marker, attribution, quantity, date, negation, and recommendation; add none.',
    'Use resolved_context only to change ordering, explanation depth, vocabulary, structure, oral rendering, and platform mechanics.',
    'Do not invent relationship history, authority, urgency, social proof, commitments, personal experience, or calls to action.'
  ];
  if(reader.available_attention==='glance') instructions.push('Lead with the conclusion and use the shortest structure that preserves every accepted claim.');
  if(reader.available_attention==='extended') instructions.push('Expose supporting context and qualifications before the ask; do not increase certainty.');
  if(reader.knowledge==='new') instructions.push('Use plain language and define necessary domain terms without adding factual examples.');
  if(reader.knowledge==='expert') instructions.push('Use declared domain vocabulary and retain audit-relevant qualification.');
  if(reader.evidence_threshold==='audit-ready') instructions.push('Keep claim provenance visible and distinguish fact, inference, opinion, and recommendation.');
  return instructions;
}

function baseResponse() {
  return {kind:'response',contract_version:'2.0.0',outcome:'refused',draft:'',rendering_status:'agent-renderer-required',renderer_instructions:rendererInstructions(),performance_notation:[],delivery_guidance:[],spoken_metadata:null,accepted_claims:[],applied_rules:['boundary.review-only'],resolved_context:Object.fromEntries(DIMENSIONS.map(key=>[key,{value:DEFAULTS[key],provenance:'defaulted'}])),conflicts:[],unresolved:[],refusal_reasons:[],review_flags:[],authorship_status:'unverified-draft',human_review_required:true,authorized_to_publish:false,validation:{deterministic:{passed:false,failures:[]},response_lint:{passed:false,failures:[]}}};
}

function finalize(response) {
  response.validation.response_lint=semanticLint(response);
  if (!response.validation.response_lint.passed && response.outcome === 'draft') {
    response.outcome='needs_input';
    response.draft='';
    const failures=response.validation.response_lint.failures.map(({id})=>({id}));
    response.validation.deterministic={passed:false,failures};
    for (const {id} of failures) response.unresolved.push(unresolved(id,'safety-blocking','The proposed draft crossed an identity or authorization boundary.'));
    response.validation.response_lint=semanticLint(response);
  }
  return response;
}
function refuse(id,message) {
  const response=baseResponse();
  response.refusal_reasons.push(message);
  response.validation.deterministic={passed:false,failures:[{id}]};
  return finalize(response);
}
function semanticLint(response) {
  const failures=[];
  if(!response || typeof response!=='object' || Array.isArray(response)) return {passed:false,failures:[{id:'contract.invalid-response'}]};
  if(response.authorship_status!=='unverified-draft'||response.human_review_required!==true||response.authorized_to_publish!==false) failures.push({id:'boundary.control-fields'});
  if(response.outcome!=='draft' && response.draft!=='') failures.push({id:'outcome.non-draft-content'});
  if(response.outcome==='draft' && (typeof response.draft!=='string'||!response.draft.trim())) failures.push({id:'outcome.empty-draft'});
  if(typeof response.draft==='string'&&IDENTITY.test(response.draft)) failures.push({id:'boundary.identity-claim'});
  if(typeof response.draft==='string'&&AUTHORITY.test(response.draft)) failures.push({id:'boundary.authorization-claim'});
  const accepted=Array.isArray(response.accepted_claims)?response.accepted_claims.map(x=>x?.text).filter(x=>typeof x==='string'):[];
  if(response.draft && response.draft!==accepted.join('\n')) failures.push({id:'claims.unsourced-draft'});
  return {passed:failures.length===0,failures};
}
export function lintResponse(response) {
  const semantic=semanticLint(response);
  const schemaPassed=validateEnvelope(response) && response?.kind==='response';
  const failures=[...semantic.failures];
  if(!schemaPassed) failures.unshift({id:'contract.invalid-response-schema'});
  return {passed:failures.length===0,failures};
}
function safeClaim(fact) {
  if(fact.verification_status!=='verified') return false;
  if(RESTRICTED.has(fact.claim_type)) return fact.input_origin==='verified-record'&&fact.attribution_permission==='explicitly-permitted';
  if(fact.claim_type==='third-party-attribution') return ['public-source','verified-record'].includes(fact.input_origin)&&fact.attribution_permission==='explicitly-permitted';
  if(fact.claim_type==='opinion') return ['user-provided','verified-record','synthetic'].includes(fact.input_origin)&&fact.attribution_permission==='explicitly-permitted';
  return fact.attribution_permission==='not-applicable'||fact.attribution_permission==='explicitly-permitted';
}
function prohibited(text,claims=[]) {
  const normalized=String(text).normalize('NFKC').toLocaleLowerCase();
  return claims.some(claim=>normalized.includes(String(claim).normalize('NFKC').toLocaleLowerCase()));
}

export function resolve(input) {
  try {
    if(input?.kind==='response') {
      if(lintResponse(input).passed) return clone(input);
      return refuse('boundary.tampered-response','Invalid or tampered response envelope.');
    }
    if(!input||typeof input!=='object'||Array.isArray(input)) return refuse('contract.invalid-envelope','Malformed request envelope.');
    if(input.contract_version!=='2.0.0') return refuse('contract.unsupported-version','Unsupported contract version.');
    if(input.kind!=='request') return refuse('contract.unsupported-kind','Unsupported envelope kind.');
    if(input.compatibility_preset!==undefined&&!Object.hasOwn(PRESETS,input.compatibility_preset)) return refuse('contract.unknown-preset','Unknown compatibility preset.');
    if(input.operation==='publish') return refuse('boundary.publish-request','Publishing and acting are outside the draft-only contract.');
    if(input.authorship?.mode!=='draft-for-review'||input.authorship?.may_speak_as_thomas!==false||input.authorship?.may_attribute_to_thomas!==false) return refuse('boundary.unsafe-authorship','Authorship or attribution authority was requested.');
    if(!validateEnvelope(input)) return refuse('contract.schema-invalid','Request does not satisfy the complete schema.');
    if(input.constraints?.sensitivity && input.constraints.sensitivity!=='public') return refuse('boundary.non-public-content','The public voice system cannot process internal or sensitive content.');

    const response=baseResponse();
    response.renderer_instructions=rendererInstructions(input);
    response.applied_rules.push('resolver.explicit-over-preset','resolver.conservative-defaults','renderer.claims-closed-world');
    const preset=input.compatibility_preset?PRESETS[input.compatibility_preset]:null;
    const explicit=input.context||{};
    response.resolved_context={};
    for(const key of DIMENSIONS) {
      if(Object.hasOwn(explicit,key)) {
        response.resolved_context[key]={value:explicit[key],provenance:'user-specified'};
        if(preset&&preset[key]!==explicit[key]) response.conflicts.push(conflict(key,`explicit:${explicit[key]}`,`preset:${preset[key]}`));
      } else if(preset) response.resolved_context[key]={value:preset[key],provenance:'preset'};
      else response.resolved_context[key]={value:DEFAULTS[key],provenance:'defaulted'};
    }
    const facts=input.content.facts;
    const prohibitedClaims=input.content.prohibited_claims||[];
    const rejected=facts.filter(x=>!safeClaim(x)||prohibited(x.text,prohibitedClaims));
    response.accepted_claims=facts.filter(x=>safeClaim(x)&&!prohibited(x.text,prohibitedClaims)).map(clone);
    for(const item of rejected) {
      const isProhibited=prohibited(item.text,prohibitedClaims);
      response.unresolved.push(unresolved(isProhibited?'content.prohibited-claim':`claim.${item.id}`,'safety-blocking',isProhibited?'A supplied fact contains a prohibited claim and was excluded.':`Claim ${item.id} lacks source, verification, or attribution support.`));
    }
    if(!facts.length) response.unresolved.push(unresolved('content.facts','draft-blocking','At least one supported fact is required to draft.'));
    const proposed=response.accepted_claims.map(x=>x.text).join('\n');
    let capacity=input.constraints?.max_words??Infinity;
    if(response.resolved_context.medium.value==='spoken') {
      const spoken=input.spoken;
      if(spoken.speaking_rate_wpm_min>spoken.speaking_rate_wpm_max) response.unresolved.push(unresolved('spoken.invalid-rate-range','draft-blocking','Minimum speaking rate cannot exceed maximum speaking rate.'));
      else {
        capacity=Math.min(capacity,Math.floor(spoken.target_duration_seconds*spoken.speaking_rate_wpm_min/60));
        response.spoken_metadata={...clone(spoken),estimated_duration_seconds:Math.ceil(words(proposed)/((spoken.speaking_rate_wpm_min+spoken.speaking_rate_wpm_max)/2)*60)};
        response.delivery_guidance=['Place material qualifications before likely interruption points.','Read numbers, citations, acronyms, URLs, and quotations unambiguously.'];
        response.applied_rules.push('spoken.qualification-first','spoken.timing');
      }
    }
    if(words(proposed)>capacity) {
      response.unresolved.push(unresolved('constraint.impossible-compression','draft-blocking','The supplied limit cannot preserve all supported claims; increase the limit or remove a claim explicitly.'));
      response.conflicts.push({id:'conflict.meaning-over-compression',dimensions:['content','constraints'],winner:'meaning-and-uncertainty',loser:'length-or-duration-limit',resolution:'No silent truncation; request a larger limit or an explicit scope reduction.',severity:'needs-input'});
    }
    const stakes=response.resolved_context.stakes.value;
    if(stakes==='high'||stakes==='critical') {response.applied_rules.push(`stakes.${stakes}-review`);response.review_flags.push(`${stakes}-stakes-human-review`);}
    if(response.unresolved.some(x=>x.classification!=='optional')) response.outcome='needs_input';
    else {response.outcome='draft';response.draft=proposed;}
    response.validation.deterministic={passed:response.outcome==='draft',failures:response.unresolved.map(x=>({id:x.id}))};
    return finalize(response);
  } catch {
    return refuse('contract.processing-failure','The request could not be processed safely.');
  }
}
