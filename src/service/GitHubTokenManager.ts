export class GitHubTokenManager {
    private static instance: GitHubTokenManager;
    private token: string;

    private constructor(token: string) {
        this.token = token;
    }

    public static initialize(token: string): void {
        if (!GitHubTokenManager.instance) {
            GitHubTokenManager.instance = new GitHubTokenManager(token);
        }
    }
    
    public static getInstance(): GitHubTokenManager {
        if (!GitHubTokenManager.instance) {
            throw new Error("GitHubTokenManager is not initialized.");
        }
        return GitHubTokenManager.instance;
    }

    public getToken(): string {
        return this.token;
    }

    public setToken(token: string): void {
        this.token = token;
    }
}