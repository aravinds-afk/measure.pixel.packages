// Referral opportunity, trigger and script generation. Deterministic and evidence-backed:
// every recommendation lists where its content came from.

import { dedupe, humanList } from "./normalize.ts";
import { getCategory, type TriggerDef } from "./taxonomy.ts";
import type { Evidence, MemberProfile, OpportunityConfidence, ReferralOpportunity, Scripts } from "./types.ts";

export function firstName(m: Pick<MemberProfile, "fullName">): string {
  return m.fullName.trim().split(/\s+/)[0] ?? m.fullName;
}

export function categoryName(m: MemberProfile): string {
  return getCategory(m.categoryId)?.name ?? m.categoryLabel ?? "Member";
}

/** A short "what they do" phrase, preferring the member's own data over profession knowledge. */
export function whatTheyDo(m: MemberProfile): string {
  if (m.services.length) return `provides ${humanList(m.services.map((s) => s.toLowerCase()), 3)}`;
  const cat = getCategory(m.categoryId);
  if (cat) return cat.summary.charAt(0).toLowerCase() + cat.summary.slice(1).replace(/\.$/, "");
  return "works in " + (m.categoryLabel ?? "their field");
}

/** Count of the core profile fields that are filled in (0–8). */
export function profileCompleteness(m: MemberProfile): { filled: number; total: number; missing: string[] } {
  const checks: [string, boolean][] = [
    ["professional category", !!m.categoryId],
    ["services", m.services.length > 0],
    ["customer types", m.customerSegments.length > 0],
    ["customer company size", m.companySizes.length > 0],
    ["industries served", m.industries.length > 0],
    ["service area", m.serviceAreas.length > 0],
    ["problems solved", m.problemsSolved.length > 0],
    ["business description", !!m.businessDescription?.trim()],
  ];
  const missing = checks.filter(([, ok]) => !ok).map(([k]) => k);
  return { filled: checks.length - missing.length, total: checks.length, missing };
}

function prov(m: MemberProfile, field: string) {
  return m.fieldProvenance?.[field] ?? "member_submitted";
}

function lookFor(giver: MemberProfile, receiver: MemberProfile, sharedCustomers: string[]): { items: string[]; evidence: Evidence[] } {
  if (sharedCustomers.length) {
    return {
      items: sharedCustomers.slice(0, 4),
      evidence: [{ source: "member_data", provenance: prov(receiver, "customerSegments"), text: `Both ${firstName(giver)} and ${firstName(receiver)} list ${humanList(sharedCustomers, 3)} as customers.` }],
    };
  }
  if (receiver.customerSegments.length) {
    return {
      items: receiver.customerSegments.slice(0, 4),
      evidence: [{ source: "member_data", provenance: prov(receiver, "customerSegments"), text: `${firstName(receiver)}'s profile lists ${humanList(receiver.customerSegments, 3)} as customers.` }],
    };
  }
  const cat = getCategory(receiver.categoryId);
  if (cat) {
    return {
      items: cat.typicalCustomers.map((c) => `${c} (typical for this profession)`),
      evidence: [{ source: "profession_knowledge", text: `${firstName(receiver)} has not listed customer types; showing customers typical for a ${cat.name}.` }],
    };
  }
  return { items: [], evidence: [] };
}

function genericQuestions(receiver: MemberProfile): string[] {
  const s = receiver.services[0]?.toLowerCase() ?? "this";
  return [`Have you looked at ${s} recently?`, "What have you tried so far?", "Would a short introduction be useful?"];
}

export interface OpportunityContext {
  sharedCustomers: string[];
  triggers: TriggerDef[];
  competitor: boolean;
  sharedSphereNames: string[];
}

export function buildOpportunities(giver: MemberProfile, receiver: MemberProfile, ctx: OpportunityContext): ReferralOpportunity[] {
  const out: ReferralOpportunity[] = [];
  const rCat = getCategory(receiver.categoryId);
  const gName = firstName(giver);
  const rName = firstName(receiver);
  const rCompleteness = profileCompleteness(receiver);
  const sparse = rCompleteness.filled <= 3;
  const look = lookFor(giver, receiver, ctx.sharedCustomers);
  const questions = rCat?.qualificationQuestions ?? genericQuestions(receiver);
  const baseWords = dedupe([...receiver.keywords.slice(0, 3), ...(rCat?.triggerWords.slice(0, 3) ?? [])]);
  const id = (k: string) => `${giver.id}:${receiver.id}:${k}`;
  const intro = (situation: string) =>
    `${rName}, meet [Prospect name]. [Prospect] mentioned ${situation}. ${rName} ${whatTheyDo(receiver)}${receiver.company ? ` at ${receiver.company}` : ""}. I thought a 15-minute conversation would be worthwhile — I'll leave you both to find a time. — ${gName}`;

  if (receiver.idealReferral?.trim()) {
    out.push({
      id: id("stated"),
      giverId: giver.id,
      receiverId: receiver.id,
      type: "Member-stated ideal referral",
      title: receiver.idealReferral.trim(),
      relevance: `${rName} has described this as their ideal referral. ${ctx.sharedCustomers.length ? `${gName} already serves ${humanList(ctx.sharedCustomers, 2)}, so these contacts may be in ${gName}'s network.` : `Check whether ${gName}'s clients match this description.`}`,
      lookFor: look.items,
      triggerSituations: ctx.triggers.slice(0, 2).map((t) => t.situation),
      triggerWords: baseWords.slice(0, 6),
      qualificationQuestions: questions,
      suggestedIntro: intro("a need that matches what you described"),
      evidence: [{ source: "member_data", provenance: prov(receiver, "idealReferral"), text: `${rName}'s stated ideal referral: “${receiver.idealReferral.trim()}”.` }, ...look.evidence],
      confidence: ctx.sharedCustomers.length ? "High" : "Medium",
    });
  }

  for (const t of ctx.triggers.slice(0, 3)) {
    const conf: OpportunityConfidence = sparse ? "Exploratory" : ctx.sharedCustomers.length ? "High" : "Medium";
    const gCat = getCategory(giver.categoryId);
    out.push({
      id: id(t.id),
      giverId: giver.id,
      receiverId: receiver.id,
      type: "Trigger-based referral",
      title: t.situation,
      relevance: `As a ${gCat?.name ?? "member"}, ${gName} is often present when this happens; it typically creates a need that a ${rCat?.name ?? categoryName(receiver)} serves.`,
      lookFor: look.items,
      triggerSituations: [t.situation],
      triggerWords: dedupe([...t.words, ...baseWords]).slice(0, 7),
      qualificationQuestions: questions,
      suggestedIntro: intro(t.words[0] ?? t.situation.toLowerCase()),
      evidence: [
        { source: "profession_knowledge", text: `${gCat?.name ?? "This profession"} commonly encounters: “${t.situation}”. That situation creates demand for a ${rCat?.name}.` },
        ...look.evidence,
        ...(receiver.services.length ? [{ source: "member_data" as const, provenance: prov(receiver, "services"), text: `${rName}'s services: ${humanList(receiver.services, 4)}.` }] : []),
      ],
      confidence: conf,
    });
  }

  if (!ctx.triggers.length && ctx.sharedSphereNames.length && rCat && !ctx.competitor) {
    out.push({
      id: id("sphere"),
      giverId: giver.id,
      receiverId: receiver.id,
      type: "Contact-sphere referral",
      title: rCat.idealReferral,
      relevance: `Both work in the ${ctx.sharedSphereNames[0]} contact sphere, so ${gName}'s clients regularly need what ${rName} offers.`,
      lookFor: look.items,
      triggerSituations: [],
      triggerWords: baseWords.slice(0, 6),
      qualificationQuestions: questions,
      suggestedIntro: intro("they were looking for help in this area"),
      evidence: [{ source: "profession_knowledge", text: `${rCat.name} is a core profession in the ${ctx.sharedSphereNames[0]} sphere.` }, ...look.evidence],
      confidence: sparse ? "Exploratory" : "Low",
    });
  }

  if (ctx.competitor) {
    out.push({
      id: id("overflow"),
      giverId: giver.id,
      receiverId: receiver.id,
      type: "Overflow / specialisation referral",
      title: `Work ${gName} cannot take on: outside capacity, budget or specialisation`,
      relevance: `${gName} and ${rName} are in the same category. Referrals are realistic only for overflow, conflicts of interest, or a niche the other specialises in.`,
      lookFor: receiver.services.length ? receiver.services.slice(0, 3).map((s) => `clients needing ${s.toLowerCase()}`) : [],
      triggerSituations: ["Project too small or too large for your practice", "Conflict of interest with an existing client", "Request outside your specialisation"],
      triggerWords: ["we're fully booked", "outside our scope", "conflict of interest"],
      qualificationQuestions: ["Is this within my capacity and specialisation?", "Would I be comfortable referring my client to a peer here?"],
      suggestedIntro: intro("a project that sits outside my current capacity"),
      evidence: [{ source: "member_data", text: `Both members are recorded as ${categoryName(receiver)}.` }],
      confidence: "Low",
    });
  }

  if (!out.length) {
    out.push({
      id: id("explore"),
      giverId: giver.id,
      receiverId: receiver.id,
      type: "Exploratory referral",
      title: receiver.services.length ? `People who need ${humanList(receiver.services.map((s) => s.toLowerCase()), 2)}` : `Learn what ${rName} needs before referring`,
      relevance: `No established referral pattern links these professions. Use a one-to-one to learn ${rName}'s ideal customer before passing referrals.`,
      lookFor: look.items,
      triggerSituations: [],
      triggerWords: baseWords.slice(0, 5),
      qualificationQuestions: questions,
      suggestedIntro: intro("something that sounded like a fit"),
      evidence: look.evidence.length ? look.evidence : [{ source: "chapter_data", text: `${rName}'s profile has limited data (${rCompleteness.filled}/${rCompleteness.total} fields).` }],
      confidence: "Exploratory",
    });
  }
  return out;
}

export function buildScripts(speaker: MemberProfile, subject: MemberProfile, opp: ReferralOpportunity | undefined): Scripts {
  const s = firstName(speaker);
  const n = firstName(subject);
  const cat = getCategory(subject.categoryId);
  const trigger = opp?.triggerSituations[0]?.toLowerCase() ?? opp?.title.toLowerCase() ?? "needs help in this area";
  const words = opp?.triggerWords.slice(0, 2) ?? [];
  const audience = subject.customerSegments.length ? humanList(subject.customerSegments.map((c) => c.toLowerCase()), 2) : cat ? humanList(cat.typicalCustomers, 2) : "businesses";
  const ideal = subject.idealReferral?.trim() || cat?.idealReferral || `someone who needs what ${n} offers`;
  return {
    fifteenSecond:
      `Who do you know where ${trigger.replace(/^a |^an /, "")}? ${subject.fullName}${subject.company ? ` of ${subject.company}` : ""} ${whatTheyDo(subject)}. ` +
      `A great referral for ${n} is ${ideal.charAt(0).toLowerCase() + ideal.slice(1).replace(/\.$/, "")}.` +
      (words.length ? ` Listen for phrases like “${words.join("” or “")}”.` : ""),
    oneToOne:
      `Ask ${n}: which of my clients have recently faced “${trigger}”? Share my top three ideal customers, ask ${n} for theirs, and agree one specific introduction each before our next meeting.`,
    whatsapp:
      `Hi [Prospect name], as promised I'm connecting you with ${subject.fullName}${subject.company ? ` of ${subject.company}` : ""}. ${n} works with ${audience} and ${whatTheyDo(subject)}. ` +
      `You mentioned [their situation] — I think a short call would be useful. ${n}, over to you! — ${s}`,
    testimonialRequest:
      `Hi ${n}, once you've completed the work with [client name], could you share a two-line note on the result? With the client's consent, I'd like to use it as a short case study at our chapter.`,
  };
}
