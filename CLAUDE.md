# RetailERP — Claude Code Configuration

## Project Overview
RetailERP is a retail enterprise resource planning platform covering inventory management, point of sale (POS), order management, customer management, supplier management, and reporting/analytics.

## Custom Skills (Slash Commands)

| Command | Description |
|---------|-------------|
| `/architect` | Architecture design — system design, microservices, ADRs, C4 diagrams |
| `/frontend` | Frontend development — React components, UI/UX, design system |
| `/backend` | Backend development — APIs, database schemas, security |
| `/devops` | DevOps & infrastructure — Docker, CI/CD, Kubernetes |
| `/qa` | Quality assurance — unit tests, integration tests, test strategy |
| `/documents` | Auto-generate full project documentation in `docs/` folder |

## Custom Agents (via Agent tool)

Agents in `.claude/agents/` can be invoked via the Agent tool for parallel or background work:
- **architect** — System architecture and design decisions
- **frontend** — UI components and frontend patterns
- **backend** — API, database, and security implementation
- **devops** — Infrastructure and deployment
- **qa** — Testing and quality assurance

## Automation

- **Auto-documentation hook**: A `Stop` hook runs after every task completion. If source code files exist in the project, it reminds to run `/documents` to keep documentation up to date.

## Conventions

- Use TypeScript for frontend and backend where possible
- Follow RESTful API conventions
- Use Mermaid diagrams in documentation
- Keep security as a first-class concern (OWASP Top 10, PCI-DSS for payments)
- Test behavior, not implementation details
- Favor simplicity over cleverness
