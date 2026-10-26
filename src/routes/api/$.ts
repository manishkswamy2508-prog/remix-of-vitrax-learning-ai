import { createFileRoute } from "@tanstack/react-router";
import { handle } from "@/server/adapter";

const run = ({ request }: { request: Request }) => handle(request, new URL(request.url).pathname);

export const Route = createFileRoute("/api/$")({
  server: { handlers: { GET: run, POST: run } },
});
