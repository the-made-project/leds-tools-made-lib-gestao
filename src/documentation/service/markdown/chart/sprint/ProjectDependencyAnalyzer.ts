import { Issue, SprintItem, TimeBox, Person } from '../../../../../model/models.js';

interface IssueStatus {
    inSprint: boolean;
    status: string;
    assignee?: Person;
    implemented: boolean;
}

export class ProjectDependencyAnalyzer {
    private allIssues: Map<string, Issue>;
    private sprintItems: Map<string, SprintItem>;
    private graph: Map<string, Set<string>>;
    private reversedGraph: Map<string, Set<string>>;
    private issueStatus: Map<string, IssueStatus>;

    constructor(sprint: TimeBox) {
        this.validateInputs(sprint);
        
        this.allIssues = new Map();
        this.sprintItems = new Map();
        this.graph = new Map();
        this.reversedGraph = new Map();
        this.issueStatus = new Map();

        this.initializeFromSprint(sprint);
    }

    private validateInputs(sprint: TimeBox): void {
        if (!sprint.sprintItems) {
            throw new Error('Sprint não contém array de items');
        }

        sprint.sprintItems.forEach((item, index) => {
            if (!item.issue || !item.issue.id) {
                throw new Error(`Item do sprint na posição ${index} não tem issue ou ID válido`);
            }
            if (!item.assignee || !item.assignee.name) {
                throw new Error(`Issue ${item.issue.id} não tem responsável definido`);
            }
        });
    }

    private initializeFromSprint(sprint: TimeBox): void {
        // Inicializa com todas as issues do sprint
        sprint.sprintItems.forEach(item => {
            const issue = item.issue;
            
            this.allIssues.set(issue.id, issue);
            this.sprintItems.set(issue.id, item);
            this.graph.set(issue.id, new Set());
            this.reversedGraph.set(issue.id, new Set());
            this.issueStatus.set(issue.id, {
                inSprint: true,
                status: item.status || 'TODO',
                assignee: item.assignee,
                implemented: item.status === 'DONE'
            });
        });

        // Adiciona dependências (tanto internas quanto externas)
        sprint.sprintItems.forEach(item => {
            if (item.issue.depends && Array.isArray(item.issue.depends)) {
                item.issue.depends.forEach(dep => {
                    if (dep && dep.id) {
                        // Se a dependência não existe nos mapas, adiciona
                        if (!this.allIssues.has(dep.id)) {
                            this.allIssues.set(dep.id, dep);
                            this.graph.set(dep.id, new Set());
                            this.reversedGraph.set(dep.id, new Set());
                            this.issueStatus.set(dep.id, {
                                inSprint: false,
                                status: dep.status || 'EXTERNAL',
                                implemented: false
                            });
                        }
                        // Adiciona as relações de dependência
                        this.graph.get(item.issue.id)?.add(dep.id);
                        this.reversedGraph.get(dep.id)?.add(item.issue.id);
                    }
                });
            }
        });
    }

    private findCycles(): string[][] {
        const cycles: string[][] = [];
        const visited = new Set<string>();
        const recursionStack = new Set<string>();

        const dfs = (nodeId: string, path: string[] = []): void => {
            visited.add(nodeId);
            recursionStack.add(nodeId);
            path.push(nodeId);

            const dependencies = this.graph.get(nodeId) || new Set();
            for (const depId of dependencies) {
                if (!visited.has(depId)) {
                    dfs(depId, [...path]);
                } else if (recursionStack.has(depId)) {
                    const cycleStartIndex = path.indexOf(depId);
                    cycles.push(path.slice(cycleStartIndex));
                }
            }

            recursionStack.delete(nodeId);
        };

        this.sprintItems.forEach((_, id: string) => {
            if (!visited.has(id)) {
                dfs(id);
            }
        });

        return cycles;
    }

    

    private generateMermaidDiagram(): string {
        let diagram = 'graph BT\n';
        
        // Definir estilos
        diagram += '    classDef sprint fill:#a8e6cf,stroke:#333,stroke-width:2px;\n';
        diagram += '    classDef done fill:#98fb98,stroke:#333,stroke-width:2px;\n';
        diagram += '    classDef external fill:#ffd3b6,stroke:#333,stroke-width:1px;\n';
        
        // Coletar todas as dependências externas
        const externalDeps = new Set<string>();
        this.sprintItems.forEach((item) => {
            if (item.issue.depends && Array.isArray(item.issue.depends)) {
                item.issue.depends.forEach(dep => {
                    if (dep && dep.id && !this.sprintItems.has(dep.id)) {
                        externalDeps.add(dep.id);
                    }
                });
            }
        });
    
        // Adicionar nós externos
        externalDeps.forEach(id => {
            const externalIssue = this.allIssues.get(id);
            const externalStatus = this.issueStatus.get(id);
            
            const title = externalIssue?.title || `${id}`;
            const status = externalStatus?.status || 'EXTERNAL';
            
            const label = `${id}["🔍 ${title}<br>` +
                         `📊 Status: ${status}<br>` +
                         `⚠️ Dependência Externa"]`;
            diagram += `    ${label}:::external\n`;
        });
    
        // Resto do código para os nós do sprint
        const issues = this.getTopologicalSort();
        
        issues.forEach(id => {
            const item = this.sprintItems.get(id)!;
            const status = this.issueStatus.get(id)!;
            const nodeClass = status.implemented ? 'done' : 'sprint';
            
            const label = `${id}["📝 Tarefa: ${item.issue.title || 'Sem título'}<br>` +
                         `📊 Estado: ${status.status}<br>` +
                         `👤 Responsável: ${status.assignee?.name || 'N/A'}"]`;
                         
            diagram += `    ${label}:::${nodeClass}\n`;
        });
    
        // Adicionar arestas
        this.sprintItems.forEach((item) => {
            if (item.issue.depends && Array.isArray(item.issue.depends)) {
                item.issue.depends.forEach(dep => {
                    if (dep && dep.id) {
                        const style = this.sprintItems.has(dep.id) ? '-->' : '-.->'; // Linha pontilhada para deps externas
                        diagram += `    ${item.issue.id} ${style} ${dep.id}\n`;
                    }
                });
            }
        });
        return diagram;
    }

    private getTopologicalSort(): string[] {
        const result: string[] = [];
        const independentTasks: string[] = [];
        const dependentTasks: string[] = [];
        const processed = new Set<string>();
        const inDegree = new Map<string, number>();

        // Inicializar graus de entrada
        this.sprintItems.forEach((_, id) => {
            inDegree.set(id, 0);
        });

        // Calcular graus de entrada para dependências dentro do sprint
        this.sprintItems.forEach((item) => {
            if (item.issue.depends && Array.isArray(item.issue.depends)) {
                item.issue.depends.forEach(dep => {
                    if (dep && dep.id && this.sprintItems.has(dep.id)) {
                        inDegree.set(dep.id, (inDegree.get(dep.id) || 0) + 1);
                    }
                });
            }
        });

        // Primeiro, separar todas as tarefas sem dependências
        this.sprintItems.forEach((item, id) => {
            if (!item.issue.depends || !Array.isArray(item.issue.depends) || item.issue.depends.length === 0) {
                independentTasks.push(id);
                processed.add(id);
            } else {
                // Verificar se tem apenas dependências externas
                const hasOnlyExternalDeps = item.issue.depends.every(dep => 
                    !dep.id || !this.sprintItems.has(dep.id)
                );
                if (hasOnlyExternalDeps) {
                    independentTasks.push(id);
                    processed.add(id);
                } else {
                    dependentTasks.push(id);
                }
            }
        });

        // Ordenar as tarefas dependentes
        const queue = dependentTasks.filter(id => (inDegree.get(id) || 0) === 0);
        const orderedDependentTasks: string[] = [];

        while (queue.length > 0) {
            const current = queue.shift()!;
            if (!processed.has(current)) {
                orderedDependentTasks.push(current);
                processed.add(current);

                const dependencies = this.graph.get(current) || new Set();
                dependencies.forEach(dep => {
                    if (this.sprintItems.has(dep)) {
                        const newDegree = (inDegree.get(dep) || 0) - 1;
                        inDegree.set(dep, newDegree);
                        if (newDegree === 0 && !processed.has(dep)) {
                            queue.push(dep);
                        }
                    }
                });
            }
        }

        // Combinar os resultados: primeiro as independentes, depois as dependentes ordenadas
        result.push(...independentTasks, ...orderedDependentTasks);
        return result;
    }

    /**
 * Busca uma issue por ID em uma estrutura de árvore hierárquica
 * @param id ID da issue a ser buscada
 * @param data Array de issues ou estrutura de dados com array de issues
 * @returns Issue encontrada ou undefined
 */
private findIssueInTree(id: string, data: any): Issue | undefined {
    // Se recebermos um objeto com propriedade data (raiz do JSON)
    if (data.data) {
        return this.findIssueInTree(id, data.data);
    }

    // Se não for um array, retorna undefined
    if (!Array.isArray(data)) {
        return undefined;
    }

    // Função recursiva para buscar em todos os níveis
    const searchRecursive = (issues: Issue[]): Issue | undefined => {
        for (const issue of issues) {
            // Verifica se é a issue que estamos procurando
            if (issue.id === id) {
                return issue;
            }

            // Busca nas sub-issues (propriedade issues)
            if (issue.issues && Array.isArray(issue.issues)) {
                const foundInIssues = searchRecursive(issue.issues);
                if (foundInIssues) {
                    return foundInIssues;
                }
            }

            // Busca nas dependências (propriedade depends)
            if (issue.depends && Array.isArray(issue.depends)) {
                for (const dep of issue.depends) {
                    if (dep.id === id) {
                        return dep;
                    }
                }
            }
        }
        return undefined;
    };

    return searchRecursive(data);
}

/**
 * Método público para buscar uma issue por ID
 */
    public getIssueById(id: string): Issue | undefined {
    // Primeiro tenta no Map por performance
    const issueFromMap = this.allIssues.get(id);
    if (issueFromMap) {
        return issueFromMap;
    }

    // Se não encontrou, busca na árvore completa
    return this.findIssueInTree(id, this.allIssues); // Assumindo que você tem o projectData armazenado
}
    public generateAnalysis(): string {
        if (this.sprintItems.size === 0) {
            return '# Análise de Dependências do Sprint\n\nNenhuma issue encontrada no sprint.';
        }

        let markdown = '# Análise de Dependências do Sprint\n\n';
        markdown += `Análise gerada em: ${new Date().toLocaleString('pt-BR')}\n\n`;

        // Mermaid diagram
        markdown += '## 🔍 Grafo de Dependências\n\n';
        markdown += '```mermaid\n';
        markdown += this.generateMermaidDiagram();
        markdown += '```\n\n';

        markdown += '**Legenda:**\n';
        markdown += '- 🟢 Verde Claro: Issues no sprint\n';
        markdown += '- 🟢 Verde Escuro: Issues concluídas\n';
        markdown += '- 🟡 Laranja: Dependências externas ao sprint\n';
        markdown += '- ➡️ Linha sólida: Dependência no sprint\n';
        markdown += '- ➡️ Linha pontilhada: Dependência externa\n\n';

        // Ciclos
        const cycles = this.findCycles();
        if (cycles.length > 0) {
            markdown += '## ⚠️ Ciclos de Dependência Detectados\n\n';
            cycles.forEach((cycle, index) => {
                markdown += `### Ciclo ${index + 1}\n`;
                markdown += cycle.map(id => {
                    const issue = this.allIssues.get(id)!;
                    return `${id} (${issue.title || 'Sem título'})`;
                }).join(' → ') + ` → ${cycle[0]}\n\n`;
            });
        }

        markdown += '## 📋 Sugestão de Execução das Issues\n\n';
        markdown += '| # | Título | Status | Responsável | Dependências |\n';
        markdown += '|---|--------|--------|-------------|---------------|\n';
        const orderedIssues = this.getTopologicalSort();
        
        orderedIssues.forEach((id, index) => {
            const item = this.sprintItems.get(id)!;
            const allDeps = new Set<string>();
            
            if (item.issue.depends && Array.isArray(item.issue.depends)) {
                item.issue.depends.forEach(dep => {
                    if (dep && dep.id) allDeps.add(dep.id);
                });
            }
            
            const dependenciesStr = Array.from(allDeps)
            .map(depId => {
                if (this.sprintItems.has(depId)) {
                    const depItem = this.sprintItems.get(depId)!;
                    const depStatus = this.issueStatus.get(depId)!;
                    return `${depItem.issue.title}${depStatus.implemented ? '✅' : ''}`;
                }
                // Buscar informações da dependência externa usando a busca em árvore
                const externalIssue = this.findIssueInTree(depId, this.allIssues);
                const externalStatus = this.issueStatus.get(depId);
                return `${externalIssue?.title || `${depId}`}${externalStatus?.implemented ? '✅' : '⚠️'}`;
            })
            .join(', ') || '🆓';
            markdown += `| ${index + 1} | ${item.issue.title || 'N/A'} | ${item.status || 'TODO'} | ${item.assignee.name} | ${dependenciesStr} |\n`;
        });
        
        markdown += '\n**Legenda das Dependências:**\n';
        markdown += '- 🆓 Sem dependências\n';
        markdown += '- ✅ Issue concluída\n';
        markdown += '- ⚠️ Dependência externa ao sprint\n';
        return markdown;    }
}