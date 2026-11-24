# PLANET OF THE FURIOUS

Jogo **mobile-first** de *merge* com carros: junte carros iguais, coloque-os para correr num circuito de rua noturno e fature moedas.
HTML + CSS + JavaScript puro, sem build e sem dependências. Funciona offline e é instalável como app (PWA).

> Jogo de fã não oficial. Carros desenhados por código (SVG procedural) e música original gerada em tempo real; não há logos, fontes, personagens nem arte oficial.

## Como jogar
- **Comprar**: botão grande na parte de baixo. Se não der, ele mostra o motivo (quanto falta ou garagem cheia).
- **Arrastar** um carro sobre outro de **mesmo nível** funde os dois no próximo nível. Níveis diferentes trocam de lugar.
- **Tocar para selecionar** (uma mão): toque no carro e depois no destino (outro carro, vaga, pista ou lixeira).
- **Pista**: arraste para a pista ou para uma vaga do pit; cada volta rende moedas. Arraste de volta para recolher.
- **Vender**: lixeira (pede confirmação ao vender seu melhor carro).
- **Nitro** (renda x2 por 30 s, recarga 90 s), **Baú diário** (moedas + carro; se a garagem estiver cheia, o carro fica na reserva).
- **Upgrades**, **Missões e conquistas**, **Coleção** com ficha de cada carro e **Prestígio** após o nível 30.
- Ganho offline de até 2 h. Tutorial interativo no primeiro acesso (pode pular e recomeçar em Configurações).

## Estrutura
| Arquivo | Conteúdo |
|---|---|
| `index.html` | Telas, ícones (SVG sprite) e camadas (painéis, popups, tutorial) |
| `style.css` | Layout retrato e paisagem, safe areas, zona do polegar, estados visuais |
| `cars.js` | Os 10 modelos × 3 estágios e o gerador SVG dos carros (+ cache em bitmap para a pista) |
| `audio.js` | Efeitos e música sintetizados (Web Audio), volumes separados |
| `game.js` | **CONFIG de balanceamento**, save versionado, economia, garagem, arrastar/tocar, pista em Canvas, qualidade adaptativa, ciclo de vida |
| `meta.js` | Painéis, popups, upgrades, prestígio, missões, conquistas, coleção, configurações, backup, tutorial, atualização do app |
| `manifest.json`, `sw.js`, `icons/` | PWA (instalação e cache offline por versão) |

Para rebalancear, edite o objeto `CONFIG` no início de `game.js`.

## Rodar localmente
```bash
python3 -m http.server 8080
```
Abra http://localhost:8080. No celular, use o IP do computador na mesma rede (ex.: http://192.168.0.10:8080).

## Publicar
Funciona em GitHub Pages, Vercel, Netlify ou Cloudflare Pages (sem build).
**A cada publicação, aumente `VERSION` em `sw.js`** — quem já tem o jogo vê "Nova versão instalada · Atualizar".
