import { IntersectionMappingRequest, AiGenerationResult } from "./types";

export interface AiProvider {
  readonly id: string;
  readonly name: string;
  readonly defaultModel: string;

  generateIntersectionMapping(
    request: IntersectionMappingRequest
  ): Promise<AiGenerationResult>;
}
