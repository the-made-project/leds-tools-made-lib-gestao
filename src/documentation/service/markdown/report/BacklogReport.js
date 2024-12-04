"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BacklogMarkdownConverter = void 0;
var BacklogMarkdownConverter = /** @class */ (function () {
    function BacklogMarkdownConverter() {
    }
    BacklogMarkdownConverter.prototype.getTypeEmoji = function (type) {
        switch (type.toLowerCase()) {
            case 'epic':
                return '🌟';
            case 'atomicuserstory':
            case 'userstory':
                return '⭐';
            case 'taskbacklog':
            case 'task':
                return '✅';
            default:
                return '';
        }
    };
    BacklogMarkdownConverter.prototype.formatDisplayType = function (type) {
        switch (type.toLowerCase()) {
            case 'epic':
                return 'Epic';
            case 'atomicuserstory':
                return 'Story';
            case 'taskbacklog':
                return 'Task';
            default:
                return type;
        }
    };
    BacklogMarkdownConverter.prototype.formatIssueForTable = function (issue, level) {
        var _this = this;
        var _a;
        if (level === void 0) { level = 0; }
        var titlePrefix = '  '.repeat(level);
        var typeEmoji = this.getTypeEmoji(issue.type);
        var displayType = this.formatDisplayType(issue.type);
        var typeWithEmoji = typeEmoji ? "".concat(typeEmoji, " ").concat(displayType) : displayType;
        var row = [
            "".concat(titlePrefix).concat(issue.id.toLocaleLowerCase()),
            typeWithEmoji,
            issue.title || '-',
            issue.description || '-',
            issue.status || '-',
            ((_a = issue.depends) === null || _a === void 0 ? void 0 : _a.map(function (d) { return d.id; }).join(', ')) || '-'
        ];
        var rows = [row.join(' | ')];
        if (issue.issues && issue.issues.length > 0) {
            issue.issues.forEach(function (subIssue) {
                rows = rows.concat(_this.formatIssueForTable(subIssue, level + 1));
            });
        }
        return rows;
    };
    BacklogMarkdownConverter.prototype.convertBacklogsToMarkdown = function (backlogs) {
        var _this = this;
        var markdown = '# 📋 Backlogs\n\n';
        var headers = [
            'ID',
            'Tipo',
            'Título',
            'Descrição',
            'Status',
            'Dependências'
        ];
        backlogs.forEach(function (backlog, index) {
            markdown += "## ".concat(backlog.name, "\n\n");
            if (backlog.description) {
                markdown += "".concat(backlog.description, "\n\n");
            }
            if (backlog.issues && backlog.issues.length > 0) {
                markdown += '### Issues\n\n';
                markdown += "| ".concat(headers.join(' | '), " |\n");
                markdown += "| ".concat(headers.map(function () { return '---'; }).join(' | '), " |\n");
                backlog.issues.forEach(function (issue) {
                    var rows = _this.formatIssueForTable(issue);
                    rows.forEach(function (row) {
                        markdown += "| ".concat(row, " |\n");
                    });
                });
                markdown += '\n';
            }
            else {
                markdown += 'Nenhuma issue encontrada neste backlog.\n\n';
            }
            if (index < backlogs.length - 1) {
                markdown += '---\n\n';
            }
        });
        return markdown;
    };
    return BacklogMarkdownConverter;
}());
exports.BacklogMarkdownConverter = BacklogMarkdownConverter;
