<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import type * as Monaco from 'monaco-editor';
	import type { SchemaFormat } from '../parser/format-detector.ts';

	interface Props {
		value: string;
		format: SchemaFormat;
		onchange?: (value: string) => void;
	}

	let props: Props = $props();

	let container: HTMLDivElement;
	let editor = $state<Monaco.editor.IStandaloneCodeEditor | null>(null);
	let isUpdatingFromProp = false;

	onMount(async () => {
		const monaco = await import('monaco-editor');

		self.MonacoEnvironment = {
			getWorker: async function (_workerId: string, label: string) {
				if (label === 'json') {
					const worker = await import('monaco-editor/esm/vs/language/json/json.worker?worker');
					return new worker.default();
				}
				const worker = await import('monaco-editor/esm/vs/editor/editor.worker?worker');
				return new worker.default();
			}
		};

		monaco.editor.defineTheme('schema-dark', {
			base: 'vs-dark',
			inherit: true,
			rules: [
				{ token: 'key', foreground: '9CDCFE' },
				{ token: 'string.key.json', foreground: '9CDCFE' },
				{ token: 'string.value.json', foreground: 'CE9178' },
				{ token: 'string', foreground: 'CE9178' },
				{ token: 'number', foreground: 'B5CEA8' },
				{ token: 'keyword', foreground: '569CD6' },
				{ token: 'comment', foreground: '6A9955' }
			],
			colors: {
				'editor.background': '#1a202c',
				'editor.foreground': '#e2e8f0',
				'editor.lineHighlightBackground': '#2d3748',
				'editorCursor.foreground': '#e2e8f0',
				'editor.selectionBackground': '#4a5568',
				'editorLineNumber.foreground': '#718096',
				'editorLineNumber.activeForeground': '#a0aec0'
			}
		});

		const language = props.format === 'avro-idl' ? 'plaintext' : 'json';

		editor = monaco.editor.create(container, {
			value: props.value,
			language,
			theme: 'schema-dark',
			minimap: { enabled: false },
			fontSize: 13,
			fontFamily: "'Monaco', 'Menlo', 'Ubuntu Mono', monospace",
			lineHeight: 20,
			padding: { top: 16, bottom: 16 },
			scrollBeyondLastLine: false,
			automaticLayout: true,
			tabSize: 2,
			insertSpaces: true,
			wordWrap: 'on',
			quickSuggestions: {
				other: true,
				comments: false,
				strings: true
			},
			suggestOnTriggerCharacters: true,
			acceptSuggestionOnEnter: 'on',
			formatOnPaste: true,
			formatOnType: true
		});

		editor.onDidChangeModelContent(() => {
			if (isUpdatingFromProp) return;
			const newValue = editor?.getValue() ?? '';
			props.onchange?.(newValue);
		});
	});

	onDestroy(() => {
		editor?.dispose();
	});

	$effect(() => {
		if (editor && props.value !== editor.getValue()) {
			isUpdatingFromProp = true;
			const position = editor.getPosition();
			editor.setValue(props.value);
			if (position) {
				editor.setPosition(position);
			}
			isUpdatingFromProp = false;
		}
	});

	$effect(() => {
		if (editor) {
			const model = editor.getModel();
			if (model) {
				const monaco = (globalThis as any).monaco;
				// We can't dynamically switch language without monaco reference,
				// but the format detection handles this at load time
			}
		}
	});
</script>

<div class="editor-container" bind:this={container}></div>

<style>
	.editor-container {
		width: 100%;
		height: 100%;
	}
</style>
