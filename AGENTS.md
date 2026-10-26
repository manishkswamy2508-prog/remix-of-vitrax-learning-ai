<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Keep coding-agent identity separate from provider/model selection; both chatbot and Codespace use the central server-side model registry.
- Use the native Messages adapter for Claude and the AI SDK Responses adapter for OpenAI; hosted runtime cannot execute desktop coding CLIs or .NET/Docker agent processes.
- Explicit model selections must not silently fall back; access-denial and credit pauses are persisted in the server-only ai_access_blocks table.
- Uploaded AGPL applications are reference material only; no source is copied without licensing review.
