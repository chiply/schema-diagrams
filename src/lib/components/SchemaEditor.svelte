<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import type * as Monaco from 'monaco-editor';
	import type { SchemaFormat } from '../parser/format-detector.ts';
	import type { SchemaError } from '../parser/types.ts';
	import { getTheme } from '$lib/theme.svelte.ts';

	interface Props {
		value: string;
		format: SchemaFormat;
		errors?: SchemaError[];
		onchange?: (value: string) => void;
	}

	let props: Props = $props();

	let container: HTMLDivElement;
	let editor = $state<Monaco.editor.IStandaloneCodeEditor | null>(null);
	let monacoRef = $state<typeof Monaco | null>(null);
	let isUpdatingFromProp = false;
	let theme = $derived(getTheme());
	let idlRegistered = false;

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

		// Register avro-idl language with Monarch tokenizer
		if (!idlRegistered) {
			monaco.languages.register({ id: 'avro-idl' });
			monaco.languages.setMonarchTokensProvider('avro-idl', {
				keywords: [
					'protocol', 'record', 'enum', 'fixed', 'union', 'array', 'map',
					'null', 'boolean', 'int', 'long', 'float', 'double', 'bytes', 'string',
					'void', 'import', 'idl', 'schema', 'throws', 'oneway', 'error',
					'date', 'time_ms', 'timestamp_ms', 'decimal', 'uuid', 'true', 'false'
				],
				tokenizer: {
					root: [
						[/\/\/.*$/, 'comment'],
						[/\/\*/, 'comment', '@comment'],
						[/@[a-zA-Z0-9_.-]+/, 'annotation'],
						[/"[^"\\]*(?:\\.[^"\\]*)*"/, 'string'],
						[/`[^`]*`/, 'string'],
						[/[0-9]+(\.[0-9]+)?/, 'number'],
						[/[a-zA-Z_]\w*/, {
							cases: {
								'@keywords': 'keyword',
								'@default': 'identifier'
							}
						}],
						[/[{}()\[\];,=<>?]/, 'delimiter']
					],
					comment: [
						[/\*\//, 'comment', '@pop'],
						[/./, 'comment']
					]
				}
			});
			idlRegistered = true;
		}

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
				{ token: 'comment', foreground: '6A9955' },
				{ token: 'annotation', foreground: 'DCDCAA' },
				{ token: 'delimiter', foreground: 'D4D4D4' },
				{ token: 'identifier', foreground: '9CDCFE' }
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

		monaco.editor.defineTheme('schema-light', {
			base: 'vs',
			inherit: true,
			rules: [
				{ token: 'key', foreground: '0451A5' },
				{ token: 'string.key.json', foreground: '0451A5' },
				{ token: 'string.value.json', foreground: 'A31515' },
				{ token: 'string', foreground: 'A31515' },
				{ token: 'number', foreground: '098658' },
				{ token: 'keyword', foreground: '0000FF' },
				{ token: 'comment', foreground: '008000' },
				{ token: 'annotation', foreground: '795E26' },
				{ token: 'delimiter', foreground: '000000' },
				{ token: 'identifier', foreground: '001080' }
			],
			colors: {
				'editor.background': '#ffffff',
				'editor.foreground': '#1e293b',
				'editor.lineHighlightBackground': '#f3f4f6',
				'editorCursor.foreground': '#1e293b',
				'editor.selectionBackground': '#c7d2fe',
				'editorLineNumber.foreground': '#94a3b8',
				'editorLineNumber.activeForeground': '#64748b'
			}
		});

		monacoRef = monaco;

		const language = props.format === 'avro-idl' ? 'avro-idl' : 'json';
		const initialTheme = getTheme() === 'dark' ? 'schema-dark' : 'schema-light';

		editor = monaco.editor.create(container, {
			value: props.value,
			language,
			theme: initialTheme,
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

	// Switch language when format changes
	$effect(() => {
		if (editor && monacoRef) {
			const model = editor.getModel();
			if (model) {
				const lang = props.format === 'avro-idl' ? 'avro-idl' : 'json';
				if (model.getLanguageId() !== lang) {
					monacoRef.editor.setModelLanguage(model, lang);
				}
			}
		}
	});

	// Set error markers
	$effect(() => {
		if (editor && monacoRef) {
			const model = editor.getModel();
			if (!model) return;
			const errors = props.errors ?? [];

			const lineCount = model.getLineCount();
			const markers: Monaco.editor.IMarkerData[] = errors.map((e) => {
				const hasPosition = e.startLineNumber != null;
				const startLine = e.startLineNumber ?? 1;
				const startCol = e.startColumn ?? 1;
				// For unpositioned errors, span the first few lines so the squiggly is visible
				const endLine = e.endLineNumber ?? (hasPosition ? startLine : Math.min(startLine + 2, lineCount));
				const endCol = e.endColumn ?? (model.getLineLength(Math.min(endLine, lineCount)) + 1);

				return {
					severity: e.severity === 'warning'
						? monacoRef!.MarkerSeverity.Warning
						: monacoRef!.MarkerSeverity.Error,
					message: e.message,
					startLineNumber: startLine,
					startColumn: startCol,
					endLineNumber: endLine,
					endColumn: endCol
				};
			});

			monacoRef.editor.setModelMarkers(model, 'avro', markers);
		}
	});

	$effect(() => {
		if (monacoRef) {
			monacoRef.editor.setTheme(theme === 'dark' ? 'schema-dark' : 'schema-light');
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
