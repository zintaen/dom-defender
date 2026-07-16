// Teaching layer for DOM Defender for teams (TASK-DD-EDU-001). Each bug family maps
// to the real web concept it represents, so a team session doubles as a lesson and
// the after-action summary can explain what each bug was really about.

export interface ConceptExplainer {
  bugType: string;
  label: string;
  concept: string;
}

export const CONCEPT_MAP: Record<string, ConceptExplainer> = {
  drift: {
    bugType: "drift",
    label: "Drifting elements",
    concept:
      "Layout and CSS: elements shift when positioning, flexbox, or constraints are wrong. The fix is stable layout rules, not nudging pixels.",
  },
  error: {
    bugType: "error",
    label: "Console errors",
    concept:
      "Error handling: uncaught exceptions and failed calls surface in the console and break features downstream. Catch, log, and recover at the boundary.",
  },
  leak: {
    bugType: "leak",
    label: "Memory leaks",
    concept:
      "Memory management: listeners, timers, and references that are never cleaned up grow memory until the tab crashes. Tear down what you set up.",
  },
  boss: {
    bugType: "boss",
    label: "Compound failure (boss)",
    concept:
      "A cascading failure that needs layout, error-handling, and memory fixes together - the kind of incident that takes a whole team.",
  },
};

export function explainBug(bugType: string): ConceptExplainer {
  return (
    CONCEPT_MAP[bugType] ?? {
      bugType,
      label: bugType,
      concept: "A web bug to patch before it spreads.",
    }
  );
}

export function allConcepts(): ConceptExplainer[] {
  return Object.values(CONCEPT_MAP);
}
