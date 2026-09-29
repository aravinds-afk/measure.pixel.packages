import type { GenerateRequest } from '@/types';

export interface AiProvider {
  readonly name: string;
  readonly isMock: boolean;
  generate(request: GenerateRequest, options: { signal?: AbortSignal }): Promise<unknown>;
}
