export type AnalyticsDailyPoint = {
  date: string;
  pageViews: number;
  visitors: number;
  sessions: number;
};

export type AnalyticsTopPage = {
  path: string;
  pageViews: number;
  visitors: number;
};

export type AnalyticsReferrer = {
  referrer: string;
  pageViews: number;
};

export type AnalyticsEventSummary = {
  name: string;
  count: number;
  visitors: number;
  metadata?: Record<string, string | number | boolean | null>;
};

export type AnalyticsSummary = {
  totalPageViews: number;
  uniqueVisitors: number;
  totalSessions: number;
  averageViewsPerSession: number;
  daily: AnalyticsDailyPoint[];
  topPages: AnalyticsTopPage[];
  referrers: AnalyticsReferrer[];
  topNavigation: AnalyticsEventSummary[];
  topSearches: AnalyticsEventSummary[];
  topProvinces: AnalyticsEventSummary[];
  topDistricts: AnalyticsEventSummary[];
  topFilterOptions: AnalyticsEventSummary[];
};
