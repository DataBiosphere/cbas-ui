import { authStore } from 'src/libs/state'


export const getUser = () => {
  return authStore.get().user
}

export const bucketBrowserUrl = id => {
  return `https://console.cloud.google.com/storage/browser/${id}?authuser=${getUser().email}`
}
