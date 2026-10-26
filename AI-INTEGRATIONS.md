# VITRAX AI integration status

## Implemented
- Codespace offers Claude and Codex identities plus a model override from the same live catalog used by chat.
- Claude uses the existing native Anthropic Messages adapter. Codex-style requests use OpenAI GPT-6 Astra through the AI SDK Responses adapter.
- Explicit selections never silently change providers. Persistent server-only access blocks stop replaying credit/access failures.
- Agent requests include unsaved active-file content and preserve local projects.

## Reference archive audit
- `free-claude-code`: independent AGPL-3.0-only proxy/desktop integration, not Anthropic Claude Code itself. No code imported.
- `no-cost-ai`: directory of service links, not an inference API or API key. No code imported.
- `open-webui`: self-hosted interface with authenticated `/api/v1/chat/completions`, streaming and configured model backends. Current/custom branding license needs review before copying UI. No code imported.
- `OpenMonoAgent.ai`: AGPL-3.0 .NET/Docker/local-inference agent, OpenAI/Ollama adapters marked WIP. Cannot run inside the hosted app runtime. No code imported.

## Still needed
Open WebUI requires an existing reachable HTTPS deployment URL and its authorized connection. OpenMono requires a separately hosted supported HTTP service. No Cost AI has no API to connect: choose actual services from its directory. Never use borrowed keys, scraped sessions, unauthorized proxies or quota evasion.

Claude Code and Codex CLI execution are not implemented: these controls run model-backed browser coding assistants, not a terminal/process agent. A separate sandbox host and secure service integration are required for real CLI/tool execution.

## Configuration and deployment
`LOVABLE_API_KEY` is managed server-side. Existing optional provider presets remain supported through their configured model lists and credentials; do not put credentials in browser storage or VITE variables. No third-party credentials were included/imported from archives.

Publish after verification to deploy the new server code and Cloud configuration. If access becomes blocked, an owner must restore access first; then the server-only stored block can be cleared deliberately. The UI cannot clear a denial or automatically probe it.

No OCR, image-generation, PDF, quiz, or flashcard changes were made as part of this focused AI-provider request.