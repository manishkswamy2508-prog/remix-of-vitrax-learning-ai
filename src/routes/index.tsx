import { createFileRoute, ClientOnly } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import vitraxCss from "../vitrax/index.css?url";

const App = lazy(() => import("../vitrax/App"));

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "VITRAX AI — Chat, study and code workspace" },
      { name: "description", content: "VITRAX AI: chat, research, flashcards, quizzes, documents and code in one workspace." },
      { property: "og:title", content: "VITRAX AI" },
      { property: "og:description", content: "Chat, research, study and code in one AI workspace." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: vitraxCss },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;500;600&family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=Space+Grotesk:wght@500;600;700&display=swap" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <ClientOnly fallback={null}>
      <Suspense fallback={null}>
        <App />
      </Suspense>
    </ClientOnly>
  );
}
