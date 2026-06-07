export interface Track {
  name: string;
  artist: string;
  cover: string;
  isLive: boolean;
}

export interface FeaturedTrack {
  title: string;
  artist: string;
  lyric?: string;
  spotifyId?: string;
  spotifyUrl?: string;
  youtubeId?: string;
  coverUrl?: string;
}

export interface GalleryItem {
  id: string;
  url: string;
  title?: string;
  category?: string;
  date?: string;
}

export interface GameplayItem {
  id: string;
  youtubeId?: string;
  isSearch?: boolean;
  title: string;
  status: string;
  year: string;
  vibe: string;
  notes: string;
  cover?: string;
}
