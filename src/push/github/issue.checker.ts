import axios from "axios"
import { GitHubIssueCreated, GitHubIssueInput } from "./issue.push"
import { Issue } from "../../model/models"

interface GithubIssueResponse {
    title: string
    id: number
    number: number
    node_id: string
}

export interface GithubIssueCreatedMasker extends GitHubIssueCreated {
    node_id: string
}  

interface GithubIssueMetadata {
    total_count: number
    incomplete_results: boolean
    items: GithubIssueResponse[]
}

export class IssueAlredyExistsError extends Error {
    public readonly issue_data: GithubIssueResponse

    public constructor(issue: GithubIssueResponse) {
        super(`issue ${issue.title} alredy exists`)
        this.issue_data = issue
    }
};

export class IssueChecker{
    private readonly owner: string
    private readonly repo: string
    private readonly githubtoken: string
    private issues: GithubIssueMetadata
    private lastIssueChecked: GithubIssueResponse

    public constructor(owner: string, repo: string, githubtoken: string) {
        this.owner = owner
        this.repo = repo
        this.githubtoken = githubtoken
    }

    public getGitHubIssues(){
        const url = `https://api.github.com/search/issues?q=is:issue+repo:${this.owner}/${this.repo}`
        const headers = {
            "Accept": "application/vnd.github+json",
            "Authorization": `Bearer ${this.githubtoken}`,
            "X-GitHub-Api-Version": "2022-11-28",
        }
        
        axios.get(url,{headers: headers}).then(response => this.issues = response.data)
    }
    
    public IssueExistsOnGithub(issue: GitHubIssueInput): boolean {
        for(const ghIssue of this.issues.items){
            if (ghIssue.title == issue.title){
                this.lastIssueChecked = ghIssue
                throw new IssueAlredyExistsError(this.lastIssueChecked)
            }
        }
        return false
    }

    public get Issue(): GithubIssueCreatedMasker {
        return {
            id: this.lastIssueChecked.id.toString(),
            number: this.lastIssueChecked.number,
            node_id: this.lastIssueChecked.node_id
        }
    }
}