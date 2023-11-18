export const DARK_MODE_KEY = 'KOBAYASHI_MODE';
export const DARK = 'dark';
export const LIGHT = 'light';

export const ProfileTabs = {
    ABOUT: 'ABOUT',
    CATEGORIES: 'CATEGORIES',
    ESSAYS: 'ESSAYS',
    PROJECTS: 'SIDE PROJECTS'
}

export const ProfileTabsList = [
    {
        name: `${ProfileTabs.ABOUT} / 关于我`,
        href: '/about/'
    },
    // {
    //     name: `${ProfileTabs.CATEGORIES} / 文章分类`,
    //     href: '/categories/'
    // },
    {
        name: `${ProfileTabs.ESSAYS} / 文章`,
        href: '/essays/'
    },
    {
        name: `${ProfileTabs.PROJECTS} / 个人项目`,
        href: '/projects/'
    },
]

export const Categories = [
    {
        category: 'Small Talk',
        desc: '杂谈',
        href: '//'
    },
    {
        category: 'Programming',
        desc: '技术',
        href: '//'
    },
    {
        category: 'Life',
        desc: '生活',
        href: '//'
    }
]

export const ProjectConfigs = [
    {
        name: 'monaco-theme-converter',
        href: 'https://github.com/KamiC6238/monaco-theme-converter',
        content: 'An easy way to use vscode theme in monaco-editor.'
    },
    {
        name: 'monaco-breakpoints',
        href: 'https://github.com/KamiC6238/monaco-breakpoints',
        content: 'A type-safe library support breakpoints in monaco-editor like vscode.'
    },
    {
        name: 'vite-plugin-lib-css-injection',
        href: 'https://github.com/KamiC6238/vite-plugin-lib-css-injection',
        content: 'A vite plugin that would inject the css file into your bundled js file.'
    },
    {
        name: 'babel-infinite-loop-plugin',
        href: 'https://github.com/KamiC6238/infinite-loop-plugin',
        content: 'A Babel plugin for detecting the presence of infinite loop code.'
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

// export const EssayTags = ['Small Talk', 'Build Tools', 'NodeJS', 'React', 'TypeScript']
// export const EssayTags = ['Small Talk', 'Build Tools', 'NodeJS', 'React']
export const EssayTags = ['Build Tools', 'NodeJS', 'React']
