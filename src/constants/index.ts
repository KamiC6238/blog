export const DARK_MODE_KEY = 'KOBAYASHI_MODE';
export const DARK = 'dark';
export const LIGHT = 'light';

export const ProfileTabs = {
    ABOUT: 'ABOUT',
    ESSAYS: 'ESSAYS',
    PROJECTS: 'PROJECTS'
}
export const ProfileTabsList = [
    {
        name: ProfileTabs.ABOUT,
        href: '/about/'
    },
    {
        name: ProfileTabs.ESSAYS,
        href: '/essays/'
    },
    {
        name: ProfileTabs.PROJECTS,
        href: '/projects/'
    },
]

export const ProjectConfigs = [
    {
        name: 'monaco-breakpoints',
        href: 'https://github.com/KamiC6238/monaco-breakpoints',
        content: 'A type-safe library support breakpoints in monaco-editor like vscode'
    },
    {
        name: 'babel-infinite-loop-plugin',
        href: 'https://github.com/KamiC6238/infinite-loop-plugin',
        content: 'A Babel plugin for detecting the presence of infinite loop code'
    },
    {
        name: 'Blog',
        href: 'https://github.com/KamiC6238/blog',
        content: 'A blog developed using ',
        aTagInfo: {
            href: 'https://astro.build/',
            content: 'Astro'
        },
    }
];

export const EssayTags = ['Small Talk', 'Build Tools', 'Node', 'React', 'TypeScript']
