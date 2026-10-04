"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Trophy, Flame, Star, Award } from "lucide-react";

interface XPStatsCardProps {
  currentXP: number;
  level: number;
  xpToNextLevel: number;
  streakDays: number;
  totalBadges: number;
  className?: string;
}

export function XPStatsCard({
  currentXP,
  level,
  xpToNextLevel,
  streakDays,
  totalBadges,
  className,
}: XPStatsCardProps) {
  const progress = Math.min((currentXP / xpToNextLevel) * 100, 100);
  const xpRemaining = xpToNextLevel - currentXP;

  return (
    <Card className={`bg-gradient-to-br from-green-50 to-emerald-100 border-green-200 ${className}`}>
      <CardContent className="p-6">
        {/* Header: Level Badge + Stats */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            {/* Level Badge */}
            <div className="relative">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-green-600 to-emerald-700 flex items-center justify-center text-white font-bold text-xl shadow-lg">
                {level}
              </div>
              <div className="absolute -bottom-1 -right-1 bg-yellow-400 rounded-full p-1 shadow">
                <Trophy className="w-3 h-3 text-yellow-900" />
              </div>
            </div>
            
            {/* Level Info */}
            <div>
              <p className="text-sm font-semibold text-green-900">Level {level}</p>
              <p className="text-xs text-green-700">
                {level < 5 ? 'Recruiter' : level < 10 ? 'Senior Recruiter' : level < 15 ? 'HR Manager' : 'HR Director'}
              </p>
            </div>
          </div>

          {/* Badges & Streak */}
          <div className="flex items-center gap-2">
            <Badge 
              variant="secondary" 
              className="bg-orange-100 text-orange-800 border-orange-200 hover:bg-orange-200 transition-colors"
            >
              <Flame className="w-3 h-3 mr-1" />
              {streakDays} day{streakDays !== 1 ? 's' : ''}
            </Badge>
            <Badge 
              variant="secondary" 
              className="bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-200 transition-colors"
            >
              <Star className="w-3 h-3 mr-1" />
              {totalBadges}
            </Badge>
          </div>
        </div>

        {/* XP Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-semibold text-green-800">
              {currentXP.toLocaleString()} XP
            </span>
            <span className="text-xs text-green-600 font-medium">
              {xpToNextLevel.toLocaleString()} XP
            </span>
          </div>
          
          <div className="relative">
            <Progress 
              value={progress} 
              className="h-3 bg-green-200/50"
              indicatorClassName="bg-gradient-to-r from-green-500 to-emerald-600 transition-all duration-500"
            />
            {/* Level markers */}
            <div className="absolute top-0 left-0 w-full h-3 pointer-events-none">
              {[0.25, 0.5, 0.75].map((marker, i) => (
                <div
                  key={i}
                  className="absolute top-0 w-px h-3 bg-green-300/50"
                  style={{ left: `${marker * 100}%` }}
                />
              ))}
            </div>
          </div>
          
          <div className="flex items-center justify-between text-xs mt-2">
            <span className="text-green-700 font-medium flex items-center gap-1">
              <Award className="w-3 h-3" />
              {xpRemaining > 0 
                ? `${xpRemaining.toLocaleString()} XP to Level ${level + 1}`
                : 'Max level reached!'}
            </span>
            <span className="text-green-600">
              {progress.toFixed(0)}% complete
            </span>
          </div>
        </div>

        {/* Level Titles Info */}
        <div className="mt-4 pt-4 border-t border-green-200">
          <div className="flex justify-between text-xs text-green-700">
            <span className={level >= 1 ? 'font-semibold text-green-900' : ''}>Lvl 1</span>
            <span className={level >= 5 ? 'font-semibold text-green-900' : ''}>Lvl 5</span>
            <span className={level >= 10 ? 'font-semibold text-green-900' : ''}>Lvl 10</span>
            <span className={level >= 15 ? 'font-semibold text-green-900' : ''}>Lvl 15</span>
            <span className={level >= 20 ? 'font-semibold text-green-900' : ''}>Lvl 20</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
