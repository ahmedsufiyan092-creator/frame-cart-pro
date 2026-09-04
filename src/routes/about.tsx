import { createFileRoute } from "@tanstack/react-router";
import { SiteShell } from "@/components/site/site-shell";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "Our craft — Frame Cart" },
      {
        name: "description",
        content:
          "How Frame Cart frames are made: archival giclée printing, acid-free museum matting and solid wood mouldings, finished by hand.",
      },
      { property: "og:title", content: "Our craft — Frame Cart" },
      {
        property: "og:description",
        content: "Archival printing, museum matting and hand-finished wood mouldings.",
      },
    ],
  }),
  component: About,
});

const STEPS = [
  {
    title: "Archival printing",
    body: "Every photograph is printed with pigment inks on 280gsm cotton-rag paper, rated for decades without fading.",
  },
  {
    title: "Museum matting",
    body: "Acid-free mats keep the print off the glass so it breathes, and give the image room to sit properly on your wall.",
  },
  {
    title: "Solid wood mouldings",
    body: "Black ash, champagne gold, natural oak and classic white profiles, cut and joined to order.",
  },
  {
    title: "Ready to hang",
    body: "Shatter-resistant glazing, dust seal, hanging hardware fitted and a protective corner-guard box for transit.",
  },
];

function About() {
  return (
    <SiteShell>
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <p className="eyebrow">Our craft</p>
        <h1 className="mt-3 text-4xl">Framing built to outlive the trend cycle</h1>
        <p className="mt-5 text-base leading-relaxed text-muted-foreground">
          Frame Cart began with a simple frustration: beautiful photographs stuck on phones, and
          cheap frames that warp in the first monsoon. We make the other thing — considered,
          archival framing at a price that still makes sense for an Indian home.
        </p>

        <div className="mt-12 grid gap-8 sm:grid-cols-2">
          {STEPS.map((step, i) => (
            <div key={step.title} className="surface-card p-6">
              <p className="eyebrow">0{i + 1}</p>
              <h2 className="mt-3 text-xl">{step.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
            </div>
          ))}
        </div>
      </div>
    </SiteShell>
  );
}
