import type { Config } from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';
import { themes as prismThemes } from 'prism-react-renderer';

const config: Config = {
  title: 'vibe-flow',
  tagline: 'Spec to merged code. Multi-agent orchestration for Claude Code.',
  favicon: 'img/favicon.svg',

  url: 'https://oai-labs.github.io',
  baseUrl: '/vibe-flow/',

  organizationName: 'OAI-Labs',
  projectName: 'vibe-flow',
  deploymentBranch: 'gh-pages',
  trailingSlash: false,

  onBrokenLinks: 'warn',
  onBrokenMarkdownLinks: 'warn',

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          editUrl: 'https://github.com/OAI-Labs/vibe-flow/tree/main/docs/',
          routeBasePath: 'docs',
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    colorMode: {
      defaultMode: 'dark',
      disableSwitch: false,
      respectPrefersColorScheme: false,
    },
    navbar: {
      title: 'vibe-flow',
      logo: { alt: 'vibe-flow', src: 'img/logo.svg' },
      items: [
        { to: '/docs/intro', label: 'Docs', position: 'right' },
        { to: '/docs/skills', label: 'Skills', position: 'right' },
        {
          href: 'https://github.com/OAI-Labs/vibe-flow',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Docs',
          items: [
            { label: 'Intro', to: '/docs/intro' },
            { label: 'Installation', to: '/docs/installation' },
            { label: 'Skills', to: '/docs/skills' },
          ],
        },
        {
          title: 'Project',
          items: [
            { label: 'GitHub', href: 'https://github.com/OAI-Labs/vibe-flow' },
            {
              label: 'Issues',
              href: 'https://github.com/OAI-Labs/vibe-flow/issues',
            },
            {
              label: 'License (MIT)',
              href: 'https://github.com/OAI-Labs/vibe-flow/blob/main/LICENSE',
            },
            { label: 'Privacy Policy', to: '/privacy' },
          ],
        },
      ],
      copyright: `© ${new Date().getFullYear()} OAI-Labs. Shipped via vibe-flow.`,
    },
    prism: {
      theme: prismThemes.oneDark,
      darkTheme: prismThemes.oneDark,
      additionalLanguages: ['bash', 'yaml', 'json'],
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
