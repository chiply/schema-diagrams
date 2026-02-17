<script lang="ts">
	import { Handle, Position } from '@xyflow/svelte';
	import type { SchemaEntity } from '../parser/types.ts';

	interface Props {
		data: {
			schema: SchemaEntity;
			isCollapsed: boolean;
			onToggleCollapse?: (id: string) => void;
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
</script>

<div class="enum-node">
	<Handle type="target" position={Position.Left} id="{id}-target" style="background: #8b5cf6; width: 10px; height: 10px; border: 2px solid #1e293b;" />

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
					<div class="symbol">{symbol}</div>
				{/each}
				{#if hasMore}
					<div class="more">+{symbols.length - 8} more</div>
				{/if}
			{:else}
				<div class="symbol">size: {schema.size}</div>
			{/if}
		</div>
	{/if}
</div>

<style>
	.enum-node {
		background: #1e293b;
		border: 1px solid #334155;
		border-radius: 6px;
		min-width: 180px;
		font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
		font-size: 12px;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
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
		color: #c4b5fd;
		font-size: 11px;
	}

	.symbol:hover {
		background: #263245;
	}

	.more {
		padding: 3px 12px;
		color: #64748b;
		font-size: 10px;
		font-style: italic;
	}
</style>
