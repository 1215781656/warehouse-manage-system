<template>
  <div class="fixed-action">
    <slot />
  </div>
  </template>
<script setup lang="ts">
</script>
<style scoped>
.fixed-action{
  display:flex;
  justify-content:flex-end;
  gap:10px;
  padding:12px 16px;
  background: var(--el-bg-color);
  position: sticky;
  bottom: 0;
  z-index: 5;
}
@media (max-width: 768px){
  .fixed-action{ justify-content:center; gap:12px; padding:12px }
}
</style>
