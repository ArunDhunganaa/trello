import { useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { Card, List } from '../types'
import { useListStore } from '../store/listStore'
import { useCardStore } from '../store/cardStore'

/**
 * Subscribes to Supabase Realtime postgres_changes for the given board.
 * Any INSERT/UPDATE/DELETE on `lists` or `cards` filtered by board_id
 * is applied directly to the local Zustand stores — no full refetch needed.
 *
 * Requires these tables to be added to the supabase_realtime publication:
 *   ALTER PUBLICATION supabase_realtime ADD TABLE public.lists;
 *   ALTER PUBLICATION supabase_realtime ADD TABLE public.cards;
 */
export function useRealtimeBoard(boardId: string | undefined) {
  const upsertList = useListStore((s) => s.upsertList)
  const removeList = useListStore((s) => s.removeList)
  const upsertCard = useCardStore((s) => s.upsertCard)
  const removeCard = useCardStore((s) => s.removeCard)

  useEffect(() => {
    if (!boardId) return

    const channel = supabase
      .channel(`board-rt-${boardId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'lists', filter: `board_id=eq.${boardId}` },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            removeList((payload.old as { id: string }).id)
          } else {
            upsertList(payload.new as List)
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'cards', filter: `board_id=eq.${boardId}` },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            removeCard((payload.old as { id: string }).id)
          } else {
            upsertCard(payload.new as Card)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [boardId, upsertList, removeList, upsertCard, removeCard])
}
