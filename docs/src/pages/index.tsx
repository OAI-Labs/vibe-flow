import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import styles from './index.module.css';

const SKILLS: Array<[string, string, string]> = [
  ['init', 'First-time setup. Pick project, scaffold config + state.', '/docs/skills/vibe-init'],
  ['plan', 'Spec → issue tree. Epic, stories, dependencies, tiers.', '/docs/skills/vibe-plan'],
  ['ship', 'Wave-based parallel dispatch with executor routing.', '/docs/skills/vibe-ship'],
  ['link', 'Workspace branch → GitHub PR. Move issue to in_review.', '/docs/skills/vibe-link'],
  ['review', 'Two-stage review by fresh subagent. Post to PR.', '/docs/skills/vibe-review'],
  ['merge', 'Verify gates, squash, close loop, archive workspace.', '/docs/skills/vibe-merge'],
  ['dispatch-fix', 'Re-dispatch on review critical or CI failure.', '/docs/skills/vibe-dispatch-fix'],
  ['rebase', 'Resolve conflicts against main. Force-with-lease.', '/docs/skills/vibe-rebase'],
  ['status', 'Snapshot of active workspaces, PRs, inconsistencies.', '/docs/skills/vibe-status'],
  ['standup', 'Periodic summary in slack/discord/markdown.', '/docs/skills/vibe-standup'],
  ['flow', 'Meta: plan → ship → review → merge → standup.', '/docs/skills/vibe-flow'],
];

const TIERS: Array<[string, string, string]> = [
  ['T0', 'Gemini flash', 'Typo, copy, trivial CSS'],
  ['T1', 'Codex mini / Sonnet medium', 'Simple CRUD, <150 LoC'],
  ['T2', 'Sonnet high', 'Multi-file, moderate'],
  ['T3', 'Opus', 'Architecture, migration'],
  ['T4', 'Opus + brainstorm', 'Research, RFC'],
];

function Hero() {
  const { siteConfig } = useDocusaurusContext();
  return (
    <header className={styles.hero}>
      <div className={styles.heroInner}>
        <p className={styles.heroEyebrow}>
          <span className={styles.heroEyebrowNum}>00</span>
          <span>— Plugin for Claude Code &middot; v0.2.0</span>
        </p>
        <h1 className={styles.heroTitle}>
          <span className={styles.heroTitleMain}>vibe-flow</span>
          <span className={styles.heroTitleSub}>
            <em>Spec</em> to <em>merged</em> code.
          </span>
        </h1>
        <p className={styles.heroTagline}>
          {siteConfig.tagline} A pipeline of specialist skills that plan, dispatch,
          link, review, and merge — with verification gates at every step.
        </p>
        <div className={styles.heroCta}>
          <Link className={styles.ctaPrimary} to="/docs/installation">
            Install &rarr;
          </Link>
          <Link className={styles.ctaSecondary} to="/docs/intro">
            Read the docs
          </Link>
        </div>
        <PhaseDiagram />
      </div>
    </header>
  );
}

function PhaseDiagram() {
  const phases = ['plan', 'ship', 'link', 'review', 'merge'];
  return (
    <div className={styles.phase} aria-label="Pipeline phases">
      {phases.map((p, i) => (
        <div key={p} className={styles.phaseItem} style={{ animationDelay: `${0.6 + i * 0.12}s` }}>
          <span className={styles.phaseNum}>{String(i + 1).padStart(2, '0')}</span>
          <span className={styles.phaseName}>{p}</span>
          {i < phases.length - 1 && <span className={styles.phaseArrow}>&rarr;</span>}
        </div>
      ))}
    </div>
  );
}

function Section({
  num,
  title,
  lede,
  children,
}: {
  num: string;
  title: string;
  lede?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={styles.section}>
      <div className={styles.sectionHead}>
        <span className={styles.sectionNum}>{num}</span>
        <h2 className={styles.sectionTitle}>{title}</h2>
        {lede && <p className={styles.sectionLede}>{lede}</p>}
      </div>
      <hr className="vf-rule" />
      <div className={styles.sectionBody}>{children}</div>
    </section>
  );
}

function SkillsIndex() {
  return (
    <div className={styles.skillGrid}>
      {SKILLS.map(([name, desc, href]) => (
        <Link key={name} to={href} className={styles.skillRow}>
          <span className={styles.skillName}>/vibe-flow:vibe-{name}</span>
          <span className={styles.skillDesc}>{desc}</span>
          <span className={styles.skillArrow}>&rarr;</span>
        </Link>
      ))}
    </div>
  );
}

function TierTable() {
  return (
    <table className={styles.tierTable}>
      <thead>
        <tr>
          <th>Tier</th>
          <th>Executor</th>
          <th>When</th>
        </tr>
      </thead>
      <tbody>
        {TIERS.map(([t, exec, when]) => (
          <tr key={t}>
            <td className={styles.tierCell}>{t}</td>
            <td>{exec}</td>
            <td>{when}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function InstallBlock() {
  return (
    <div className={styles.install}>
      <pre className={styles.installPre}>
        <code>
          {`# In Claude Code:
/plugin marketplace add OAI-Labs/vibe-flow
/plugin install vibe-flow@vibe-flow

# Then, in your repo:
/vibe-flow:vibe-init`}
        </code>
      </pre>
      <p className={styles.installNote}>
        Requires the <code>vibe-kanban</code> MCP server. See{' '}
        <Link to="/docs/installation">installation</Link> for wiring.
      </p>
    </div>
  );
}

function Philosophy() {
  const items = [
    ['Verify fresh, always.', 'No hope-based merges. Every gate re-checked before it lets code through.'],
    ['Humans pick scope.', 'Plan approval, tier overrides, cost budget — human owns the contract.'],
    ['Agents do the work.', 'Parallel waves, strict isolation, bounded escalation. The graph stays tight.'],
    ['State is the source of truth.', 'state.json + vibe-kanban board mirror reality. No guessing.'],
    ['Ship small, ship often.', 'Atomic issues, one-PR-per-issue, squash merge. No epics that never land.'],
  ];
  return (
    <ul className={styles.phil}>
      {items.map(([head, body]) => (
        <li key={head} className={styles.philItem}>
          <strong className={styles.philHead}>{head}</strong>
          <span className={styles.philBody}>{body}</span>
        </li>
      ))}
    </ul>
  );
}

export default function Home() {
  return (
    <Layout
      title="vibe-flow — spec to merged code"
      description="Multi-agent orchestration plugin for Claude Code. Wave-based dispatch, executor routing, two-stage review, autonomous fix loops."
    >
      <main className={styles.page}>
        <Hero />

        <Section
          num="01"
          title="What it is"
          lede="A plugin for Claude Code. Ten coordinated skills that turn a spec into merged code."
        >
          <p className={styles.prose}>
            You hand it a spec. It decomposes into atomic issues on your vibe-kanban board,
            assigns a complexity tier, dispatches workspaces in parallel waves, opens PRs,
            runs a two-stage review with an isolated subagent, merges clean, and posts a standup.
            When a run hits a CI failure or a conflict, it routes to the fix or rebase sub-skill
            and loops — with an escalation ceiling so it can&rsquo;t thrash forever.
          </p>
          <p className={styles.prose}>
            Every transition is gated. Nothing ships without a fresh verification.
          </p>
        </Section>

        <Section num="02" title="Skills" lede="Each one is a skill you can invoke directly. Or let the meta skill run the full loop.">
          <SkillsIndex />
        </Section>

        <Section num="03" title="Executor routing" lede="Five tiers. The cheapest model that can do the job, and no cheaper.">
          <TierTable />
        </Section>

        <Section num="04" title="Install" lede="One command to add the marketplace, one to install, one to init.">
          <InstallBlock />
        </Section>

        <Section num="05" title="Philosophy" lede="Why it&rsquo;s shaped this way.">
          <Philosophy />
        </Section>

        <footer className={styles.endmark}>
          <span>&mdash; fin &mdash;</span>
        </footer>
      </main>
    </Layout>
  );
}
