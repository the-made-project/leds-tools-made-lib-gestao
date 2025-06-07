import { MarkdownBacklogService } from './MarkdownBacklogService'
import { MarkdownRoadmapService } from './MarkdownRoadmapService'
import { MarkdownTimeBoxService } from './MarkdownTimeBoxService'

export class MarkdownFactory {
  static createMarkdown(type: string, target_folder: string, db_path: string) {
    const markdownClasses: { [key: string]: any } = {
      Backlog: MarkdownBacklogService,
      Roadmap: MarkdownRoadmapService,
      TimeBox: MarkdownTimeBoxService,
    };

    const MarkdownClass = markdownClasses[type];
    if (!MarkdownClass) {
      throw new Error(`Unknown application type: ${type}`);
    }

    return new MarkdownClass(target_folder, db_path);
  }
}
