import { axiosInstance } from '../../util/axiosInstance';
import { GitHubTokenManager } from '../../service/GitHubTokenManager';

/**
 * Adiciona um membro ao time do GitHub.
 */
export async function addMemberToTeam(
  org: string,
  teamName: string,
  username: string
): Promise<void> {
  const slug = teamName.toLowerCase().replace(/ /g, '-');
  const url = `https://api.github.com/orgs/${org}/teams/${encodeURIComponent(slug)}/memberships/${encodeURIComponent(username)}`;
  const axios_instance = axiosInstance(GitHubTokenManager.getInstance().getToken());
  await axios_instance.put(url, { role: "member" });
}