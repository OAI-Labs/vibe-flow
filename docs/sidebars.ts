import type { SidebarsConfig } from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  docs: [
    'intro',
    'installation',
    {
      type: 'category',
      label: 'Concepts',
      collapsed: false,
      items: ['concepts/waves', 'concepts/tiers', 'concepts/state'],
    },
    {
      type: 'category',
      label: 'Skills',
      collapsed: false,
      items: [
        'skills',
        'skills/vibe-init',
        'skills/vibe-plan',
        'skills/vibe-ship',
        'skills/vibe-link',
        'skills/vibe-review',
        'skills/vibe-merge',
        'skills/vibe-dispatch-fix',
        'skills/vibe-rebase',
        'skills/vibe-status',
        'skills/vibe-standup',
        'skills/vibe-flow',
      ],
    },
  ],
};

export default sidebars;
