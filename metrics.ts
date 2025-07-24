import { storage } from '../storage';
import type { MetricsSummary, MetricValue, CoreMetrics, NovelMetrics } from '@shared/schema';

export class MetricsService {
  async computeTrends(gameIds: string[]): Promise<any> {
    // Get games and compute metrics for each individually to create trends
    const games = await storage.getGames();
    const selectedGames = games.filter(g => gameIds.includes(g.id));
    
    if (selectedGames.length < 2) {
      return {};
    }

    const trends: any = {};
    
    // For each metric, create a trend array
    const metricKeys = ['defensiveSuccessRate', 'havocRate', 'stuffRate', 'explosivesAllowedRate'];
    
    for (const metricKey of metricKeys) {
      trends[metricKey] = [];
      
      for (const game of selectedGames) {
        const gameMetrics = await this.computeMetricsSummary([game.id]);
        const value = (gameMetrics.core as any)[metricKey]?.value || 0;
        
        trends[metricKey].push({
          name: game.displayName || game.filename,
          value: value
        });
      }
    }
    
    return trends;
  }

  async computeMetricsSummary(gameIds?: string[]): Promise<MetricsSummary> {
    // Always compute fresh metrics - no caching issues
    const plays = await storage.getPlays(gameIds ? { gameIds } : undefined);
    const drives = await storage.getDrives();
    const filteredDrives = gameIds ? drives.filter(d => gameIds.includes(d.gameId)) : drives;
    
    console.log(`Computing metrics for ${plays.length} plays and ${filteredDrives.length} drives. Game IDs: ${gameIds?.join(', ') || 'ALL'}`);
    
    // If no data, return zero metrics
    if (plays.length === 0) {
      return this.getZeroMetrics();
    }

    const core = await this.computeCoreMetrics(plays, filteredDrives);
    const novel = await this.computeNovelMetrics(plays, filteredDrives);
    const driveEndDistribution = this.computeDriveEndDistribution(filteredDrives);

    const summary: MetricsSummary = {
      core,
      novel,
      driveEndDistribution
    };

    return summary;
  }

  private getZeroMetrics(): MetricsSummary {
    return {
      core: {
        defensiveSuccessRate: { value: 0, explanation: "No game data uploaded yet" },
        havocRate: { value: 0, explanation: "No game data uploaded yet" },
        stuffRate: { value: 0, explanation: "No game data uploaded yet" },
        explosivesAllowedRate: { value: 0, explanation: "No game data uploaded yet" },
        redZoneTdPercentAllowed: { value: 0, explanation: "No game data uploaded yet" },
        thirdDownStopRate: { value: 0, explanation: "No game data uploaded yet" },
        takeawayRate: { value: 0, explanation: "No game data uploaded yet" },
        pointsPerDriveAllowed: { value: 0, explanation: "No game data uploaded yet" },
        avgStartFieldPosition: { value: 50, explanation: "No game data uploaded yet" },
        passerDisruptionRate: { value: 0, explanation: "No game data uploaded yet" },
        penaltyHurtRate: { value: 0, explanation: "No game data uploaded yet" },
        earlyDownSuccess: { value: 0, explanation: "No game data uploaded yet" },
        avgThirdDownDistance: { value: 0, explanation: "No game data uploaded yet" }
      },
      novel: {
        containIntegrityIndex: { value: 0, explanation: "No game data uploaded yet" },
        explosiveResponseFactor: { value: 0, explanation: "No game data uploaded yet" },
        sustainedPressureScore: { value: 0, explanation: "No game data uploaded yet" },
        finishingStrength: { value: 0, explanation: "No game data uploaded yet" },
        driveStressIndex: { value: 0, explanation: "No game data uploaded yet" },
        negativeNetYardageChain: { value: 0, explanation: "No game data uploaded yet" },
        explosiveDifferential: { value: 0, explanation: "No game data uploaded yet" },
        redZoneShrinkFactor: { value: 0, explanation: "No game data uploaded yet" },
        situationalFlexScore: { value: 0, explanation: "No game data uploaded yet" },
        formationStressRate: { value: 0, explanation: "No game data uploaded yet" },
        adaptiveAdjustmentLag: { value: 0, explanation: "No game data uploaded yet" },
        pressureToOutcomeRatio: { value: 0, explanation: "No game data uploaded yet" },
        driveKillActionsPerDrive: { value: 0, explanation: "No game data uploaded yet" },
        coverageContestRate: { value: 0, explanation: "No game data uploaded yet" },
        fieldZoneEpaSurrogate: { value: 0, explanation: "No game data uploaded yet" },
        momentumSwingIndex: { value: 0, explanation: "No game data uploaded yet" }
      },
      driveEndDistribution: { TD: 0, FG: 0, Punt: 0, INT: 0, Fumble: 0, Downs: 0, Other: 0 }
    };
  }

  private async computeCoreMetrics(plays: any[], drives: any[]): Promise<CoreMetrics> {
    const totalPlays = plays.length;
    const defensivePlays = plays.filter(p => p.defenseSuccess !== null && p.defenseSuccess !== undefined);
    const runPlays = plays.filter(p => p.isRun === true);
    const passPlays = plays.filter(p => p.isPass === true);
    const redZonePlays = plays.filter(p => p.fieldZone === 'Red Zone');
    const redZoneDrives = drives.filter(d => d.startYardToGoal !== null && d.startYardToGoal <= 20);
    const thirdDownPlays = plays.filter(p => p.down === 3);
    
    console.log(`Total plays: ${totalPlays}, Defensive plays: ${defensivePlays.length}, Run: ${runPlays.length}, Pass: ${passPlays.length}, 3rd down: ${thirdDownPlays.length}, Red zone drives: ${redZoneDrives.length}`);

    return {
      defensiveSuccessRate: this.createMetricValue(
        this.calculatePercentage(defensivePlays.filter(p => p.defenseSuccess).length, defensivePlays.length),
        "Percentage of plays where offense gained less than required yards for expected success"
      ),
      
      havocRate: this.createMetricValue(
        this.calculatePercentage(
          plays.filter(p => p.isTfl || p.isSack || p.isTakeaway || p.isPbu).length,
          totalPlays
        ),
        "Percentage of plays resulting in TFL, sacks, interceptions, or pass breakups"
      ),

      stuffRate: this.createMetricValue(
        this.calculatePercentage(
          runPlays.filter(p => p.gain !== null && p.gain <= 0).length,
          runPlays.length
        ),
        "Percentage of run plays held to zero or negative yards"
      ),

      explosivesAllowedRate: this.createMetricValue(
        this.calculatePercentage(plays.filter(p => p.isExplosive).length, totalPlays),
        "Percentage of plays resulting in explosive gains (10+ rush, 15+ pass)"
      ),

      redZoneTdPercentAllowed: this.createMetricValue(
        this.calculatePercentage(
          redZoneDrives.filter(d => d.result === 'TD').length,
          redZoneDrives.length
        ),
        "Percentage of red zone drives ending in touchdowns"
      ),

      thirdDownStopRate: this.createMetricValue(
        this.calculatePercentage(
          thirdDownPlays.filter(p => p.defenseSuccess).length,
          thirdDownPlays.length
        ),
        "Percentage of third down plays that were defensive successes"
      ),

      takeawayRate: this.createMetricValue(
        drives.length > 0 ? plays.filter(p => p.isTakeaway).length / drives.length : 0,
        "Average takeaways per defensive drive"
      ),

      pointsPerDriveAllowed: this.createMetricValue(
        this.estimatePointsPerDrive(drives),
        "Estimated points allowed per opposing drive"
      ),

      avgStartFieldPosition: this.createMetricValue(
        drives.length > 0 ? drives.reduce((sum, d) => sum + (d.startYardToGoal || 50), 0) / drives.length : 50,
        "Average yards to goal at start of opposing drives"
      ),

      passerDisruptionRate: this.createMetricValue(
        this.calculatePercentage(
          passPlays.filter(p => p.isSack || p.isPbu || p.isTakeaway).length,
          passPlays.length
        ),
        "Percentage of pass plays with sacks, PBUs, or interceptions"
      ),

      penaltyHurtRate: this.createMetricValue(
        drives.length > 0 ? plays.filter(p => p.isPenaltyDefense).length / drives.length : 0,
        "Average defensive penalties per drive"
      ),

      earlyDownSuccess: this.createMetricValue(
        this.calculatePercentage(
          plays.filter(p => (p.down === 1 || p.down === 2) && p.defenseSuccess).length,
          plays.filter(p => p.down === 1 || p.down === 2).length
        ),
        "Defensive success rate on 1st and 2nd downs"
      ),

      avgThirdDownDistance: this.createMetricValue(
        thirdDownPlays.length > 0 ? thirdDownPlays.reduce((sum, p) => sum + (p.distance || 0), 0) / thirdDownPlays.length : 0,
        "Average yards to go on third down attempts"
      )
    };
  }

  private async computeNovelMetrics(plays: any[], drives: any[]): Promise<NovelMetrics> {
    return {
      containIntegrityIndex: this.computeContainIntegrityIndex(plays),
      explosiveResponseFactor: this.computeExplosiveResponseFactor(plays),
      sustainedPressureScore: this.computeSustainedPressureScore(plays),
      finishingStrength: this.computeFinishingStrength(plays),
      driveStressIndex: this.computeDriveStressIndex(drives),
      negativeNetYardageChain: this.computeNegativeNetYardageChain(plays),
      explosiveDifferential: this.computeExplosiveDifferential(plays, drives),
      redZoneShrinkFactor: this.computeRedZoneShrinkFactor(plays),
      situationalFlexScore: this.computeSituationalFlexScore(plays),
      formationStressRate: this.computeFormationStressRate(plays),
      adaptiveAdjustmentLag: this.computeAdaptiveAdjustmentLag(plays),
      pressureToOutcomeRatio: this.computePressureToOutcomeRatio(plays),
      driveKillActionsPerDrive: this.computeDriveKillActionsPerDrive(plays, drives),
      coverageContestRate: this.computeCoverageContestRate(plays),
      fieldZoneEpaSurrogate: this.computeFieldZoneEpaSurrogate(plays),
      momentumSwingIndex: this.computeMomentumSwingIndex(plays)
    };
  }

  // Novel metric implementations
  private computeContainIntegrityIndex(plays: any[]): MetricValue {
    const edgeRuns = plays.filter(p => 
      p.isRun && p.playDirection && 
      (p.playDirection.toLowerCase().includes('outside') || 
       p.playDirection.toLowerCase().includes('edge') ||
       p.playDirection.toLowerCase().includes('sweep'))
    );
    
    const containedRuns = edgeRuns.filter(p => p.gain !== null && p.gain <= 5);
    
    return this.createMetricValue(
      this.calculatePercentage(containedRuns.length, edgeRuns.length),
      "Percentage of edge runs held to 5 yards or fewer - measures edge containment discipline"
    );
  }

  private computeExplosiveResponseFactor(plays: any[]): MetricValue {
    let totalResponse = 0;
    let explosiveCount = 0;

    for (let i = 0; i < plays.length - 2; i++) {
      if (plays[i].isExplosive) {
        explosiveCount++;
        const next2Plays = plays.slice(i + 1, i + 3);
        const successCount = next2Plays.filter(p => p.defenseSuccess).length;
        totalResponse += successCount / next2Plays.length;
      }
    }

    const responseRate = explosiveCount > 0 ? totalResponse / explosiveCount : 0;

    return this.createMetricValue(
      responseRate,
      "Average defensive success rate of the next 2 plays after allowing an explosive play"
    );
  }

  private computeSustainedPressureScore(plays: any[]): MetricValue {
    const passPlays = plays.filter(p => p.isPass);
    let pressureSum = 0;
    let windowCount = 0;

    for (let i = 9; i < passPlays.length; i++) {
      const window = passPlays.slice(i - 9, i + 1);
      const pressureEvents = window.filter(p => p.isSack || p.isPbu || p.isTakeaway).length;
      pressureSum += pressureEvents / window.length;
      windowCount++;
    }

    return this.createMetricValue(
      windowCount > 0 ? pressureSum / windowCount : 0,
      "Moving average of passer disruption rate over last 10 pass plays"
    );
  }

  private computeFinishingStrength(plays: any[]): MetricValue {
    const totalPlays = plays.filter(p => p.defenseSuccess !== null);
    const lateGamePlays = plays.filter(p => p.quarter >= 3 && p.defenseSuccess !== null);

    const overallSuccess = this.calculatePercentage(
      totalPlays.filter(p => p.defenseSuccess).length,
      totalPlays.length
    );

    const lateGameSuccess = this.calculatePercentage(
      lateGamePlays.filter(p => p.defenseSuccess).length,
      lateGamePlays.length
    );

    const ratio = overallSuccess > 0 ? lateGameSuccess / overallSuccess : 0;

    return this.createMetricValue(
      ratio,
      "Ratio of late-game (3rd/4th quarter) success rate to overall success rate"
    );
  }

  private computeDriveStressIndex(drives: any[]): MetricValue {
    if (drives.length === 0) {
      return this.createMetricValue(0, "Composite stress score based on plays, yards, and conversions (0-100 scale)");
    }

    let totalStress = 0;

    for (const drive of drives) {
      const playsComponent = Math.min(drive.totalPlays / 15, 1) * 0.4;
      const yardsComponent = Math.min(drive.totalYards / 80, 1) * 0.3;
      
      // Estimate conversion rate (simplified)
      const conversionComponent = drive.result === 'TD' ? 1 : drive.result === 'FG' ? 0.7 : 0;
      const convRate = conversionComponent * 0.3;
      
      const driveStress = (playsComponent + yardsComponent + convRate) * 100;
      totalStress += driveStress;
    }

    return this.createMetricValue(
      totalStress / drives.length,
      "Composite stress score based on plays (40%), yards (30%), and conversions (30%) on 0-100 scale"
    );
  }

  private computeNegativeNetYardageChain(plays: any[]): MetricValue {
    let maxChain = 0;
    let currentChain = 0;

    for (const play of plays) {
      if (play.gain !== null && play.gain <= 0) {
        currentChain++;
        maxChain = Math.max(maxChain, currentChain);
      } else {
        currentChain = 0;
      }
    }

    return this.createMetricValue(
      maxChain,
      "Maximum consecutive defensive plays holding offense to zero or negative net yards"
    );
  }

  private computeExplosiveDifferential(plays: any[], drives: any[]): MetricValue {
    const explosivesPerDrive = drives.length > 0 ? 
      plays.filter(p => p.isExplosive).length / drives.length : 0;
    
    // Use a reasonable season average for comparison
    const seasonAverage = 1.8; // Approximate league average
    
    return this.createMetricValue(
      explosivesPerDrive - seasonAverage,
      "Difference between current explosive plays per drive and season average"
    );
  }

  private computeRedZoneShrinkFactor(plays: any[]): MetricValue {
    const redZonePlays = plays.filter(p => p.fieldZone === 'Red Zone' && p.defenseSuccess !== null);
    const nonRedZonePlays = plays.filter(p => p.fieldZone !== 'Red Zone' && p.defenseSuccess !== null);

    const rzSuccess = this.calculatePercentage(
      redZonePlays.filter(p => p.defenseSuccess).length,
      redZonePlays.length
    );

    const nonRzSuccess = this.calculatePercentage(
      nonRedZonePlays.filter(p => p.defenseSuccess).length,
      nonRedZonePlays.length
    );

    return this.createMetricValue(
      rzSuccess - nonRzSuccess,
      "Difference between red zone and non-red zone defensive success rates"
    );
  }

  private computeSituationalFlexScore(plays: any[]): MetricValue {
    const situations = ['Own 0-20', 'Own 21-40', 'Midfield 41-59', 'Opp 40-21', 'Red Zone'];
    const successRates: number[] = [];

    for (const situation of situations) {
      const situationPlays = plays.filter(p => p.fieldZone === situation && p.defenseSuccess !== null);
      if (situationPlays.length > 0) {
        successRates.push(this.calculatePercentage(
          situationPlays.filter(p => p.defenseSuccess).length,
          situationPlays.length
        ));
      }
    }

    if (successRates.length === 0) {
      return this.createMetricValue(0, "Consistency of performance across field zones (1 = perfectly consistent)");
    }

    const mean = successRates.reduce((sum, rate) => sum + rate, 0) / successRates.length;
    const variance = successRates.reduce((sum, rate) => sum + Math.pow(rate - mean, 2), 0) / successRates.length;
    const stdDev = Math.sqrt(variance);
    const normalizedStdDev = mean > 0 ? stdDev / mean : 0;
    
    return this.createMetricValue(
      Math.max(0, 1 - normalizedStdDev),
      "Consistency of performance across field zones (1 = perfectly consistent, 0 = highly variable)"
    );
  }

  private computeFormationStressRate(plays: any[]): MetricValue {
    const formations = [...new Set(plays.map(p => p.offenseFormation).filter(Boolean))];
    const stressRates: { formation: string; rate: number }[] = [];

    for (const formation of formations) {
      const formationPlays = plays.filter(p => p.offenseFormation === formation);
      const stressEvents = formationPlays.filter(p => p.isExplosive || (p.down === 3 && !p.defenseSuccess));
      
      if (formationPlays.length > 0) {
        stressRates.push({
          formation,
          rate: this.calculatePercentage(stressEvents.length, formationPlays.length)
        });
      }
    }

    stressRates.sort((a, b) => b.rate - a.rate);
    const worstRate = stressRates.length > 0 ? stressRates[0].rate : 0;

    return this.createMetricValue(
      worstRate,
      `Stress rate for worst formation: ${stressRates[0]?.formation || 'N/A'} (${worstRate.toFixed(1)}%)`
    );
  }

  private computeAdaptiveAdjustmentLag(plays: any[]): MetricValue {
    // Simplified implementation - would need more complex analysis in production
    const formationExplosives = new Map();
    const adjustmentLags: number[] = [];

    for (let i = 0; i < plays.length; i++) {
      const play = plays[i];
      if (play.isExplosive && play.offenseFormation) {
        const formation = play.offenseFormation;
        
        // Look ahead for next successful stop vs this formation
        for (let j = i + 1; j < Math.min(i + 20, plays.length); j++) {
          const futurePlay = plays[j];
          if (futurePlay.offenseFormation === formation && futurePlay.defenseSuccess) {
            adjustmentLags.push(j - i);
            break;
          }
        }
      }
    }

    const medianLag = adjustmentLags.length > 0 ? 
      adjustmentLags.sort((a, b) => a - b)[Math.floor(adjustmentLags.length / 2)] : 0;

    return this.createMetricValue(
      medianLag,
      "Median plays between explosive by formation and next successful stop vs that formation"
    );
  }

  private computePressureToOutcomeRatio(plays: any[]): MetricValue {
    const pressureEvents = plays.filter(p => p.isSack || p.isPbu || p.isTakeaway).length;
    const outcomes = plays.filter(p => p.isTakeaway || p.isSack).length;

    return this.createMetricValue(
      pressureEvents > 0 ? outcomes / pressureEvents : 0,
      "Ratio of high-value outcomes (sacks + takeaways) to total pressure events"
    );
  }

  private computeDriveKillActionsPerDrive(plays: any[], drives: any[]): MetricValue {
    const killActions = plays.filter(p => 
      p.isSack || p.isTfl || p.isTakeaway || p.isPenaltyOffense
    ).length;

    return this.createMetricValue(
      drives.length > 0 ? killActions / drives.length : 0,
      "Average drive-killing actions (sacks, TFL, takeaways, offensive penalties) per drive"
    );
  }

  private computeCoverageContestRate(plays: any[]): MetricValue {
    const passTargets = plays.filter(p => p.isPass).length; // Approximation
    const contests = plays.filter(p => p.isPbu || p.isTakeaway).length;

    return this.createMetricValue(
      this.calculatePercentage(contests, passTargets),
      "Percentage of pass targets with pass breakups or interceptions"
    );
  }

  private computeFieldZoneEpaSurrogate(plays: any[]): MetricValue {
    // Simplified EPA calculation using field position weights
    const epaWeights = {
      'Own 0-20': -0.5,
      'Own 21-40': -0.2,
      'Midfield 41-59': 0.1,
      'Opp 40-21': 0.8,
      'Red Zone': 2.0,
      'Goal-to-Go': 3.0
    };

    let totalEpa = 0;
    let playCount = 0;

    for (const play of plays) {
      if (play.fieldZone && play.gain !== null) {
        const weight = epaWeights[play.fieldZone as keyof typeof epaWeights] || 0;
        const epaChange = play.defenseSuccess ? -weight * 0.5 : weight * 0.3;
        totalEpa += epaChange;
        playCount++;
      }
    }

    return this.createMetricValue(
      playCount > 0 ? totalEpa / playCount : 0,
      "Expected points impact per play by field zone (negative = good for defense)"
    );
  }

  private computeMomentumSwingIndex(plays: any[]): MetricValue {
    let momentum = 0;
    const swings: number[] = [];

    for (const play of plays) {
      let swing = 0;
      
      if (play.isTakeaway) swing += 2;
      if (play.down === 3 && play.defenseSuccess) swing += 1;
      if (play.isExplosive) swing -= 2;
      if (play.isTdAllowed) swing -= 3;
      if (play.isSack) swing += 1;
      if (play.isTfl) swing += 1;
      
      momentum += swing;
      swings.push(momentum);
    }

    const finalMomentum = swings.length > 0 ? swings[swings.length - 1] : 0;

    return this.createMetricValue(
      finalMomentum,
      "Cumulative momentum score (+2 takeaway, +1 3rd stop/sack/TFL, -2 explosive, -3 TD)"
    );
  }

  // Helper methods
  private createMetricValue(value: number, explanation: string, note?: string): MetricValue {
    return {
      value: isNaN(value) ? null : Math.round(value * 100) / 100,
      explanation,
      note
    };
  }

  private calculatePercentage(numerator: number, denominator: number): number {
    return denominator > 0 ? (numerator / denominator) * 100 : 0;
  }

  private computeDriveEndDistribution(drives: any[]): Record<string, number> {
    const distribution: Record<string, number> = {
      'TD': 0,
      'FG': 0,
      'Punt': 0,
      'INT': 0,
      'Fumble': 0,
      'Downs': 0,
      'Other': 0
    };

    for (const drive of drives) {
      const result = drive.result;
      if (distribution[result] !== undefined) {
        distribution[result]++;
      } else {
        distribution['Other']++;
      }
    }

    return distribution;
  }

  private estimatePointsPerDrive(drives: any[]): number {
    if (drives.length === 0) return 0;

    let totalPoints = 0;
    for (const drive of drives) {
      switch (drive.result) {
        case 'TD': totalPoints += 7; break;
        case 'FG': totalPoints += 3; break;
        default: totalPoints += 0;
      }
    }

    return totalPoints / drives.length;
  }

  private getCacheKey(gameIds?: string[]): string {
    return gameIds ? gameIds.sort().join(',') : 'all-games';
  }

  private isCacheValid(computedAt: Date): boolean {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    return computedAt > fiveMinutesAgo;
  }
}

export const metricsService = new MetricsService();
