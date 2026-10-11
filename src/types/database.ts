export interface Profile {
  id: string;
  username: string;
  display_name: string;
  bio: string;
  avatar_url: string;
  banner_url?: string;
  banner_index: number;
  link?: string;
  is_creator: boolean;
  created_at?: string;
  first_name?: string;
  last_name?: string;
  birthday?: string;
  gender?: string;
  phone?: string;
  location?: string;
  email?: string;
}

export interface Post {
  id: string;
  user_id: string;
  content: string;
  captured_image?: string;
  image_gradient?: string;
  likes_count: number;
  comments_count: number;
  sound?: string;
  is_quote: boolean;
  type: "post" | "note" | "music";
  created_at: string;
  profiles?: Profile;
}

export interface Nano {
  id: string;
  user_id: string;
  caption: string;
  gradient: string;
  sound?: string;
  likes_count: number;
  comments_count: number;
  created_at: string;
  profiles?: Profile;
}

export interface Comment {
  id: string;
  post_id?: string;
  nano_id?: string;
  user_id: string;
  content: string;
  created_at: string;
  profiles?: Profile;
}

export interface Notification {
  id: string;
  recipient_id: string;
  sender_id: string;
  type: "like" | "comment" | "follow";
  post_id?: string;
  nano_id?: string;
  message: string;
  is_read: boolean;
  created_at: string;
  sender?: Profile;
}
