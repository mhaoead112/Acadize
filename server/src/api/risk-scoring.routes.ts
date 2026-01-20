import { Router } from 'express';
import { RiskScoringService } from '../services/risk-scoring.service.js';
import { isAuthenticated, isTeacher, isAdmin } from '../middleware/auth.middleware.js';

const router = Router();

/**
 * POST /api/risk-scoring/calculate/:attemptId
 * Calculate risk score for a specific exam attempt
 * Teacher/Admin only - for review purposes
 */
router.post('/calculate/:attemptId', isAuthenticated, isTeacher, async (req, res) => {
  try {
    const { attemptId } = req.params;
    const { weights, thresholds } = req.body;

    const riskScore = await RiskScoringService.calculateRiskScore(attemptId, {
      weights,
      thresholds,
    });

    res.json({
      success: true,
      data: riskScore,
    });
  } catch (error: any) {
    console.error('[RISK SCORING API] Error calculating risk score:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to calculate risk score',
      error: error.message,
    });
  }
});

/**
 * GET /api/risk-scoring/attempt/:attemptId
 * Get risk score for a specific exam attempt
 * Teacher/Admin only - for review purposes
 */
router.get('/attempt/:attemptId', isAuthenticated, isTeacher, async (req, res) => {
  try {
    const { attemptId } = req.params;

    const riskScore = await RiskScoringService.calculateRiskScore(attemptId);

    res.json({
      success: true,
      data: riskScore,
    });
  } catch (error: any) {
    console.error('[RISK SCORING API] Error fetching risk score:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch risk score',
      error: error.message,
    });
  }
});

/**
 * GET /api/risk-scoring/flagged
 * Get all flagged attempts (high risk)
 * Teacher/Admin only
 */
router.get('/flagged', isAuthenticated, isTeacher, async (req, res) => {
  try {
    const { examId, minRiskLevel, limit } = req.query;

    const flaggedAttempts = await RiskScoringService.getFlaggedAttempts(
      examId as string | undefined,
      {
        minRiskLevel: (minRiskLevel as 'medium' | 'high' | 'critical') || 'high',
        limit: limit ? parseInt(limit as string) : undefined,
      }
    );

    res.json({
      success: true,
      data: {
        total: flaggedAttempts.length,
        attempts: flaggedAttempts,
      },
    });
  } catch (error: any) {
    console.error('[RISK SCORING API] Error fetching flagged attempts:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch flagged attempts',
      error: error.message,
    });
  }
});

/**
 * GET /api/risk-scoring/exam/:examId/flagged
 * Get flagged attempts for a specific exam
 * Teacher/Admin only
 */
router.get('/exam/:examId/flagged', isAuthenticated, isTeacher, async (req, res) => {
  try {
    const { examId } = req.params;
    const { minRiskLevel, limit } = req.query;

    const flaggedAttempts = await RiskScoringService.getFlaggedAttempts(
      examId,
      {
        minRiskLevel: (minRiskLevel as 'medium' | 'high' | 'critical') || 'high',
        limit: limit ? parseInt(limit as string) : undefined,
      }
    );

    res.json({
      success: true,
      data: {
        examId,
        total: flaggedAttempts.length,
        attempts: flaggedAttempts,
      },
    });
  } catch (error: any) {
    console.error('[RISK SCORING API] Error fetching exam flagged attempts:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch exam flagged attempts',
      error: error.message,
    });
  }
});

/**
 * GET /api/risk-scoring/explanation/:attemptId
 * Get detailed risk explanation for teachers
 * Teacher/Admin only - provides breakdown of risk factors
 */
router.get('/explanation/:attemptId', isAuthenticated, isTeacher, async (req, res) => {
  try {
    const { attemptId } = req.params;

    const riskScore = await RiskScoringService.calculateRiskScore(attemptId);

    // Format explanation for teacher review
    const explanation = {
      attemptId: riskScore.attemptId,
      studentId: riskScore.studentId,
      examId: riskScore.examId,
      overallRisk: {
        score: riskScore.riskScore,
        level: riskScore.riskLevel,
        flagged: riskScore.flaggedForReview,
      },
      riskFactors: riskScore.compositeFactors.map(factor => ({
        name: factor.factor,
        severity: factor.severity,
        weight: `${(factor.weight * 100).toFixed(1)}%`,
        contribution: `${factor.contribution.toFixed(1)} points`,
        description: factor.description,
        evidence: factor.evidence,
      })),
      recommendations: riskScore.recommendations,
      reviewRequired: riskScore.flaggedForReview,
      autoGradingAllowed: riskScore.autoGraded,
      calculatedAt: riskScore.calculatedAt,
    };

    res.json({
      success: true,
      data: explanation,
    });
  } catch (error: any) {
    console.error('[RISK SCORING API] Error fetching risk explanation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch risk explanation',
      error: error.message,
    });
  }
});

/**
 * GET /api/risk-scoring/config
 * Get current risk scoring configuration (weights and thresholds)
 * Teacher/Admin only
 */
router.get('/config', isAuthenticated, isTeacher, async (req, res) => {
  try {
    // Return default configuration
    const config = {
      weights: {
        tabSwitches: 0.08,
        copypaste: 0.15,
        screenCapture: 0.05,
        multipleDevices: 0.12,
        ipChange: 0.10,
        unusualSpeed: 0.15,
        suspiciousPattern: 0.12,
        aiDetection: 0.18,
        networkAnomaly: 0.05,
      },
      thresholds: {
        low: 25,
        medium: 50,
        high: 75,
        critical: 100,
      },
      riskLevels: {
        low: {
          range: '0-25',
          description: 'No significant concerns detected',
          autoGrade: true,
        },
        medium: {
          range: '26-50',
          description: 'Minor concerns detected - review recommended',
          autoGrade: true,
        },
        high: {
          range: '51-75',
          description: 'Significant concerns - manual review required',
          autoGrade: false,
        },
        critical: {
          range: '76-100',
          description: 'Critical risk - do not auto-grade, investigate thoroughly',
          autoGrade: false,
        },
      },
    };

    res.json({
      success: true,
      data: config,
    });
  } catch (error: any) {
    console.error('[RISK SCORING API] Error fetching config:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch configuration',
      error: error.message,
    });
  }
});

export default router;
