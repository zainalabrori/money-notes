/// <reference types="@sveltejs/kit" />
/// <reference types="vite-plugin-pwa/info" />
/// <reference types="vite-plugin-pwa/client" />
/// <reference types="vite-plugin-pwa/svelte" />

declare module 'virtual:pwa-info' {
	export const pwaInfo: import('vite-plugin-pwa/info').PwaInfo | undefined;
}

declare namespace App {
	// interface Error {}
	// interface Locals {}
	// interface PageData {}
	// interface PageState {}
	// interface Platform {}
}

export {};
