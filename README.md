# Fechamento de Viagem

Sistema de gerenciamento de fechamento de viagens para controle de despesas, aprovações e relatórios.

## Sobre o Projeto

Este projeto é uma aplicação React para gerenciar viagens corporativas, incluindo:
- Criação e edição de viagens
- Controle de despesas diárias
- Aprovação de viagens
- Relatórios e dashboards
- Upload de comprovantes

## Tecnologias Utilizadas

- **React 18** - Biblioteca para construção de interfaces
- **Vite** - Build tool e servidor de desenvolvimento
- **React Router** - Navegação entre páginas
- **TanStack Query** - Gerenciamento de estado do servidor
- **Tailwind CSS** - Framework de estilos
- **Radix UI** - Componentes acessíveis
- **React Hook Form** - Gerenciamento de formulários
- **Zod** - Validação de dados
- **Recharts** - Gráficos

## Estrutura do Projeto

```
.
├── entities/              # Definições de entidades (Viagem, Despesa, Aprovacao, etc.)
├── src/
│   ├── api/               # Cliente de API
│   ├── components/        # Componentes React
│   │   └── ui/            # Componentes de UI (Radix + Tailwind)
│   ├── hooks/             # Hooks personalizados
│   ├── lib/               # Utilitários e contextos
│   ├── pages/             # Páginas da aplicação
│   └── utils/             # Funções utilitárias
├── package.json
├── vite.config.js
└── tailwind.config.js
```

## Instalação e Execução

### Pré-requisitos

- Node.js (versão 18 ou superior)
- npm ou yarn

### Passos

1. Instale as dependências:
```bash
npm install
```

2. Execute o servidor de desenvolvimento:
```bash
npm run dev
```

3. Acesse a aplicação em http://localhost:5173

## Scripts Disponíveis

- `npm run dev` - Inicia o servidor de desenvolvimento
- `npm run build` - Cria a build de produção
- `npm run preview` - Visualiza a build de produção localmente
- `npm run lint` - Executa o linter
- `npm run lint:fix` - Corrige problemas de linting automaticamente
- `npm run typecheck` - Verifica tipos TypeScript

## Funcionalidades Principais

### Dashboard
- Visão geral das viagens
- Gráficos de despesas
- Estatísticas rápidas

### Gerenciamento de Viagens
- Criar nova viagem
- Editar viagens existentes
- Visualizar detalhes da viagem
- Listar minhas viagens

### Aprovações
- Aprovar/rejeitar viagens
- Visualizar histórico de aprovações

### Configurações
- Configurações financeiras
- Gerenciamento de usuários
- Parâmetros do sistema

## Contribuição

1. Faça um fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/nova-feature`)
3. Commit suas alterações (`git commit -m 'Adiciona nova feature'`)
4. Push para a branch (`git push origin feature/nova-feature`)
5. Abra um Pull Request

## Licença

Este projeto está sob a licença MIT.
