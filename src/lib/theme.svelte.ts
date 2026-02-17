import { browser } from '$app/environment';

function getInitialTheme(): 'dark' | 'light' {
	if (browser) {
		const stored = localStorage.getItem('schema-diagrams-theme');
		if (stored === 'light' || stored === 'dark') return stored;
	}
	return 'dark';
}

let theme = $state<'dark' | 'light'>(getInitialTheme());

export function getTheme() {
	return theme;
}

export function toggleTheme() {
	theme = theme === 'dark' ? 'light' : 'dark';
	if (browser) {
		localStorage.setItem('schema-diagrams-theme', theme);
	}
}
