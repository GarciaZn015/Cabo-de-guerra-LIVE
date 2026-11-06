# Cabo de Guerra Live — Palmeiras x Estudiantes

Jogo de cabo de guerra pro celular, controlado pela sua live do TikTok.

## Como o público joga
- Comentar **1** (ou "palmeiras", "verdão") puxa pro Palmeiras. Comentar **2** (ou "estudiantes", "pincha") puxa pro Estudiantes.
- Depois de escolher o time pelo comentário, os **presentes** e as **curtidas** da pessoa puxam pro time dela.
- Presente de quem ainda não escolheu time: 🌹 Rosa vai pro Palmeiras e 🎵 TikTok vai pro Estudiantes.
- Quem chega na linha do seu lado ganha o round. O placar fica salvo no celular.

## Colocar no ar (grátis, pelo Render)
1. Suba esta pasta num repositório no GitHub.
2. No render.com, crie um **Web Service** ligado ao repositório.
   - Build command: `npm install`
   - Start command: `npm start`
3. Abra o link gerado (ex.: `https://cabo-de-guerra.onrender.com`) no navegador do celular.
   - No plano grátis o servidor "dorme" quando fica parado. A primeira abertura pode levar cerca de 1 minuto.

## Na hora da live
1. No TikTok: **+ → Live → Mobile Gaming** e inicie a live.
2. Abra o jogo no navegador, toque em ⚙, digite seu @ **sem o @** e toque em **Conectar**.
3. Feche o painel e deixe o jogo em tela cheia.

## Testar sem live
Toque em ⚙ e use os botões de teste ou **▶ Simular público**.

## Ajustar o jogo
No começo do `<script>` em `public/index.html` fica o bloco `CFG`, onde você muda:
- a força dos comentários, curtidas e presentes;
- qual presente vai pra qual time;
- as palavras que contam como voto.

## Rodar no PC
```
npm install
npm start
```
Depois abra http://localhost:3000

## Opcional
Se a conexão começar a falhar por limite, crie uma chave grátis em eulerstream.com e configure a variável de ambiente `EULER_API_KEY` no Render.
