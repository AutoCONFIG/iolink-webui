<script setup lang="ts">
const version = import.meta.env.VITE_APP_VERSION?.trim() || 'dev'
</script>

<template>
  <small aria-label="当前版本">{{ version }}</small>
</template>
