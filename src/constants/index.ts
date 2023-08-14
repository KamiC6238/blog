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
        name: 'Blog',
        href: 'https://github.com/KamiC6238/blog',
        content: 'A blog developed using ',
        aTagInfo: {
            href: 'https://astro.build/',
            content: 'Astro'
        },
    }
];

export const EssayTags = ['Build Tools', 'Node', 'React', 'TypeScript', 'Small Talk']
