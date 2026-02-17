<script lang="ts">
	let { children } = $props();
</script>

<svelte:head>
	<title>Schema Diagrams</title>
	<meta name="description" content="Visualize Avro schemas as ERD-style diagrams" />
</svelte:head>

{@render children()}
