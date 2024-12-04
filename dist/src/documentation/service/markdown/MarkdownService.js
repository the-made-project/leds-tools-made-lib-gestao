"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MarkdownService = void 0;
const fs_1 = __importDefault(require("fs"));
const generator_utils_js_1 = require("../../../util/generator-utils.js");
const MarkdownBacklogService_js_1 = require("./MarkdownBacklogService.js");
const MarkdownTimeBoxService_js_1 = require("./MarkdownTimeBoxService.js");
const MarkdownRoadmapService_js_1 = require("./MarkdownRoadmapService.js");
class MarkdownService {
    constructor(target_folder) {
        this.target_folder = target_folder;
        this.DB_PATH = (0, generator_utils_js_1.createPath)(this.target_folder, 'db');
        fs_1.default.mkdirSync(this.target_folder, { recursive: true });
        this.markdownBacklogService = new MarkdownBacklogService_js_1.MarkdownBacklogService(this.target_folder, this.DB_PATH);
        this.markdownTimeBoxService = new MarkdownTimeBoxService_js_1.MarkdownTimeBoxService(this.target_folder, this.DB_PATH);
        this.markdownRoadmapService = new MarkdownRoadmapService_js_1.MardownRoadmapService(this.target_folder, this.DB_PATH);
    }
    createManagementDocumenation() {
        this.markdownTimeBoxService.create();
        this.markdownBacklogService.create();
        this.markdownRoadmapService.create();
    }
}
exports.MarkdownService = MarkdownService;
