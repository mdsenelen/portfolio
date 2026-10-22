// All site content lives here. Replace every placeholder with your own details.
// Lists are ordered newest first; the hero's commit graph is built from them.

export const profile = {
  name: 'Merve Deniz Senelen',
  role: 'Frontend engineer',
  intro:
    'Frontend-focused full-stack engineer building React, Next.js and TypeScript products, with backend work in Node.js, AWS Lambda and FastAPI.',
  location: 'Berlin, Germany',
  email: 'mervedenizsenlen@gmail.com',
  instagram: 'https://www.instagram.com/mdenizsenelenn/',
  mediumHref: 'https://medium.com/@mdsenelen',
  youtubeTrackIds: ['W_NcoP44AFI', '8g-aABfzo3g'],
  youtubeTrackHref: 'https://www.youtube.com/watch?v=W_NcoP44AFI',
  links: [
    { label: 'GitHub', href: 'https://github.com/mdsenelen' },
    { label: 'LinkedIn', href: 'https://www.linkedin.com/in/mdenizsenelen' },
  ],
  resumeHref: '/resume.pdf',
};

export const githubProjects = [
  {
    id: 'url-inspector-main',
    name: 'URL Inspector',
    href: 'https://github.com/mdsenelen/url-inspector-main',
    bookHref: 'https://github.com/mdsenelen/url-inspector-main',
    description: 'Takes a website URL as input, crawls it and displays information.',
    language: 'TypeScript',
    technologies: ['TypeScript'],
    cardOnHover: false,
  },
  {
    id: 'melody-generator-ai',
    name: 'Melody Generator AI',
    href: 'https://github.com/mdsenelen/melody-generator-ai',
    bookHref: 'https://melody-generator-ai.vercel.app',
    live: 'https://melody-generator-ai.vercel.app',
    description: 'Turns a piece of audio into new, playable melody variants and chord progressions.',
    language: 'Jupyter Notebook',
    technologies: ['Next.js 15', 'React 19', 'TypeScript', 'Tailwind CSS', 'FastAPI', 'PyTorch', 'librosa', 'Basic Pitch', 'pretty_midi'],
    cardOnHover: true,
  },
  {
    id: 'opslens',
    name: 'OpsLens',
    href: 'https://github.com/mdsenelen/opslens',
    bookHref: 'https://github.com/mdsenelen/opslens',
    live: 'https://opslens-sigma.vercel.app',
    description: 'A small-fleet observability dashboard for investigating whether a deployment caused a service regression.',
    language: 'TypeScript',
    technologies: ['Next.js 16', 'React 19', 'Fastify 5', 'TypeScript', 'Zod', 'PostgreSQL', 'uPlot'],
    cardOnHover: true,
  },
];

export const about = [
  "I'm a frontend-focused full-stack engineer in Berlin with 3+ years of experience building React, Next.js and TypeScript products for data-heavy enterprise platforms, plus backend work in Node.js, AWS Lambda and FastAPI.",
  'I like owning a feature from the first stakeholder conversation to release, and I ship it tested with Jest, React Testing Library and Playwright. AI-assisted development with Claude Code is a normal part of how I work.',
  "I recently completed an MSc in Data Science. I've loved machine learning for years and built ML projects well before my studies and thesis, including Melodia. I speak English (C2), German (B1) and Turkish (native).",
];

export const skills = [
  'React', 'Next.js', 'TypeScript', 'Redux', 'Tailwind CSS', 'AG Grid', 'Salesforce LWC',
  'Node.js', 'Fastify', 'NestJS', 'FastAPI', 'PostgreSQL', 'GraphQL',
  'Jest', 'Vitest', 'Playwright',
  'AWS Lambda', 'Docker', 'GitHub Actions', 'Vercel',
  'PyTorch', 'scikit-learn', 'Claude Code',
];

// kind: 'role' sits on the main line of the graph; 'study' too.
export const experience = [
  {
    id: 'msc',
    kind: 'study',
    title: 'MSc in Data Science',
    org: 'Berlin',
    period: 'Sept 2024 – Oct 2026',
    points: ['Completed an MSc in Data Science. Built machine-learning projects before and during the degree; thesis project: Melodia, an AI melody generator using a conditional VAE fine-tuned with PPO on MAESTRO v3.'],
    tech: ['Python', 'PyTorch', 'scikit-learn', 'pandas'],
  },
  {
    id: 'bonfry',
    kind: 'role',
    title: 'Software Engineer (Working Student)',
    org: 'BONFRY, Berlin',
    period: 'Nov 2025 – Mar 2026',
    points: [
      'Built serverless AWS Lambda workflows in Node.js and TypeScript with input validation, structured logging and Slack alerting, so failures surfaced right away.',
      'Sole frontend engineer in a small autonomous team: built Salesforce LWC features end to end, from scoping with stakeholders to release.',
      'Wrote Jest and React Testing Library tests and took part in code reviews and CI/CD in a Scrum team.',
    ],
    tech: ['TypeScript', 'Node.js', 'AWS Lambda', 'Salesforce LWC', 'Jest'],
  },
  {
    id: 'continuous',
    kind: 'role',
    title: 'Frontend Developer',
    org: 'Continuous Software, Dublin',
    period: 'Oct 2022 – Sept 2024',
    points: [
      'Shipped React, Next.js and TypeScript features for Aangine, an enterprise portfolio planning platform.',
      'Built portfolio-performance dashboards and sped up AG Grid tables, using Redux for shared state.',
      'Built reusable components for the team library and integrated them with backend REST APIs.',
      'Load-tested APIs with LoadRunner and worked with Product and QA to resolve 60+ interface defects.',
    ],
    tech: ['React', 'Next.js', 'TypeScript', 'Redux', 'AG Grid'],
  },
  {
    id: 'provera',
    kind: 'role',
    title: 'Software Engineer Intern',
    org: 'Provera TBT, Adana (remote)',
    period: 'Feb 2021 – Oct 2021',
    points: ['Built responsive project-planning UIs with React and Redux, connected to Java Spring Boot REST APIs with JWT auth.'],
    tech: ['React', 'JavaScript', 'Redux', 'Java'],
  },
  {
    id: 'bsc',
    kind: 'study',
    title: 'BSc in Computer Engineering',
    org: '',
    period: 'Sept 2017 – June 2022',
    points: [],
    tech: [],
  },
];

// `after` is the id of the experience entry this project branched from,
// so the graph can draw it as a side branch at the right point in time.
export const projects = [
  {
    id: 'opslens',
    featured: true,
    title: 'OpsLens',
    after: 'bonfry',
    year: '2026',
    summary:
      'Real-time service monitoring dashboard: a Fastify and PostgreSQL API with Zod contracts shared with the frontend, an alert-evaluation job and a Server-Sent Events stream feeding live charts in Next.js. Tested with Vitest and Playwright, CI on GitHub Actions.',
    tech: ['Next.js', 'TypeScript', 'Fastify', 'PostgreSQL', 'Zod', 'SSE', 'Playwright'],
    repo: 'https://github.com/mdsenelen/opslens',
    live: 'https://opslens-sigma.vercel.app',
  },
  {
    id: 'melodia',
    title: 'Melodia',
    after: 'msc',
    year: '2025',
    summary:
      'AI melody generator and MSc thesis: turns an audio clip into new melodies, with live in-browser pitch visualization and a FastAPI backend. Generation uses a conditional VAE fine-tuned with PPO on about 200 hours of piano.',
    tech: ['Next.js', 'TypeScript', 'FastAPI', 'PyTorch'],
    repo: 'https://github.com/mdsenelen/melody-generator-ai',
    live: 'https://melody-generator-ai.vercel.app',
  },
  {
    id: 'url-inspector',
    title: 'URL Inspector',
    after: 'continuous',
    year: '2025',
    summary: 'Takes a website URL, crawls it and displays what it finds.',
    tech: ['React', 'TypeScript', 'Go', 'MySQL'],
    repo: 'https://github.com/mdsenelen/url-inspector-main',
    live: '',
  },
  {
    id: 'als-prediction',
    title: 'ALS Prediction with EMG Signals',
    after: 'provera',
    year: '2022',
    summary: 'Classifies EMG signals to predict ALS, using a bidirectional LSTM model.',
    tech: ['Python', 'Jupyter Notebook', 'TensorFlow', 'Keras'],
    repo: 'https://github.com/mdsenelen/ALS-Prediction-with-EMG-Signals',
    live: '',
  },
  {
    id: 'detecting-binaries',
    title: 'Detecting Binaries',
    after: 'provera',
    year: '2022',
    summary: 'Detects binary files using entropy analysis and machine learning.',
    tech: ['Python', 'Jupyter Notebook', 'Machine Learning'],
    repo: 'https://github.com/mdsenelen/DetectingBinaries',
    live: '',
  },
];
