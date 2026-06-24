# Troubleshooting: Redirect para Localhost após Google OAuth

## Problema
Depois de fazer login com Google, o navegador redireciona para `http://localhost:3000` ou `http://localhost:5173` em vez de `https://trip-close.duckdns.org`

---

## Solução Passo a Passo

### Passo 1: Atualizar Configuração do Supabase (Obrigatório!)
1. Acesse o [Supabase Dashboard](https://supabase.com/dashboard)
2. Selecione seu projeto
3. Vá para **Authentication** → **URL Configuration**
4. **Atualize esses campos**:

| Campo | Valor |
|-------|-------|
| **Site URL** | `https://trip-close.duckdns.org` |
| **Additional Redirect URLs** | Adicione todas essas linhas (uma por linha): |
| | `https://trip-close.duckdns.org` |
| | `https://trip-close.duckdns.org/*` |
| | `http://localhost:5173` |
| | `http://localhost:5174` |

5. **Salve as alterações**

---

### Passo 2: Atualizar Credenciais do Google Cloud
1. Acesse o [Google Cloud Console](https://console.cloud.google.com/)
2. Vá para **APIs & Services** → **Credentials**
3. Edite sua OAuth Client ID
4. **Atualize esses campos**:
   - **Authorized JavaScript origins**: Adicione `https://trip-close.duckdns.org`
   - **Authorized redirect URIs**: Adicione/verifique:
     - `https://SEU-PROJETO.supabase.co/auth/v1/callback`
     - `https://trip-close.duckdns.org`

5. **Salve as alterações**

---

### Passo 3: (Opcional, mas Recomendado) Adicionar Variável de Ambiente no Projeto
Crie/edite o arquivo `.env` no diretório do projeto local e adicione:
```env
VITE_AUTH_REDIRECT_URL=https://trip-close.duckdns.org
```

Depois, **reconstrua e reenvie a imagem Docker para a VM**:
```bash
# No diretório do projeto local
npm run build

# Envie os arquivos para a VM (ou use git pull na VM)
# Depois na VM:
cd ~/trip-app
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml up -d --build
```

---

### Passo 4: Testar Novamente!
1. Limpe os cookies e cache do navegador ou use o modo anônimo
2. Acesse `https://trip-close.duckdns.org`
3. Clique em "Entrar com Google"
4. Deve redirecionar corretamente!
