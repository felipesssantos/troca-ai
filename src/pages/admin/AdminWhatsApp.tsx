import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { QrCode, Smartphone, RefreshCw, PowerOff, ShieldCheck, AlertTriangle } from 'lucide-react'

interface BotStatus {
    status: 'DISCONNECTED' | 'QR_READY' | 'CONNECTED';
    qr: string | null;
}

export default function AdminWhatsApp() {
    const [botState, setBotState] = useState<BotStatus>({ status: 'DISCONNECTED', qr: null })
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    // Using localhost:3001 as default, can be overridden by env variable
    const BOT_API_URL = import.meta.env.VITE_BOT_API_URL || 'http://localhost:3001/api/whatsapp';

    const fetchStatus = async () => {
        try {
            const res = await fetch(`${BOT_API_URL}/status`)
            if (!res.ok) throw new Error('Servidor do bot não está respondendo.')
            const data = await res.json()
            setBotState(data)
            setError(null)
        } catch (err: any) {
            setError(err.message || 'Erro ao conectar com a API do bot.')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        // Fetch initially
        fetchStatus()
        
        // Poll every 3 seconds
        const interval = setInterval(() => {
            fetchStatus()
        }, 3000)

        return () => clearInterval(interval)
    }, [])

    const handleLogout = async () => {
        if (!window.confirm("Deseja realmente desconectar o número atual do bot? Ele precisará ser lido novamente.")) return;
        
        try {
            setLoading(true)
            const res = await fetch(`${BOT_API_URL}/logout`, { method: 'POST' })
            if (!res.ok) throw new Error('Erro ao solicitar desconexão.')
            // Optimistically update
            setBotState({ status: 'DISCONNECTED', qr: null })
            alert('Desconexão solicitada. O bot será reiniciado em instantes e um novo QR code será gerado.')
        } catch (err: any) {
            alert(err.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="space-y-6">
            <h2 className="text-3xl font-bold tracking-tight">WhatsApp Bot (Assistente IA)</h2>
            <p className="text-gray-500">
                Gerencie a conexão do seu número de WhatsApp corporativo com o bot assistente do Troca-AI.
            </p>

            <div className="bg-white border rounded-md p-8 flex flex-col items-center justify-center min-h-[400px]">
                {loading && botState.status === 'DISCONNECTED' && !error ? (
                    <div className="flex flex-col items-center animate-pulse">
                        <RefreshCw className="h-8 w-8 text-blue-500 animate-spin mb-4" />
                        <p className="text-gray-500">Conectando ao serviço do bot...</p>
                    </div>
                ) : error ? (
                    <div className="flex flex-col items-center text-red-500 max-w-md text-center">
                        <AlertTriangle className="h-12 w-12 mb-4 text-red-500" />
                        <h3 className="text-xl font-bold mb-2">Serviço Indisponível</h3>
                        <p className="mb-4">{error}</p>
                        <p className="text-sm text-gray-500 mb-6">
                            Certifique-se de que o processo `node index.js` dentro da pasta `whatsapp-bot` está rodando em sua máquina e a porta 3001 está liberada.
                        </p>
                        <Button variant="outline" onClick={fetchStatus}>
                            <RefreshCw className="mr-2 h-4 w-4" /> Tentar Novamente
                        </Button>
                    </div>
                ) : botState.status === 'CONNECTED' ? (
                    <div className="flex flex-col items-center text-center">
                        <div className="bg-green-100 p-4 rounded-full mb-4">
                            <ShieldCheck className="h-16 w-16 text-green-600" />
                        </div>
                        <h3 className="text-2xl font-bold text-green-700 mb-2">Bot Conectado!</h3>
                        <p className="text-gray-600 mb-8 max-w-sm">
                            O assistente de IA está online e pronto para receber mensagens dos usuários do Troca-AI.
                        </p>
                        <Button variant="destructive" onClick={handleLogout}>
                            <PowerOff className="mr-2 h-4 w-4" /> Desconectar Número
                        </Button>
                    </div>
                ) : botState.status === 'QR_READY' && botState.qr ? (
                    <div className="flex flex-col items-center text-center">
                        <div className="bg-blue-50 border border-blue-200 text-blue-800 p-4 rounded-md mb-6 max-w-md text-sm">
                            Abra o WhatsApp no seu celular conectado à conta do Bot, vá em <strong>Aparelhos Conectados &gt; Conectar um Aparelho</strong> e aponte a câmera para o QR Code abaixo.
                        </div>
                        <div className="bg-white p-4 rounded-xl border-4 border-gray-100 shadow-sm mb-6">
                            <img src={botState.qr} alt="WhatsApp QR Code" className="w-64 h-64" />
                        </div>
                        <p className="text-gray-500 flex items-center text-sm animate-pulse">
                            <RefreshCw className="h-3 w-3 mr-2 animate-spin" /> Aguardando leitura...
                        </p>
                    </div>
                ) : (
                    <div className="flex flex-col items-center text-center">
                        <Smartphone className="h-16 w-16 text-gray-300 mb-4" />
                        <h3 className="text-xl font-bold text-gray-700 mb-2">Iniciando Serviço</h3>
                        <p className="text-gray-500 mb-6">
                            O serviço do WhatsApp está iniciando. O QR Code será gerado em alguns segundos...
                        </p>
                        <RefreshCw className="h-6 w-6 text-gray-400 animate-spin" />
                    </div>
                )}
            </div>
        </div>
    )
}
