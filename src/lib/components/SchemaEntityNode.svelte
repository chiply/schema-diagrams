<script lang="ts">
	import { Handle, Position } from '@xyflow/svelte';
	import type { SchemaEntity } from '../parser/types.ts';

	interface Props {
		data: {
			schema: SchemaEntity;
			isCollapsed: boolean;
			onToggleCollapse?: (id: string) => void;
			onAddField?: (id: string) => void;
			onRenameField?: (schemaId: string, oldName: string, newName: string) => void;
			editingFieldName?: string | null;
		};
		id: string;
	}

	let { data, id }: Props = $props();

	let schema = $derived(data.schema);
	let isCollapsed = $derived(data.isCollapsed);
	let fields = $derived(schema.fields ?? []);

	let editingField = $state<string | null>(null);
	let editValue = $state('');
	let cancelling = false;

	$effect(() => {
		if (data.editingFieldName) {
			editingField = data.editingFieldName;
			editValue = data.editingFieldName;
		}
	});

	function startEdit(fieldName: string) {
		editingField = fieldName;
		editValue = fieldName;
	}

	function commitEdit(oldName: string) {
		if (cancelling) return;
		const trimmed = editValue.trim();
		if (trimmed && trimmed !== oldName) {
			data.onRenameField?.(id, oldName, trimmed);
		}
		editingField = null;
	}

	function cancelEdit() {
		cancelling = true;
		editingField = null;
		// Reset flag after the blur event has fired
		requestAnimationFrame(() => { cancelling = false; });
	}
</script>

<div class="entity-node">
	<Handle type="target" position={Position.Left} id="{id}-target" style="background: #3b82f6; width: 10px; height: 10px; border: 2px solid var(--handle-border, #1e293b);" />
	<Handle type="source" position={Position.Right} id="{id}-source" style="background: #3b82f6; width: 10px; height: 10px; border: 2px solid var(--handle-border, #1e293b);" />

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
					{#if editingField === field.name}
						<!-- svelte-ignore a11y_autofocus -->
						<input
							class="field-name-input nopan nowheel nodrag"
							type="text"
							bind:value={editValue}
							autofocus
							onkeydown={(e) => {
								if (e.key === 'Enter') { e.preventDefault(); commitEdit(field.name); }
								else if (e.key === 'Escape') { e.preventDefault(); cancelEdit(); }
							}}
							onblur={() => commitEdit(field.name)}
							onfocus={(e) => (e.target as HTMLInputElement).select()}
						/>
					{:else}
						<span
							class="field-name editable"
							role="button"
							tabindex="0"
							onclick={(e) => { e.stopPropagation(); startEdit(field.name); }}
							onkeydown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); startEdit(field.name); } }}
						>{field.name}</span>
					{/if}
					<span class="field-type">{field.type.display}</span>
					<Handle type="source" position={Position.Right} id="{id}.{field.name}-source" />
				</div>
			{/each}
		</div>
		<button class="add-field-btn" onclick={() => data.onAddField?.(id)}>+ Add Field</button>
	{/if}
</div>

<style>
	.entity-node {
		background: var(--bg-surface, #1e293b);
		border: 1px solid var(--border, #334155);
		border-radius: 6px;
		min-width: 240px;
		font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
		font-size: 12px;
		box-shadow: 0 2px 8px var(--shadow, rgba(0, 0, 0, 0.3));
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
		background: var(--bg-hover, #263245);
	}

	.field-row.reference .field-type {
		color: #60a5fa;
	}

	.field-row.nullable .field-name::after {
		content: '?';
		color: var(--text-secondary, #94a3b8);
		margin-left: 1px;
	}

	.field-name {
		color: var(--text-primary, #e2e8f0);
		flex: 1;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.field-name.editable {
		cursor: text;
		border-radius: 2px;
		padding: 0 2px;
		margin: 0 -2px;
	}

	.field-name.editable:hover {
		background: var(--bg-elevated, #334155);
	}

	.field-name-input {
		flex: 1;
		font-family: inherit;
		font-size: inherit;
		color: var(--text-primary, #e2e8f0);
		background: var(--bg-elevated, #334155);
		border: 1px solid #3b82f6;
		border-radius: 2px;
		padding: 0 2px;
		margin: 0 -3px;
		outline: none;
		min-width: 0;
	}

	.field-type {
		color: var(--text-secondary, #94a3b8);
		font-size: 11px;
		text-align: right;
		flex-shrink: 0;
		max-width: 120px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.add-field-btn {
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

	.add-field-btn:hover {
		color: var(--text-primary, #e2e8f0);
		border-color: var(--text-secondary, #94a3b8);
		background: var(--bg-hover, #263245);
	}
</style>
