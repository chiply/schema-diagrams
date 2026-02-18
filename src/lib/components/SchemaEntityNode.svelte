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
			onChangeDefault?: (schemaId: string, fieldName: string, newDefault: unknown) => void;
			editingFieldName?: string | null;
		};
		id: string;
	}

	let { data, id }: Props = $props();

	let schema = $derived(data.schema);
	let isCollapsed = $derived(data.isCollapsed);
	let fields = $derived(schema.fields ?? []);

	// Field name editing state
	let editingField = $state<string | null>(null);
	let editValue = $state('');
	let cancelling = false;

	// Default value editing state
	let editingDefault = $state<string | null>(null);
	let editDefaultValue = $state('');
	let cancellingDefault = false;

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
		requestAnimationFrame(() => { cancelling = false; });
	}

	function formatDefaultDisplay(value: unknown): string {
		if (value === null) return 'null';
		if (value === true) return 'true';
		if (value === false) return 'false';
		if (typeof value === 'number') return String(value);
		if (typeof value === 'string') return `"${value}"`;
		if (typeof value === 'object') return JSON.stringify(value);
		return String(value);
	}

	function parseDefaultInput(raw: string): unknown {
		const trimmed = raw.trim();
		if (trimmed === '') return undefined; // remove default
		if (trimmed === 'null') return null;
		if (trimmed === 'true') return true;
		if (trimmed === 'false') return false;
		if (/^-?[0-9]+(\.[0-9]+)?$/.test(trimmed)) return Number(trimmed);
		// Try JSON parse for objects/arrays
		if ((trimmed.startsWith('{') && trimmed.endsWith('}')) ||
			(trimmed.startsWith('[') && trimmed.endsWith(']'))) {
			try { return JSON.parse(trimmed); } catch { return trimmed; }
		}
		// Strip surrounding quotes if present
		if (trimmed.startsWith('"') && trimmed.endsWith('"') && trimmed.length >= 2) {
			return trimmed.slice(1, -1);
		}
		return trimmed;
	}

	function startDefaultEdit(fieldName: string, currentDefault: unknown) {
		editingDefault = fieldName;
		editDefaultValue = currentDefault !== undefined ? formatDefaultDisplay(currentDefault) : '';
	}

	function commitDefaultEdit(fieldName: string) {
		if (cancellingDefault) return;
		const parsed = parseDefaultInput(editDefaultValue);
		data.onChangeDefault?.(id, fieldName, parsed);
		editingDefault = null;
	}

	function cancelDefaultEdit() {
		cancellingDefault = true;
		editingDefault = null;
		requestAnimationFrame(() => { cancellingDefault = false; });
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
					{#if editingDefault === field.name}
						<!-- svelte-ignore a11y_autofocus -->
						<input
							class="field-default-input nopan nowheel nodrag"
							type="text"
							bind:value={editDefaultValue}
							autofocus
							onkeydown={(e) => {
								if (e.key === 'Enter') { e.preventDefault(); commitDefaultEdit(field.name); }
								else if (e.key === 'Escape') { e.preventDefault(); cancelDefaultEdit(); }
							}}
							onblur={() => commitDefaultEdit(field.name)}
							onfocus={(e) => (e.target as HTMLInputElement).select()}
						/>
					{:else if field.default !== undefined}
						<span
							class="field-default editable"
							role="button"
							tabindex="0"
							onclick={(e) => { e.stopPropagation(); startDefaultEdit(field.name, field.default); }}
							onkeydown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); startDefaultEdit(field.name, field.default); } }}
						>= {formatDefaultDisplay(field.default)}</span>
					{:else}
						<span
							class="field-default-empty"
							role="button"
							tabindex="0"
							onclick={(e) => { e.stopPropagation(); startDefaultEdit(field.name, undefined); }}
							onkeydown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); startDefaultEdit(field.name, undefined); } }}
						>+</span>
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
		min-width: 280px;
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

	.field-default {
		color: var(--text-muted, #64748b);
		font-size: 11px;
		flex-shrink: 0;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		max-width: 80px;
	}

	.field-default.editable {
		cursor: text;
		border-radius: 2px;
		padding: 0 2px;
	}

	.field-default.editable:hover {
		background: var(--bg-elevated, #334155);
	}

	.field-default-empty {
		color: var(--text-muted, #64748b);
		font-size: 11px;
		flex-shrink: 0;
		opacity: 0;
		cursor: pointer;
		padding: 0 2px;
		border-radius: 2px;
	}

	.field-row:hover .field-default-empty {
		opacity: 0.5;
	}

	.field-default-empty:hover {
		opacity: 1 !important;
		background: var(--bg-elevated, #334155);
	}

	.field-default-input {
		font-family: inherit;
		font-size: 11px;
		color: var(--text-primary, #e2e8f0);
		background: var(--bg-elevated, #334155);
		border: 1px solid #3b82f6;
		border-radius: 2px;
		padding: 0 2px;
		outline: none;
		min-width: 0;
		width: 60px;
		flex-shrink: 0;
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
