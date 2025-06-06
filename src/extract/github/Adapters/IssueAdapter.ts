import { Issue } from "../../../model/models";
import { GitHubIssue } from "../issue.extract";

interface IssueAdapter {
    toInternalFormat(gitHubIssue: GitHubIssue): Issue;
}

export class DefaultIssueAdapter implements IssueAdapter {
    toInternalFormat(gitHubIssue: GitHubIssue): Issue {
        return {
            id: gitHubIssue.number.toString(),
            externalId: `${gitHubIssue.repositoryOwner}/${gitHubIssue.repository}#${gitHubIssue.number}`,
            key: `${gitHubIssue.repository}-${gitHubIssue.number}`,
            self: gitHubIssue.url,
            type: 'github',
            subtype: gitHubIssue.type || 'issue',
            title: gitHubIssue.title,
            description: gitHubIssue.customFields.description || '',
            status: gitHubIssue.state === 'OPEN' ? 'open' : 'closed',
            createdDate: gitHubIssue.createdAt,
            labels: gitHubIssue.labels
        };
    }
}