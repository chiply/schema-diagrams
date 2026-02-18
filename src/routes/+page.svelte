<script lang="ts">
	import { onMount } from 'svelte';
	import {
		SvelteFlow,
		Controls,
		MiniMap,
		Background,
		BackgroundVariant,
		type Node,
		type Edge,
		type NodeTypes,
		type EdgeTypes
	} from '@xyflow/svelte';
	import '@xyflow/svelte/dist/style.css';

	import SchemaEntityNode from '$lib/components/SchemaEntityNode.svelte';
	import EnumNode from '$lib/components/EnumNode.svelte';
	import UnionNode from '$lib/components/UnionNode.svelte';
	import RelationshipEdge from '$lib/components/RelationshipEdge.svelte';
	import FitViewHelper from '$lib/components/FitViewHelper.svelte';
	import { parseSchema, addField, generateUniqueFieldName, renameFieldInSchema } from '$lib/editor/schema-editor.ts';
	import { layoutGraph } from '$lib/layout/elk-layout.ts';
	import { examples } from '$lib/examples.ts';
	import type { SchemaFormat } from '$lib/parser/format-detector.ts';
	import { getTheme, toggleTheme } from '$lib/theme.svelte.ts';

	const nodeTypes: NodeTypes = {
		schemaEntity: SchemaEntityNode as any,
		enum: EnumNode as any,
		union: UnionNode as any
	};

	const edgeTypes: EdgeTypes = {
		relationship: RelationshipEdge as any
	};

	let code = $state(examples[0].content);
	let nodes = $state.raw<Node[]>([]);
	let edges = $state.raw<Edge[]>([]);
	let format = $state<SchemaFormat>('avro-json');
	let statusMessage = $state('');
	let collapsedNodes = $state(new Set<string>());
	let debounceTimer: ReturnType<typeof setTimeout> | undefined;
	let editorLoaded = $state(false);
	let SchemaEditorComponent = $state<any>(null);
	let fitViewTrigger = $state(0);
	let helpOpen = $state(false);
	let editingField = $state<{ schemaId: string; fieldName: string } | null>(null);

	onMount(async () => {
		const mod = await import('$lib/components/SchemaEditor.svelte');
		SchemaEditorComponent = mod.default;
		editorLoaded = true;
		await updateDiagram();
	});

	function handleCodeChange(newValue: string) {
		code = newValue;
		clearTimeout(debounceTimer);
		debounceTimer = setTimeout(() => {
			updateDiagram();
		}, 300);
	}

	async function updateDiagram() {
		const { graph, format: detectedFormat } = parseSchema(code);
		format = detectedFormat;

		if (graph.errors.length > 0) {
			statusMessage = graph.errors[0];
			return;
		}

		if (graph.schemas.length === 0) {
			statusMessage = 'No schemas found';
			nodes = [];
			edges = [];
			return;
		}

		try {
			const result = await layoutGraph(graph, collapsedNodes);
			nodes = result.nodes.map((n) => ({
				...n,
				data: {
					...n.data,
					onToggleCollapse: handleToggleCollapse,
					onAddField: handleAddField,
					onRenameField: handleRenameField,
					editingFieldName: editingField?.schemaId === n.id ? editingField.fieldName : null
				}
			}));
			editingField = null;
			edges = result.edges;
			statusMessage = `${graph.schemas.length} schemas, ${graph.relationships.length} relationships`;
		} catch (e) {
			statusMessage = `Layout error: ${e instanceof Error ? e.message : String(e)}`;
			console.error('Layout error:', e);
		}
	}

	function handleToggleCollapse(nodeId: string) {
		const next = new Set(collapsedNodes);
		if (next.has(nodeId)) {
			next.delete(nodeId);
		} else {
			next.add(nodeId);
		}
		collapsedNodes = next;
		updateDiagram();
	}

	async function applyDiagramEdit(newCode: string) {
		code = newCode;
		await updateDiagram();
	}

	function handleAddField(schemaId: string) {
		const existingFields = nodes
			.find(n => n.id === schemaId)
			?.data?.schema?.fields?.map((f: any) => f.name) ?? [];
		const fieldName = generateUniqueFieldName(existingFields);
		const newCode = addField(code, format, schemaId, fieldName, 'string');
		editingField = { schemaId, fieldName };
		applyDiagramEdit(newCode);
	}

	function handleRenameField(schemaId: string, oldName: string, newName: string) {
		if (!newName || newName === oldName) return;
		const newCode = renameFieldInSchema(code, format, schemaId, oldName, newName);
		applyDiagramEdit(newCode);
	}

	async function expandAll() {
		collapsedNodes = new Set();
		await updateDiagram();
		fitViewTrigger++;
	}

	async function collapseAll() {
		collapsedNodes = new Set(nodes.map((n) => n.id));
		await updateDiagram();
		fitViewTrigger++;
	}

	async function loadExample(index: number) {
		code = examples[index].content;
		collapsedNodes = new Set();
		await updateDiagram();
		fitViewTrigger++;
	}

	let theme = $derived(getTheme());

	let splitDragging = $state(false);
	let splitPercent = $state(40);

	function handleSplitMouseDown() {
		splitDragging = true;
	}

	function handleSplitMouseMove(e: MouseEvent) {
		if (!splitDragging) return;
		const container = (e.currentTarget as HTMLElement);
		const rect = container.getBoundingClientRect();
		const percent = ((e.clientX - rect.left) / rect.width) * 100;
		splitPercent = Math.min(Math.max(percent, 20), 80);
	}

	function handleSplitMouseUp() {
		splitDragging = false;
	}
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div
	class="app"
	class:theme-light={theme === 'light'}
	onmousemove={handleSplitMouseMove}
	onmouseup={handleSplitMouseUp}
	onclick={(e) => {
		if (helpOpen && !(e.target as HTMLElement).closest('.help-dropdown')) {
			helpOpen = false;
		}
	}}
	role="application"
>
	<header class="app-header">
		<div class="title">
			<h1>Schema Diagrams</h1>
			<span class="format-badge">{format === 'avro-json' ? 'Avro JSON' : format === 'avro-idl' ? 'Avro IDL' : 'Unknown'}</span>
		</div>
		<div class="toolbar">
			<select onchange={(e) => loadExample(parseInt((e.target as HTMLSelectElement).value))}>
				{#each examples as example, i}
					<option value={i}>{example.name}</option>
				{/each}
			</select>
			<button onclick={expandAll}>Expand All</button>
			<button onclick={collapseAll}>Collapse All</button>
			<button class="theme-toggle" onclick={toggleTheme} aria-label="Toggle theme">
				{#if theme === 'dark'}
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
				{:else}
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
				{/if}
			</button>
			<div class="help-dropdown">
				<button class="help-toggle" onclick={() => helpOpen = !helpOpen} aria-label="Help">?</button>
				{#if helpOpen}
					<div class="help-panel">
						<h3>Editor</h3>
						<ul>
							<li>Edit Avro JSON or IDL on the left — diagram updates live</li>
						</ul>
						<h3>Diagram</h3>
						<ul>
							<li>Click "+" on a record node to add a new field</li>
							<li>Click a field name to rename it inline</li>
							<li>Click a node header to collapse or expand it</li>
							<li>Drag nodes to reposition them</li>
							<li>Scroll to zoom in and out</li>
							<li>Drag the background to pan</li>
							<li>Drag the divider to resize panels</li>
						</ul>
						<h3>Toolbar</h3>
						<ul>
							<li>Pick an example schema from the dropdown</li>
							<li>Expand All / Collapse All toggles every node</li>
							<li>Fit View control (bottom-left of diagram) auto-fits</li>
						</ul>
					</div>
				{/if}
			</div>
		</div>
	</header>

	<div class="split-container">
		<div class="editor-pane" style="width: {splitPercent}%">
			{#if editorLoaded && SchemaEditorComponent}
				<SchemaEditorComponent value={code} {format} onchange={handleCodeChange} />
			{:else}
				<div class="editor-loading">Loading editor...</div>
			{/if}
		</div>

		<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
		<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
		<div
			class="split-handle"
			class:active={splitDragging}
			onmousedown={handleSplitMouseDown}
			role="separator"
			aria-orientation="vertical"
			tabindex="0"
		></div>

		<div class="diagram-pane" style="width: {100 - splitPercent}%">
			<div class="flow-wrapper">
				<SvelteFlow
					bind:nodes
					bind:edges
					{nodeTypes}
					{edgeTypes}
					fitView
					colorMode={theme}
					minZoom={0.1}
					maxZoom={2}
					defaultEdgeOptions={{ type: 'relationship' }}
					proOptions={{ hideAttribution: true }}
				>
					<FitViewHelper trigger={fitViewTrigger} />
				<Controls />
					<MiniMap
						nodeColor={theme === 'dark' ? '#334155' : '#cbd5e1'}
						maskColor={theme === 'dark' ? 'rgba(0, 0, 0, 0.5)' : 'rgba(255, 255, 255, 0.6)'}
					/>
					<Background variant={BackgroundVariant.Dots} gap={20} size={1} />
				</SvelteFlow>
			</div>
		</div>
	</div>

	<footer class="status-bar">
		{statusMessage}
	</footer>
</div>

<style>
	:global(body) {
		margin: 0;
		padding: 0;
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
		overflow: hidden;
	}

	.app {
		--bg-app: #0f172a;
		--bg-surface: #1e293b;
		--bg-elevated: #334155;
		--bg-hover: #263245;
		--border: #334155;
		--border-accent: #475569;
		--text-primary: #e2e8f0;
		--text-secondary: #94a3b8;
		--text-muted: #64748b;
		--shadow: rgba(0, 0, 0, 0.3);
		--handle-border: #1e293b;

		display: flex;
		flex-direction: column;
		height: 100vh;
		width: 100vw;
		background: var(--bg-app);
		color: var(--text-primary);
	}

	.app.theme-light {
		--bg-app: #f1f5f9;
		--bg-surface: #ffffff;
		--bg-elevated: #e2e8f0;
		--bg-hover: #f1f5f9;
		--border: #d1d5db;
		--border-accent: #cbd5e1;
		--text-primary: #1e293b;
		--text-secondary: #64748b;
		--text-muted: #94a3b8;
		--shadow: rgba(0, 0, 0, 0.1);
		--handle-border: #ffffff;
	}

	.app-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 8px 16px;
		background: var(--bg-surface);
		border-bottom: 1px solid var(--border);
		flex-shrink: 0;
	}

	.title {
		display: flex;
		align-items: center;
		gap: 12px;
	}

	.title h1 {
		margin: 0;
		font-size: 16px;
		font-weight: 600;
		color: var(--text-primary);
	}

	.format-badge {
		font-size: 10px;
		text-transform: uppercase;
		letter-spacing: 0.5px;
		background: #3b82f6;
		color: white;
		padding: 2px 8px;
		border-radius: 4px;
	}

	.toolbar {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.toolbar select {
		background: var(--bg-elevated);
		color: var(--text-primary);
		border: 1px solid var(--border-accent);
		border-radius: 4px;
		padding: 4px 8px;
		font-size: 12px;
		cursor: pointer;
	}

	.toolbar button {
		background: var(--bg-elevated);
		color: var(--text-primary);
		border: 1px solid var(--border-accent);
		border-radius: 4px;
		padding: 4px 12px;
		font-size: 12px;
		cursor: pointer;
		transition: background 0.15s;
	}

	.toolbar button:hover {
		background: var(--border-accent);
	}

	.toolbar .theme-toggle {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 4px 8px;
	}

	.split-container {
		display: flex;
		flex: 1;
		overflow: hidden;
	}

	.editor-pane {
		overflow: hidden;
		position: relative;
	}

	.editor-loading {
		display: flex;
		align-items: center;
		justify-content: center;
		height: 100%;
		color: var(--text-muted);
		font-size: 14px;
	}

	.split-handle {
		width: 4px;
		background: var(--border);
		cursor: col-resize;
		flex-shrink: 0;
		transition: background 0.15s;
	}

	.split-handle:hover,
	.split-handle.active {
		background: #3b82f6;
	}

	.diagram-pane {
		overflow: hidden;
		position: relative;
	}

	.flow-wrapper {
		width: 100%;
		height: 100%;
		position: absolute;
		top: 0;
		left: 0;
	}

	.status-bar {
		padding: 4px 16px;
		background: var(--bg-surface);
		border-top: 1px solid var(--border);
		font-size: 11px;
		color: var(--text-secondary);
		flex-shrink: 0;
	}

	.help-dropdown {
		position: relative;
	}

	.help-dropdown .help-toggle {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 28px;
		height: 28px;
		padding: 0;
		border-radius: 50%;
		font-weight: 700;
		font-size: 13px;
	}

	.help-panel {
		position: absolute;
		top: 100%;
		right: 0;
		margin-top: 8px;
		width: 280px;
		background: var(--bg-surface);
		border: 1px solid var(--border);
		border-radius: 8px;
		box-shadow: 0 4px 16px var(--shadow);
		padding: 16px;
		z-index: 100;
	}

	.help-panel h3 {
		margin: 0;
		font-size: 10px;
		text-transform: uppercase;
		letter-spacing: 0.5px;
		color: var(--text-muted);
		padding-bottom: 4px;
	}

	.help-panel h3:not(:first-child) {
		margin-top: 12px;
	}

	.help-panel ul {
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.help-panel li {
		font-size: 12px;
		color: var(--text-secondary);
		line-height: 1.6;
	}
</style>
