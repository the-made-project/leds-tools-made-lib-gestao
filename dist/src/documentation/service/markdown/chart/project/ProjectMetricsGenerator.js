"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProjectMetricsGenerator = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const ProjectCFD_js_1 = require("./ProjectCFD.js");
const ProjectThroughputGenerator_js_1 = require("./ProjectThroughputGenerator.js");
const ProjectMonteCarlo_js_1 = require("./ProjectMonteCarlo.js");
class ProjectMetricsGenerator {
    constructor(sprints) {
        this.sprints = sprints;
    }
    parseBrazilianDate(dateStr) {
        if (!dateStr) {
            throw new Error('Data não fornecida');
        }
        dateStr = dateStr.trim();
        const dateRegex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
        const match = dateStr.match(dateRegex);
        if (!match) {
            throw new Error(`Data inválida: ${dateStr}. Formato esperado: dd/mm/yyyy`);
        }
        const [, day, month, year] = match;
        const date = new Date(`${year}-${month}-${day}`);
        if (isNaN(date.getTime())) {
            throw new Error(`Data inválida após conversão: ${dateStr}`);
        }
        return date;
    }
    formatDate(date) {
        try {
            const parsedDate = this.parseBrazilianDate(date);
            return parsedDate.toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: '2-digit'
            });
        }
        catch (error) {
            console.error(`Erro ao formatar data: ${this.getErrorMessage(error)}`);
            return date;
        }
    }
    calculateDuration(startDate, endDate) {
        try {
            const start = this.parseBrazilianDate(startDate);
            const end = this.parseBrazilianDate(endDate);
            const startTime = start.getTime();
            const endTime = end.getTime();
            if (endTime < startTime) {
                throw new Error('Data de fim é anterior à data de início');
            }
            return Math.ceil((endTime - startTime) / (1000 * 60 * 60 * 24));
        }
        catch (error) {
            console.error(`Erro ao calcular duração entre ${startDate} e ${endDate}: ${this.getErrorMessage(error)}`);
            throw new Error(`Erro ao calcular duração: ${this.getErrorMessage(error)}`);
        }
    }
    getErrorMessage(error) {
        if (error instanceof Error) {
            return error.message;
        }
        if (typeof error === 'string') {
            return error;
        }
        if (error && typeof error === 'object' && 'toString' in error) {
            return error.toString();
        }
        return 'Erro desconhecido';
    }
    analyzeTaskStatus(tasks) {
        return {
            completed: tasks.filter(task => task.status === "DONE").length,
            inProgress: tasks.filter(task => task.status !== "DONE" && task.startDate).length,
            pending: tasks.filter(task => task.status !== "DONE" && !task.startDate).length
        };
    }
    calculateVelocity(tasks, duration) {
        const completedTasks = tasks.filter(task => task.status === "DONE").length;
        return Number((completedTasks / duration).toFixed(2));
    }
    generateSprintSVG(sprints) {
        const width = 800;
        const height = 400;
        const margin = { top: 40, right: 40, bottom: 60, left: 60 };
        const graphWidth = width - margin.left - margin.right;
        const graphHeight = height - margin.top - margin.bottom;
        const getCompletedTasks = (tasks) => tasks.filter(t => t.status === "Concluído").length;
        const maxTasks = Math.max(...sprints.map(s => s.sprintItems.length));
        const barWidth = graphWidth / (sprints.length * 2);
        let svg = `
        <svg viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
            <style>
                .bar { fill: #4f46e5; opacity: 0.8; }
                .bar:hover { opacity: 1; }
                .label { font-size: 12px; font-family: Arial; }
            </style>
            <g transform="translate(${margin.left}, ${margin.top})">`;
        // Add axes
        svg += `
        <line x1="0" y1="0" x2="0" y2="${graphHeight}" stroke="black" stroke-width="2"/>
        <line x1="0" y1="${graphHeight}" x2="${graphWidth}" y2="${graphHeight}" stroke="black" stroke-width="2"/>`;
        // Add Y-axis labels
        for (let i = 0; i <= 4; i++) {
            const yValue = maxTasks * (4 - i) / 4;
            svg += `
            <text x="-10" y="${(graphHeight * i) / 4}" 
                  text-anchor="end" dominant-baseline="middle" 
                  class="label">${Math.round(yValue)}</text>`;
        }
        // Add bars and labels
        sprints.forEach((sprint, i) => {
            const completedTasks = getCompletedTasks(sprint.sprintItems);
            const barHeight = (completedTasks / maxTasks) * graphHeight;
            const x = (i * graphWidth) / sprints.length;
            svg += `
            <g>
                <rect x="${x + barWidth / 2}" y="${graphHeight - barHeight}"
                      width="${barWidth}" height="${barHeight}" class="bar">
                    <title>${sprint.name}: ${completedTasks}/${sprint.sprintItems.length} tasks completed</title>
                </rect>
                <text x="${x + barWidth}" y="${graphHeight + 20}"
                      text-anchor="middle" class="label"
                      transform="rotate(45, ${x + barWidth}, ${graphHeight + 20})">${sprint.name}</text>
            </g>`;
        });
        svg += `
            </g>
        </svg>`;
        return svg;
    }
    generateSummaryTable() {
        let markdown = '## Métricas Consolidadas\n\n';
        markdown += '| Sprint | Período | Duração | Total Tasks | Concluídas | Em Progresso | Pendentes | Velocidade | Eficiência |\n';
        markdown += '|--------|---------|----------|-------------|------------|--------------|-----------|------------|------------|\n';
        this.sprints.forEach(sprint => {
            const duration = this.calculateDuration(sprint.startDate, sprint.endDate);
            const status = this.analyzeTaskStatus(sprint.sprintItems);
            const velocity = this.calculateVelocity(sprint.sprintItems, duration);
            const efficiency = ((status.completed / sprint.sprintItems.length) * 100).toFixed(1);
            markdown += `| ${sprint.name} | ${this.formatDate(sprint.startDate)} - ${this.formatDate(sprint.endDate)} | ${duration} dias | ${sprint.sprintItems.length} | ${status.completed} (${efficiency}%) | ${status.inProgress} | ${status.pending} | ${velocity}/dia | ${efficiency}% |\n`;
        });
        return markdown;
    }
    generateMarkdownReport(project) {
        var _a, _b, _c, _d;
        let markdown = '# 📊 Visão Geral do Projeto \n\n';
        markdown += `${(_a = project.description) !== null && _a !== void 0 ? _a : "-"}` + '\n';
        markdown += `* Data de Início: ${(_b = project.startDate) !== null && _b !== void 0 ? _b : "-"}` + '\n';
        markdown += `* Data de Planejado: ${(_c = project.dueDate) !== null && _c !== void 0 ? _c : "-"}` + '\n';
        markdown += `* Data de Finalização: ${(_d = project.completedDate) !== null && _d !== void 0 ? _d : "-"}` + '\n\n';
        markdown += `${project.description}` + '\n';
        // Adiciona a tabela de métricas
        markdown += this.generateSummaryTable() + '\n';
        // Análise geral
        const totalTasks = this.sprints.reduce((acc, sprint) => acc + sprint.sprintItems.length, 0);
        const totalStatus = this.analyzeTaskStatus(this.sprints.flatMap(s => s.sprintItems));
        const globalEfficiency = ((totalStatus.completed / totalTasks) * 100).toFixed(1);
        markdown += '## Análise Geral\n\n';
        markdown += `- **Total de Sprints:** ${this.sprints.length}\n`;
        markdown += `- **Total de Tasks:** ${totalTasks}\n`;
        markdown += `- **Taxa de Conclusão:** ${globalEfficiency}%\n\n`;
        // Notas
        markdown += '### Notas\n';
        markdown += `- Período Total: ${this.formatDate(this.sprints[0].startDate)} - ${this.formatDate(this.sprints[this.sprints.length - 1].endDate)}\n`;
        markdown += `- Média de Duração das Sprints: ${Math.round(this.sprints.reduce((acc, sprint) => acc + this.calculateDuration(sprint.startDate, sprint.endDate), 0) / this.sprints.length)} dias\n\n`;
        markdown += `*Última atualização: ${new Date().toLocaleDateString('pt-BR', {
            month: 'long',
            year: 'numeric'
        })}*`;
        markdown += '\n\n## Cumulative Flow \n';
        markdown += '![ Cumulative Flow](./project-cfd.svg)\n\n';
        const projectAnalysis = new ProjectMonteCarlo_js_1.ProjectMonteCarlo(this.sprints);
        const report = projectAnalysis.generateMarkdownReport();
        markdown += report;
        return markdown;
    }
    generateFiles(outputDir, project) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Criar diretório se não existir
                if (!fs_1.default.existsSync(outputDir)) {
                    fs_1.default.mkdirSync(outputDir, { recursive: true });
                }
                // Gerar e salvar SVG primeiro
                const svgPath = path_1.default.join(outputDir, 'project-cfd.svg');
                const projectCFD = new ProjectCFD_js_1.ProjectCFD(this.sprints, svgPath);
                projectCFD.generate();
                const svgPathTP = path_1.default.join(outputDir, 'project-throughput.svg');
                const throughput = new ProjectThroughputGenerator_js_1.ProjectThroughputGenerator(this.sprints, svgPathTP);
                throughput.generate();
                // Gerar markdown com referência ao SVG
                const markdown = this.generateMarkdownReport(project);
                const markdownPath = path_1.default.join(outputDir, '01_overview.md');
                yield fs_1.default.promises.writeFile(markdownPath, markdown, 'utf-8');
            }
            catch (error) {
                console.error('Erro ao gerar arquivos:', error);
                throw error;
            }
        });
    }
}
exports.ProjectMetricsGenerator = ProjectMetricsGenerator;
