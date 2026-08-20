# Costa Corp · Cash Flow — Como publicar na web (sem terminal)

Você vai colocar o app no ar com um link público usando a **Vercel**. É de graça e não precisa de linha de comando.

---

## Opção A — A mais simples (arrastar a pasta)

1. Descompacte o arquivo `costa-cashflow.zip` no seu computador. Vai virar uma pasta chamada `costa-cashflow`.
2. Acesse **https://vercel.com** e crie uma conta (pode entrar com o Google).
3. No painel, clique em **Add New… → Project**.
4. Procure a opção **Deploy** / **Browse** e **arraste a pasta `costa-cashflow`** para a área indicada (ou selecione-a).
5. A Vercel detecta que é um projeto **Vite** sozinha. Se pedir configuração, use:
   - **Framework Preset:** Vite
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
6. Clique em **Deploy** e aguarde ~1 minuto.
7. Pronto: aparece um link do tipo `https://costa-cashflow.vercel.app`. Esse é o seu app — abre no PC e no celular.

> Dica: no celular, abra o link no Safari/Chrome e use "Adicionar à tela de início" para virar um ícone de app.

---

## Opção B — Com atualização automática (recomendada a longo prazo)

Assim, toda vez que você mudar algo, o site atualiza sozinho.

1. Crie uma conta no **https://github.com**.
2. Crie um repositório novo (botão **New**), dê o nome `costa-cashflow`.
3. Na página do repositório vazio, clique em **uploading an existing file** e **arraste todos os arquivos da pasta** (menos a pasta `node_modules`, se existir).
4. Confirme com **Commit changes**.
5. Vá em **https://vercel.com → Add New → Project → Import** e escolha esse repositório do GitHub.
6. Deixe as configurações padrão (Vite) e clique em **Deploy**.
7. Seu link fica pronto e, a partir daí, qualquer alteração enviada ao GitHub republica sozinha.

---

## Sobre seus dados

- Os lançamentos ficam salvos **no próprio navegador** (localStorage), no aparelho onde você usa.
- Isso significa: o que você cadastrar no PC não aparece automaticamente no celular — cada aparelho guarda o seu.
- Se limpar os dados do navegador, os lançamentos sào apagados.
- Quando quiser um banco de dados de verdade compartilhado entre aparelhos (Supabase, por exemplo), me avise que eu evoluo o projeto.

---

## Rodar no seu PC (opcional, caso queira testar antes)

Se um dia quiser rodar localmente, precisa do Node.js instalado. Então, na pasta do projeto:

```
npm install
npm run dev
```

E abra o endereço que aparecer (algo como `http://localhost:5173`).
