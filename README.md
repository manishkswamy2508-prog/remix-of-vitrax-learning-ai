# Remix of Vitrax Learning Ai

VITRAX AI: MASTER MULTI-MODEL INTEGRATION, HIGH-AVAILABILITY & EFFECTIVELY UNLIMITED USER ACCESS



Act as a senior AI infrastructure engineer, full-stack architect, security engineer, and debugging specialist. You are working on my existing VITRAX AI application.



I have supplied three source archives:



1. "VitraxAI-source.zip": the existing VITRAX AI application. THIS IS THE PRIMARY PROJECT AND SOURCE OF TRUTH.

2. "OmniGPT-Gateway-main.zip": an OpenAI-compatible gateway project. Inspect its architecture and reuse only suitable, legally compliant, secure, independently useful components.

3. "free-claude-code-main.zip": a multi-provider AI model routing project. Inspect its provider registry, model routing, retry logic, provider fallback, and usage optimization capabilities.



PRIMARY OBJECTIVE



Upgrade VITRAX AI into a reliable, high-quality, multi-model AI application with effectively unlimited-feeling access for its users, subject to actual provider capacity and configured operating budgets.



Users should be able to ask questions, receive detailed answers, analyse documents, generate educational PDFs, create flashcards, generate quizzes, and work with their source materials without an arbitrary application-imposed daily credit wall.



Do not falsely claim that external AI services provide unlimited requests. The goal is to maximize legitimate free-tier capacity, add optional paid or self-hosted providers, use intelligent routing, and make service failures rare and recoverable.



Do not rebuild the application from scratch. Do not replace the existing design with a generic AI dashboard. Modify the existing VITRAX implementation.



PHASE 1: AUDIT ALL THREE PROJECTS



Before changing code:



1. Inspect the complete VITRAX source tree, including package.json, routes, components, API integrations, server functions, authentication, database configuration, document processing, PDF generation, and existing AI features.

2. Locate the exact cause of previous errors such as "No output generated" and identify any broken model calls, incorrect response parsing, streaming failures, missing environment variables, quota exhaustion, or unsupported model configurations.

3. Inspect both gateway archives and map their useful components, dependencies, interfaces, security assumptions, deployment requirements, and licensing obligations.

4. Identify which existing features are working and preserve them.

5. Produce a concise implementation plan, then execute it. Do not stop after providing recommendations.

6. Never assume that a feature exists merely because a README describes it. Verify it in the actual source code.



PHASE 2: BUILD A CENTRALIZED AI ROUTING LAYER



Create a maintainable, provider-independent AI service integrated with VITRAX's existing framework.



Use a common internal interface for:



- Sending conversational requests.

- Streaming responses when supported.

- Handling system prompts and conversation history.

- Supplying relevant excerpts from uploaded documents.

- Image and multimodal inputs where supported.

- Structured JSON output where supported.

- Token limits, cancellation, timeouts, and error normalization.

- Selecting models by task, quality, cost, availability, and supported capabilities.



Implement provider adapters for compatible, officially supported APIs. Preserve the current Gemini integration if it exists and works.



Allow optional integration with other providers through their official APIs or supported OpenAI-compatible endpoints. Support self-hosted models where technically feasible.



Do not hard-code model names or assume every model supports vision, tools, JSON mode, long context, or streaming. Discover or configure capabilities explicitly.



PHASE 3: PROVIDER REGISTRY AND MODEL FALLBACK



Implement a configurable provider and model registry.



Each model entry should contain:



- Provider and model identifier.

- Supported capabilities.

- Maximum configured context and output limits, based on verified provider specifications.

- Cost configuration when applicable.

- Availability and health information.

- Priority and task suitability.

- Required environment variables.

- Whether the model is free-tier, paid, or self-hosted.



Build intelligent routing:



1. Prefer an eligible high-quality model for complex reasoning, difficult educational problems, and document analysis.

2. Use suitable low-cost or legitimate free-tier models for routine questions and lightweight transformations.

3. Select models according to task capabilities rather than merely switching to the next model in a list.

4. Fall back to another eligible provider when the primary model is temporarily unavailable or has exhausted its quota.

5. Respect provider-specific rate limits, retry-after headers, and concurrency limits.

6. Use bounded exponential backoff with jitter for transient failures.

7. Do not retry indefinitely.

8. Do not send requests to models that cannot handle the required input.

9. If all providers are unavailable, return a clear, actionable error and allow the user to retry later.

10. Never claim that a fallback response has the same quality or capabilities as the original model unless verified.



Distinguish rate limits, billing failures, authentication failures, invalid requests, safety refusals, timeouts, and malformed model output. Do not respond to invalid credentials by endlessly retrying or switching credentials.



PHASE 4: EVALUATE THE SUPPLIED GATEWAY PROJECTS SAFELY



OmniGPT Gateway



Inspect the gateway's API compatibility layer, request validation, response normalization, and other independently reusable components.



Its supplied implementation uses browser automation of existing ChatGPT or Claude web sessions. Do not use stealth automation, session-cookie extraction, credential sharing, anti-bot circumvention, or subscription-session repurposing as VITRAX's production AI backend.



Do not expose a private individual's ChatGPT or Claude account to VITRAX users. Do not copy browser profiles or authentication cookies into the application server.



If any component depends on these mechanisms, exclude it from production and document why. Prefer official APIs and authorized inference endpoints.



Free Claude Code



Inspect the provider registry, model catalog, retry/fallback implementation, and provider integrations.



Determine whether its components can actually be reused independently of its coding-agent runtime.



Do not blindly embed the entire application or assume its providers are suitable for general-purpose public inference. Reuse compatible components only after verifying their interfaces, dependencies, security, and license obligations.



The integration must support ordinary VITRAX conversations and educational tasks, not just software-development agents.



Check the applicable licenses, including the AGPL-3.0 obligations of Free Claude Code and any relevant dependency licenses. Do not copy or redistribute code without complying with the applicable licenses. If licensing makes direct integration impractical, implement a clean-room adapter using documented interfaces instead.



PHASE 5: EFFECTIVELY UNLIMITED USER EXPERIENCE



Remove arbitrary daily application credit restrictions if they exist and are not required for legitimate abuse prevention or operating-budget controls.



Do not fabricate credits or bypass provider quotas.



Implement:



- No arbitrary daily message cap in the normal application configuration.

- Configurable per-user request pacing and concurrency limits for abuse prevention.

- Optional administrator-defined usage and cost limits.

- Fair-use protection against bots, scraping, and automated request floods.

- Clear explanations when all available inference capacity is exhausted.

- Graceful recovery after provider quotas reset.

- No surprise paid-provider calls or silent cost escalation.

- No hidden subscription requirements.

- No false claims that users have unlimited model capacity.



Cache eligible repeated results, extracted document text, and reusable intermediate outputs. Use appropriate cache invalidation and never return another user's private information through shared caches.



Avoid caching private conversations across users or treating user-specific responses as globally reusable.



PHASE 6: IMPROVE ANSWER QUALITY



VITRAX must provide actual answers, not merely loading indicators, generic apologies, empty responses, or raw implementation errors.



Implement the following:



1. Validate incoming requests and model responses.

2. Handle empty content, malformed JSON, truncated generations, and interrupted streams.

3. Normalize provider responses into one consistent internal format.

4. Preserve conversation history within the configured context budget.

5. Summarize or retrieve relevant historical context when conversations become long.

6. Use retrieval-augmented generation for uploaded documents when useful.

7. Keep source references and distinguish source-grounded claims from general model knowledge.

8. Render equations, tables, code, lists, and educational explanations cleanly in the existing UI.

9. Prevent duplicate submissions and repeated billing caused by accidental frontend retries.

10. Add structured server-side logging with secrets and sensitive document contents redacted.



For educational mathematics, physics, chemistry, and engineering questions, favour complete step-by-step explanations, clear notation, intermediate calculations, and final answers.



Do not sacrifice answer quality merely to maximize the number of requests.



PHASE 7: DOCUMENTS, PDFS, FLASHCARDS AND QUIZZES



Integrate the centralized routing layer with all existing VITRAX AI capabilities.



Document analysis



- Support the file formats already supported by VITRAX.

- Extract and preserve relevant document content.

- Handle large files through chunking and retrieval rather than sending every page repeatedly.

- Support questions grounded in uploaded source materials.

- Show useful source references when available.



PDF generation



- Generate properly formatted educational and analytical PDFs.

- Support headings, page breaks, tables, equations, page numbering, and readable spacing where appropriate.

- Reuse existing PDF-generation libraries where practical.

- Validate that generated files open correctly and contain the requested content.



Flashcards



- Generate meaningful question-and-answer pairs from uploaded material.

- Preserve factual accuracy and important definitions.

- Support revision and export through the existing interface.



Quizzes



- Generate questions, plausible answer choices, correct answers, and explanations.

- Avoid duplicated questions and unsupported claims.

- Validate output structure before displaying the quiz.

- Preserve the existing scoring and progress features.



These features must use the common AI service and must not maintain separate, inconsistent provider configurations.



PHASE 8: SECURITY AND DEPLOYMENT



Inspect the existing deployment architecture before selecting the implementation.



If a persistent backend is required, implement it using infrastructure compatible with the existing project and deployment environment.



- Keep provider secrets on the server.

- Use environment variables or the platform's secret manager.

- Never place private API keys in client-side JavaScript, public configuration, or committed files.

- Add request validation, authentication checks, rate limiting, and appropriate CORS protections.

- Avoid logging passwords, cookies, API keys, private conversations, or uploaded document contents.

- Prevent unauthorized users from consuming other users' resources.

- Ensure that user data and generated files are properly isolated.

- Add health checks and useful diagnostic endpoints without exposing secrets.

- Document required environment variables using a safe example file containing placeholders only.



If the current hosting environment cannot run the required backend, explain exactly which backend deployment or configuration step is necessary. Do not simulate a backend in frontend code or claim a feature works when it cannot be deployed.



PHASE 9: TEST EVERYTHING



Run the available project tests, lint checks, and production build.



Create or update automated tests covering:



- Primary-provider success.

- Provider timeout and rate limiting.

- Fallback-provider success.

- All providers unavailable.

- Invalid API credentials.

- Empty and malformed responses.

- Streaming interruption.

- Long conversations.

- Document extraction and analysis.

- PDF generation.

- Flashcard generation.

- Quiz generation.

- Authentication and user isolation.

- Duplicate submissions.

- Cost-control enforcement.

- Missing environment variables.



Use mocked provider responses for deterministic tests. Run live integration tests only when valid credentials and permission are available.



Fix the underlying causes of failures instead of hiding them with generic fallback messages.



PHASE 10: PRESERVE VITRAX



Preserve the existing VITRAX branding, layouts, navigation, colours, animations, responsive behaviour, and working features.



Do not replace the application with an unrelated chatbot template.



Avoid unnecessary dependencies and massive rewrites. Make small, maintainable changes that fit the existing architecture.



FINAL ACCEPTANCE CRITERIA



The implementation is complete only when:



1. The application builds successfully.

2. The existing VITRAX AI interface remains intact.

3. AI requests use the centralized provider layer.

4. Configured provider fallback works in automated tests.

5. Empty-response and error-handling paths are tested.

6. PDF, flashcard, quiz, and document workflows are connected to the AI service.

7. Secrets are not exposed in the frontend.

8. Usage limits and cost controls are configurable.

9. License and deployment requirements are documented.

10. No unsupported claim of unlimited capacity is made.



At completion, provide:



- A summary of the architecture.

- Exact files created or modified.

- Which supplied project components were reused and why.

- Which integrations were excluded and why.

- Environment variables that I must configureVITRAX AI: MASTER MULTI-MODEL INTEGRATION, HIGH-AVAILABILITY & EFFECTIVELY UNLIMITED USER ACCESS



Act as a senior AI infrastructure engineer, full-stack architect, security engineer, and debugging specialist. You are working on my existing VITRAX AI application.



I have supplied three source archives:



1. "VitraxAI-source.zip": the existing VITRAX AI application. THIS IS THE PRIMARY PROJECT AND SOURCE OF TRUTH.

2. "OmniGPT-Gateway-main.zip": an OpenAI-compatible gateway project. Inspect its architecture and reuse only suitable, legally compliant, secure, independently useful components.

3. "free-claude-code-main.zip": a multi-provider AI model routing project. Inspect its provider registry, model routing, retry logic, provider fallback, and usage optimization capabilities.



PRIMARY OBJECTIVE



Upgrade VITRAX AI into a reliable, high-quality, multi-model AI application with effectively unlimited-feeling access for its users, subject to actual provider capacity and configured operating budgets.



Users should be able to ask questions, receive detailed answers, analyse documents, generate educational PDFs, create flashcards, generate quizzes, and work with their source materials without an arbitrary application-imposed daily credit wall.



Do not falsely claim that external AI services provide unlimited requests. The goal is to maximize legitimate free-tier capacity, add optional paid or self-hosted providers, use intelligent routing, and make service failures rare and recoverable.



Do not rebuild the application from scratch. Do not replace the existing design with a generic AI dashboard. Modify the existing VITRAX implementation.



PHASE 1: AUDIT ALL THREE PROJECTS



Before changing code:



1. Inspect the complete VITRAX source tree, including package.json, routes, components, API integrations, server functions, authentication, database configuration, document processing, PDF generation, and existing AI features.

2. Locate the exact cause of previous errors such as "No output generated" and identify any broken model calls, incorrect response parsing, streaming failures, missing environment variables, quota exhaustion, or unsupported model configurations.

3. Inspect both gateway archives and map their useful components, dependencies, interfaces, security assumptions, deployment requirements, and licensing obligations.

4. Identify which existing features are working and preserve them.

5. Produce a concise implementation plan, then execute it. Do not stop after providing recommendations.

6. Never assume that a feature exists merely because a README describes it. Verify it in the actual source code.



PHASE 2: BUILD A CENTRALIZED AI ROUTING LAYER



Create a maintainable, provider-independent AI service integrated with VITRAX's existing framework.



Use a common internal interface for:



- Sending conversational requests.

- Streaming responses when supported.

- Handling system prompts and conversation history.

- Supplying relevant excerpts from uploaded documents.

- Image and multimodal inputs where supported.

- Structured JSON output where supported.

- Token limits, cancellation, timeouts, and error normalization.

- Selecting models by task, quality, cost, availability, and supported capabilities.



Implement provider adapters for compatible, officially supported APIs. Preserve the current Gemini integration if it exists and works.



Allow optional integration with other providers through their official APIs or supported OpenAI-compatible endpoints. Support self-hosted models where technically feasible.



Do not hard-code model names or assume every model supports vision, tools, JSON mode, long context, or streaming. Discover or configure capabilities explicitly.



PHASE 3: PROVIDER REGISTRY AND MODEL FALLBACK



Implement a configurable provider and model registry.



Each model entry should contain:



- Provider and model identifier.

- Supported capabilities.

- Maximum configured context and output limits, based on verified provider specifications.

- Cost configuration when applicable.

- Availability and health information.

- Priority and task suitability.

- Required environment variables.

- Whether the model is free-tier, paid, or self-hosted.



Build intelligent routing:



1. Prefer an eligible high-quality model for complex reasoning, difficult educational problems, and document analysis.

2. Use suitable low-cost or legitimate free-tier models for routine questions and lightweight transformations.

3. Select models according to task capabilities rather than merely switching to the next model in a list.

4. Fall back to another eligible provider when the primary model is temporarily unavailable or has exhausted its quota.

5. Respect provider-specific rate limits, retry-after headers, and concurrency limits.

6. Use bounded exponential backoff with jitter for transient failures.

7. Do not retry indefinitely.

8. Do not send requests to models that cannot handle the required input.

9. If all providers are unavailable, return a clear, actionable error and allow the user to retry later.

10. Never claim that a fallback response has the same quality or capabilities as the original model unless verified.



Distinguish rate limits, billing failures, authentication failures, invalid requests, safety refusals, timeouts, and malformed model output. Do not respond to invalid credentials by endlessly retrying or switching credentials.



PHASE 4: EVALUATE THE SUPPLIED GATEWAY PROJECTS SAFELY



OmniGPT Gateway



Inspect the gateway's API compatibility layer, request validation, response normalization, and other independently reusable components.



Its supplied implementation uses browser automation of existing ChatGPT or Claude web sessions. Do not use stealth automation, session-cookie extraction, credential sharing, anti-bot circumvention, or subscription-session repurposing as VITRAX's production AI backend.



Do not expose a private individual's ChatGPT or Claude account to VITRAX users. Do not copy browser profiles or authentication cookies into the application server.



If any component depends on these mechanisms, exclude it from production and document why. Prefer official APIs and authorized inference endpoints.



Free Claude Code



Inspect the provider registry, model catalog, retry/fallback implementation, and provider integrations.



Determine whether its components can actually be reused independently of its coding-agent runtime.



Do not blindly embed the entire application or assume its providers are suitable for general-purpose public inference. Reuse compatible components only after verifying their interfaces, dependencies, security, and license obligations.



The integration must support ordinary VITRAX conversations and educational tasks, not just software-development agents.



Check the applicable licenses, including the AGPL-3.0 obligations of Free Claude Code and any relevant dependency licenses. Do not copy or redistribute code without complying with the applicable licenses. If licensing makes direct integration impractical, implement a clean-room adapter using documented interfaces instead.



PHASE 5: EFFECTIVELY UNLIMITED USER EXPERIENCE



Remove arbitrary daily application credit restrictions if they exist and are not required for legitimate abuse prevention or operating-budget controls.



Do not fabricate credits or bypass provider quotas.



Implement:



- No arbitrary daily message cap in the normal application configuration.

- Configurable per-user request pacing and concurrency limits for abuse prevention.

- Optional administrator-defined usage and cost limits.

- Fair-use protection against bots, scraping, and automated request floods.

- Clear explanations when all available inference capacity is exhausted.

- Graceful recovery after provider quotas reset.

- No surprise paid-provider calls or silent cost escalation.

- No hidden subscription requirements.

- No false claims that users have unlimited model capacity.



Cache eligible repeated results, extracted document text, and reusable intermediate outputs. Use appropriate cache invalidation and never return another user's private information through shared caches.



Avoid caching private conversations across users or treating user-specific responses as globally reusable.



PHASE 6: IMPROVE ANSWER QUALITY



VITRAX must provide actual answers, not merely loading indicators, generic apologies, empty responses, or raw implementation errors.



Implement the following:



1. Validate incoming requests and model responses.

2. Handle empty content, malformed JSON, truncated generations, and interrupted streams.

3. Normalize provider responses into one consistent internal format.

4. Preserve conversation history within the configured context budget.

5. Summarize or retrieve relevant historical context when conversations become long.

6. Use retrieval-augmented generation for uploaded documents when useful.

7. Keep source references and distinguish source-grounded claims from general model knowledge.

8. Render equations, tables, code, lists, and educational explanations cleanly in the existing UI.

9. Prevent duplicate submissions and repeated billing caused by accidental frontend retries.

10. Add structured server-side logging with secrets and sensitive document contents redacted.



For educational mathematics, physics, chemistry, and engineering questions, favour complete step-by-step explanations, clear notation, intermediate calculations, and final answers.



Do not sacrifice answer quality merely to maximize the number of requests.



PHASE 7: DOCUMENTS, PDFS, FLASHCARDS AND QUIZZES



Integrate the centralized routing layer with all existing VITRAX AI capabilities.



Document analysis



- Support the file formats already supported by VITRAX.

- Extract and preserve relevant document content.

- Handle large files through chunking and retrieval rather than sending every page repeatedly.

- Support questions grounded in uploaded source materials.

- Show useful source references when available.



PDF generation



- Generate properly formatted educational and analytical PDFs.

- Support headings, page breaks, tables, equations, page numbering, and readable spacing where appropriate.

- Reuse existing PDF-generation libraries where practical.

- Validate that generated files open correctly and contain the requested content.



Flashcards



- Generate meaningful question-and-answer pairs from uploaded material.

- Preserve factual accuracy and important definitions.

- Support revision and export through the existing interface.



Quizzes



- Generate questions, plausible answer choices, correct answers, and explanations.

- Avoid duplicated questions and unsupported claims.

- Validate output structure before displaying the quiz.

- Preserve the existing scoring and progress features.



These features must use the common AI service and must not maintain separate, inconsistent provider configurations.



PHASE 8: SECURITY AND DEPLOYMENT



Inspect the existing deployment architecture before selecting the implementation.



If a persistent backend is required, implement it using infrastructure compatible with the existing project and deployment environment.



- Keep provider secrets on the server.

- Use environment variables or the platform's secret manager.

- Never place private API keys in client-side JavaScript, public configuration, or committed files.

- Add request validation, authentication checks, rate limiting, and appropriate CORS protections.

- Avoid logging passwords, cookies, API keys, private conversations, or uploaded document contents.

- Prevent unauthorized users from consuming other users' resources.

- Ensure that user data and generated files are properly isolated.

- Add health checks and useful diagnostic endpoints without exposing secrets.

- Document required environment variables using a safe example file containing placeholders only.



If the current hosting environment cannot run the required backend, explain exactly which backend deployment or configuration step is necessary. Do not simulate a backend in frontend code or claim a feature works when it cannot be deployed.



PHASE 9: TEST EVERYTHING



Run the available project tests, lint checks, and production build.



Create or update automated tests covering:



- Primary-provider success.

- Provider timeout and rate limiting.

- Fallback-provider success.

- All providers unavailable.

- Invalid API credentials.

- Empty and malformed responses.

- Streaming interruption.

- Long conversations.

- Document extraction and analysis.

- PDF generation.

- Flashcard generation.

- Quiz generation.

- Authentication and user isolation.

- Duplicate submissions.

- Cost-control enforcement.

- Missing environment variables.



Use mocked provider responses for deterministic tests. Run live integration tests only when valid credentials and permission are available.



Fix the underlying causes of failures instead of hiding them with generic fallback messages.



PHASE 10: PRESERVE VITRAX



Preserve the existing VITRAX branding, layouts, navigation, colours, animations, responsive behaviour, and working features.



Do not replace the application with an unrelated chatbot template.



Avoid unnecessary dependencies and massive rewrites. Make small, maintainable changes that fit the existing architecture.



FINAL ACCEPTANCE CRITERIA



The implementation is complete only when:



1. The application builds successfully.

2. The existing VITRAX AI interface remains intact.

3. AI requests use the centralized provider layer.

4. Configured provider fallback works in automated tests.

5. Empty-response and error-handling paths are tested.

6. PDF, flashcard, quiz, and document workflows are connected to the AI service.

7. Secrets are not exposed in the frontend.

8. Usage limits and cost controls are configurable.

9. License and deployment requirements are documented.

10. No unsupported claim of unlimited capacity is made.



At completion, provide:



- A summary of the architecture.

- Exact files created or modified.

- Which supplied project components were reused and why.

- Which integrations were excluded and why.

- Environment variables that I must configure.

- Deployment steps that I must complete.

- Test and build results.

- Any remaining limitations or expected operating costs.



Start by inspecting all available source files. Then implement, test, and report the real results. Do not stop at a proposed plan..

- Deployment steps that I must complete.

- Test and build results.

- Any remaining limitations or expected operating costs.



Start by inspecting all available source files. Then implement, test, and report the real results. Do not stop at a proposed plan.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/51a12819-46b9-48d7-9e4e-98b09f2bbb79).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
