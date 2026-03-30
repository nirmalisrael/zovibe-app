export type MoodType = 'chill' | 'focus' | 'party' | 'sad' | 'workout';

export const MOODS: Record<
  MoodType,
  {
    label: string;
    labelTamil: string;
    color: string;
    bg: string;
    searches: string[];
  }
> = {
  chill: {
    label: 'Chill',
    labelTamil: 'நிதானம்',
    color: '#06B6D4',
    bg: '#0E1F30',
    searches: ['sid sriram chill', 'yuvan slow', 'arijit soft', 'lo-fi tamil'],
  },
  focus: {
    label: 'Focus',
    labelTamil: 'கவனம்',
    color: '#A78BFA',
    bg: '#1A1050',
    searches: ['ar rahman instrumental', 'harris jayaraj background', 'classical carnatic'],
  },
  party: {
    label: 'Party',
    labelTamil: 'பார்டி',
    color: '#EC4899',
    bg: '#1F0E20',
    searches: ['arabic kuthu', 'mass bgm remix', 'bollywood party hits', 'vijay dance'],
  },
  sad: {
    label: 'Sad',
    labelTamil: 'வலி',
    color: '#7C6FCD',
    bg: '#1A1035',
    searches: ['sid sriram emotional', 'yuvan sad songs', 'arijit singh sad', 'breakup tamil'],
  },
  workout: {
    label: 'Workout',
    labelTamil: 'உடற்பயிற்சி',
    color: '#EF9F27',
    bg: '#1A1A0A',
    searches: ['kutty story mass', 'beast mode bgm', 'peppy hindi workout', 'high energy tamil'],
  },
};
