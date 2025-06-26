import { axiosInstance } from '../../util/axiosInstance';
import { GitHubTokenManager } from '../../service/GitHubTokenManager';

/**
 * Cria uma label no repositório do GitHub se ela não existir.
 */
export async function createOrEnsureLabel(
  org: string,
  repo: string,
  name: string,
  color: string = 'ededed',
  description: string = ''
): Promise<void> {
  const slug = repo.toLowerCase().replace(/ /g, '-');
  const url = `https://api.github.com/orgs/${org}/teams/${encodeURIComponent(slug)}`;
  const axios_instance = axiosInstance(GitHubTokenManager.getInstance().getToken());

  try {
    // Tenta buscar a label
    await axios_instance.get(`${url}/${encodeURIComponent(name)}`);
    // Se não lançar erro, a label já existe
  } catch (error: any) {
    if (error.response && error.response.status === 404) {
      // Cria a label se não existir
      await axios_instance.post(url, {
        name,
        color,
        description
      });
    } else {
      throw error;
    }
  }
}