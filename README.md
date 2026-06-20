# ⚽ Album Creator — Criador e Colecionador de Figurinhas

Jogo web completo e interativo para **criar**, **configurar** e **colecionar** seu próprio álbum de figurinhas, com estética premium (glassmorphism, gradientes dinâmicos, cartas holográficas e animações fluidas).

Feito com **HTML5 + Tailwind CSS (Play CDN) + JavaScript puro** — sem build, sem dependências para instalar.

## ▶️ Como rodar

Basta abrir o `index.html` no navegador. Para evitar restrições de CORS em alguns navegadores, sirva localmente:

```bash
# qualquer um destes
python3 -m http.server 8080
# ou
npx serve .
```

Depois acesse `http://localhost:8080`. Todo o progresso é salvo automaticamente no **localStorage**.

> Requer acesso à internet para carregar o Tailwind e as fontes via CDN.

## 🎮 Modos

### 🎨 Modo Editor
- **Álbum:** título, capa e contracapa customizáveis (upload de imagem de fundo), páginas dinâmicas com slots ajustáveis e 4 paletas: **Dark, Light, Neon, Vintage**.
- **Figurinhas:** criação dupla — *ficha técnica* (nome, nascimento, peso, altura, time) e *upload de foto* (jogador real ou amigos). Pré-visualização ao vivo.
- **Raridades:** `Comum`, `Escudo` (formato de brasão), `FWC` (edição especial), `Brilhante` (holográfico que reage ao mouse) e `Legend` (borda dourada texturizada + fonte exclusiva).
- **Pacote:** editor visual da embalagem (cores + logo) e slider de figurinhas por pacote.

### 🎮 Modo Jogador
- **Banca:** compre pacotes com moedas; sorteio ponderado por raridade.
- **Abertura animada:** pacote rasgando + cartas com efeito *flip* revelando uma a uma (com brilho/sparkles para raras).
- **Álbum interativo:** cole as figurinhas conquistadas nos slots corretos com efeito satisfatório.
- **Repetidas:** monte de duplicadas, com opção de reciclar por moedas.

## 🗂 Estrutura

```
index.html          # shell, nav, CDN
css/styles.css      # glassmorphism, raridades, animações, temas
js/state.js         # estado central + persistência (localStorage)
js/ui.js            # utilitários (toast, modal, dropzone, holo, sparkles)
js/stickers.js      # render das figurinhas
js/editor.js        # Modo Editor
js/player.js        # Modo Jogador
js/main.js          # controlador + menu principal
```
