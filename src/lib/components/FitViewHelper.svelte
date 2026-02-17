<script lang="ts">
	import { useSvelteFlow } from '@xyflow/svelte';

	interface Props {
		trigger: number;
	}

	let { trigger }: Props = $props();
	const { fitView } = useSvelteFlow();

	$effect(() => {
		trigger;
		if (trigger > 0) {
			requestAnimationFrame(() => {
				fitView({ padding: 0.1, duration: 200 });
			});
		}
	});
</script>
