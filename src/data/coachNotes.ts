import type { Gear } from '../simulation/types';

export interface CoachNote {
  id: string;
  title: string;
  quote: string;
  gear: Gear;
  source: 'user-message' | 'coach-video' | 'school-video';
  startSeconds: number | null;
  endSeconds: number | null;
  checkpointId: string | null;
  observation: string | null;
  verification: 'awaiting-video' | 'verified';
}

// Exact wording supplied by the user in the original requirements, NOT a video transcript.
// Never interpret these as a timed steering sequence until their context is verified.
export const coachNotes: CoachNote[] = [
  { id: 'user-forward-mnemonic', title: '前進口訣', quote: '左、左、右、右', gear: 'D', source: 'user-message', startSeconds: null, endSeconds: null, checkpointId: null, observation: null, verification: 'awaiting-video' },
  { id: 'user-reverse-mnemonic', title: '後退口訣', quote: '右、左、右', gear: 'R', source: 'user-message', startSeconds: null, endSeconds: null, checkpointId: null, observation: null, verification: 'awaiting-video' },
];

export const schoolVideoUrl = 'https://www.youtube.com/watch?v=eDh4jVEMTuA';

/** An unmapped quote must never turn into an automatic driving instruction. */
export function isActionableNote(note: CoachNote): boolean {
  return note.verification === 'verified' && note.source !== 'user-message' &&
    typeof note.startSeconds === 'number' && Number.isFinite(note.startSeconds) && note.startSeconds >= 0 &&
    typeof note.endSeconds === 'number' && Number.isFinite(note.endSeconds) && note.endSeconds > note.startSeconds &&
    Boolean(note.checkpointId?.trim()) && Boolean(note.observation?.trim());
}
