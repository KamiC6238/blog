/** @type {import('tailwindcss').Config} */
module.exports = {
	darkMode: 'class',
	content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
	theme: {
		extend: {},
	},
	plugins: [
		function ({ addVariant }) {
			addVariant('child', '& > *'),
			addVariant('child-p', '& > p'),
			addVariant('nlc', '& > *:not(:last-child)'),
			addVariant('after', '&:after')
		},
		require('@tailwindcss/typography')
	],
}
