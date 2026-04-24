# vibe-flow docs

Docusaurus 3 site. Deploys to https://oai-labs.github.io/vibe-flow/ on push to
`main` via `.github/workflows/deploy-docs.yml`.

## Dev

```bash
cd docs
npm install
npm run start
```

Opens at `http://localhost:3000/vibe-flow/`.

## Build

```bash
npm run build
npm run serve   # preview production build
```

## Structure

- `src/pages/index.tsx` — custom landing (editorial-industrial aesthetic)
- `src/css/custom.css` — palette + font overrides
- `docs/` — markdown content (intro, installation, concepts, skills)
- `static/img/` — logo, favicon
- `docusaurus.config.ts` — site config
- `sidebars.ts` — sidebar nav

## Adding a new skill page

1. Add the markdown file under `docs/skills/<name>.md`
2. Add its id to `sidebars.ts` under the Skills category
3. Add a row to `src/pages/index.tsx` SKILLS array
4. Add to `docs/skills.md` overview table
