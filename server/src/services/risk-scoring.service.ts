import { db } from '../db/index.js';
import { antiCheatEvents, examAttempts } from '../db/schema.js';
import { eq, and, gte, desc, sql } from 'drizzle-orm';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface RiskWeights {
  tabSwitches: number;
  copypaste: number;
  screenCapture: number;
  multipleDevices: number;
  ipChange: number;
  unusualSpeed: number;
  suspiciousPattern: number;
  aiDetection: number;
  networkAnomaly: number;
}

export interface RiskThresholds {
  low: number;
  medium: number;
  high: number;
  critical: number;
}

export interface RiskFactorExplanation {
  factor: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  weight: number;
  contribution: number;
  description: string;
  evidence: string[];
}

export interface RiskScoreResult {
  attemptId: string;
  studentId: string;
  examId: string;
  riskScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  flaggedForReview: boolean;
  autoGraded: boolean;
  compositeFactors: RiskFactorExplanation[];
  recommendations: string[];
  calculatedAt: Date;
}

export interface BehavioralMetrics {
  avgTimePerQuestion: number;
  answerPatternVariance: number;
  timeDeviationScore: number;
  rapidAnswerStreak: number;
  suspiciousNavigationCount: number;
}

export interface NetworkMetrics {
  ipChanges: number;
  deviceChanges: number;
  vpnDetected: boolean;
  proxySuspected: boolean;
  geoLocationInconsistencies: number;
}

export interface AIFlagMetrics {
  textSimilarityScore: number;
  plagiarismProbability: number;
  answerStyleInconsistency: number;
  knowledgeLevelAnomaly: number;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const DEFAULT_WEIGHTS: RiskWeights = {
  tabSwitches: 0.08,        // 8% weight
  copypaste: 0.15,          // 15% weight
  screenCapture: 0.05,      // 5% weight
  multipleDevices: 0.12,    // 12% weight
  ipChange: 0.10,           // 10% weight
  unusualSpeed: 0.15,       // 15% weight
  suspiciousPattern: 0.12,  // 12% weight
  aiDetection: 0.18,        // 18% weight (highest)
  networkAnomaly: 0.05,     // 5% weight
};

const DEFAULT_THRESHOLDS: RiskThresholds = {
  low: 25,      // 0-25: Low risk
  medium: 50,   // 26-50: Medium risk
  high: 75,     // 51-75: High risk
  critical: 100, // 76-100: Critical risk
};

// Event type to factor mapping
const EVENT_FACTOR_MAP: Record<string, keyof RiskWeights> = {
  'tab_switch': 'tabSwitches',
  'window_blur': 'tabSwitches',
  'copy_paste': 'copypaste',
  'right_click': 'copypaste',
  'devtools_open': 'screenCapture',
  'screenshot_detected': 'screenCapture',
  'multiple_sessions': 'multipleDevices',
  'device_change': 'multipleDevices',
  'ip_change': 'ipChange',
  'vpn_detected': 'networkAnomaly',
  'unusual_speed': 'unusualSpeed',
  'suspicious_pattern': 'suspiciousPattern',
  'ai_flag': 'aiDetection',
  'plagiarism_detected': 'aiDetection',
};

// ============================================================================
// SERVICE CLASS
// ============================================================================

export class RiskScoringService {
  
  /**
   * Calculate comprehensive risk score for an exam attempt
   * Combines anti-cheat events, behavioral analytics, AI flags, and network signals
   */
  static async calculateRiskScore(
    attemptId: string,
    options?: {
      weights?: Partial<RiskWeights>;
      thresholds?: Partial<RiskThresholds>;
    }
  ): Promise<RiskScoreResult> {
    // Merge custom weights and thresholds with defaults
    const weights = { ...DEFAULT_WEIGHTS, ...options?.weights };
    const thresholds = { ...DEFAULT_THRESHOLDS, ...options?.thresholds };

    // Step 1: Fetch exam attempt
    const attempt = await db.query.examAttempts.findFirst({
      where: eq(examAttempts.id, attemptId),
    });

    if (!attempt) {
      throw new Error('Exam attempt not found.');
    }

    // Step 2: Fetch all anti-cheat events for this attempt
    const events = await db.query.antiCheatEvents.findMany({
      where: eq(antiCheatEvents.attemptId, attemptId),
      orderBy: [desc(antiCheatEvents.createdAt)],
    });

    // Step 3: Analyze behavioral metrics
    const behavioralMetrics = await this.analyzeBehavioralMetrics(attemptId, events);

    // Step 4: Analyze network metrics
    const networkMetrics = await this.analyzeNetworkMetrics(attemptId, events);

    // Step 5: Analyze AI flags
    const aiMetrics = await this.analyzeAIFlags(attemptId, attempt);

    // Step 6: Calculate weighted risk factors
    const riskFactors = this.calculateRiskFactors(
      events,
      behavioralMetrics,
      networkMetrics,
      aiMetrics,
      weights
    );

    // Step 7: Calculate composite risk score (0-100)
    const riskScore = this.calculateCompositeScore(riskFactors);

    // Step 8: Determine risk level
    const riskLevel = this.determineRiskLevel(riskScore, thresholds);

    // Step 9: Determine if flagged for review
    const flaggedForReview = riskLevel === 'high' || riskLevel === 'critical';

    // Step 10: Generate recommendations
    const recommendations = this.generateRecommendations(riskLevel, riskFactors);

    console.log(`[RISK SCORING] Attempt ${attemptId}: Risk Score ${riskScore}/100 (${riskLevel})`);

    return {
      attemptId,
      studentId: attempt.studentId,
      examId: attempt.examId,
      riskScore: Math.round(riskScore * 100) / 100,
      riskLevel,
      flaggedForReview,
      autoGraded: !flaggedForReview, // Don't auto-grade flagged attempts
      compositeFactors: riskFactors,
      recommendations,
      calculatedAt: new Date(),
    };
  }

  /**
   * Analyze behavioral metrics from events and timing patterns
   */
  private static async analyzeBehavioralMetrics(
    attemptId: string,
    events: any[]
  ): Promise<BehavioralMetrics> {
    // Calculate average time per question
    const answerTimes = events
      .filter(e => e.eventType === 'question_answered')
      .map(e => e.metadata?.timeSpent || 0);

    const avgTimePerQuestion = answerTimes.length > 0
      ? answerTimes.reduce((sum, time) => sum + time, 0) / answerTimes.length
      : 0;

    // Calculate answer pattern variance
    const answerPatternVariance = this.calculateVariance(answerTimes);

    // Calculate time deviation score
    const expectedTime = 60; // Expected 60 seconds per question
    const timeDeviationScore = avgTimePerQuestion > 0
      ? Math.abs(avgTimePerQuestion - expectedTime) / expectedTime
      : 0;

    // Count rapid answer streaks (< 10 seconds)
    let rapidAnswerStreak = 0;
    let currentStreak = 0;
    answerTimes.forEach(time => {
      if (time < 10) {
        currentStreak++;
        rapidAnswerStreak = Math.max(rapidAnswerStreak, currentStreak);
      } else {
        currentStreak = 0;
      }
    });

    // Count suspicious navigation events
    const suspiciousNavigationCount = events.filter(e =>
      ['tab_switch', 'window_blur', 'back_navigation', 'forward_navigation'].includes(e.eventType)
    ).length;

    return {
      avgTimePerQuestion,
      answerPatternVariance,
      timeDeviationScore,
      rapidAnswerStreak,
      suspiciousNavigationCount,
    };
  }

  /**
   * Analyze network-related metrics
   */
  private static async analyzeNetworkMetrics(
    attemptId: string,
    events: any[]
  ): Promise<NetworkMetrics> {
    // Count IP changes
    const ipChanges = events.filter(e => e.eventType === 'ip_change').length;

    // Count device changes
    const deviceChanges = events.filter(e => e.eventType === 'device_change').length;

    // Check for VPN detection
    const vpnDetected = events.some(e => e.eventType === 'vpn_detected');

    // Check for proxy suspicion
    const proxySuspected = events.some(e => e.metadata?.proxySuspected);

    // Count geolocation inconsistencies
    const geoLocationInconsistencies = events.filter(e =>
      e.eventType === 'geolocation_mismatch'
    ).length;

    return {
      ipChanges,
      deviceChanges,
      vpnDetected,
      proxySuspected,
      geoLocationInconsistencies,
    };
  }

  /**
   * Analyze AI-based flags (placeholder for future AI integration)
   */
  private static async analyzeAIFlags(
    attemptId: string,
    attempt: any
  ): Promise<AIFlagMetrics> {
    // Placeholder: These would come from AI analysis of exam answers
    // For now, we check for AI-related anti-cheat events

    const events = await db.query.antiCheatEvents.findMany({
      where: eq(antiCheatEvents.attemptId, attemptId),
    });

    const aiEvents = events.filter(e =>
      ['ai_flag', 'suspicious_pattern'].includes(e.eventType)
    );

    // Extract AI metrics from event metadata (with type safety)
    const textSimilarityScore = aiEvents
      .map(e => {
        const metadata = e.metadata as Record<string, any> | null;
        return metadata?.similarityScore || 0;
      })
      .reduce((max, score) => Math.max(max, score), 0);

    const plagiarismProbability = aiEvents
      .filter(e => e.eventType === 'suspicious_pattern')
      .length > 0 ? 0.8 : 0.0;

    const answerStyleInconsistency = aiEvents
      .map(e => {
        const metadata = e.metadata as Record<string, any> | null;
        return metadata?.styleInconsistency || 0;
      })
      .reduce((max, score) => Math.max(max, score), 0);

    const knowledgeLevelAnomaly = aiEvents
      .map(e => {
        const metadata = e.metadata as Record<string, any> | null;
        return metadata?.knowledgeAnomaly || 0;
      })
      .reduce((max, score) => Math.max(max, score), 0);

    return {
      textSimilarityScore,
      plagiarismProbability,
      answerStyleInconsistency,
      knowledgeLevelAnomaly,
    };
  }

  /**
   * Calculate risk factors with weights
   */
  private static calculateRiskFactors(
    events: any[],
    behavioral: BehavioralMetrics,
    network: NetworkMetrics,
    ai: AIFlagMetrics,
    weights: RiskWeights
  ): RiskFactorExplanation[] {
    const factors: RiskFactorExplanation[] = [];

    // Factor 1: Tab Switches
    const tabSwitchCount = events.filter(e =>
      ['tab_switch', 'window_blur'].includes(e.eventType)
    ).length;
    if (tabSwitchCount > 0) {
      const severity = this.getSeverityFromCount(tabSwitchCount, [3, 7, 15]);
      factors.push({
        factor: 'Tab Switches',
        severity,
        weight: weights.tabSwitches,
        contribution: this.calculateContribution(tabSwitchCount, 20, weights.tabSwitches),
        description: `Student switched tabs or windows ${tabSwitchCount} times during the exam`,
        evidence: [`${tabSwitchCount} tab/window switches detected`],
      });
    }

    // Factor 2: Copy/Paste
    const copyPasteCount = events.filter(e =>
      ['copy_paste', 'right_click'].includes(e.eventType)
    ).length;
    if (copyPasteCount > 0) {
      const severity = this.getSeverityFromCount(copyPasteCount, [2, 5, 10]);
      factors.push({
        factor: 'Copy/Paste Activity',
        severity,
        weight: weights.copypaste,
        contribution: this.calculateContribution(copyPasteCount, 15, weights.copypaste),
        description: `Copy/paste or right-click events detected ${copyPasteCount} times`,
        evidence: [`${copyPasteCount} copy/paste events`],
      });
    }

    // Factor 3: Screen Capture
    const screenCaptureCount = events.filter(e =>
      ['screenshot_detected', 'devtools_open'].includes(e.eventType)
    ).length;
    if (screenCaptureCount > 0) {
      const severity = this.getSeverityFromCount(screenCaptureCount, [1, 3, 5]);
      factors.push({
        factor: 'Screen Capture',
        severity,
        weight: weights.screenCapture,
        contribution: this.calculateContribution(screenCaptureCount, 10, weights.screenCapture),
        description: `Screenshot attempts or developer tools detected`,
        evidence: [`${screenCaptureCount} screen capture events`],
      });
    }

    // Factor 4: Multiple Devices
    if (network.deviceChanges > 0) {
      const severity = this.getSeverityFromCount(network.deviceChanges, [1, 2, 3]);
      factors.push({
        factor: 'Multiple Devices',
        severity,
        weight: weights.multipleDevices,
        contribution: this.calculateContribution(network.deviceChanges, 5, weights.multipleDevices),
        description: `Exam was accessed from ${network.deviceChanges} different devices`,
        evidence: [`${network.deviceChanges} device changes`],
      });
    }

    // Factor 5: IP Changes
    if (network.ipChanges > 0) {
      const severity = this.getSeverityFromCount(network.ipChanges, [1, 2, 4]);
      factors.push({
        factor: 'IP Address Changes',
        severity,
        weight: weights.ipChange,
        contribution: this.calculateContribution(network.ipChanges, 5, weights.ipChange),
        description: `IP address changed ${network.ipChanges} times during exam`,
        evidence: [`${network.ipChanges} IP changes`],
      });
    }

    // Factor 6: Unusual Speed
    if (behavioral.rapidAnswerStreak >= 3) {
      const severity = this.getSeverityFromCount(behavioral.rapidAnswerStreak, [3, 5, 10]);
      factors.push({
        factor: 'Unusual Answer Speed',
        severity,
        weight: weights.unusualSpeed,
        contribution: this.calculateContribution(behavioral.rapidAnswerStreak, 15, weights.unusualSpeed),
        description: `Answered ${behavioral.rapidAnswerStreak} questions in rapid succession (< 10 seconds each)`,
        evidence: [
          `Rapid answer streak: ${behavioral.rapidAnswerStreak}`,
          `Average time: ${behavioral.avgTimePerQuestion.toFixed(1)}s per question`,
        ],
      });
    }

    // Factor 7: Suspicious Pattern
    if (behavioral.suspiciousNavigationCount > 5) {
      const severity = this.getSeverityFromCount(behavioral.suspiciousNavigationCount, [5, 15, 30]);
      factors.push({
        factor: 'Suspicious Navigation Pattern',
        severity,
        weight: weights.suspiciousPattern,
        contribution: this.calculateContribution(behavioral.suspiciousNavigationCount, 40, weights.suspiciousPattern),
        description: `Unusual navigation pattern detected with ${behavioral.suspiciousNavigationCount} events`,
        evidence: [`${behavioral.suspiciousNavigationCount} suspicious navigation events`],
      });
    }

    // Factor 8: AI Detection
    if (ai.plagiarismProbability > 0 || ai.textSimilarityScore > 0.5) {
      const severity = ai.plagiarismProbability > 0.7 ? 'critical' : 
                      ai.textSimilarityScore > 0.8 ? 'high' : 'medium';
      const contribution = Math.max(
        ai.plagiarismProbability,
        ai.textSimilarityScore
      ) * 100 * weights.aiDetection;
      
      factors.push({
        factor: 'AI Detection',
        severity,
        weight: weights.aiDetection,
        contribution,
        description: 'AI analysis detected potential plagiarism or answer similarity',
        evidence: [
          `Text similarity: ${(ai.textSimilarityScore * 100).toFixed(1)}%`,
          `Plagiarism probability: ${(ai.plagiarismProbability * 100).toFixed(1)}%`,
        ],
      });
    }

    // Factor 9: Network Anomaly
    if (network.vpnDetected || network.proxySuspected) {
      const severity = network.vpnDetected && network.proxySuspected ? 'high' : 'medium';
      factors.push({
        factor: 'Network Anomaly',
        severity,
        weight: weights.networkAnomaly,
        contribution: weights.networkAnomaly * 100,
        description: 'VPN or proxy detected during exam',
        evidence: [
          network.vpnDetected ? 'VPN detected' : '',
          network.proxySuspected ? 'Proxy suspected' : '',
        ].filter(Boolean),
      });
    }

    return factors;
  }

  /**
   * Calculate composite risk score (0-100)
   */
  private static calculateCompositeScore(factors: RiskFactorExplanation[]): number {
    const totalContribution = factors.reduce((sum, factor) => sum + factor.contribution, 0);
    return Math.min(100, totalContribution);
  }

  /**
   * Determine risk level based on score and thresholds
   */
  private static determineRiskLevel(
    score: number,
    thresholds: RiskThresholds
  ): 'low' | 'medium' | 'high' | 'critical' {
    if (score >= thresholds.high) return 'critical';
    if (score >= thresholds.medium) return 'high';
    if (score >= thresholds.low) return 'medium';
    return 'low';
  }

  /**
   * Generate recommendations for teachers
   */
  private static generateRecommendations(
    riskLevel: 'low' | 'medium' | 'high' | 'critical',
    factors: RiskFactorExplanation[]
  ): string[] {
    const recommendations: string[] = [];

    if (riskLevel === 'low') {
      recommendations.push('No significant concerns detected. Proceed with automatic grading.');
      return recommendations;
    }

    if (riskLevel === 'medium') {
      recommendations.push('⚠️ Minor concerns detected. Review flagged events before finalizing grade.');
    }

    if (riskLevel === 'high') {
      recommendations.push('⚠️ Significant concerns detected. Manual review recommended before grading.');
      recommendations.push('Consider reviewing the student\'s answer patterns and timestamps.');
    }

    if (riskLevel === 'critical') {
      recommendations.push('🚨 Critical risk detected. Do not auto-grade. Conduct thorough investigation.');
      recommendations.push('Contact the student for clarification before finalizing grade.');
      recommendations.push('Consider administering a supervised retake if cheating is confirmed.');
    }

    // Factor-specific recommendations
    const highRiskFactors = factors.filter(f => f.severity === 'high' || f.severity === 'critical');
    
    if (highRiskFactors.some(f => f.factor === 'AI Detection')) {
      recommendations.push('🔍 Review answers for plagiarism using manual verification tools.');
    }

    if (highRiskFactors.some(f => f.factor === 'Multiple Devices')) {
      recommendations.push('🔍 Verify if student had a legitimate reason for device changes.');
    }

    if (highRiskFactors.some(f => f.factor === 'Unusual Answer Speed')) {
      recommendations.push('🔍 Review answer quality - rapid answers may indicate pre-prepared responses.');
    }

    if (highRiskFactors.some(f => f.factor === 'Tab Switches')) {
      recommendations.push('🔍 Check if external resources were accessed during tab switches.');
    }

    return recommendations;
  }

  /**
   * Get severity level based on count and thresholds
   */
  private static getSeverityFromCount(
    count: number,
    thresholds: [number, number, number]
  ): 'low' | 'medium' | 'high' | 'critical' {
    const [low, medium, high] = thresholds;
    if (count >= high) return 'critical';
    if (count >= medium) return 'high';
    if (count >= low) return 'medium';
    return 'low';
  }

  /**
   * Calculate contribution to risk score
   */
  private static calculateContribution(
    count: number,
    maxCount: number,
    weight: number
  ): number {
    const normalizedCount = Math.min(count / maxCount, 1.0);
    return normalizedCount * 100 * weight;
  }

  /**
   * Calculate variance of an array of numbers
   */
  private static calculateVariance(values: number[]): number {
    if (values.length === 0) return 0;
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    return squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
  }

  /**
   * Get all flagged attempts for a teacher/admin
   */
  static async getFlaggedAttempts(
    examId?: string,
    options?: {
      minRiskLevel?: 'medium' | 'high' | 'critical';
      limit?: number;
    }
  ): Promise<Array<{
    attemptId: string;
    studentId: string;
    examId: string;
    riskScore: number;
    riskLevel: string;
    flaggedAt: Date;
  }>> {
    // This is a placeholder - in production, you'd store risk scores in DB
    // For now, we calculate on-the-fly for recent attempts
    
    const query = examId
      ? eq(examAttempts.examId, examId)
      : sql`true`;

    const attempts = await db.query.examAttempts.findMany({
      where: query,
      orderBy: [desc(examAttempts.createdAt)],
      limit: options?.limit || 50,
    });

    const flaggedResults = [];

    for (const attempt of attempts) {
      try {
        const riskScore = await this.calculateRiskScore(attempt.id);
        
        // Filter by minimum risk level
        const minLevel = options?.minRiskLevel || 'medium';
        const levelOrder = { low: 0, medium: 1, high: 2, critical: 3 };
        
        if (levelOrder[riskScore.riskLevel] >= levelOrder[minLevel]) {
          flaggedResults.push({
            attemptId: attempt.id,
            studentId: attempt.studentId,
            examId: attempt.examId,
            riskScore: riskScore.riskScore,
            riskLevel: riskScore.riskLevel,
            flaggedAt: riskScore.calculatedAt,
          });
        }
      } catch (error) {
        console.error(`[RISK SCORING] Error calculating risk for attempt ${attempt.id}:`, error);
      }
    }

    return flaggedResults;
  }
}

export default RiskScoringService;
