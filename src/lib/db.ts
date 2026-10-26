import { supabase, isSupabaseConfigured } from "./supabase";
import type { Profile, Post, Notification, Nano } from "../types/database";

export { isSupabaseConfigured };

export const db = {
  auth: {
    getSession: async () => {
      if (!supabase) return null;
      const { data } = await supabase.auth.getSession();
      return data.session;
    },

    getUser: async () => {
      if (!supabase) return null;
      const { data } = await supabase.auth.getUser();
      return data.user;
    },

    getCurrentUserId: async (): Promise<string | null> => {
      if (!supabase) return null;
      const { data } = await supabase.auth.getUser();
      return data.user?.id ?? null;
    },

    getCurrentUserProfile: async (): Promise<Profile | null> => {
      if (!supabase) return null;
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return null;

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.user.id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },

    signInWithPassword: async (email: string, password: string) => {
      if (!supabase) throw new Error("Supabase is not configured");
      return supabase.auth.signInWithPassword({ email, password });
    },

    signUp: async (email: string, password: string) => {
      if (!supabase) throw new Error("Supabase is not configured");
      return supabase.auth.signUp({ email, password });
    },

    signOut: async () => {
      if (!supabase) return;
      await supabase.auth.signOut();
    },
  },

  profiles: {
    getByUsername: async (username: string): Promise<Profile | null> => {
      if (!supabase) return null;

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("username", username)
        .maybeSingle();

      if (error) throw error;
      return data;
    },

    getById: async (id: string): Promise<Profile | null> => {
      if (!supabase) return null;

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },

    update: async (id: string, payload: Partial<Profile>) => {
      if (!supabase) throw new Error("Supabase is not configured");

      const { data, error } = await supabase
        .from("profiles")
        .update(payload)
        .eq("id", id)
        .select("*")
        .single();

      if (error) throw error;
      return data as Profile;
    },
  },

  follows: {
    listFollowers: async (userId: string): Promise<Profile[]> => {
      if (!supabase) return [];

      const { data, error } = await supabase
        .from("follows")
        .select("follower:profiles!follows_follower_id_fkey(*)")
        .eq("following_id", userId);

      if (error) throw error;

      return (data ?? [])
        .map((r: any) => r.follower)
        .filter(Boolean);
    },

    listFollowing: async (userId: string): Promise<Profile[]> => {
      if (!supabase) return [];

      const { data, error } = await supabase
        .from("follows")
        .select("following:profiles!follows_following_id_fkey(*)")
        .eq("follower_id", userId);

      if (error) throw error;

      return (data ?? [])
        .map((r: any) => r.following)
        .filter(Boolean);
    },

    isFollowing: async (
      followerId: string,
      followingId: string
    ): Promise<boolean> => {
      if (!supabase) return false;

      const { data } = await supabase
        .from("follows")
        .select("follower_id")
        .eq("follower_id", followerId)
        .eq("following_id", followingId)
        .maybeSingle();

      return !!data;
    },

    followToggle: async (
      followerId: string,
      followingId: string
    ): Promise<boolean> => {
      if (!supabase || followerId === followingId) return false;

      const current = await supabase
        .from("follows")
        .select("follower_id")
        .eq("follower_id", followerId)
        .eq("following_id", followingId)
        .maybeSingle();

      if (current.data) {
        const { error } = await supabase
          .from("follows")
          .delete()
          .eq("follower_id", followerId)
          .eq("following_id", followingId);

        if (error) throw error;
        return false;
      }

      const { error } = await supabase
        .from("follows")
        .insert({
          follower_id: followerId,
          following_id: followingId,
        });

      if (error) throw error;
      return true;
    },
  },

  posts: {
    create: async (payload: any): Promise<Post> => {
      if (!supabase) throw new Error("Supabase is not configured");

      const { data, error } = await supabase
        .from("posts")
        .insert(payload)
        .select("*, profiles(*)")
        .single();

      if (error) throw error;
      return data as Post;
    },

    list: async (limit = 20): Promise<Post[]> => {
      if (!supabase) return [];

      const { data, error } = await supabase
        .from("posts")
        .select("*, profiles(*)")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) throw error;
      return (data ?? []) as Post[];
    },

    isLikedBy: async (
      postId: string,
      userId: string
    ): Promise<boolean> => {
      if (!supabase) return false;

      const { data } = await supabase
        .from("likes")
        .select("post_id")
        .eq("post_id", postId)
        .eq("user_id", userId)
        .maybeSingle();

      return !!data;
    },

    likeToggle: async (
      postId: string,
      userId: string
    ): Promise<boolean> => {
      if (!supabase) return false;

      const current = await supabase
        .from("likes")
        .select("post_id")
        .eq("post_id", postId)
        .eq("user_id", userId)
        .maybeSingle();

      if (current.data) {
        const { error } = await supabase
          .from("likes")
          .delete()
          .eq("post_id", postId)
          .eq("user_id", userId);

        if (error) throw error;
        return false;
      }

      const { error } = await supabase
        .from("likes")
        .insert({
          post_id: postId,
          user_id: userId,
        });

      if (error) throw error;
      return true;
    },
  },

  nanos: {
    list: async (limit = 20): Promise<Nano[]> => {
      if (!supabase) return [];

      const { data, error } = await supabase
        .from("nanos")
        .select("*, profiles(*)")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) throw error;
      return (data ?? []) as Nano[];
    },

    create: async (payload: any): Promise<Nano> => {
      if (!supabase) throw new Error("Supabase is not configured");

      const { data, error } = await supabase
        .from("nanos")
        .insert(payload)
        .select("*, profiles(*)")
        .single();

      if (error) throw error;
      return data as Nano;
    },
  },

  search: {
    profiles: async (q: string): Promise<Profile[]> => {
      if (!supabase || !q.trim()) return [];

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .or(
          `username.ilike.%${q.trim()}%,display_name.ilike.%${q.trim()}%`
        )
        .limit(20);

      if (error) throw error;
      return (data ?? []) as Profile[];
    },

    posts: async (q: string): Promise<Post[]> => {
      if (!supabase || !q.trim()) return [];

      const { data, error } = await supabase
        .from("posts")
        .select("*, profiles(*)")
        .ilike("content", `%${q.trim()}%`)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      return (data ?? []) as Post[];
    },
  },

  notifications: {
    list: async (userId: string): Promise<Notification[]> => {
      if (!supabase) return [];

      const { data, error } = await supabase
        .from("notifications")
        .select("*, sender:sender_id(*)")
        .eq("recipient_id", userId)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return (data ?? []) as Notification[];
    },

    markAllRead: async (userId: string) => {
      if (!supabase) return;

      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("recipient_id", userId)
        .eq("is_read", false);

      if (error) throw error;
    },
  },
};
