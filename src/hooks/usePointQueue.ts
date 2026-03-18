import { useEffect, useRef } from 'react'
import { usePointQueueStore } from '../stores/pointQueueStore'
import { useConfigStore } from '../stores/configStore'
import { awardPoints } from '../services/growndApi'

export function usePointQueueProcessor() {
  const config = useConfigStore((s) => s.config)
  const queue = usePointQueueStore((s) => s.queue)
  const updateStatus = usePointQueueStore((s) => s.updateStatus)
  const incrementRetry = usePointQueueStore((s) => s.incrementRetry)
  const processing = useRef(false)

  useEffect(() => {
    if (processing.current || !config.growndApiKey || !config.growndClassId) return

    const pending = queue.filter(
      (item) =>
        (item.status === 'pending' || item.status === 'failed') &&
        item.retryCount < 5
    )

    if (pending.length === 0) return

    processing.current = true

    const processNext = async () => {
      for (const item of pending) {
        updateStatus(item.id, 'sending')
        try {
          const result = await awardPoints({
            classId: config.growndClassId,
            studentCode: item.studentCode,
            apiKey: config.growndApiKey,
            type: item.type,
            points: item.points,
            description: item.description,
          })
          if (result.success) {
            updateStatus(item.id, 'sent')
          } else {
            updateStatus(item.id, 'failed')
            incrementRetry(item.id)
          }
        } catch {
          updateStatus(item.id, 'failed')
          incrementRetry(item.id)
        }
        await new Promise((r) => setTimeout(r, 500))
      }
      processing.current = false
    }

    const timer = setTimeout(processNext, 2000)
    return () => clearTimeout(timer)
  }, [queue, config.growndApiKey, config.growndClassId, updateStatus, incrementRetry])
}
