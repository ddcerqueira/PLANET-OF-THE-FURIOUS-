# PLANET OF THE FURIOUS

Jogo web **mobile-first** de *merge* com carros: junte carros iguais, coloque-os para correr num circuito de rua noturno e fature moedas.
HTML + CSS + JavaScript puro, sem build e sem dependências. Funciona offline e é instalável como PWA.

> Jogo de fã não oficial. Todos os carros são desenhados por código (SVG procedural); não há logos, fontes, personagens nem arte oficial.

## Como jogar
- **Comprar**: cria um carro numa vaga livre da garagem (o preço sobe a cada compra).
- **Merge**: arraste um carro sobre outro de **mesmo nível** → próximo nível. Níveis diferentes trocam de lugar.
- **Pista**: arraste da garagem para a pista (ou para uma vaga do pit). Cada volta rende moedas. Arraste de volta (do pit ou direto da pista) para recolher.
- **Vender**: arraste para a lixeira.
- **Nitro**: renda x2 por 30s (recarga de 90s). **Baú diário**: moedas + carro bônus a cada 24h.
- **Upgrades**: garagem maior, mais vagas na pista, patrocínio (+renda), desconto VIP.
- **Coleção**: 30 carros = 10 capítulos × (Stock → Tuned → Furious).
- Ganho offline de até 2h ao voltar.

## Estrutura
| Arquivo | Conteúdo |
|---|---|
| `index.html` | Telas (splash, jogo, popups) |
| `style.css` | Visual (muro de tijolos, graffiti neon, botões arcade) |
| `game.js` | Motor: **CONFIG de balanceamento** no topo, estado/salvamento, economia, drag & drop, pista em Canvas, popups, áudio Web Audio |
| `cars.js` | Os 10 modelos, cores por estágio e gerador SVG dos carros |
| `manifest.json`, `sw.js`, `icons/` | PWA (instalação + cache offline) |

Para rebalancear, edite o objeto `CONFIG` no início de `game.js`.

## Rodar localmente
Precisa de um servidor estático (o service worker não funciona via `file://`):
```bash
python3 -m http.server 8080
# ou: npx serve .
```
Abra http://localhost:8080. No celular, use o IP do computador na mesma rede (ex.: http://192.168.0.10:8080).

## Publicar
**Vercel**: `npm i -g vercel` e rode `vercel` na pasta (sem framework, sem build, diretório de saída `.`) — ou importe o repositório em vercel.com. Também funciona em GitHub Pages, Netlify ou Cloudflare Pages.

Ao publicar uma nova versão, aumente `VERSION` em `sw.js` para os jogadores receberem os arquivos novos.
