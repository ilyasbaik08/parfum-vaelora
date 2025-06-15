import { supabase } from '../supabaseClient';

export const checkUnreadMessages = async (userId) => {
  if (!userId) return false;

  const { data, error } = await supabase
    .from('chats')
    .select('is_read')
    .eq('receiver_id', userId)
    .eq('is_read', false);

  if (error) {
    console.error('Error checking unread messages:', error);
    return false;
  }

  return data.length > 0;
};