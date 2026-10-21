export interface Candidate {
  scientificName: string;
  commonName: string;
  family: string;
  score: number;
}

export interface Capture {
  id: string;
  user_id: string;
  scientific_name: string;
  common_name: string;
  family: string;
  score: number;
  photo_path: string;
  species_key: string;
  created_at: string;
  photoUrl?: string;
}

export interface LeaderboardRow {
  rank: number;
  display_name: string;
  species: number;
  xp: number;
  level: number;
  is_me: boolean;
}

export interface FriendSearchResult {
  display_name: string;
  friend_code: string;
}

export interface FriendConnection {
  request_id: string;
  friend_id: string;
  display_name: string;
  friend_code: string;
  status: 'pending' | 'accepted';
  incoming: boolean;
  species: number;
  xp: number;
  level: number;
}

export interface Database {
  public: {
    Tables: {
      captures: {
        Row: Omit<Capture, 'photoUrl'>;
        Insert: Pick<Capture, 'user_id' | 'scientific_name' | 'common_name' | 'family' | 'score' | 'photo_path'>;
        Update: never;
        Relationships: [];
      };
      leaderboard_profiles: {
        Row: { user_id: string; display_name: string; updated_at: string };
        Insert: { user_id: string; display_name: string };
        Update: { display_name?: string };
        Relationships: [];
      };
      friend_profiles: {
        Row: { user_id: string; display_name: string; friend_code: string; updated_at: string };
        Insert: { user_id: string; display_name: string; friend_code?: string };
        Update: { display_name?: string; friend_code?: string };
        Relationships: [];
      };
      friend_requests: {
        Row: { id: string; sender_id: string; receiver_id: string; accepted_at: string | null; created_at: string };
        Insert: never;
        Update: never;
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      get_leaderboard: { Args: Record<string, never>; Returns: LeaderboardRow[] };
      search_friend_players: { Args: { p_display_name: string }; Returns: FriendSearchResult[] };
      send_friend_request: { Args: { p_friend_code: string }; Returns: string };
      respond_friend_request: { Args: { p_request_id: string; p_accept: boolean }; Returns: undefined };
      remove_friend: { Args: { p_request_id: string }; Returns: undefined };
      get_friend_connections: { Args: Record<string, never>; Returns: FriendConnection[] };
      are_friends: { Args: { p_user_id: string }; Returns: boolean };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
}

export interface CatalogPlant {
  id: string;
  name: string;
  scientificName: string;
  family: string;
  habitat: string;
  description: string;
  shape: 'split' | 'round' | 'spike' | 'flower' | 'fern';
  color: string;
}
