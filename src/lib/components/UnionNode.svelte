<script lang="ts">
	import { Handle, Position } from '@xyflow/svelte';
	import type { FieldType } from '../parser/types.ts';

	interface Props {
		data: {
			label: string;
			unionTypes: FieldType[];
		};
		id: string;
	}

	let { data, id }: Props = $props();
</script>

<div class="union-node">
	<Handle type="target" position={Position.Left} id="{id}-target" />

	<div class="header">
		<span class="badge">union</span>
		<span class="name">{data.label}</span>
	</div>

	<div class="variants">
		{#each data.unionTypes as variant, i}
			<div class="variant">
				<span class="variant-type">{variant.display}</span>
				<Handle type="source" position={Position.Right} id="{id}-variant-{i}" style="top: {44 + i * 24}px;" />
			</div>
		{/each}
	</div>
</div>

<style>
	.union-node {
		background: var(--bg-surface, #1e293b);
		border: 1px solid var(--border, #334155);
		border-radius: 6px;
		min-width: 160px;
		font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
		font-size: 12px;
		box-shadow: 0 2px 8px var(--shadow, rgba(0, 0, 0, 0.3));
	}

	.header {
		background: #f59e0b;
		color: #1e293b;
		padding: 8px 12px;
		border-radius: 5px 5px 0 0;
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.badge {
		font-size: 9px;
		text-transform: uppercase;
		letter-spacing: 0.5px;
		background: rgba(0, 0, 0, 0.15);
		padding: 1px 6px;
		border-radius: 4px;
	}

	.name {
		font-weight: 600;
		font-size: 13px;
	}

	.variants {
		padding: 6px 0;
	}

	.variant {
		padding: 3px 12px;
		color: #fbbf24;
		font-size: 11px;
		position: relative;
	}

	.variant:hover {
		background: var(--bg-hover, #263245);
	}
</style>
