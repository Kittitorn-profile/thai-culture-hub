export type FeedbackStatus = 'new' | 'reviewed' | 'archived';

export type FeedbackItem = {
  id: string;
  createdAt: string;
  name: string;
  contact: string;
  message: string;
  path: string;
  status: FeedbackStatus;
  userAgent: string;
};
