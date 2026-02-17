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
	import { parseSchema } from '$lib/editor/schema-editor.ts';
	import { layoutGraph } from '$lib/layout/elk-layout.ts';
	import { examples } from '$lib/examples.ts';
	import type { SchemaFormat } from '$lib/parser/format-detector.ts';

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
					onToggleCollapse: handleToggleCollapse
				}
			}));
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
	onmousemove={handleSplitMouseMove}
	onmouseup={handleSplitMouseUp}
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
					colorMode="dark"
					minZoom={0.1}
					maxZoom={2}
					defaultEdgeOptions={{ type: 'relationship' }}
					proOptions={{ hideAttribution: true }}
				>
					<FitViewHelper trigger={fitViewTrigger} />
				<Controls />
					<MiniMap
						nodeColor="#334155"
						maskColor="rgba(0, 0, 0, 0.5)"
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
		background: #0f172a;
		color: #e2e8f0;
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
		overflow: hidden;
	}

	.app {
		display: flex;
		flex-direction: column;
		height: 100vh;
		width: 100vw;
	}

	.app-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 8px 16px;
		background: #1e293b;
		border-bottom: 1px solid #334155;
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
		color: #f1f5f9;
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
		background: #334155;
		color: #e2e8f0;
		border: 1px solid #475569;
		border-radius: 4px;
		padding: 4px 8px;
		font-size: 12px;
		cursor: pointer;
	}

	.toolbar button {
		background: #334155;
		color: #e2e8f0;
		border: 1px solid #475569;
		border-radius: 4px;
		padding: 4px 12px;
		font-size: 12px;
		cursor: pointer;
		transition: background 0.15s;
	}

	.toolbar button:hover {
		background: #475569;
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
		color: #64748b;
		font-size: 14px;
	}

	.split-handle {
		width: 4px;
		background: #334155;
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
		background: #1e293b;
		border-top: 1px solid #334155;
		font-size: 11px;
		color: #94a3b8;
		flex-shrink: 0;
	}
</style>
