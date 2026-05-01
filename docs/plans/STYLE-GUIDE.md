# 🎨 Grovva — Guia de Estilo do Produto

> Extraído do Brandbook Grovva v1.0 (abril 2026).  
> **Documento vivo** — atualizar quando o brandbook evoluir.

---

## Marca

- **Nome:** Grovva (nunca abreviar — "Grv" e "Gva" são proibidos)
- **Tagline:** "O manual de construção, uso e operação da marca que transforma tráfego em faturamento."
- **Posicionamento:** Máquina de vendas terceirizada. Tráfego + gestão de leads, ponta a ponta.

---

## Paleta de Cores

### Primária

| Nome | Hex | RGB | Uso |
|------|-----|-----|-----|
| Grovva Black | `#0A0A0A` | rgb(10,10,10) | Texto principal, fundo editorial |
| Grovva Green | `#56C271` | rgb(86,194,113) | Destaque, ação, CTA, ponto-chave |
| Grovva White | `#FFFFFF` | rgb(255,255,255) | Fundo padrão |
| Grovva Cream | `#F0EEE9` | rgb(240,238,233) | Apoio, calor humano |

**REGRA DE OURO:** O verde nunca é estrutura. É destaque, ação, ponto-chave. Se tudo é verde, nada é verde.

### UI Palette

| Nome | Hex | Uso |
|------|-----|-----|
| Black 1000 | `#0A0A0A` | Texto principal |
| Black 900 | `#171717` | Texto secundário |
| Gray 700 | `#3A3A3A` | Labels, mutado |
| Gray 500 | `#7A7A7A` | Placeholder, disabled |
| Gray 300 | `#C9C9C9` | Divisor |
| Gray 100 | `#EEECE7` | Divisor sutil |
| Cream | `#F0EEE9` | Fundo padrão |
| White | `#FFFFFF` | Fundo claro |
| Green | `#56C271` | Ação, brand |
| Green Deep | `#2F8A47` | Verde sobre branco (texto corrido) |

### Contraste & Acessibilidade

Toda combinação deve passar **WCAG AA** (4.5:1 texto, 3:1 elementos grandes).

| Combinação | Ratio | Status |
|------------|-------|--------|
| Preto / Branco | 19.8:1 | ✅ AAA |
| Verde / Preto | 8.2:1 | ✅ AAA |
| Green Deep / Branco | 4.7:1 | ✅ AA |
| Verde / Branco | 2.4:1 | ❌ FALHA — só pra grandes/decorativo |

**Verde sobre branco** = só permitido em elementos decorativos ou tipografia 24px+ bold.  
**Texto corrido** = sempre usar Green Deep `#2F8A47`.

---

## Tipografia

### Display — Cornaltail Type (OFL, gratuita)

Uso: Display, headings, corpo, UI

| Nível | Tamanho | Peso | Tracking | Line-height | Uso |
|-------|---------|------|----------|-------------|-----|
| Display | 120px | 900 | −4% | 0.9 | Hero, splash |
| H1 | 64px | 900 | −2.5% | 0.96 | Títulos de seção |
| H2 | 40px | 800 | −1.2% | 1.1 | Subtítulos |
| Lead | 22px | 400 | 0% | 1.4 | Parágrafo de introdução |
| Corpo | 16px | 400 | 0% | 1.6 | Parágrafo padrão (max-width: 680px) |
| Label | 11px mono | 500 | +2px | 1.3 | Chapéu, capítulo, timestamp, eyebrow |

**Regra:** Não cria peso novo. Se precisar, reconsidere a hierarquia.

### Mono — Fira Code

Pesos: 400 / 500 / 600  
Uso: Labels, dados, eyebrows, timestamps, código, números

---

## Grid & Layout

| Propriedade | Valor |
|------------|-------|
| Base unit | 8px |
| Colunas | 12 |
| Regra | Todo espaçamento é múltiplo de 8. Nunca 7, nunca 10. Só 8 (ou 4 em UI extrema) |

---

## Icones

- **Família:** Lucide Icons
- **Cor:** Cor sólida do contexto (nunca gradiente)
- **Estilo:** Arredondados
- **Eixos (gráficos):** Cinza 18% opacidade (sobre escuro) ou 12% (sobre claro)

---

## Motion

| Propriedade | Valor |
|------------|-------|
| Fade + translate | 200ms + translateY 8px |
| Easing padrão | `cubic-bezier(0.2, 0.8, 0.2, 1)` |
| Stagger | 80ms (sobe da base) |
| **NUNCA** | rotate 360°, pulse infinito, bounce |

Animação é utilitária — guia o olho, não impressiona.

---

## Tom de Voz

**Direto. Próximo. Levemente afiado.**

| Atributo | Descrição |
|----------|-----------|
| **Direto** | Sem rodeio. A primeira frase entrega o ponto. |
| **Técnico** | Dados no texto, não em anexo. Se afirmar, prova. |
| **Próximo** | Fala "você", usa contração ("tá", "pra"), admite erro. |
| **Afiado** | Questiona o óbvio. Rejeita clichê. Não tem medo de discordar. |
| **Honesto** | Nunca promete o que não pode entregar. Número sempre real. |
| **Curto** | Se cabe em 5 palavras, nunca em 15. Adjetivo é despesa. |

### Do's & Don'ts

| ✅ Fala assim | ❌ Não fala assim |
|-------------|-----------------|
| A Grovva entrega leads qualificados. | Na Grovva, temos a satisfação de entregar leads devidamente qualificados. |
| Engajamento sem faturamento é barulho. | É importante ressaltar que métricas de engajamento, embora relevantes, não necessariamente se traduzem em resultado financeiro. |
| Você vai ver receita em 90 dias. | Nosso compromisso é proporcionar uma jornada de crescimento sustentável. |
| Dashboard bonito não paga folha. | As ferramentas de análise, apesar de esteticamente agradáveis, não devem ser o único critério. |
| Se não vira caixa, a gente não entrega. | Estamos comprometidos em buscar resultados mensuráveis para nossos parceiros. |

### Padrões de Copy (4 moldes)

1. **Afirmação + Consequência:** "Engajamento sobe. Caixa não mexe."
2. **Pergunta retórica curta:** "Se não vira receita, pra que serve?"
3. **Lista de 3 (sempre ímpar):** "Tráfego. Qualificação. Receita."
4. **Negação direta:** "Não vendemos relatório. Vendemos lead."

---

## Aplicações

### Instagram Carrossel
- Formato: 1080×1350
- Estrutura: gancho → dado → contexto → lição → framework → ponte → prova → resultado → CTA

### E-mail
- Nunca frase motivacional
- Sempre HTML (nunca PNG)
- Sem redes sociais (exceto LinkedIn para decisores)
- Máximo 6 linhas

### Proposta Comercial
- PDF A4
- Capa com logo + "Proposta Nº"
- Corpo em duas colunas
- Tabela de entregáveis clara
- Assinatura digital no rodapé

---

*Fonte: Grovva — Brandbook v1.0, abril 2026. Documento vivo.*