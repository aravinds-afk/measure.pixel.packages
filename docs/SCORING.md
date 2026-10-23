# Compatibility scoring

Scores are computed by deterministic code (`supabase/functions/_shared/engine/scoring.ts`) on the server. AI is used only to reword the result, never to produce or change a number.

## Formula

```
Compatibility = Σ (factor score × effective weight) / 100          (0–100, rounded)
```

Each factor is normalised to 0–100. A factor score of 80 with a 20% weight contributes 16 points.

**Missing data is not a negative match.** When a factor cannot be evaluated (e.g. one member has not listed industries), it is excluded and its weight is redistributed proportionally across the evaluated factors (`effectiveWeight`). The report shows both the configured and the effective weight. Confidence drops instead.

## Factors (default weights, configurable by admins)

| Factor | Weight | How it is scored |
|---|---:|---|
| Ideal customer profile overlap | 20% | Fuzzy overlap of customer types (60%, using a synonym vocabulary — "SMEs" = "small and medium businesses") and customer company sizes (25%), plus up to +10 when free-text ICP descriptions share terms. |
| Complementary services | 20% | Same category = direct competitor: 20 (45 if their services are clearly differentiated). Different categories: 80 if they share a contact sphere, 70 if linked by referral triggers, 50 if adjacent spheres, 25 otherwise; +15 for a known joint-offer pattern; −20 if listed services overlap heavily. |
| Referral potential in both directions | 20% | Directional likelihood A→B and B→A (0–1) from the trigger knowledge base: how many real-world situations A typically sees that create demand for B, with sphere and collaboration bonuses, scaled by customer overlap. Factor = 100 × (0.7 × average + 0.3 × minimum), so reciprocal flows score above one-way flows. |
| Contact sphere alignment | 15% | 100 if both are recorded in the same chapter sphere or their professions share a sphere template (60 for same-category pairs); 55 adjacent; 15 unrelated. |
| Industry & customer ecosystem overlap | 10% | 100 × (0.7 × overlap coefficient + 0.3 × Jaccard) over industries served; 70 if either serves all industries; 10 if none in common. |
| Geographic & market alignment | 5% | 60 + 40 × overlap for shared areas; 100 if both national/online; 85 if one is; 25 otherwise. |
| Shared customer problems & solutions | 5% | Problems solved are mapped to problem areas (growth, money, compliance, people, premises, technology, events, operations). Shared areas and direct term overlap score highest; adjacent areas score 60 for complementary professions. |
| Existing relationship or collaboration potential | 5% | 100 mutual referral partners, 80 one-way, 75 customer/vendor; recorded referrals raise it to 70 + 10 per referral (+10 if closed). Without history: 70 for a known joint-offer pattern, 55 same sphere, otherwise not evaluated. |

## Adjustments

- **Direct competitor cap**: members in the same category are capped at 49 so they are never presented as ideal partners. Their report offers overflow/specialisation referrals only.

## Classifications (configurable)

| Score | Label |
|---|---|
| 90–100 | Exceptional Strategic Match |
| 75–89 | Strong Referral Partnership |
| 60–74 | Promising Business Connection |
| 40–59 | Potential Relationship to Explore |
| 0–39 | Limited Identified Synergy |

Labels describe potential, not guaranteed results. When confidence is Low the report is titled "Exploratory assessment".

## Confidence

```
confidence = 0.5 × completeness(weaker profile) + 0.2 × average completeness + 0.3 × share of weight evaluated
High ≥ 0.75, Medium ≥ 0.50, Low otherwise (and Low whenever under half the weight could be evaluated)
```

Completeness counts eight core fields: category, services, customer types, company size, industries, service area, problems solved, business description.

## Potential vs proven

Every report states whether referral history exists. Without recorded referrals, the summary says "potential compatibility, not proven referral history". Recorded outcomes raise only the relationship factor, so new members are never penalised for having no history. Scores are not revenue forecasts.

## Referral opportunities

For each direction the engine produces, in order: the receiver's own stated ideal referral (member data), up to three trigger-based opportunities, a sphere-based opportunity, an overflow opportunity for competitors, or an exploratory one. Each lists people to look for, trigger situations, trigger words, qualification questions, a suggested introduction, evidence (with provenance: verified, member-submitted, profession knowledge, referral history) and a confidence level. Admin-withdrawn recommendations are removed.

## Contact Sphere Fit (0–100)

For the chapter members present in a sphere:

```
fit = 0.25 × customer overlap + 0.20 × category coverage + 0.25 × mutual referral potential
    + 0.15 × internal referral frequency + 0.15 × geographic alignment
```

(averaged over member pairs; unavailable parts are excluded and re-weighted). A member's personal fit for a sphere is their average compatibility with that sphere's members (×0.8 if their profession is only adjacent).

## Knowledge base

`engine/taxonomy.ts` contains 32 professions, 6 contact-sphere templates, 35 referral-trigger situations and 32 collaboration patterns. Extending it (and running `npm run gen:sql`) adds professions to both the engine and the database.
