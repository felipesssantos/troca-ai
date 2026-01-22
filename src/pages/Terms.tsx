import { Helmet } from 'react-helmet-async'

export default function Terms() {
    return (
        <div className="container mx-auto py-10 px-4 max-w-4xl text-gray-700">
            <Helmet>
                <title>Termos de Uso - Troca Aí</title>
                <meta name="description" content="Termos de Uso e Política de Privacidade do Troca Aí. Leia nossos termos para entender seus direitos e deveres na plataforma." />
            </Helmet>
            <h1 className="text-3xl font-bold mb-6 text-gray-900">Termos de Uso e Política de Privacidade</h1>

            <div className="space-y-6">
                <section>
                    <h2 className="text-xl font-semibold mb-2 text-gray-800">1. Aceitação dos Termos</h2>
                    <p>
                        Ao acessar e usar o Troca.ai, você aceita e concorda em estar vinculado aos termos e disposições deste acordo.
                        Se você não concordar em respeitar estes termos, por favor, não use este serviço.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold mb-2 text-gray-800">2. Descrição do Serviço</h2>
                    <p>
                        O Troca.ai é uma plataforma desenhada para conectar colecionadores de figurinhas, facilitando a troca de itens repetidos.
                        Nós não vendemos figurinhas diretamente, nem garantimos a entrega física dos itens trocados entre usuários.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold mb-2 text-gray-800">3. Responsabilidades do Usuário</h2>
                    <p>
                        Você é responsável por manter a confidencialidade de sua conta e senha.
                        Você concorda em não usar o serviço para fins ilegais ou não autorizados.
                        Qualquer tentativa de fraude ou comportamento abusivo resultará no banimento da plataforma.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold mb-2 text-gray-800">4. Privacidade</h2>
                    <p>
                        Respeitamos sua privacidade. Coletamos apenas as informações necessárias para o funcionamento da plataforma (como email, nome e dados das coleções).
                        Não compartilhamos seus dados pessoais com terceiros sem seu consentimento explícito, exceto conforme exigido por lei.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold mb-2 text-gray-800">5. Alterações nos Termos</h2>
                    <p>
                        O Troca.ai reserva-se o direito de alterar estes termos a qualquer momento.
                        Recomendamos que você revise esta página periodicamente para quaisquer alterações.
                    </p>
                </section>

                <div className="pt-8 border-t mt-8 text-sm text-gray-500">
                    Última atualização: Janeiro de 2025
                </div>
            </div>
        </div>
    )
}
