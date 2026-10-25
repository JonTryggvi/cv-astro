// Build-time data layer for the CV.
//
// The CV is fetched from the WordPress endpoint at BUILD time (Astro SSG), so
// the deployed site is fully static and there is no browser CORS dependency.
// The endpoint is CORS-allowed for the production origins only, not localhost,
// which is another reason never to fetch this client-side.
//
// Behaviour:
//   - Normal build/dev: fetch the live endpoint.
//   - Fetch fails (network/HTTP): fall back to the bundled sample so the build
//     still succeeds and the page renders.
//   - Live data is EMPTY (nothing published yet) AND we are in dev, or
//     CV_SAMPLE=true: fall back to the sample so the full design is viewable.
//     A production build with an empty endpoint renders the real (empty) page,
//     with each section hidden gracefully — sample content never ships silently.
import sample from '../data/sample-cv.json';

export const ENDPOINT = 'https://jontryggvi.is/wp-json/jt/v1/cv';

export interface Headshot {
  url: string;
  width: number;
  height: number;
  alt: string;
  thumbnail: string;
  medium: string;
  large: string;
}

export interface Social {
  network: string;
  url: string;
}

export interface Meta {
  name: string;
  fullname: string;
  headshot: Headshot | null;
  short_intro: string;
  unijonlink: string;
  contact: { address: string; city: string; tel: string; email: string };
  social: Social[];
}

export interface Skill {
  skill: string;
  group: string;
}

export interface Work {
  id: number;
  title: string;
  role: string;
  client: string;
  period_from: string;
  period_to: string;
  summary: string;
  tech: string[];
  link: string;
  body: string;
  thumbnail: string | null;
}

export interface Experience {
  id: number;
  title: string;
  role: string;
  org: string;
  period_from: string;
  period_to: string;
  description: string;
}

export interface Education {
  id: number;
  title: string;
  qualification: string;
  school: string;
  period_from: string;
  period_to: string;
  note: string;
}

export interface Reference {
  id: number;
  name: string;
  relation: string;
  quote: string;
  link: string;
  headshot: string | null;
}

export interface CV {
  meta: Meta;
  skills: Skill[];
  work: Work[];
  experience: Experience[];
  education: Education[];
  references: Reference[];
}

const SAMPLE = sample as unknown as CV;

function isEmpty(cv: CV | null | undefined): boolean {
  if (!cv) return true;
  const hasMeta = Boolean(cv.meta?.name || cv.meta?.fullname || cv.meta?.short_intro);
  const counts =
    (cv.skills?.length ?? 0) +
    (cv.work?.length ?? 0) +
    (cv.experience?.length ?? 0) +
    (cv.education?.length ?? 0) +
    (cv.references?.length ?? 0);
  return !hasMeta && counts === 0;
}

export async function getCV(): Promise<CV> {
  // Build runs in Node, so read the raw env var (Vite only surfaces PUBLIC_* on
  // import.meta.env). import.meta.env.DEV is still the reliable dev flag.
  const forceSample = process.env.CV_SAMPLE === 'true';
  if (forceSample) {
    console.warn('[cv] CV_SAMPLE=true — using bundled sample data.');
    return SAMPLE;
  }

  try {
    const res = await fetch(ENDPOINT);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as CV;

    if (isEmpty(data)) {
      if (import.meta.env.DEV) {
        console.warn('[cv] live endpoint returned no content — using sample data (dev only).');
        return SAMPLE;
      }
      console.warn('[cv] live endpoint returned no content — building an empty page.');
    }
    return data;
  } catch (err) {
    console.warn(`[cv] live fetch failed (${String(err)}) — falling back to sample data.`);
    return SAMPLE;
  }
}

// ---- view helpers -------------------------------------------------------

/** "2019 – 2023", "2019 – present", "2019", or "" */
export function periodLabel(from?: string, to?: string): string {
  const f = (from ?? '').trim();
  const t = (to ?? '').trim();
  if (!f && !t) return '';
  if (f && !t) return `${f} – present`;
  if (!f && t) return t;
  if (f === t) return f;
  return `${f} – ${t}`;
}

export interface SkillGroup {
  name: string;
  items: string[];
}

/** Collapse the flat [{skill, group}] list into ordered groups. */
export function groupSkills(skills: Skill[]): SkillGroup[] {
  const order: string[] = [];
  const map = new Map<string, string[]>();
  for (const { skill, group } of skills ?? []) {
    const key = (group || 'Other').trim();
    if (!map.has(key)) {
      map.set(key, []);
      order.push(key);
    }
    if (skill?.trim()) map.get(key)!.push(skill.trim());
  }
  return order.map((name) => ({ name, items: map.get(name)! }));
}
