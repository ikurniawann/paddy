/**
 * XP System Utilities for TalentPool
 * 
 * Helper functions for XP calculations, level progression, and gamification
 */

import { createBrowserClient } from "@/lib/pg/browser-client";

/**
 * XP Rules for TalentPool activities
 */
export const XP_RULES = {
  // Candidate Management
  candidate_added: 25,
  candidate_updated: 10,
  candidate_screening: 15,
  
  // Interview Activities
  interview_scheduled: 20,
  interview_completed: 40,
  interview_scorecard_filled: 15,
  
  // Hiring Success
  candidate_hired: 100,
  candidate_talent_pooled: 30,
  
  // Engagement
  daily_login: 5,
  fast_response: 20,
  weekly_streak: 50,
  
  // Quality
  complete_profile: 25,
  referral_hired: 150,
} as const;

/**
 * Level titles based on user level
 */
export const LEVEL_TITLES: Record<number, string> = {
  1: 'Recruiter',
  5: 'Senior Recruiter',
  10: 'HR Manager',
  15: 'HR Director',
  20: 'VP of Talent',
};

/**
 * Calculate level from total XP
 * Formula: level = floor(sqrt(total_xp / 1000)) + 1
 */
export function calculateLevel(totalXP: number): number {
  return Math.floor(Math.sqrt(totalXP / 1000)) + 1;
}

/**
 * Calculate XP needed for next level
 * Formula: xp_to_next = 1000 * 1.25^level
 */
export function calculateXPForNextLevel(level: number): number {
  return Math.floor(1000 * Math.pow(1.25, level));
}

/**
 * Get level title based on current level
 */
export function getLevelTitle(level: number): string {
  const levels = Object.keys(LEVEL_TITLES).map(Number).sort((a, b) => b - a);
  for (const lvl of levels) {
    if (level >= lvl) {
      return LEVEL_TITLES[lvl];
    }
  }
  return 'Recruiter';
}

/**
 * Calculate progress percentage to next level
 */
export function calculateLevelProgress(currentXP: number, xpToNext: number): number {
  return Math.min((currentXP / xpToNext) * 100, 100);
}

/**
 * XP Service Class
 */
export class XPService {
  private db;

  constructor() {
    this.db = createBrowserClient();
  }

  /**
   * Add XP to user for an activity
   */
  async addXP(
    userId: string,
    activityType: keyof typeof XP_RULES,
    description: string,
    referenceId?: string,
    referenceType?: string,
    metadata?: Record<string, any>
  ) {
    const xpAmount = XP_RULES[activityType];

    try {
      const { data, error } = await this.db.rpc('add_xp_to_user', {
        p_user_id: userId,
        p_xp_amount: xpAmount,
        p_activity_type: activityType,
        p_description: description,
        p_reference_id: referenceId ? referenceId : null,
        p_reference_type: referenceType ? referenceType : null,
        p_metadata: metadata ? metadata : null,
      });

      if (error) {
        console.error('Error adding XP:', error);
        return { success: false, error };
      }

      const [result] = data || [];
      
      // Check for badge unlocks
      if (result?.level_up) {
        await this.checkAndUnlockBadges(userId);
      }

      return {
        success: true,
        newXP: result?.new_xp,
        newLevel: result?.new_level,
        levelUp: result?.level_up,
      };
    } catch (error) {
      console.error('Error in addXP:', error);
      return { success: false, error };
    }
  }

  /**
   * Get user's XP stats
   */
  async getUserStats(userId: string) {
    try {
      const { data, error } = await this.db
        .from('user_xp_stats')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        console.error('Error fetching XP stats:', error);
        return null;
      }

      return {
        ...data,
        levelTitle: getLevelTitle(data.level),
        progress: calculateLevelProgress(data.current_xp, data.xp_to_next_level),
      };
    } catch (error) {
      console.error('Error in getUserStats:', error);
      return null;
    }
  }

  /**
   * Get user's recent XP activities
   */
  async getUserActivities(userId: string, limit: number = 20) {
    try {
      const { data, error } = await this.db
        .from('xp_activities')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching XP activities:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getUserActivities:', error);
      return [];
    }
  }

  /**
   * Get user's unlocked badges
   */
  async getUserBadges(userId: string) {
    try {
      const { data, error } = await this.db
        .from('user_badges')
        .select(`
          *,
          xp_badges (
            id,
            badge_name,
            badge_icon,
            badge_color,
            description,
            category
          )
        `)
        .eq('user_id', userId)
        .order('unlocked_at', { ascending: false });

      if (error) {
        console.error('Error fetching user badges:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getUserBadges:', error);
      return [];
    }
  }

  /**
   * Check and unlock badges for user
   */
  async checkAndUnlockBadges(userId: string) {
    try {
      const { data: badgesToUnlock, error } = await this.db.rpc(
        'check_badge_unlocks',
        { p_user_id: userId }
      );

      if (error) {
        console.error('Error checking badge unlocks:', error);
        return [];
      }

      // Unlock each badge
      const unlocked = [];
      for (const badge of badgesToUnlock || []) {
        const { success } = await this.db.rpc('unlock_badge', {
          p_user_id: userId,
          p_badge_id: badge.badge_id,
        });

        if (success) {
          unlocked.push(badge);
        }
      }

      return unlocked;
    } catch (error) {
      console.error('Error in checkAndUnlockBadges:', error);
      return [];
    }
  }

  /**
   * Get active challenges
   */
  async getActiveChallenges(userId: string) {
    try {
      const { data, error } = await this.db
        .from('xp_challenges')
        .select(`
          *,
          user_challenge_progress (
            current_progress,
            is_completed,
            xp_claimed
          )
        `)
        .eq('is_active', true)
        .gte('end_date', new Date().toISOString().split('T')[0]);

      if (error) {
        console.error('Error fetching challenges:', error);
        return [];
      }

      return data.map(challenge => ({
        ...challenge,
        progress: challenge.user_challenge_progress?.[0]?.current_progress || 0,
        isCompleted: challenge.user_challenge_progress?.[0]?.is_completed || false,
        xpClaimed: challenge.user_challenge_progress?.[0]?.xp_claimed || false,
      }));
    } catch (error) {
      console.error('Error in getActiveChallenges:', error);
      return [];
    }
  }

  /**
   * Claim challenge reward
   */
  async claimChallengeReward(userId: string, challengeId: string) {
    try {
      const { data, error } = await this.db.rpc('claim_challenge_reward', {
        p_user_id: userId,
        p_challenge_id: challengeId,
      });

      if (error) {
        console.error('Error claiming challenge reward:', error);
        return { success: false, error };
      }

      const [result] = data || [];
      return {
        success: result?.success,
        xpAwarded: result?.xp_awarded,
        message: result?.message,
      };
    } catch (error) {
      console.error('Error in claimChallengeReward:', error);
      return { success: false, error };
    }
  }

  /**
   * Get leaderboard (top users by XP)
   */
  async getLeaderboard(limit: number = 10) {
    try {
      const { data, error } = await this.db
        .from('user_xp_stats')
        .select(`
          *,
          users (
            full_name,
            role
          )
        `)
        .order('total_xp_earned', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching leaderboard:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getLeaderboard:', error);
      return [];
    }
  }

  /**
   * Get user's rank in leaderboard
   */
  async getUserRank(userId: string) {
    try {
      const { data, error } = await this.db.rpc('get_user_rank', {
        p_user_id: userId,
      });

      if (error) {
        console.error('Error fetching user rank:', error);
        return null;
      }

      return data?.[0]?.rank || null;
    } catch (error) {
      console.error('Error in getUserRank:', error);
      return null;
    }
  }

  /**
   * Get available rewards
   */
  async getAvailableRewards() {
    try {
      const { data, error } = await this.db
        .from('xp_rewards')
        .select('*')
        .eq('is_active', true)
        .order('xp_cost', { ascending: true });

      if (error) {
        console.error('Error fetching rewards:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getAvailableRewards:', error);
      return [];
    }
  }

  /**
   * Redeem reward
   */
  async redeemReward(userId: string, rewardId: string) {
    try {
      const { data, error } = await this.db.rpc('redeem_reward', {
        p_user_id: userId,
        p_reward_id: rewardId,
      });

      if (error) {
        console.error('Error redeeming reward:', error);
        return { success: false, error };
      }

      const [result] = data || [];
      return {
        success: result?.success,
        redemptionId: result?.redemption_id,
        message: result?.message,
      };
    } catch (error) {
      console.error('Error in redeemReward:', error);
      return { success: false, error };
    }
  }

  /**
   * Get user's redemption history
   */
  async getRedemptionHistory(userId: string) {
    try {
      const { data, error } = await this.db
        .from('xp_redemptions')
        .select(`
          *,
          xp_rewards (
            reward_name,
            reward_description,
            image_url
          )
        `)
        .eq('user_id', userId)
        .order('redeemed_at', { ascending: false });

      if (error) {
        console.error('Error fetching redemption history:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getRedemptionHistory:', error);
      return [];
    }
  }
}

// Export singleton instance
export const xpService = new XPService();
