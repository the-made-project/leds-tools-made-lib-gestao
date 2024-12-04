export declare class Graph {
    private adjacencyList;
    constructor();
    addVertex(vertex: string, description: string): void;
    addEdge(source: string, target: string): void;
    containsCycle(): string | null;
    private generateMermaidCycleDiagram;
    generateMermaidDiagram(): string;
    topologicalSort(): string[] | null;
    generateMarkdownTable(): string;
}
