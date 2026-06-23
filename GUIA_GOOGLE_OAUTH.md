# Guia de Configuração - Autenticação com Google OAuth

## Visão Geral
O frontend já tem o botão de login com Google implementado! Agora precisamos configurar as credenciais no **Google Cloud Console** e habilitar o provedor no **Supabase Console**.

---

## Passo 1: Configurar OAuth no Google Cloud Console

1. Acesse o [Google Cloud Console](https://console.cloud.google.com/)
2. Crie um novo projeto (ou selecione um existente)
3. Vá para **APIs & Services > Credentials**
4. Clique em **Create Credentials > OAuth client ID**
5. Configure a tela de consentimento OAuth:
   - Selecione **External** (para usuários fora da organização) ou **Internal**
   - Preencha os dados básicos do app (nome, email de suporte, etc.)
   - Adicione os escopos: `.../auth/userinfo.email`, `.../auth/userinfo.profile`
   - Adicione usuários de teste (se for External)
6. Volte para a criação de OAuth client ID:
   - Tipo de aplicativo: **Web application**
   - Nome: Trip Close Auth
   - **Authorized JavaScript origins**:
     - Adicione: `http://localhost:5173` (desenvolvimento)
     - Adicione: `http://localhost:5174` (desenvolvimento)
     - Adicione: `http://SEU-IP-ORACLE` (produção - o IP da sua VM Oracle)
   - **Authorized redirect URIs**:
     - Você vai pegar essa URL no próximo passo no Supabase!
7. Salve e copie o **Client ID** e **Client Secret** gerados!

---

## Passo 2: Habilitar Provedor Google no Supabase

1. Acesse o [Supabase Dashboard](https://supabase.com/dashboard)
2. Selecione seu projeto
3. Vá para **Authentication > Providers**
4. Selecione **Google**
5. Ative o provedor (toggle "Enabled")
6. Cole o **Client ID** e **Client Secret** do Google Cloud
7. **Copie a URL de Redirect** que o Supabase mostra!
   - Ela se parece com: `https://SEU-PROJETO.supabase.co/auth/v1/callback`
8. Volte para o Google Cloud Console e adicione essa URL em **Authorized redirect URIs**
9. Salve as configurações no Supabase!

---

## Passo 3: Testar o Login!

1. Inicie o servidor dev: `npm run dev`
2. Acesse a página de login (`/login`)
3. Clique em **Entrar com Google**
4. Você deve ser redirecionado para o Google, fazer login e voltar para a aplicação autenticado!

---

## (Opcional) Configurar Redirect para Produção

Quando for fazer deploy na Oracle:
1. Adicione o IP público da sua VM no Google Cloud Console (Authorized origins e redirect)
2. No Supabase, você já configurou tudo corretamente

---

## Dados do Usuário do Google
O `AuthContext` já vai receber automaticamente:
- `user.email`: E-mail do Google
- `user.user_metadata.name`: Nome completo
- `user.user_metadata.picture`: URL da foto de perfil

E a função `ensureProfileForUser` cria/atualiza o perfil automaticamente!
