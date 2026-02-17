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
	let fields = $derived(schema.fields ?? []);
</script>

<div class="entity-node">
	<Handle type="target" position={Position.Left} id="{id}-target" style="opacity: 0; pointer-events: all;" />

	<div class="header" role="button" tabindex="0"
		onclick={() => data.onToggleCollapse?.(id)}
		onkeydown={(e) => e.key === 'Enter' && data.onToggleCollapse?.(id)}
	>
		<span class="toggle">{isCollapsed ? '\u25B6' : '\u25BC'}</span>
		<span class="name">{schema.name}</span>
		{#if schema.namespace}
			<span class="namespace">{schema.namespace}</span>
		{/if}
		{#if isCollapsed && fields.length > 0}
			<span class="field-count">{fields.length} fields</span>
		{/if}
	</div>

	{#if !isCollapsed}
		<div class="fields">
			{#each fields as field, i}
				<div class="field-row" class:reference={field.type.isReference} class:nullable={field.type.isNullable}>
					<Handle type="target" position={Position.Left} id="{id}.{field.name}-target" />
					<span class="field-name">{field.name}</span>
					<span class="field-type">{field.type.display}</span>
					<Handle type="source" position={Position.Right} id="{id}.{field.name}-source" />
				</div>
			{/each}
		</div>
	{/if}
</div>

<style>
	.entity-node {
		background: #1e293b;
		border: 1px solid #334155;
		border-radius: 6px;
		min-width: 240px;
		font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
		font-size: 12px;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
	}

	.header {
		background: #3b82f6;
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

	.name {
		font-weight: 600;
		font-size: 13px;
	}

	.namespace {
		font-size: 10px;
		opacity: 0.7;
		margin-left: auto;
		max-width: 120px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.field-count {
		font-size: 10px;
		opacity: 0.7;
		margin-left: auto;
		background: rgba(255, 255, 255, 0.2);
		padding: 1px 6px;
		border-radius: 8px;
	}

	.fields {
		padding: 4px 0;
	}

	.field-row {
		display: flex;
		align-items: center;
		padding: 4px 12px;
		gap: 8px;
		position: relative;
		height: 28px;
		box-sizing: border-box;
	}

	.field-row:hover {
		background: #263245;
	}

	.field-row.reference .field-type {
		color: #60a5fa;
	}

	.field-row.nullable .field-name::after {
		content: '?';
		color: #94a3b8;
		margin-left: 1px;
	}

	.field-name {
		color: #e2e8f0;
		flex: 1;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.field-type {
		color: #94a3b8;
		font-size: 11px;
		text-align: right;
		flex-shrink: 0;
		max-width: 120px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
</style>
