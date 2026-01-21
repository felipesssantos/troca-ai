import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion"

export default function FAQ() {
    return (
        <div className="container mx-auto py-10 px-4 max-w-3xl">
            <h1 className="text-3xl font-bold mb-8 text-center text-gray-800">Perguntas Frequentes</h1>

            <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="item-1">
                    <AccordionTrigger>Como funcionam as trocas?</AccordionTrigger>
                    <AccordionContent>
                        O sistema "Match" do Troca.ai identifica automaticamente quais figurinhas você tem repetidas e quais outros usuários precisam.
                        Você pode ver as sugestões de troca na aba "Área de Troca" e enviar propostas. Se o outro usuário aceitar, vocês combinam a entrega (pessoalmente ou correio).
                    </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-2">
                    <AccordionTrigger>O que é o plano Premium?</AccordionTrigger>
                    <AccordionContent>
                        O plano Premium remove os limites de álbuns e trocas simultâneas.
                        Além disso, usuários Premium têm acesso a estatísticas avançadas e prioridade nas sugestões de troca.
                    </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-3">
                    <AccordionTrigger>Posso ter mais de um álbum?</AccordionTrigger>
                    <AccordionContent>
                        Sim! Usuários gratuitos podem ter até 3 álbuns no painel.
                        Usuários Premium podem ter álbuns ilimitados de diferentes coleções.
                    </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-4">
                    <AccordionTrigger>Como cadastro minhas repetidas?</AccordionTrigger>
                    <AccordionContent>
                        Entre no álbum desejado, clique nas figurinhas para marcá-las.
                        1 clique = Você tem (Azul).
                        2 cliques = Você tem repetida (Laranja).
                        O sistema usa essas informações para encontrar parceiros de troca.
                    </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-5">
                    <AccordionTrigger>É seguro?</AccordionTrigger>
                    <AccordionContent>
                        Nós não intermediamos o envio físico das figurinhas, apenas conectamos os colecionadores.
                        Recomendamos sempre verificar o perfil do outro usuário e combinar trocas em locais públicos ou usar serviços de entrega rastreáveis.
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
        </div>
    )
}
