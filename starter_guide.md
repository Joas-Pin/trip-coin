# Guia de Início Rápido - Fechamento de Viagem

Bem-vindo ao sistema de Fechamento de Viagem! Este guia irá ajudá-lo a começar rapidamente.

## Primeiros Passos

### 1. Configurando o Ambiente

Antes de começar, certifique-se de ter o Node.js instalado em sua máquina (versão 18 ou superior).

Verifique a instalação:
```bash
node --version
npm --version
```

### 2. Instalando Dependências

Navegue até a pasta do projeto e instale as dependências:

```bash
cd "c:\Dev\Fechamento de Viagem"
npm install
```

### 3. Executando o Projeto

Inicie o servidor de desenvolvimento:

```bash
npm run dev
```

O servidor iniciará em http://localhost:5173

## Navegando pela Aplicação

### Páginas Principais

1. **Dashboard** (`/`) - Página inicial com visão geral das viagens e estatísticas
2. **Minhas Viagens** (`/minhas-viagens`) - Lista de todas as suas viagens
3. **Criar Viagem** (`/criar-viagem`) - Formulário para criar uma nova viagem
4. **Aprovações** (`/aprovacoes`) - Lista de viagens pendentes de aprovação
5. **Configurações** (`/configuracoes`) - Configurações do sistema e financeiras
6. **Painel Admin** (`/admin`) - Gerenciamento de usuários e parâmetros (apenas administradores)

### Autenticação

- Acesse `/login` para fazer login
- Acesse `/register` para criar uma nova conta
- Acesse `/forgot-password` para recuperar a senha

## Estrutura de Arquivos Importantes

### Entidades (`entities/`)

Contém as definições das entidades do sistema:
- `Aprovacao` - Aprovações de viagens
- `CalculoAlimentacao` - Cálculos de alimentação
- `Cliente` - Clientes
- `Comprovante` - Comprovantes de despesas
- `ConfiguracaoFinanceira` - Configurações financeiras
- `Departamento` - Departamentos
- `DespesaDiaria` - Despesas diárias
- `Fechamento` - Fechamentos de viagens
- `Notificacao` - Notificações
- `TaxaAntecipada` - Taxas antecipadas
- `Trajeto` - Trajetos de viagem
- `Viagem` - Viagens

### Páginas (`src/pages/`)

- `Dashboard.jsx` - Página inicial
- `MinhasViagens.jsx` - Lista de viagens
- `CriarViagem.jsx` - Formulário de criação
- `ViagemDetail.jsx` - Detalhes da viagem
- `Aprovacoes.jsx` - Aprovações
- `Configuracoes.jsx` - Configurações
- `AdminPanel.jsx` - Painel administrativo
- `Login.jsx`, `Register.jsx`, `ForgotPassword.jsx`, `ResetPassword.jsx` - Autenticação

### Componentes (`src/components/`)

- `ui/` - Componentes de interface (botões, inputs, cards, etc.)
- `Layout.jsx` - Layout principal
- `HeaderBar.jsx` - Barra superior
- `Sidebar.jsx` - Menu lateral
- `AuthLayout.jsx` - Layout para páginas de autenticação

## Adicionando uma Nova Funcionalidade

### Exemplo: Criando uma Nova Página

1. Crie um arquivo em `src/pages/NovaPagina.jsx`
2. Adicione a rota em `src/App.jsx`
3. Importe e use o componente Layout para manter a consistência visual

### Exemplo: Usando Componentes de UI

Os componentes de UI estão em `src/components/ui/` e seguem o padrão Radix UI + Tailwind CSS.

Exemplo de uso de um botão:
```jsx
import { Button } from '@/components/ui/button'

function MeuComponente() {
  return <Button>Clique Aqui</Button>
}
```

## Conectando a uma API

O arquivo `src/api/base44Client.js` já contém um cliente mockado. Para conectar a sua própria API:

1. Modifique `src/api/base44Client.js` para fazer chamadas reais à sua API
2. Atualize os hooks e componentes que usam este cliente

## Build para Produção

Para criar uma versão otimizada para produção:

```bash
npm run build
```

Os arquivos gerados estarão na pasta `dist/`.

Para testar a build localmente:

```bash
npm run preview
```

## Dicas Úteis

- Use `npm run lint` para verificar problemas de código
- Use `npm run lint:fix` para corrigir problemas automaticamente
- O Tailwind CSS está configurado, use classes utilitárias para estilizar
- Os componentes Radix UI são acessíveis e customizáveis

## Suporte

Se precisar de ajuda, consulte:
- O arquivo `README.md` para informações gerais
- A documentação das tecnologias utilizadas (React, Vite, Tailwind, etc.)
