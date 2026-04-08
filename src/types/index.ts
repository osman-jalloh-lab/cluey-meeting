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
  status: string; // e.g. "upcoming" or "past"
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
  tags: string[];
  isVoice: boolean;
  createdAt: string; // ISO format
}

export interface Project {
  id: string;
  name: string;
  color: string;
}

export type ViewType = 'all' | 'people' | 'commitments' | 'project';
