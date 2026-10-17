import { Request, Response } from 'express';
import { z } from 'zod';
import { StorageService } from '../services/storage_service.js';

const MilestoneProofSchema = z.object({
  campaignAddress: z.string().min(1),
  trancheIndex: z.number().int().min(0).max(4),
  title: z.string().min(3).max(128),
  summary: z.string().min(10).max(4000),
  deliverables: z.array(z.string().min(2)).min(1),
  repositoryCommitSha: z.string().optional(),
  externalDemoUrl: z.string().url().optional().or(z.literal('')),
  submittedAt: z.number().int().positive(),
  authorWallet: z.string().min(1),
});

export class EvidenceController {
  constructor(private readonly storageService: StorageService) {}

  uploadEvidence = async (req: Request, res: Response): Promise<void> => {
    try {
      const parsed = MilestoneProofSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          error: 'Validation failed',
          issues: parsed.error.issues,
        });
        return;
      }

      const result = await this.storageService.uploadEvidence(parsed.data);
      res.status(201).json(result);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  };

  getEvidence = async (req: Request, res: Response): Promise<void> => {
    try {
      const { uriOrHash } = req.params;
      const evidence = await this.storageService.getEvidence(uriOrHash);
      if (!evidence) {
        res.status(404).json({ error: 'Evidence not found' });
        return;
      }

      const expectedHash = req.query.expectedHash as string | undefined;
      const isVerified = expectedHash
        ? await this.storageService.verifyIntegrity(uriOrHash, expectedHash)
        : true;

      res.json({
        evidence,
        isVerified,
      });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  };
}
