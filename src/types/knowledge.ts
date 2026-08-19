export type KnowledgeSourceType = 'Text' | 'FAQ' | 'URL' | 'PDF' | 'Document';

export type KnowledgeSourceStatus = 'processing' | 'ready' | 'failed' | 'outdated';

export interface FaqPair {
  question: string;
  answer: string;
}

export interface FileMetadata {
  filename: string;
  size: string;
  ext: string;
}

export interface KnowledgeSource {
  id: string;
  workspaceId: string;
  name: string;
  type: KnowledgeSourceType;
  status: KnowledgeSourceStatus;
  content: string | FaqPair[] | null;
  originalUrl?: string | null;
  fileMetadata?: FileMetadata | null;
  chunkCount: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  connectedAgentsCount?: number;
}

export interface KnowledgeChunkItem {
  id: string;
  text: string;
  chunkIndex: number;
  metadata?: any;
  createdAt: string;
}

export interface RAGSearchResult {
  id: string;
  sourceName: string;
  sourceType: string;
  text: string;
  chunkIndex: number;
  similarityScore: number;
}
