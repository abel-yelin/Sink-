import { z } from 'zod'

export default eventHandler(async (event) => {
  const { cloudflare } = event.context
  const { KV } = cloudflare.env
  const { limit, cursor } = await getValidatedQuery(event, z.object({
    limit: z.coerce.number().max(1024).default(20),
    cursor: z.string().trim().max(1024).optional().nullable(),
  }).parse)

  const listOptions: { prefix: string; limit: number; cursor?: string } = {
    prefix: 'link:',
    limit,
  }
  
  if (cursor) {
    listOptions.cursor = cursor
  }

  const list = await KV.list(listOptions)
  if (Array.isArray(list.keys)) {
    list.links = await Promise.all(list.keys.map(async (key: { name: string }) => {
      const { metadata, value: link } = await KV.getWithMetadata(key.name, { type: 'json' })
      if (link) {
        return {
          ...metadata,
          ...link,
        }
      }
      return link
    }))
  }
  delete list.keys
  return list
})
