export default {
	server: {
		port: 8080
	},

	/*
  ** Nuxt rendering mode
  ** See https://nuxtjs.org/api/configuration-mode
  */
	ssr: false,
	/*
  ** Nuxt target
  ** See https://nuxtjs.org/api/configuration-target
  */
	target: 'static',
	/*
  ** Headers of the page
  ** See https://nuxtjs.org/api/configuration-head
  */
	head: {
		titleTemplate: '%s',
		title: 'Taskwarrior Webui',
		meta: [
			{ charset: 'utf-8' },
			{ name: 'viewport', content: 'width=device-width, initial-scale=1' },
			{ hid: 'description', name: 'description', content: process.env.npm_package_description || '' }
		],
		link: [
			{ rel: 'icon', type: 'image/png', href: '/favicon.png' }
		]
	},
	/*
  ** Global CSS
  */
	css: [
		// mdi font
		'@mdi/font/css/materialdesignicons.css',
		// main font
		'typeface-open-sans/index.css',
		// App css
		'@/assets/app.css'
	],
	/*
  ** Plugins to load before mounting the App
  ** https://nuxtjs.org/guide/plugins
  */
	plugins: [
		'@/plugins/composition-api'
	],
	/*
  ** Auto import components
  ** See https://nuxtjs.org/api/configuration-components
  */
	components: true,
	/*
  ** Nuxt.js dev-modules
  */
	buildModules: [
		'@nuxt/typescript-build',
		'@nuxtjs/vuetify'
	],
	/*
  ** Nuxt.js modules
  */
	modules: [
		// Doc: https://axios.nuxtjs.org/usage
		'@nuxtjs/axios',
		'@nuxtjs/pwa',
		'@nuxtjs/proxy'
	],

	pwa: {
		meta: {
			name: 'Taskwarrior-webui'
		},
		manifest: {
			name: 'Taskwarrior-webui',
			short_name: 'Taskwarrior-webui'
		}
	},

	proxy: {
		// Backend
		'/api': {
			target: 'http://localhost:3000/',
			changeOrigin: true,
			pathRewrite: {
				'/api': ''
			}
		}
	},
	/*
  ** Axios module configuration
  ** See https://axios.nuxtjs.org/options
  */
	axios: {
		baseURL: '/'
	},
	/*
  ** vuetify module configuration
  ** https://github.com/nuxt-community/vuetify-module
  */
	vuetify: {
		defaultAssets: false,
		customVariables: ['~/assets/variables.scss'],
		treeShake: true // to make customVariables work in dev
	},
	/*
  ** Build configuration
  ** See https://nuxtjs.org/api/configuration-build/
  */
	build: {
	}
};
