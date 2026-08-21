import type { PerformanceGroupEntry } from 'src/sections/home/components/home-types';

export type PerformanceGroupPersonnel = PerformanceGroupEntry['personnel'][number];

export type PerformanceGroupYearlyRecord = PerformanceGroupEntry['yearlyData'][number];
