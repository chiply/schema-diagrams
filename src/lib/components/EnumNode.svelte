<script lang="ts">
	import { Handle, Position } from '@xyflow/svelte';
	import type { SchemaEntity } from '../parser/types.ts';

	interface Props {
		data: {
			schema: SchemaEntity;
			isCollapsed: boolean;
			onToggleCollapse?: (id: string) => void;
			onAddSymbol?: (id: string) => void;
			onRenameSymbol?: (schemaId: string, oldName: string, newName: string) => void;
			editingSymbolName?: string | null;
		};
		id: string;
	}

	let { data, id }: Props = $props();

	let schema = $derived(data.schema);
	let isCollapsed = $derived(data.isCollapsed);
	let isEnum = $derived(schema.type === 'enum');
	let symbols = $derived(schema.symbols ?? []);
	let displaySymbols = $derived(isCollapsed ? [] : symbols.slice(0, 8));
	let hasMore = $derived(symbols.length > 8);

	// Symbol editing state
	let editingSymbol = $state<string | null>(null);
	let editValue = $state('');
	let cancelling = false;

	$effect(() => {
		if (data.editingSymbolName) {
			editingSymbol = data.editingSymbolName;
			editValue = data.editingSymbolName;
		}
	});

	function startEdit(symbol: string) {
		editingSymbol = symbol;
		editValue = symbol;
	}

	function commitEdit(oldName: string) {
		if (cancelling) return;
		const trimmed = editValue.trim();
		if (trimmed && trimmed !== oldName) {
			data.onRenameSymbol?.(id, oldName, trimmed);
		}
		editingSymbol = null;
	}

	function cancelEdit() {
		cancelling = true;
		editingSymbol = null;
		requestAnimationFrame(() => { cancelling = false; });
	}
</script>

<div class="enum-node">
	<Handle type="target" position={Position.Left} id="{id}-target" style="background: #8b5cf6; width: 10px; height: 10px; border: 2px solid var(--handle-border, #1e293b);" />
	<Handle type="source" position={Position.Right} id="{id}-source" style="background: #8b5cf6; width: 10px; height: 10px; border: 2px solid var(--handle-border, #1e293b);" />

	<div class="header" role="button" tabindex="0"
		onclick={() => data.onToggleCollapse?.(id)}
		onkeydown={(e) => e.key === 'Enter' && data.onToggleCollapse?.(id)}
	>
		<span class="toggle">{isCollapsed ? '\u25B6' : '\u25BC'}</span>
		<span class="badge">{isEnum ? 'enum' : 'fixed'}</span>
		<span class="name">{schema.name}</span>
		{#if isCollapsed && isEnum}
			<span class="count">{symbols.length}</span>
		{/if}
	</div>

	{#if !isCollapsed}
		<div class="body">
			{#if isEnum}
				{#each displaySymbols as symbol}
					<div class="symbol">
						{#if editingSymbol === symbol}
							<!-- svelte-ignore a11y_autofocus -->
							<input
								class="symbol-input nopan nowheel nodrag"
								type="text"
								bind:value={editValue}
								autofocus
								onkeydown={(e) => {
									if (e.key === 'Enter') { e.preventDefault(); commitEdit(symbol); }
									else if (e.key === 'Escape') { e.preventDefault(); cancelEdit(); }
								}}
								onblur={() => commitEdit(symbol)}
								onfocus={(e) => (e.target as HTMLInputElement).select()}
							/>
						{:else}
							<span
								class="symbol-name editable"
								role="button"
								tabindex="0"
								onclick={(e) => { e.stopPropagation(); startEdit(symbol); }}
								onkeydown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); startEdit(symbol); } }}
							>{symbol}</span>
						{/if}
					</div>
				{/each}
				{#if hasMore}
					<div class="more">+{symbols.length - 8} more</div>
				{/if}
				<button class="add-symbol-btn" onclick={() => data.onAddSymbol?.(id)}>+ Add Symbol</button>
			{:else}
				<div class="symbol">size: {schema.size}</div>
			{/if}
		</div>
	{/if}
</div>

<style>
	.enum-node {
		background: var(--bg-surface, #1e293b);
		border: 1px solid var(--border, #334155);
		border-radius: 6px;
		min-width: 180px;
		font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
		font-size: 12px;
		box-shadow: 0 2px 8px var(--shadow, rgba(0, 0, 0, 0.3));
	}

	.header {
		background: #8b5cf6;
		color: white;
		padding: 8px 12px;
		border-radius: 5px 5px 0 0;
		display: flex;
		align-items: center;
		gap: 8px;
		cursor: pointer;
		user-select: none;
	}

	.toggle {
		font-size: 10px;
		width: 12px;
	}

	.badge {
		font-size: 9px;
		text-transform: uppercase;
		letter-spacing: 0.5px;
		background: rgba(255, 255, 255, 0.2);
		padding: 1px 6px;
		border-radius: 4px;
	}

	.name {
		font-weight: 600;
		font-size: 13px;
	}

	.count {
		font-size: 10px;
		opacity: 0.7;
		margin-left: auto;
		background: rgba(255, 255, 255, 0.2);
		padding: 1px 6px;
		border-radius: 8px;
	}

	.body {
		padding: 6px 0;
	}

	.symbol {
		padding: 3px 12px;
		color: var(--text-secondary, #c4b5fd);
		font-size: 11px;
	}

	.symbol:hover {
		background: var(--bg-hover, #263245);
	}

	.symbol-name.editable {
		cursor: text;
		border-radius: 2px;
		padding: 0 2px;
		margin: 0 -2px;
	}

	.symbol-name.editable:hover {
		background: var(--bg-elevated, #334155);
	}

	.symbol-input {
		width: 100%;
		font-family: inherit;
		font-size: inherit;
		color: var(--text-primary, #e2e8f0);
		background: var(--bg-elevated, #334155);
		border: 1px solid #8b5cf6;
		border-radius: 2px;
		padding: 0 2px;
		margin: 0 -3px;
		outline: none;
		min-width: 0;
		box-sizing: border-box;
	}

	.more {
		padding: 3px 12px;
		color: var(--text-muted, #64748b);
		font-size: 10px;
		font-style: italic;
	}

	.add-symbol-btn {
		display: block;
		width: calc(100% - 16px);
		margin: 2px 8px 6px;
		padding: 4px 0;
		background: none;
		border: 1px dashed var(--border-accent, #475569);
		border-radius: 4px;
		color: var(--text-muted, #64748b);
		font-family: inherit;
		font-size: 11px;
		cursor: pointer;
		transition: color 0.15s, border-color 0.15s, background 0.15s;
	}

	.add-symbol-btn:hover {
		color: var(--text-primary, #e2e8f0);
		border-color: var(--text-secondary, #94a3b8);
		background: var(--bg-hover, #263245);
	}
</style>
