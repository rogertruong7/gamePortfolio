import { lazy } from "react";

// Every project and experience is one <slug>.json plus one <slug>.mdx in src/content.
// Adding those two files adds the menu option, the page and the route.
const metas = import.meta.glob("../content/*.json", { eager: true, import: "default" });
const bodies = import.meta.glob("../content/*.mdx");

const entries = Object.values(metas).map((meta) => ({
  ...meta,
  path: `/${meta.kind === "experience" ? "experiences" : "projects"}/${meta.slug}`,
  Body: lazy(bodies[`../content/${meta.slug}.mdx`]),
}));

const ofKind = (kind) =>
  entries.filter((e) => e.kind === kind).sort((a, b) => a.order - b.order);

export const projects = ofKind("project");
export const experiences = ofKind("experience");
export const allEntries = [...projects, ...experiences];
