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

export interface Database {
  public: {
    Tables: {
      captures: {
        Row: Omit<Capture, 'photoUrl'>;
        Insert: Pick<Capture, 'user_id' | 'scientific_name' | 'common_name' | 'family' | 'score' | 'photo_path'>;
        Update: never;
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
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
