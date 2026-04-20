export interface Task {
  id: string;
  text: string;
  done: boolean;
  assignee?: string;
  assigneeEmail?: string;
  assignedByEmail?: string;
  dueDate?: string;
  completedAt?: string;
  notificationSent?: boolean;
  completionSent?: boolean;
}

export interface Commitment {
  text: string;
  done: boolean;
}

export interface CalendarEvent {
  id: string;
  title: string;
  attendees: string[];
  startTime: string;
  endTime: string;
  status: string;
}

export interface Meeting {
  id: string;
  person: string;
  projId: string;
  type: '1:1' | 'Team' | 'Client' | 'Interview' | 'Standup' | 'Other';
  rawNotes: string;
  summary: string;
  decisions: string[];
  actions: string[];
  commitments: Commitment[];
  tasks?: Task[];
  tags: string[];
  isVoice: boolean;
  createdAt: string;
}

export interface Project {
  id: string;
  name: string;
  color: string;
  description?: string;
  reviewIntervalDays?: number;   // 0 = no review
  lastReviewedAt?: string;       // ISO date string
}

export type ViewType = 'all' | 'people' | 'commitments' | 'project';
