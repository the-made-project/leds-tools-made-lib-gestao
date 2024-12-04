"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProjectDependencyAnalyzer = void 0;
class ProjectDependencyAnalyzer {
    constructor(sprint) {
        this.validateInputs(sprint);
        this.allIssues = new Map();
        this.sprintItems = new Map();
        this.graph = new Map();
        this.reversedGraph = new Map();
        this.issueStatus = new Map();
        this.initializeFromSprint(sprint);
    }
    validateInputs(sprint) {
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
    initializeFromSprint(sprint) {
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
                    var _a, _b;
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
                        (_a = this.graph.get(item.issue.id)) === null || _a === void 0 ? void 0 : _a.add(dep.id);
                        (_b = this.reversedGraph.get(dep.id)) === null || _b === void 0 ? void 0 : _b.add(item.issue.id);
                    }
                });
            }
        });
    }
    findCycles() {
        const cycles = [];
        const visited = new Set();
        const recursionStack = new Set();
        const dfs = (nodeId, path = []) => {
            visited.add(nodeId);
            recursionStack.add(nodeId);
            path.push(nodeId);
            const dependencies = this.graph.get(nodeId) || new Set();
            for (const depId of dependencies) {
                if (!visited.has(depId)) {
                    dfs(depId, [...path]);
                }
                else if (recursionStack.has(depId)) {
                    const cycleStartIndex = path.indexOf(depId);
                    cycles.push(path.slice(cycleStartIndex));
                }
            }
            recursionStack.delete(nodeId);
        };
        this.sprintItems.forEach((_, id) => {
            if (!visited.has(id)) {
                dfs(id);
            }
        });
        return cycles;
    }
    generateMermaidDiagram() {
        let diagram = 'graph BT\n';
        // Definir estilos
        diagram += '    classDef sprint fill:#a8e6cf,stroke:#333,stroke-width:2px;\n';
        diagram += '    classDef done fill:#98fb98,stroke:#333,stroke-width:2px;\n';
        diagram += '    classDef external fill:#ffd3b6,stroke:#333,stroke-width:1px;\n';
        // Coletar todas as dependências externas
        const externalDeps = new Set();
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
            const label = `${id}["🔍 ${id}<br>` +
                `⚠️ Dependência Externa"]`;
            diagram += `    ${label}:::external\n`;
        });
        // Ordenar issues do sprint por nível de dependência
        const issues = this.getTopologicalSort();
        // Adicionar nós do sprint
        issues.forEach(id => {
            var _a;
            const item = this.sprintItems.get(id);
            const status = this.issueStatus.get(id);
            const nodeClass = status.implemented ? 'done' : 'sprint';
            const label = `${id}["🔍 Identificador: ${id}<br>` +
                `📝 Tarefa: ${item.issue.title || 'Sem título'}<br>` +
                `📊 Estado: ${status.status}<br>` +
                `👤 Responsável: ${((_a = status.assignee) === null || _a === void 0 ? void 0 : _a.name) || 'N/A'}"]`;
            diagram += `    ${label}:::${nodeClass}\n`;
        });
        // Adicionar arestas (incluindo para dependências externas)
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
    getTopologicalSort() {
        const result = [];
        const independentTasks = [];
        const dependentTasks = [];
        const processed = new Set();
        const inDegree = new Map();
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
            }
            else {
                // Verificar se tem apenas dependências externas
                const hasOnlyExternalDeps = item.issue.depends.every(dep => !dep.id || !this.sprintItems.has(dep.id));
                if (hasOnlyExternalDeps) {
                    independentTasks.push(id);
                    processed.add(id);
                }
                else {
                    dependentTasks.push(id);
                }
            }
        });
        // Ordenar as tarefas dependentes
        const queue = dependentTasks.filter(id => (inDegree.get(id) || 0) === 0);
        const orderedDependentTasks = [];
        while (queue.length > 0) {
            const current = queue.shift();
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
    generateAnalysis() {
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
                    const issue = this.allIssues.get(id);
                    return `${id} (${issue.title || 'Sem título'})`;
                }).join(' → ') + ` → ${cycle[0]}\n\n`;
            });
        }
        // Tabela de análise em ordem de execução
        markdown += '## 📋 Sugestão de Execução das Issues\n\n';
        markdown += '| # | Issue | Título | Status | Responsável | Dependências |\n';
        markdown += '|---|-------|--------|--------|-------------|---------------|\n';
        const orderedIssues = this.getTopologicalSort();
        orderedIssues.forEach((id, index) => {
            const item = this.sprintItems.get(id);
            const allDeps = new Set();
            if (item.issue.depends && Array.isArray(item.issue.depends)) {
                item.issue.depends.forEach(dep => {
                    if (dep && dep.id)
                        allDeps.add(dep.id);
                });
            }
            const dependenciesStr = Array.from(allDeps)
                .map(depId => {
                if (this.sprintItems.has(depId)) {
                    const depStatus = this.issueStatus.get(depId);
                    return `${depId}${depStatus.implemented ? '✅' : ''}`;
                }
                return `${depId}⚠️`;
            })
                .join(', ') || '🆓'; // Usa 🆓 para indicar que não tem dependências
            markdown += `| ${index + 1} | ${id} | ${item.issue.title || 'N/A'} | ${item.status || 'TODO'} | ${item.assignee.name} | ${dependenciesStr} |\n`;
        });
        markdown += '\n**Legenda das Dependências:**\n';
        markdown += '- 🆓 Sem dependências\n';
        markdown += '- ✅ Issue concluída\n';
        markdown += '- ⚠️ Dependência externa ao sprint\n';
        return markdown;
    }
}
exports.ProjectDependencyAnalyzer = ProjectDependencyAnalyzer;
