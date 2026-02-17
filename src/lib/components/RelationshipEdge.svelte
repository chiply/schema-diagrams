<script lang="ts">
	import { BaseEdge, getBezierPath, type EdgeProps } from '@xyflow/svelte';
	import type { Relationship } from '../parser/types.ts';

	let {
		id,
		sourceX,
		sourceY,
		targetX,
		targetY,
		sourcePosition,
		targetPosition,
		data,
		style,
		markerEnd
	}: EdgeProps = $props();

	let relationship = $derived(data?.relationship as Relationship | undefined);

	let edgePath = $derived.by(() => {
		const [path] = getBezierPath({
			sourceX,
			sourceY,
			targetX,
			targetY,
			sourcePosition,
			targetPosition
		});
		return path;
	});

	let midX = $derived((sourceX + targetX) / 2);
	let midY = $derived((sourceY + targetY) / 2);

	let strokeColor = $derived.by(() => {
		if (!relationship) return '#64748b';
		switch (relationship.type) {
			case 'join': return '#f59e0b';
			case 'nested': return '#8b5cf6';
			case 'reference': return '#60a5fa';
			default: return '#64748b';
		}
	});

	let strokeDasharray = $derived(relationship?.type === 'join' ? '6 3' : undefined);
</script>

<BaseEdge {id} path={edgePath} style="stroke: {strokeColor}; stroke-width: 1.5; {strokeDasharray ? `stroke-dasharray: ${strokeDasharray};` : ''}" />

{#if relationship?.cardinality}
	<foreignObject x={midX - 20} y={midY - 10} width="40" height="20" class="edge-label-container">
		<div class="edge-label" style="background: {strokeColor}">
			{relationship.cardinality}
		</div>
	</foreignObject>
{/if}

<style>
	.edge-label-container {
		overflow: visible;
		pointer-events: none;
	}

	.edge-label {
		font-size: 9px;
		font-family: 'Monaco', 'Menlo', monospace;
		color: white;
		padding: 1px 4px;
		border-radius: 3px;
		text-align: center;
		white-space: nowrap;
	}
</style>
