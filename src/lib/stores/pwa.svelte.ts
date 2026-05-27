class PWAStore {
	// Store the beforeinstallprompt event when fired
	installPrompt = $state<any>(null);

	// Derived state indicating if the app is currently installable
	isInstallable = $derived(this.installPrompt !== null);

	setPrompt(event: any) {
		this.installPrompt = event;
	}

	async install() {
		if (!this.installPrompt) return;

		// Show the browser's install prompt
		this.installPrompt.prompt();

		// Wait for the user choice
		const { outcome } = await this.installPrompt.userChoice;
		if (outcome === 'accepted') {
			// Clear the prompt event as it has been used/accepted
			this.installPrompt = null;
		}
	}
}

export const pwa = new PWAStore();
