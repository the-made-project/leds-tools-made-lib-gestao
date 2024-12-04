
export class Graph {
    private adjacencyList: Map<string, { description: string, dependencies: string[] }>;

    constructor() {
        this.adjacencyList = new Map();
    }

    // Add a vertex to the graph
    public addVertex(vertex: string, description: string): void {
        if (!this.adjacencyList.has(vertex)) {
            this.adjacencyList.set(vertex, { description, dependencies: [] });
        }
    }

    // Add an edge to the graph
    public addEdge(source: string, target: string): void {
        if (!this.adjacencyList.has(source)) {
            throw new Error(`Vertex ${source} does not exist in the graph.`);
        }
        if (!this.adjacencyList.has(target)) {
            throw new Error(`Vertex ${target} does not exist in the graph.`);
        }
        this.adjacencyList.get(source)?.dependencies.push(target);
    }

    // Detect if the graph contains a cycle using DFS and return the cycle path
    // Detect if the graph contains a cycle using DFS and return the cycle path
    public containsCycle(): string | null {
        const visited = new Set<string>();
        const stack = new Set<string>();
        const parent = new Map<string, string | null>();
    
        const dfs = (vertex: string): string | null => {
            if (!visited.has(vertex)) {
                visited.add(vertex);
                stack.add(vertex);
    
                const { dependencies } = this.adjacencyList.get(vertex)!;
                for (const dependency of dependencies) {
                    if (!visited.has(dependency)) {
                        parent.set(dependency, vertex);
                        const cyclePath = dfs(dependency);
                        if (cyclePath) return cyclePath;
                    } else if (stack.has(dependency)) {
                        // Cycle detected, build the cycle path
                        const cyclePath: string[] = [];
                        let current = vertex;
                        while (current !== dependency) {
                            cyclePath.push(current);
                            current = parent.get(current) || "";
                        }
                        cyclePath.push(dependency);
                        cyclePath.push(vertex);
                        cyclePath.reverse();
                        return this.generateMermaidCycleDiagram(cyclePath);
                    }
                }
            }
            stack.delete(vertex);
            return null;
        };
    
        for (const vertex of this.adjacencyList.keys()) {
            if (!visited.has(vertex)) {
                const cyclePath = dfs(vertex);
                if (cyclePath) {
                    return `Cycle detected:\n${cyclePath}`;
                }
            }
        }
    
        return null;
    }
    

    // Generate Mermaid cycle diagram
    private generateMermaidCycleDiagram(cyclePath: string[]): string {
        let diagram = 'graph TD\n';
        for (let i = 0; i < cyclePath.length - 1; i++) {
            diagram += `  ${cyclePath[i]} --> ${cyclePath[i + 1]}\n`;
        }
        diagram += `  ${cyclePath[cyclePath.length - 1]} --> ${cyclePath[0]}\n`;
        return diagram;
    }    

    public generateMermaidDiagram(): string {
        const sortedNodes = this.topologicalSort();
        if (!sortedNodes) {
            return 'Cycle detected. Topological sort not possible.';
        }
    
        let diagram = 'graph TD\n';
        for (const node of sortedNodes) {
            const { dependencies } = this.adjacencyList.get(node)!;
            for (const dependency of dependencies) {
                diagram += `  ${dependency} --> ${node}\n`;
            }
        }
    
        return diagram;
    }

    // Topological Sort using Kahn's Algorithm
    public topologicalSort(): string[] | null {
        const inDegree = new Map<string, number>();
        const zeroInDegreeQueue: string[] = [];
        const topologicalOrder: string[] = [];
    
        // Initialize in-degrees of all vertices
        for (const [vertex] of this.adjacencyList.entries()) {
            inDegree.set(vertex, 0);
        }
    
        // Calculate in-degrees
        for (const [vertex, { dependencies }] of this.adjacencyList.entries()) {
            for (const dependency of dependencies) {
                inDegree.set(dependency, (inDegree.get(dependency) || 0) + 1);
                vertex
            }
        }
    
        // Enqueue vertices with in-degree 0
        for (const [vertex, degree] of inDegree.entries()) {
            if (degree === 0) {
                zeroInDegreeQueue.push(vertex);
            }
        }
    
        while (zeroInDegreeQueue.length > 0) {
            const vertex = zeroInDegreeQueue.shift()!;
            topologicalOrder.push(vertex);
    
            const { dependencies } = this.adjacencyList.get(vertex)!;
            for (const dependency of dependencies) {
                inDegree.set(dependency, (inDegree.get(dependency) || 0) - 1);
                if (inDegree.get(dependency) === 0) {
                    zeroInDegreeQueue.push(dependency);
                }
            }
        }
    
        // Check if there was a cycle
        if (topologicalOrder.length !== this.adjacencyList.size) {
            return null;
        }
    
        return topologicalOrder.reverse();
    }
    

    // Generate Markdown table
    public generateMarkdownTable(): string {
        const sortedNodes = this.topologicalSort();
        if (!sortedNodes) {
            return 'Cycle detected. Topological sort not possible.';
        }

        const headers = "| Item | Description | Dependencies | Enables |\n| --- | --- | --- | --- |\n";
        let rows = "";

        for (const node of sortedNodes) {
            const { description, dependencies } = this.adjacencyList.get(node)!;
            const enables: string[] = [];
            for (const [vertex, { dependencies: vertexDeps }] of this.adjacencyList.entries()) {
                if (vertexDeps.includes(node)) {
                    enables.push(vertex);
                }
            }
            rows += `| ${node} | ${description} | ${dependencies.join(", ")} | ${enables.join(", ")} |\n`;
        }

        return headers + rows;
    }
}