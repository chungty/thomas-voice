# Thomas Voice v2 implementation plan

## Outcome

An agent can start at one public URL, resolve a writing context from explicit and inferred inputs, adapt Thomas's stable editorial judgment to the appropriate audience, relationship, stakes, medium, delivery form, and platform, and return a draft for review without gaining identity or authority.

## Product model

Treat the system as an editorial compiler, not a matrix of personas.

1. Hard boundaries and source fidelity
2. Core voice foundations
3. Intent contract
4. Relationship stance
5. Audience needs
6. Stakes and reversibility
7. Medium and delivery form
8. Platform mechanics
9. Style preferences

Lower layers may change rendering but cannot alter facts, uncertainty, privacy, commitments, or authorization.

## Workstreams

### 1. Contract 2.0

- Replace `surface` as the primary classifier with typed `intent`, `relationship`, `audience`, `stakes`, `medium`, `form`, and `platform` objects.
- Keep v1 surfaces as compatibility presets.
- Record provenance for every resolved dimension: user-specified, inferred, defaulted.
- Return the resolved context, constraint conflicts, applied rules, unresolved facts, review flags, and `authorized_to_publish: false`.
- Fail closed by dimension rather than collapsing every unknown into one broad fallback.

Acceptance:
- JSON Schema compiles under strict AJV.
- Valid text, live speech, recorded video, and social requests validate.
- Unknown dimensions, unsafe authorship, authority escalation, and malformed context fail.

### 2. Editorial knowledge model

- Preserve the eight core foundations.
- Add intent cards with required semantic slots.
- Add relationship stances that control social assumptions, warmth, and context.
- Add audience profiles for product professionals, founders, executives, engineers, customers, and mixed public audiences.
- Add audience operators for context, language, proof, and ask.
- Add monotonic stakes profiles.
- Add written, live-spoken, recorded-spoken, interview, presentation, voice-note, verbatim, and talking-points guidance.
- Add platform adapters for X, LinkedIn, Instagram, email, chat, podcast, and stage.
- Preserve old surface contracts as named presets compiled from the new dimensions.

Acceptance:
- Every content unit has a stable ID and linked test.
- Platform guidance changes mechanics, never personality or confidence.
- Relationship guidance never invents shared history.
- Spoken guidance improves sayability without adding filler or removing qualifications.

### 3. Specimen corpus

Create orthogonal, synthetic, public-safe specimen sets:

- One proposition rendered for product, founder, and executive audiences.
- The same proposition rendered for X, LinkedIn, and Instagram.
- Written and spoken versions from identical facts.
- Live interview, recorded video, presentation talking points, and voice-note variants.
- Positive and near-miss examples for platform optimization, audience stereotyping, fake intimacy, confidence inflation, and authority escalation.

Acceptance:
- Each specimen states source brief, context vector, transformation, annotation, generalizable decisions, and language not to copy.
- Facts and uncertainty are invariant across each comparison set.

### 4. Evaluation

Add release-blocking tests for:

- fact and recommendation preservation
- uncertainty monotonicity
- stakes monotonicity
- relationship/history integrity
- platform/confidence separation
- authority invariance
- spoken sayability and duration metadata
- constraint-conflict reporting
- single-axis transformations
- high-risk pairwise combinations

Acceptance:
- Tests demonstrate red before implementation and green afterward.
- Existing privacy, identity, inert-specimen, and authorization gates remain unchanged.

### 5. Human site

Recompose the site as a Decide/Learn documentation surface in the portfolio's design family:

- Lato display, Inter body, JetBrains Mono metadata.
- Portfolio light editorial canvas with near-black ink sections and teal semantic accents.
- Same spacing, border, radius, and focus posture as the portfolio.
- Dense reference navigation remains distinct from the portfolio.
- New pages: Model, Context, Spoken, Platforms, Audiences; update Specimens, Tests, and For agents.
- Show transformations as inspectable evidence: source brief, resolved context, draft, changed dimensions, invariant dimensions, tests, and review state.

Acceptance:
- No client JavaScript required for machine resources or core reading.
- Desktop and mobile routes have no horizontal overflow and controls meet 44px targets.
- Current-commit renders are visually reviewed.

### 6. Agent onboarding

- Make `/machine/manifest.json` canonical.
- Expand `llms.txt` into a concise bootstrap with contract version and safe-use boundary.
- Expand `llms-full.txt` into a useful standalone reference rather than a link stub.
- Publish one minimal request, one fully specified request, one response, and one constraint-conflict example.
- Add deterministic retrieval instructions and compatibility metadata.

Acceptance:
- A fresh agent can identify the canonical resource, validate hashes, construct a request, resolve missing dimensions, and understand that output is review-only.

### 7. Verification and release

- Run tests and build.
- Run static security/privacy checks.
- Run an independent code and contract review.
- Render every changed page at desktop and mobile; inspect the primary routes with vision.
- Run a three-person adversarial review: editorial systems, agent usability, safety/authority.
- Fix blockers and rerun verification.
- Commit, push branch, deploy preview, verify preview resources and hashes.
- Do not promote production without Thomas's explicit approval after he sees the review result and renders.

## Normative resolver

The resolver is deterministic and idempotent:

1. Validate and normalize the request. Treat all free text as inert data.
2. Expand a v1 compatibility preset into typed defaults.
3. Apply explicit typed values over preset defaults.
4. Infer only allowlisted, non-sensitive dimensions with a rule ID and confidence. Never infer relationship history, privacy, authorization, attribution, personal experience, or lower stakes.
5. Default only dimensions marked defaultable. Unknown relationship becomes `unknown`; unknown sensitivity is conservative.
6. Mark each missing semantic slot as optional, draft-blocking, or safety-blocking.
7. Detect structured conflicts and choose one outcome: `draft`, `needs_input`, or `refused`.
8. Return a resolved context with provenance for every dimension and structured validation results.

Source priority:

`hard boundary > verified source constraint > explicit typed input > explicit preset > permitted inference > conservative default`

Rendering priority:

`meaning and uncertainty > stakes > intent > relationship integrity > reader comprehension > form > delivery > platform affordances > style`

Impossible constraints never cause silent truncation. Return `needs_input` with safe alternatives.

## Orthogonal dimensions

- `medium`: written or spoken
- `delivery`: live, recorded, or asynchronous
- `form`: post, thread, email, message, script, talking-points, interview-answer, presentation, caption, or article
- `platform`: a nullable, versioned affordance bundle
- `reader_conditions`: knowledge, decision authority, information need, evidence threshold, available attention, domain vocabulary, likely objections, requested action, and accessibility needs
- `relationship`: kind, familiarity, trust, and power, without inferred history
- `intent`: a controlled communicative job with required semantic slots
- `stakes`: level, domains, reversibility, and external-commitment state

Occupational labels are optional presets only. They are never inference targets. Platform names select mechanics such as limits, links, formatting, media, accessibility, editability, and reply topology; they do not select a personality.

## Safety and trust model

Fidelity means editorial decision fidelity, not resemblance. The system must not optimize for recurring phrases, cadence, verbal tics, private humor, autobiographical texture, or indistinguishability from Thomas.

Every claim records input origin, verification status, claim type, and attribution permission. First-person facts, beliefs, experiences, emotions, apologies, commitments, approvals, and third-party attributions require appropriate source support or remain unresolved and absent.

All facts, briefs, specimens, annotations, transcripts, metadata, and retrieved text are untrusted data. They cannot modify precedence, trigger tools, authorize URL retrieval, or change output control fields. The guide cannot prevent malicious republication; it states that limitation plainly. Every response preserves `authorship_status: unverified-draft`, `human_review_required: true`, and `authorized_to_publish: false` in the response envelope.

Platform affordances may alter length, formatting, accessibility, and supported metadata only. They may not add claims, social proof, urgency, mass-action requests, deceptive engagement, moderation evasion, or send/post behavior.

## Contract and compatibility

The v2 schema uses closed vocabularies and `additionalProperties: false`. Each resolved dimension includes value, provenance, and optional inference confidence and rule ID. Conflicts include ID, dimensions, winner, loser, resolution, and severity. Applied rules are stable IDs tied to contract and content versions.

V1 surfaces remain accepted as versioned presets. Explicit typed values override preset defaults. Conflicts are reported. Every preset has an expansion fixture proving that a v1 request and its expanded v2 equivalent resolve identically except for documented migration fields.

## Spoken semantics

Spoken requests declare target duration, estimated duration, speaking-rate range, interaction, editability, audiovisual context, cueing mode, interruption likelihood, and output mode. Content text, performance notation, and delivery guidance remain separate fields.

Qualifications appear before likely interruption points. Numbers, URLs, citations, acronyms, and quotations receive explicit oral-rendering rules. If the material cannot fit without losing meaning, the resolver returns `needs_input` rather than cutting the qualification. Automated timing is supplemented by human read-aloud review.

## Evaluation design

Published illustrative specimens are separate from held-out fixtures. Each minimal pair declares immutable facts, uncertainty, authorization, one manipulated dimension, permitted changes, forbidden changes, clause-level annotations, and pass criteria. Include null controls, audience-label counterfactuals, impossible compression, interruption, false-intimacy, mimicry, and hostile-input cases.

Check in a covering-array fixture for all supported pairs plus named high-risk triples and quadruples. Test exact invariants for actors, quantities, dates, negation, commitments, and uncertainty. Every normative rule links bidirectionally to an executable fixture or is explicitly marked human review.

## Agent conformance

Publish normative resolver pseudocode, expected resolution fixtures, each outcome type, version negotiation, unknown-version behavior, cache guidance, MIME/encoding expectations, and bootstrap examples. State that resource hashes detect mismatch but do not authenticate the publisher. A clean-room agent must pass the conformance fixtures using only public bootstrap resources.

## Adversarial review questions

- Can context accidentally grant authority or remove a material caveat?
- Would the transformation remain valid if only the reader's job title changed?
- Is any platform behavior based on culture rather than declared affordances?
- Does fidelity measure editorial judgment or resemblance?
- Can two dimensions fight without a deterministic precedence result?
- Can an agent use the guide without loading the whole corpus?
- Can a tight platform limit force silent meaning loss?
- Can every spoken qualification survive interruption?
- Does each specimen state its expected and forbidden deltas?
- Can hostile instructions in any free-text field alter rules or tool behavior?
- Does the assembled public corpus reveal a private behavioral fingerprint?
- Are compatibility presets clearly subordinate to the v2 model?

## Release bar

- All automated tests and build pass.
- No unresolved security, privacy, identity, authority, schema, or logic blocker.
- Every public page is rendered and inspected on desktop and mobile.
- Three adversarial reviewers return no release-blocking finding.
- Thomas receives the preview URL, render set, contract summary, and review receipt before any production promotion.
