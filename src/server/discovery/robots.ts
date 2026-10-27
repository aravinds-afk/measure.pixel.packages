/**
 * Minimal robots.txt evaluation (RFC 9309): picks the most specific matching
 * user-agent group (ours, else "*"), longest-path match wins, Allow wins ties.
 */

type Rule = { allow: boolean; pattern: string };

export type Robots = { isAllowed(path: string): boolean; status: "parsed" | "none" | "unreachable" };

export function parseRobots(text: string, agentToken: string): Robots {
  const groups: { agents: string[]; rules: Rule[] }[] = [];
  let current: { agents: string[]; rules: Rule[] } | null = null;
  let lastWasAgent = false;
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*$/, "").trim();
    if (!line) continue;
    const m = line.match(/^([A-Za-z-]+)\s*:\s*(.*)$/);
    if (!m) continue;
    const field = m[1].toLowerCase();
    const value = m[2].trim();
    if (field === "user-agent") {
      if (!current || !lastWasAgent) {
        current = { agents: [], rules: [] };
        groups.push(current);
      }
      current.agents.push(value.toLowerCase());
      lastWasAgent = true;
    } else if ((field === "allow" || field === "disallow") && current) {
      lastWasAgent = false;
      if (field === "disallow" && value === "") continue; // empty disallow = allow all
      current.rules.push({ allow: field === "allow", pattern: value });
    } else {
      lastWasAgent = false;
    }
  }
  const token = agentToken.toLowerCase();
  const specific = groups.filter((g) => g.agents.some((a) => a !== "*" && token.includes(a)));
  const chosen = specific.length ? specific : groups.filter((g) => g.agents.includes("*"));
  const rules = chosen.flatMap((g) => g.rules);

  return {
    status: "parsed",
    isAllowed(path: string) {
      let best: Rule | null = null;
      let bestLen = -1;
      for (const r of rules) {
        if (!matches(r.pattern, path)) continue;
        const len = r.pattern.length;
        if (len > bestLen || (len === bestLen && r.allow)) {
          best = r;
          bestLen = len;
        }
      }
      return best ? best.allow : true;
    },
  };
}

function matches(pattern: string, path: string): boolean {
  const anchored = pattern.endsWith("$");
  const body = anchored ? pattern.slice(0, -1) : pattern;
  const re = new RegExp("^" + body.split("*").map(escapeRe).join(".*") + (anchored ? "$" : ""));
  return re.test(path);
}

const escapeRe = (s: string) => s.replace(/[.+?^${}()|[\]\\]/g, "\\$&");

export const allowAll: Robots = { status: "none", isAllowed: () => true };
export const disallowAll: Robots = { status: "unreachable", isAllowed: () => false };
