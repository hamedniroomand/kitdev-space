import { searchTools } from '#shared/utils/tools'

export function useToolSearch() {
  const query = ref('')

  const results = computed(() => searchTools(query.value))

  function setQuery(value: string) {
    query.value = value
  }

  return {
    query,
    results,
    setQuery
  }
}
