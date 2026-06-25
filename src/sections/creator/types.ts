export type CreatorStatus = 'pending' | 'approved' | 'rejected';
export type CreatorArticleStatus = 'draft' | 'pending_review' | 'approved' | 'rejected' | 'published';
export type CreatorPlaceCorrectionStatus = 'pending' | 'approved' | 'rejected';

export type CreatorArticleApprovalReview = {
  userId: string;
  email: string;
  displayName: string;
  reviewedAt: string;
};

export type CreatorProfile = {
  id: string;
  userId: string;
  email: string;
  displayName: string;
  bio: string;
  phone: string;
  provinceCode: string;
  websiteUrl: string;
  facebookUrl: string;
  avatarUrl: string;
  status: CreatorStatus;
  isActive: boolean;
  warningNote: string;
  warnedAt: string;
  reviewedAt: string;
  rejectReason: string;
  creatorScore?: {
    totalScore: number;
    publishedArticleCount: number;
    averageQualityScore: number;
    totalViews: number;
    totalLikes: number;
    profileCompletenessScore: number;
  };
  creatorAwards?: Array<{
    key: string;
    title: string;
    subtitle: string;
    imageUrl: string;
  }>;
  createdAt: string;
  updatedAt: string;
};

export type CreatorArticle = {
  id: string;
  creatorId: string;
  categoryKey: string;
  categoryLabel: string;
  title: string;
  slug: string;
  excerpt: string;
  coverImageUrl: string;
  contentHtml: string;
  status: CreatorArticleStatus;
  isActive: boolean;
  inactiveReason: string;
  inactivatedAt: string;
  approvalRequiredCount: number;
  approvalReviewerIds: string[];
  approvalReviews: CreatorArticleApprovalReview[];
  approvalRequestedAt: string;
  submittedAt: string;
  reviewedAt: string;
  rejectReason: string;
  publishedAt: string;
  createdAt: string;
  updatedAt: string;
  creatorName?: string;
  creatorEmail?: string;
  creatorAvatarUrl?: string;
};

export type CreatorPlaceCorrection = {
  id: string;
  placeId: string;
  provinceCode: string;
  placeName: string;
  creatorProfileId: string;
  requesterUserId: string;
  requesterEmail: string;
  requesterName: string;
  reason: string;
  originalSnapshot: Record<string, unknown>;
  suggestedPayload: Record<string, unknown>;
  status: CreatorPlaceCorrectionStatus;
  reviewedAt: string;
  reviewerEmail: string;
  reviewerName: string;
  reviewNote: string;
  appliedAt: string;
  createdAt: string;
  updatedAt: string;
};
