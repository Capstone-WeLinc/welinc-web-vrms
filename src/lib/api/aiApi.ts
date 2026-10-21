import api from './axios';

// The AI service returns knowledge base SOPs as { articles: [...] }
export async function getKnowledgeArticles<T>(): Promise<T[]> {
  const response = await api.get<{ articles?: T[] }>('/ai/knowledge/articles');
  return response.data.articles ?? [];
}
