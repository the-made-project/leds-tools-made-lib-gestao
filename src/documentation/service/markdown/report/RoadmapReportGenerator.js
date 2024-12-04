"use strict";
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RoadmapReportGenerator = void 0;
var RoadmapReportGenerator = /** @class */ (function () {
    function RoadmapReportGenerator(roadmaps) {
        this.roadmaps = roadmaps;
    }
    RoadmapReportGenerator.prototype.formatDate = function (dateStr) {
        if (!dateStr)
            return 'N/A';
        try {
            // Verifica se a data já está no formato brasileiro (dd/mm/yyyy)
            if (dateStr.includes('/')) {
                var _a = dateStr.split('/'), day_1 = _a[0], month_1 = _a[1], year_1 = _a[2];
                var date_1 = new Date("".concat(year_1, "-").concat(month_1, "-").concat(day_1));
                if (isNaN(date_1.getTime()))
                    return 'N/A';
                return dateStr;
            }
            // Se estiver no formato ISO (yyyy-mm-dd)
            var date = new Date(dateStr);
            if (isNaN(date.getTime()))
                return 'N/A';
            var day = date.getDate().toString().padStart(2, '0');
            var month = (date.getMonth() + 1).toString().padStart(2, '0');
            var year = date.getFullYear();
            return "".concat(day, "/").concat(month, "/").concat(year);
        }
        catch (error) {
            console.error('Erro ao formatar data:', error);
            return 'N/A';
        }
    };
    RoadmapReportGenerator.prototype.getStatusEmoji = function (status) {
        var statusEmojis = {
            PLANNED: '📋',
            IN_PROGRESS: '🏃',
            COMPLETED: '✅',
            DELAYED: '⚠️',
            IN_DEVELOPMENT: '🏗️',
            TESTING: '🧪',
            RELEASED: '✨'
        };
        return statusEmojis[status] || '❓';
    };
    RoadmapReportGenerator.prototype.generateMilestonesSection = function (roadmap) {
        var _this = this;
        var _a;
        if (!((_a = roadmap.milestones) === null || _a === void 0 ? void 0 : _a.length))
            return '';
        var milestonesContent = roadmap.milestones.map(function (milestone) {
            var _a, _b;
            return "\n### ".concat(_this.getStatusEmoji(milestone.status || 'PLANNED'), " ").concat(milestone.name, " (").concat(milestone.status, ")\n- **In\u00EDcio**: ").concat(_this.formatDate(milestone.startDate), "\n- **Conclus\u00E3o").concat(milestone.status !== 'COMPLETED' ? ' Prevista' : '', "**: ").concat(_this.formatDate(milestone.dueDate), "\n- **Descri\u00E7\u00E3o**: ").concat(milestone.description, "\n").concat(((_a = milestone.releases) === null || _a === void 0 ? void 0 : _a.length) ?
                "- **Releases Associadas**: ".concat(milestone.releases.map(function (r) { return r.version; }).join(', ')) :
                '- **Releases**: Nenhuma', "\n").concat(((_b = milestone.dependencies) === null || _b === void 0 ? void 0 : _b.length) ?
                "- **Depend\u00EAncias**: ".concat(milestone.dependencies.map(function (d) { return d.name; }).join(', ')) :
                '- **Dependências**: Nenhuma', "\n      \n    ").concat(_this.generateReleasesTable(milestone.releases), "\n      ");
        }).join('\n');
        return "\n## \uD83C\uDFAF Milestones\n\n".concat(milestonesContent, "\n");
    };
    RoadmapReportGenerator.prototype.generateReleasesTable = function (releases) {
        var _this = this;
        if (!(releases === null || releases === void 0 ? void 0 : releases.length))
            return '';
        return "\n#### Releases\n| Vers\u00E3o | Nome | Status | Data Prevista | Data Release |\n|--------|------|--------|---------------|--------------|\n".concat(releases.map(function (release) {
            return "| ".concat(release.version, " | ").concat(release.name, " | ").concat(_this.getStatusEmoji(release.status || 'PLANNED'), " ").concat(release.status, " | ").concat(_this.formatDate(release.dueDate), " | ").concat(_this.formatDate(release.releasedDate || ''), " |");
        }).join('\n'), "\n\n").concat(this.generateIssuesTable(releases), "\n");
    };
    RoadmapReportGenerator.prototype.generateIssuesTable = function (releases) {
        if (!(releases === null || releases === void 0 ? void 0 : releases.length))
            return '';
        var allIssues = releases.flatMap(function (release) { return release.issues || []; });
        if (!allIssues.length)
            return '';
        return "\n#### Issues\n| Key | Tipo | T\u00EDtulo | Status | Labels |\n|-----|------|--------|--------|--------|\n".concat(allIssues.map(function (issue) { var _a; return "| ".concat(issue.id || 'N/A', " | ").concat(issue.type, " | ").concat(issue.title || 'N/A', " | ").concat(issue.status || 'N/A', " | ").concat(((_a = issue.labels) === null || _a === void 0 ? void 0 : _a.join(', ')) || 'N/A', " |"); }).join('\n'), "\n");
    };
    RoadmapReportGenerator.prototype.generateProgressOverview = function (roadmap) {
        var milestones = roadmap.milestones || [];
        var statusCount = {
            total: milestones.length,
            completed: milestones.filter(function (m) { return m.status === 'COMPLETED'; }).length,
            inProgress: milestones.filter(function (m) { return m.status === 'IN_PROGRESS'; }).length,
            planned: milestones.filter(function (m) { return m.status === 'PLANNED'; }).length,
            delayed: milestones.filter(function (m) { return m.status === 'DELAYED'; }).length
        };
        return "\n## \uD83D\uDCCA Vis\u00E3o Geral do Progresso\n\nStatus atual do roadmap:\n- Total de Milestones: ".concat(statusCount.total, "\n- Conclu\u00EDdos: ").concat(statusCount.completed, "\n- Em Progresso: ").concat(statusCount.inProgress, "\n- Planejados: ").concat(statusCount.planned, "\n- Atrasados: ").concat(statusCount.delayed, "\n\nProgresso: ").concat(statusCount.total ? Math.round((statusCount.completed / statusCount.total) * 100) : 0, "%\n");
    };
    RoadmapReportGenerator.prototype.generateTimeline = function (roadmap) {
        var _this = this;
        var _a;
        if (!((_a = roadmap.milestones) === null || _a === void 0 ? void 0 : _a.length))
            return '';
        var timelineItems = roadmap.milestones
            .flatMap(function (milestone) {
            var _a;
            return __spreadArray([
                {
                    date: milestone.startDate,
                    type: 'Milestone Start',
                    name: milestone.name,
                    status: milestone.status
                },
                {
                    date: milestone.dueDate,
                    type: 'Milestone Due',
                    name: milestone.name,
                    status: milestone.status
                }
            ], (((_a = milestone.releases) === null || _a === void 0 ? void 0 : _a.map(function (release) { return ({
                date: release.dueDate,
                type: 'Release',
                name: "".concat(release.version, " - ").concat(release.name),
                status: release.status
            }); })) || []), true);
        })
            .sort(function (a, b) { return new Date(a.date).getTime() - new Date(b.date).getTime(); });
        return "\n## \uD83D\uDCC5 Timeline\n\n".concat(timelineItems.map(function (item) {
            return "- ".concat(_this.formatDate(item.date), " - ").concat(_this.getStatusEmoji(item.status || 'PLANNED'), " **").concat(item.type, "**: ").concat(item.name);
        }).join('\n'), "\n");
    };
    RoadmapReportGenerator.prototype.generateReport = function () {
        var _this = this;
        var report = '# 🎯 Roadmaps\n\n';
        this.roadmaps.forEach(function (roadmap) {
            report += "# ".concat(roadmap.name || 'Roadmap sem nome', "\n\n");
            report += roadmap.description ? "".concat(roadmap.description, "\n\n") : '';
            report += _this.generateProgressOverview(roadmap);
            report += _this.generateMilestonesSection(roadmap);
            report += _this.generateTimeline(roadmap);
        });
        return report;
    };
    RoadmapReportGenerator.prototype.generateSingleRoadmapReport = function (roadmapId) {
        var roadmap = this.roadmaps.find(function (r) { return r.id === roadmapId; });
        if (!roadmap)
            return null;
        return "# ".concat(roadmap.name || 'Relatório de Progresso do Roadmap', "\n\n").concat(roadmap.description || '', "\n\n").concat(this.generateProgressOverview(roadmap), "\n").concat(this.generateMilestonesSection(roadmap), "\n").concat(this.generateTimeline(roadmap), "\n");
    };
    return RoadmapReportGenerator;
}());
exports.RoadmapReportGenerator = RoadmapReportGenerator;
