import axios from 'axios';
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
  const url = `https://api.github.com/repos/${org}/${repo}/labels`;
  const token = GitHubTokenManager.getInstance().getToken();
  
  // Cria uma instância do axios específica para REST API
  const restAxios = axios.create({
    baseURL: 'https://api.github.com',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  try {
    // Tenta buscar a label
    await restAxios.get(`/repos/${org}/${repo}/labels/${encodeURIComponent(name)}`);
    // Se não lançar erro, a label já existe
  } catch (error: any) {
    if (error.response && error.response.status === 404) {
      // Cria a label se não existir
      await restAxios.post(`/repos/${org}/${repo}/labels`, {
        name,
        color,
        description
      });
    } else {
      throw error;
    }
  }
}