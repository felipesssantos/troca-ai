import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useAuthStore } from '@/store/authStore'
import { supabase } from '@/lib/supabase'
import { Send, ArrowLeft, ShieldAlert } from 'lucide-react'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog"

interface Conversation {
    id: string
    user1_id: string
    user2_id: string
    last_message: string
    updated_at: string
    unread_count?: number
    other_user?: {
        username: string
        avatar_url: string
    }
}

interface Message {
    id: string
    content: string
    sender_id: string
    created_at: string
}

export default function Inbox() {
    const { user } = useAuthStore()
    // navigate unused
    const [conversations, setConversations] = useState<Conversation[]>([])
    const [activeConversation, setActiveConversation] = useState<string | null>(null)
    const [messages, setMessages] = useState<Message[]>([])
    const [newMessage, setNewMessage] = useState('')
    const [loading, setLoading] = useState(true)

    // Safety Warning State
    const [showSafetyWarning, setShowSafetyWarning] = useState(false)

    // Mobile view state
    const [showChatOnMobile, setShowChatOnMobile] = useState(false)
    const messagesEndRef = useRef<HTMLDivElement>(null)

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }

    useEffect(() => {
        scrollToBottom()
    }, [messages])

    // Handle deep linking from Trades page
    useEffect(() => {
        if (!user || loading) return

        const params = new URLSearchParams(window.location.search)
        const targetUserId = params.get('userId')

        if (targetUserId) {
            handleDeepLink(targetUserId)
        }
    }, [user, loading]) // Run when user/loading changes

    const handleDeepLink = async (targetUserId: string) => {
        // 1. Check if we already have this conversation loaded
        const existing = conversations.find(c =>
            (c.user1_id === user?.id && c.user2_id === targetUserId) ||
            (c.user1_id === targetUserId && c.user2_id === user?.id)
        )

        if (existing) {
            setActiveConversation(existing.id)
        } else {
            // 2. If not in list (maybe new?), try to fetch specifically or create
            // Ensure order user1 < user2 for constraint
            const [u1, u2] = [user!.id, targetUserId].sort()

            // Try to create (or get if exists/conflict? Postgres doesn't return existing on conflict easily without specific query)
            // But we can check existence first via RPC or simple select

            const { data: found } = await supabase.from('conversations')
                .select('*')
                .or(`and(user1_id.eq.${u1},user2_id.eq.${u2})`)
                .single()

            if (found) {
                // It exists, maybe refreshes weren't fast enough
                await fetchConversations() // Force refresh
                setActiveConversation(found.id)
            } else {
                // Create new
                const { data: newConv, error } = await supabase.from('conversations')
                    .insert({ user1_id: u1, user2_id: u2 })
                    .select()
                    .single()

                if (newConv) {
                    await fetchConversations()
                    setActiveConversation(newConv.id)
                } else if (error) {
                    console.error('Error creating conversation', error)
                }
            }
        }
        // removing query param to clean url
        window.history.replaceState({}, '', '/inbox')
    }

    useEffect(() => {
        if (!user) return
        fetchConversations()

        // Realtime Subscription for Conversations list
        const sub = supabase
            .channel('inbox-conversations')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, () => {
                fetchConversations()
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => {
                fetchConversations()
            })
            .subscribe()

        return () => {
            supabase.removeChannel(sub)
        }
    }, [user])

    useEffect(() => {
        if (!activeConversation) return

        // Hide warning initially when switching chats
        setShowSafetyWarning(false)

        fetchMessages(activeConversation)
        setShowChatOnMobile(true)

        // Realtime Subscription for Messages
        const sub = supabase
            // ... existing subscription logic ...
            .channel(`chat-${activeConversation}`)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${activeConversation}` }, async (payload) => {
                const newMessage = payload.new as Message
                setMessages(prev => {
                    if (prev.some(m => m.id === newMessage.id)) return prev
                    return [...prev, newMessage]
                })

                // If I am receiving this message and I have the chat open, mark it as read immediately
                if (newMessage.sender_id !== user?.id) {
                    await supabase.rpc('mark_messages_read', { p_conversation_id: activeConversation })
                }
            })
            .subscribe((status) => {
                console.log(`Realtime connection status for ${activeConversation}:`, status)
            })

        return () => {
            supabase.removeChannel(sub)
        }
    }, [activeConversation]) // Removed user dependency to avoid loops if user obj changes ref

    const fetchConversations = async () => {
        // ... existing implementation ...
        if (!user) return

        const { data, error } = await supabase
            .from('conversations')
            .select('*')
            .order('updated_at', { ascending: false })

        if (error) {
            console.error('Error fetching conversations:', error)
            setLoading(false)
            return
        }

        const enrichedConversations = await Promise.all(data.map(async (conv: any) => {
            const otherUserId = conv.user1_id === user.id ? conv.user2_id : conv.user1_id
            const { data: profile } = await supabase.from('profiles').select('username, avatar_url').eq('id', otherUserId).single()
            const { count } = await supabase
                .from('messages')
                .select('*', { count: 'exact', head: true })
                .eq('conversation_id', conv.id)
                .neq('sender_id', user.id)
                .eq('is_read', false)

            return {
                ...conv,
                other_user: profile,
                unread_count: count || 0
            }
        }))

        setConversations(enrichedConversations)
        setLoading(false)
    }

    const fetchMessages = async (conversationId: string) => {
        const { data } = await supabase
            .from('messages')
            .select('*')
            .eq('conversation_id', conversationId)
            .order('created_at', { ascending: true })

        if (data) {
            setMessages(data)

            // LOGIC: Show warning ONLY if I haven't sent any messages yet
            // This covers: New Chat (0 total) OR Incoming Request (0 from me)
            const hasSentMessage = data.some(m => m.sender_id === user?.id)
            if (!hasSentMessage) {
                setShowSafetyWarning(true)
            }
        }

        // Mark messages as read using RPC
        const { error } = await supabase.rpc('mark_messages_read', {
            p_conversation_id: conversationId
        })

        if (!error) {
            setConversations(prev => prev.map(c => {
                if (c.id === conversationId) return { ...c, unread_count: 0 }
                return c
            }))
        }
    }

    const handleSendMessage = async () => {
        if (!newMessage.trim() || !user || !activeConversation) return

        const content = newMessage.trim()
        setNewMessage('') // Optimistic clear

        // Optimistic UI update
        const optimisticId = Math.random().toString() // temp id
        const optimisticTimestamp = new Date().toISOString()

        const optimisticMsg: Message = {
            id: optimisticId,
            conversation_id: activeConversation,
            sender_id: user.id,
            content: content,
            created_at: optimisticTimestamp,
            is_read: false
        } as any // cast if needed for extra fields

        setMessages(prev => [...prev, optimisticMsg])

        // Optimistic update for Conversation List
        setConversations(prev => {
            const updated = prev.map(c => {
                if (c.id === activeConversation) {
                    return { ...c, last_message: content, updated_at: optimisticTimestamp }
                }
                return c
            })
            // Re-sort: active conversation goes to top
            return updated.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
        })

        const { data, error } = await supabase.from('messages').insert({
            conversation_id: activeConversation,
            sender_id: user.id,
            content
        }).select().single()

        if (error) {
            console.error('Error sending message:', error)
            alert('Falha ao enviar mensagem')
            // Remove optimistic message on error
            setMessages(prev => prev.filter(m => m.id !== optimisticId))
        } else if (data) {
            // Replace optimistic message with real one
            setMessages(prev => prev.map(m => m.id === optimisticId ? data : m))
        }
    }

    const activeConvData = conversations.find(c => c.id === activeConversation)

    return (
        <div className="container mx-auto p-4 h-[calc(100vh-80px)] flex gap-4">
            {/* Left Sidebar: Conversation List */}
            <Card className={`w-full md:w-1/3 flex flex-col ${showChatOnMobile ? 'hidden md:flex' : 'flex'}`}>
                <div className="p-4 border-b">
                    <h1 className="text-xl font-bold">Mensagens</h1>
                </div>
                <div className="flex-1 overflow-y-auto">
                    {loading ? (
                        <div className="p-4 text-center text-gray-500">Carregando...</div>
                    ) : conversations.length === 0 ? (
                        <div className="p-4 text-center text-gray-500">Nenhuma conversa iniciada.</div>
                    ) : (
                        <div className="divide-y">
                            {conversations.map(conv => (
                                <div
                                    key={conv.id}
                                    className={`p-4 flex gap-3 cursor-pointer hover:bg-gray-50 ${activeConversation === conv.id ? 'bg-gray-100' : ''}`}
                                    onClick={() => {
                                        setActiveConversation(conv.id)
                                        setShowChatOnMobile(true)
                                    }}
                                >
                                    <Avatar>
                                        <AvatarImage src={conv.other_user?.avatar_url} />
                                        <AvatarFallback>{conv.other_user?.username?.slice(0, 2).toUpperCase()}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 overflow-hidden">
                                        <div className="flex justify-between items-center">
                                            <h4 className={`text-sm ${conv.unread_count && conv.unread_count > 0 ? 'font-bold text-gray-900' : 'font-medium'}`}>
                                                {conv.other_user?.username || 'Usuário'}
                                            </h4>
                                            <span className="text-xs text-gray-400">
                                                {new Date(conv.updated_at).toLocaleDateString()}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center mt-1">
                                            <p className={`text-sm truncate ${conv.unread_count && conv.unread_count > 0 ? 'font-semibold text-gray-800' : 'text-gray-500'}`}>
                                                {conv.last_message || 'Inicie a conversa...'}
                                            </p>
                                            {conv.unread_count && conv.unread_count > 0 ? (
                                                <span className="bg-green-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[1.25rem] text-center">
                                                    {conv.unread_count}
                                                </span>
                                            ) : null}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </Card>

            {/* Right Side: Chat Area */}
            <Card className={`w-full md:w-2/3 flex flex-col ${!showChatOnMobile ? 'hidden md:flex' : 'flex'}`}>
                {activeConversation ? (
                    <>
                        {/* Chat Header */}
                        <div className="p-4 border-b flex items-center gap-3 bg-gray-50 rounded-t-lg">
                            <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setShowChatOnMobile(false)}>
                                <ArrowLeft className="h-5 w-5" />
                            </Button>
                            <Avatar className="h-8 w-8">
                                <AvatarImage src={activeConvData?.other_user?.avatar_url} />
                                <AvatarFallback>{activeConvData?.other_user?.username?.slice(0, 2).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <div>
                                <h3 className="font-bold">{activeConvData?.other_user?.username}</h3>
                            </div>
                        </div>

                        {/* Messages List */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50">
                            {messages.map(msg => {
                                const isMe = msg.sender_id === user?.id
                                return (
                                    <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[70%] rounded-lg p-3 ${isMe ? 'bg-green-600 text-white' : 'bg-white border shadow-sm'}`}>
                                            <p className="text-sm">{msg.content}</p>
                                            <span className={`text-[10px] block text-right mt-1 ${isMe ? 'text-green-100' : 'text-gray-400'}`}>
                                                {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                    </div>
                                )
                            })}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input Area */}
                        <div className="p-4 border-t bg-white rounded-b-lg flex gap-2">
                            <input
                                type="text"
                                className="flex-1 border rounded-full px-4 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                                placeholder="Digite sua mensagem..."
                                value={newMessage}
                                onChange={e => setNewMessage(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                            />
                            <Button size="icon" className="bg-green-600 rounded-full hover:bg-green-700" onClick={handleSendMessage}>
                                <Send className="h-4 w-4" />
                            </Button>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex items-center justify-center text-gray-400">
                        <div className="text-center">
                            <p className="text-lg">Selecione uma conversa para começar</p>
                        </div>
                    </div>
                )}
            </Card>

            {/* Safety Dialog */}
            <Dialog open={showSafetyWarning} onOpenChange={setShowSafetyWarning}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-amber-600">
                            <ShieldAlert className="h-6 w-6" />
                            Dicas de Segurança Importantes
                        </DialogTitle>
                        <DialogDescription className="pt-2 text-base space-y-3 text-slate-700">
                            <p>
                                <strong>⚠️ Atenção:</strong> Se você for menor de 18 anos,
                                avise sempre seu responsável sobre qualquer negociação ou encontro.
                            </p>
                            <ul className="list-disc pl-5 space-y-1 text-sm">
                                <li>Marque trocas apenas em <strong>locais públicos e movimentados</strong> (Shoppings, Estações de Metrô).</li>
                                <li>Nunca vá a locais isolados ou residências desconhecidas.</li>
                                <li>Se possível, vá acompanhado(a).</li>
                            </ul>
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button onClick={() => setShowSafetyWarning(false)} className="w-full bg-amber-600 hover:bg-amber-700 text-white">
                            Entendi, vou tomar cuidado
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
