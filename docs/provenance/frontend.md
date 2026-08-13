# Frontend Provenance Record

Status: M4B reference selected; adaptation not started

Review date: 2026-08-12

No layout, component, brand asset, copywriting, activity data, or design source was copied before this M4B selection gate.

## Selection decision

HushFlow will adapt a small, audited subset of:

1. `pdsuwwz/nextjs-nextra-starter` for application-shell and landing-section structure; and
2. `magicuidesign/magicui` for selected motion primitives.

HushFlow will not copy either project's branding, copywriting, documentation information architecture, external media, testimonials, analytics, vendor badges, logos, icons, favicons, example activity, or product data. Retained source files will be copied into HushFlow-owned paths and substantially restyled for the approved deep-navy, silver, and cobalt design system. This record must be updated if implementation retains fewer files or introduces another source.

## Candidate comparison

| Candidate | Source and pin | License | Workflow fit | Responsive and accessibility evidence | Implementation speed | Decision |
| --- | --- | --- | --- | --- | --- | --- |
| Next.js Nextra Starter | https://github.com/pdsuwwz/nextjs-nextra-starter at `34de7d1e7cac308430dd69c653214b22af62c329` | MIT | Strong shell, responsive dark landing, theme and motion foundations; documentation-specific routing will not be retained | README claims responsive desktop/mobile layout and dark mode; no project-level WCAG claim, so HushFlow supplies its own keyboard, screen-reader, contrast, and reduced-motion gates | Fastest Next.js 16 and React 19 aligned shell | Selected as structural base |
| Magic UI | https://github.com/magicuidesign/magicui at `2d671cc6c0e0f40e28682c9cbddd16694dcfe627` | MIT | Strong animated beam, grid, reveal, and border primitives for Encrypted Quote Convergence; not a complete application template | No project-level WCAG or responsive claim found; every retained primitive requires HushFlow reduced-motion, semantic, pointer, and mobile tests | Fast for isolated visual effects | Selected for motion primitives only |
| SaaSFly | https://github.com/nextify-limited/saasfly at `49f7e28f69eae9cd9eed84221e13a3dbae87da67` | MIT | Mature SaaS product structure, Radix UI, Tailwind, and Motion, but auth, billing, database, and generic SaaS surfaces do not match HushFlow | README describes responsive behavior; Radix supplies accessible primitives, but no project-level WCAG claim was treated as evidence | Slower because Next.js 15 must be upgraded and large unrelated surfaces removed | Rejected for adaptation; no files retained |

All three candidates have a compatible redistributable MIT license. Rejection of SaaSFly is based on workflow and migration cost, not license incompatibility.

## Selected source A: Next.js Nextra Starter

- Repository: https://github.com/pdsuwwz/nextjs-nextra-starter
- Commit: `34de7d1e7cac308430dd69c653214b22af62c329`
- License file: https://github.com/pdsuwwz/nextjs-nextra-starter/blob/34de7d1e7cac308430dd69c653214b22af62c329/LICENSE
- License: MIT
- Copyright: `Copyright (c) 2020-PRESENT Wisdom`
- Grant: permission to use, copy, modify, merge, publish, distribute, sublicense, and sell copies.
- Condition: the copyright notice and permission notice must remain in copies or substantial portions of the software.
- Warranty: provided without warranty under the license text.
- Reviewed stack: Next.js `16.2.9`, React and React DOM `^19.2.7`, Tailwind CSS `^4.3.1`, Motion and Framer Motion `^12.40.0`, Radix UI `^1.6.0` plus individual Radix primitives.

Planned retained source paths:

- `src/app/[lang]/_components/ThemeProvider.tsx`
- `src/components/HomepageHero/index.tsx`
- `src/components/HomepageHero/Section.tsx`
- `src/components/HomepageHero/Setup.tsx`
- `src/components/HomepageHero/SetupHero.module.css`
- `src/components/MotionWrapper/FadeIn.tsx`
- `src/components/ui/button.tsx`
- `src/lib/utils.ts`

Planned HushFlow modifications:

- remove Nextra, MDX, documentation routing, locale-specific shell assumptions, AI demo, auth demo, search, sitemap, and pagefind concerns;
- move retained behavior into HushFlow-owned `apps/web` component boundaries;
- replace theme tokens, layout, content order, typography, spacing, and all visible copy;
- rebuild hero as Encrypted Quote Convergence without external assets;
- add semantic landmarks, keyboard behavior, focus management, WCAG AA contrast, touch targets, live-region status, and reduced-motion behavior;
- use exact repository dependency pins rather than inheriting permissive ranges;
- retain required MIT notice in HushFlow's third-party notices.

Explicitly rejected source and assets include:

- `src/app/[lang]/_components/ThirdPartyScripts.tsx`;
- `src/components/AIDemoLanding/**`;
- `src/components/auth/**`;
- `src/widgets/auth-button.tsx`;
- `src/widgets/mobile-menu-auth.tsx`;
- `src/content/**/ai-demo.mdx`;
- `public/img/next.svg`;
- `public/img/vercel.svg`;
- `public/img/favicon.svg`;
- `src/favicon.ico`;
- `src/assets/images/hero-tile-dark.svg`;
- `src/assets/images/hero-tile-light.svg`;
- all Giphy, GitHub attachment, Netlify, Vercel, sponsor, badge, and other remotely hosted demo assets.

## Selected source B: Magic UI

- Repository: https://github.com/magicuidesign/magicui
- Commit: `2d671cc6c0e0f40e28682c9cbddd16694dcfe627`
- License file: https://github.com/magicuidesign/magicui/blob/2d671cc6c0e0f40e28682c9cbddd16694dcfe627/LICENSE.md
- License: MIT
- Copyright: `Copyright (c) Magic UI`
- Grant: permission to use, copy, modify, merge, publish, distribute, sublicense, and sell copies.
- Condition: the copyright notice and permission notice must remain in copies or substantial portions of the software.
- Warranty: provided without warranty under the license text.
- Reviewed source app stack includes Motion `^12.23.12`, React `19.1.1`, Tailwind CSS `^4.1.13`, and Next.js `^15.5.18`; HushFlow will adapt source behavior to its pinned Next.js 16 and React 19 baseline instead of inheriting the source app manifest.

Planned retained source paths:

- `apps/www/registry/magicui/animated-beam.tsx`
- `apps/www/registry/magicui/animated-grid-pattern.tsx`
- `apps/www/registry/magicui/blur-fade.tsx`
- `apps/www/registry/magicui/border-beam.tsx`

Planned HushFlow modifications:

- convert primitives to HushFlow naming, tokens, component APIs, and exact dependency pins;
- cap pointer displacement and animate transform/opacity where possible;
- stop animation outside the viewport or when the document is hidden;
- provide static reduced-motion fallbacks and lighter mobile behavior;
- remove generic demo composition, decorative text, and brand styling;
- add tests for keyboard independence, reduced motion, resize behavior, cleanup, and mobile rendering;
- retain required MIT notice in HushFlow's third-party notices.

Explicitly rejected source and assets include Magic UI marketing pages, showcase content, testimonials, video testimonials, tweet links, logos, social links, icons, favicons, preview images, external GIFs, and demo data.

## Visual-only references

The following live sites informed mood and information hierarchy only:

- https://aztec.network/ — privacy-first atmosphere and geometric storytelling;
- https://linear.app/ — restrained premium typography, spacing, and motion hierarchy;
- https://layerzero.network/ — technical credibility and numbered infrastructure narrative.

No exact source commit or redistributable site license was established for these live sites. They are therefore rejected as code, layout, asset, copywriting, or brand sources. HushFlow retains no files from them and will not reproduce their specific compositions.

## Asset and data policy

- No source brand asset, remote image, testimonial, partner logo, activity feed, metric, or copywriting is retained.
- HushFlow motion graphics use locally authored CSS and SVG geometry or audited retained source code.
- Any later font, icon, illustration, or asset requires its own source, pin, license, retained-file, and modification record before use.
- Protocol statistics and activity must come from real protocol adapters or carry a persistent `Local fixture data` label.
- No fabricated address, transaction, volume, partner, testimonial, user, quote, minimum, or protocol activity may be introduced for visual completeness.

## Implementation audit requirement

Before M4B completion, compare this planned list with the actual diff and record:

- exact retained destination files;
- files removed from the planned list;
- any added third-party source;
- final dependency pins;
- third-party notice location;
- accessibility and responsive changes applied to retained code.
