import { api } from "@/lib/trpc"
import { Note } from "@shared/lib/types"
import { RootStore } from "@/store"
import { PromiseState } from "@/store/standard/PromiseState"
import { DialogStore } from "@/store/module/Dialog"
import { observer } from "mobx-react-lite"
import { useEffect, useState } from "react"
import { BlinkoCard } from "../BlinkoCard"
import { ScrollArea } from "../Common/ScrollArea"
import { useTranslation } from "react-i18next"

export const BlinkoReference = observer(({ item }: { item: Note }) => {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState<'references' | 'referencedBy'>('references')

  const store = RootStore.Local(() => ({
    outgoingRefs: new PromiseState({
      function: async () => {
        return await api.notes.noteReferenceList.mutate({ noteId: item.id!, type: 'references' })
      }
    }),
    incomingRefs: new PromiseState({
      function: async () => {
        return await api.notes.noteReferenceList.mutate({ noteId: item.id!, type: 'referencedBy' })
      }
    })
  }))

  useEffect(() => {
    store.outgoingRefs.call()
    store.incomingRefs.call()
  }, [item.id])

  const outgoing = store.outgoingRefs.value || []
  const incoming = store.incomingRefs.value || []
  const activeList = activeTab === 'references' ? outgoing : incoming

  return <div className="flex md:flex-row flex-col gap-2 p-6 w-full bg-secondbackground rounded-2xl max-h-[80vh]">
    <div className="w-full md:w-1/2 hidden md:block">
      <BlinkoCard blinkoItem={item} />
    </div>
    <div className="w-full md:w-1/2 flex flex-col gap-2 max-h-[80vh]">
      {/* Tabs for outgoing/incoming */}
      <div className="flex gap-1 p-1 bg-default-100 rounded-lg">
        <button
          className={`flex-1 text-xs font-medium py-1.5 rounded-md transition-colors ${activeTab === 'references' ? 'bg-background shadow-sm' : 'text-foreground/50 hover:text-foreground/70'}`}
          onClick={() => setActiveTab('references')}
        >
          Links to ({outgoing.length})
        </button>
        <button
          className={`flex-1 text-xs font-medium py-1.5 rounded-md transition-colors ${activeTab === 'referencedBy' ? 'bg-background shadow-sm' : 'text-foreground/50 hover:text-foreground/70'}`}
          onClick={() => setActiveTab('referencedBy')}
        >
          Linked from ({incoming.length})
        </button>
      </div>

      <ScrollArea className="flex-1 flex flex-col gap-4" onBottom={() => { }}>
        {activeList.length === 0 ? (
          <div className="text-center text-foreground/30 text-sm py-8">
            {activeTab === 'references' ? 'No outgoing links' : 'No incoming links'}
          </div>
        ) : (
          activeList.map((i: any) => <BlinkoCard key={i.id} blinkoItem={i} />)
        )}
      </ScrollArea>
    </div>
  </div>
})


export const ShowBlinkoReference = ({ item }: { item: Note }) => {
  RootStore.Get(DialogStore).setData({
    isOpen: true,
    onlyContent: true,
    showOnlyContentCloseButton: true,
    size: '4xl',
    content: <BlinkoReference item={item} />
  })
}
